const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg|bmp|ico)(\?.*)?$/i;

export function getDriveFileId(url: string): string | null {
  if (!url) return null;
  const idMatch = /\/file\/d\/([^/]+)/.exec(url);
  if (idMatch) return idMatch[1] ?? null;
  const id = /[?&]id=([^&]+)/.exec(url);
  if (id) return decodeURIComponent(id[1] ?? "");
  return null;
}

export function getPreviewUrl(url: string): string | null {
  if (!url) return null;
  const driveId = getDriveFileId(url);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w800`;
  }
  if (/^https?:\/\//i.test(url) && IMAGE_EXT.test(url)) return url;
  return null;
}
