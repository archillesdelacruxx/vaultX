import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "~/env";

const KEY = Buffer.from(env.APP_KEY, "hex");

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Output format: `v1:<iv base64>:<tag base64>:<ciphertext base64>`
 */
export function encrypt(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

/** Decrypt a string produced by encrypt(). Returns "" on any failure. */
export function decrypt(payload: string | null | undefined): string {
  if (!payload) return "";
  try {
    const parts = payload.split(":");
    const [version, ivB64, tagB64, ctB64] = parts;
    if (version !== "v1" || !ivB64 || !tagB64 || !ctB64) return "";
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(ctB64, "base64");
    const decipher = createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
