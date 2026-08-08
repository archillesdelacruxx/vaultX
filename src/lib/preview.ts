const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg|bmp|ico)(\?.*)?$/i;

export function getDriveFileId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("drive.google.com")) return null;
    const idMatch = /\/file\/d\/([^/]+)/.exec(u.pathname);
    if (idMatch) return idMatch[1] ?? null;
    const id = u.searchParams.get("id");
    if (id) return id;
    return null;
  } catch {
    return null;
  }
}

export function getPreviewUrl(url: string): string | null {
  if (!url) return null;
  const driveId = getDriveFileId(url);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w800`;
  }
  if (IMAGE_EXT.test(url)) return url;
  return null;
}
