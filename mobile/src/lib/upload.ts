import { API_URL } from "./api";
import { getCookie } from "./auth";

export interface UploadResult {
  url: string;
  size: number;
}

export async function uploadFile(
  uri: string,
  name: string,
  mimeType: string,
): Promise<UploadResult> {
  const cookie = getCookie();
  const form = new FormData();
  form.append("file", {
    uri,
    name,
    type: mimeType,
  } as unknown as Blob);

  const res = await fetch(`${API_URL}/api/mobile/upload`, {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 413) throw new Error("File too large (max 10 MB).");
    if (res.status === 429) throw new Error("Upload rate limit reached. Try again shortly.");
    throw new Error(body.trim() || "Upload failed.");
  }

  return (await res.json()) as UploadResult;
}
