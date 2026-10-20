import sharp from "sharp";
import { logger } from "./logger.js";

/**
 * Upload-time image optimization.
 *
 * Storefront images are uploaded straight from a camera/design tool and are
 * routinely 2–4 MB and 3000+ px wide. ERPNext serves them byte-for-byte, and
 * the reverse proxy in front of it has no resizing capability, so whatever is
 * uploaded is what every visitor downloads. Shrinking uploads here is the only
 * place the weight can be removed.
 *
 * Policy:
 *   - Non-images pass through untouched.
 *   - GIF/SVG are left alone (animation / vector data would be lost).
 *   - Everything else is resized to fit within MAX_DIMENSION and re-encoded
 *     (JPEG → mozjpeg, PNG → palette-optimized PNG, WEBP → webp).
 *   - The original is returned when optimization does not actually help.
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;

const RASTER_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "tiff", "tif", "bmp"]);
// Left untouched: animating (gif) and vector/hand-authored formats.
const PASSTHROUGH_EXTENSIONS = new Set(["svg", "gif", "ico"]);

export type OptimizedUpload = {
  buffer: Buffer;
  filename: string;
  originalSize: number;
  optimizedSize: number;
  width?: number;
  height?: number;
};

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/**
 * Optimizes an uploaded image in memory. Never throws: on any failure the
 * original bytes are returned so an upload can never be blocked by this step.
 */
export async function optimizeImageUpload(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<OptimizedUpload> {
  const originalSize = buffer.length;
  const ext = extensionOf(filename);

  const unchanged: OptimizedUpload = {
    buffer,
    filename,
    originalSize,
    optimizedSize: originalSize,
  };

  if (!mimetype.startsWith("image/")) return unchanged;
  if (PASSTHROUGH_EXTENSIONS.has(ext)) return unchanged;
  if (!RASTER_EXTENSIONS.has(ext)) return unchanged;

  try {
    // `rotate()` with no argument applies the EXIF orientation, which phone
    // photos need or they come out sideways once metadata is stripped.
    const pipeline = sharp(buffer, { failOn: "none" }).rotate();

    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height) return unchanged;

    const resized = pipeline.resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

    // Re-encode according to the original format so the extension stays valid.
    let out: Buffer;
    if (ext === "png") {
      out = await resized.png({ compressionLevel: 9, palette: true }).toBuffer();
    } else if (ext === "webp") {
      out = await resized.webp({ quality: WEBP_QUALITY }).toBuffer();
    } else if (ext === "avif") {
      out = await resized.avif({ quality: 60 }).toBuffer();
    } else {
      out = await resized.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    }

    // Keep the original if the "optimized" result is not actually smaller.
    if (out.length === 0 || out.length >= originalSize) {
      return unchanged;
    }

    const outMeta = await sharp(out).metadata();

    logger.info(
      {
        filename,
        from: originalSize,
        to: out.length,
        savedPercent: Math.round((1 - out.length / originalSize) * 100),
        fromDimensions: `${meta.width}x${meta.height}`,
        toDimensions: `${outMeta.width}x${outMeta.height}`,
      },
      "[image-optimizer] compressed upload",
    );

    return {
      buffer: out,
      filename,
      originalSize,
      optimizedSize: out.length,
      width: outMeta.width,
      height: outMeta.height,
    };
  } catch (error) {
    logger.warn({ error, filename }, "[image-optimizer] failed — uploading original");
    return unchanged;
  }
}
