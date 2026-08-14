import * as SecureStore from "expo-secure-store";

const KEY_COOKIE = "vaultx_cookie";
const KEY_USER = "vaultx_user";

export async function getStoredCookie(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_COOKIE);
}

export async function setStoredCookie(cookie: string | null): Promise<void> {
  if (cookie) {
    await SecureStore.setItemAsync(KEY_COOKIE, cookie);
  } else {
    await SecureStore.deleteItemAsync(KEY_COOKIE);
  }
}

export async function getStoredUser<T>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setStoredUser<T>(user: T | null): Promise<void> {
  if (user) {
    await SecureStore.setItemAsync(KEY_USER, JSON.stringify(user));
  } else {
    await SecureStore.deleteItemAsync(KEY_USER);
  }
}
