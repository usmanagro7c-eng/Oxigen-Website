export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function getProductImage(imgUrl?: string | null): string {
  if (!imgUrl) return "/placeholder.png";
  if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) return imgUrl;
  if (imgUrl.startsWith("/files/") || imgUrl.startsWith("/private/files/")) return imgUrl;
  if (imgUrl.startsWith("files/") || imgUrl.startsWith("private/files/")) return `/${imgUrl}`;
  return `${API_BASE}/items/image/${imgUrl.replace(/^\/+/, "")}`;
}
