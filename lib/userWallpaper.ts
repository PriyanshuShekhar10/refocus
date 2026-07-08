/** Max upload size for dashboard wallpapers (10 MB). */
export const WALLPAPER_MAX_BYTES = 10 * 1024 * 1024;

export const WALLPAPER_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** True when the URL points at our Vercel Blob store (safe to delete on replace). */
export function isManagedWallpaperUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
