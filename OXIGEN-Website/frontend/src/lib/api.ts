export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link: string;
  cta?: string;
  active: boolean;
  order: number;
}

export function getProductImage(imgUrl?: string | null): string {
  if (!imgUrl) return "/placeholder.png";
  if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) return imgUrl;
  if (imgUrl.startsWith("/files/") || imgUrl.startsWith("/private/files/")) return imgUrl;
  if (imgUrl.startsWith("files/") || imgUrl.startsWith("private/files/")) return `/${imgUrl}`;
  return `${API_BASE}/items/image/${imgUrl.replace(/^\/+/, "")}`;
}

export async function getBanners(): Promise<BannerItem[]> {
  try {
    const res = await fetch(`${API_BASE}/banners`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}
