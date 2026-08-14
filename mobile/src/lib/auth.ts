import { API_URL } from "./api";
import { setStoredCookie } from "./secure";

let cookieCache: string | null = null;

export function getCookie(): string | null {
  return cookieCache;
}

export function setCookieCache(cookie: string | null): void {
  cookieCache = cookie;
}

export async function loadStoredSession(): Promise<void> {
  const { getStoredCookie } = await import("./secure");
  cookieCache = await getStoredCookie();
}

export async function clearSession(): Promise<void> {
  cookieCache = null;
  await setStoredCookie(null);
}

type CookiePair = { name: string; value: string };

function parseCookies(setCookieHeader: string | null): CookiePair[] {
  if (!setCookieHeader) return [];
  const pairs: CookiePair[] = [];
  const re = /([^;,=\s]+)=([^;,]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(setCookieHeader)) !== null) {
    const name = m[1]?.trim();
    const value = m[2]?.trim();
    if (name && value) pairs.push({ name, value });
  }
  return pairs;
}

function isAuthJsCookie(name: string): boolean {
  return name.toLowerCase().includes("authjs.");
}

function collectCookies(setCookieHeader: string | null): string {
  const pairs = parseCookies(setCookieHeader).filter((p) => isAuthJsCookie(p.name));
  return pairs.map((p) => `${p.name}=${p.value}`).join("; ");
}

function xhrRequest(
  method: "GET" | "POST",
  url: string,
  body?: string,
  cookie?: string,
): Promise<{ status: number; json: unknown; setCookie: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader("Accept", "application/json");
    if (body) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    if (cookie) xhr.setRequestHeader("Cookie", cookie);
    xhr.onload = () => {
      let setCookie = "";
      const all = xhr.getAllResponseHeaders() ?? "";
      const matches = all.matchAll(/^set-cookie:\s*(.+)$/gim);
      for (const match of matches) {
        const val = match[1]?.trim();
        if (val) setCookie = setCookie ? `${setCookie}; ${val}` : val;
      }
      let json: unknown = null;
      try {
        json = JSON.parse(xhr.responseText ?? "null");
      } catch {
        json = null;
      }
      resolve({ status: xhr.status, json, setCookie });
    };
    xhr.onerror = () => reject(new Error("Network request failed"));
    xhr.send(body);
  });
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

async function loginViaEndpoint(
  email: string,
  password: string,
): Promise<{ ok: true; cookie: string } | { ok: false; error: string; notFound?: boolean }> {
  const res = await fetch(`${API_URL}/api/mobile/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 404) {
    return { ok: false, error: "", notFound: true };
  }
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; name?: string; value?: string; error?: string };
  if (!res.ok || !json.ok || !json.name || !json.value) {
    return { ok: false, error: json.error ?? "Invalid email or password." };
  }
  return { ok: true, cookie: `${json.name}=${json.value}` };
}

async function loginViaCsrf(email: string, password: string): Promise<LoginResult> {
  try {
    const csrf = await xhrRequest("GET", `${API_URL}/api/auth/csrf`);
    const csrfJson = csrf.json as { csrfToken?: string } | null;
    const csrfToken = csrfJson?.csrfToken;
    if (!csrfToken) {
      return { ok: false, error: "Could not start sign-in session." };
    }
    const csrfCookie = collectCookies(csrf.setCookie);

    const body = new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${API_URL}/dashboard`,
      json: "true",
    }).toString();

    const res = await xhrRequest(
      "POST",
      `${API_URL}/api/auth/callback/credentials`,
      body,
      csrfCookie,
    );
    const resJson = res.json as { url?: string; error?: string } | null;

    if (resJson?.error) {
      return { ok: false, error: "Invalid email or password." };
    }
    if (res.status >= 400) {
      return { ok: false, error: "Invalid email or password." };
    }

    const sessionCookie = collectCookies(res.setCookie);
    const merged = [csrfCookie, sessionCookie].filter(Boolean).join("; ");
    cookieCache = merged;
    await setStoredCookie(merged);
    return { ok: true };
  } catch {
    return { ok: false, error: "Cannot reach server. Check your connection." };
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const viaEndpoint = await loginViaEndpoint(email, password);
    if (viaEndpoint.ok) {
      cookieCache = viaEndpoint.cookie;
      await setStoredCookie(viaEndpoint.cookie);
      return { ok: true };
    }
    if (!viaEndpoint.notFound) {
      return { ok: false, error: viaEndpoint.error };
    }
  } catch {
    // Fall through to the CSRF flow if the endpoint is unreachable.
  }
  return loginViaCsrf(email, password);
}

export async function serverLogout(): Promise<void> {
  const cookie = getCookie();
  try {
    await fetch(`${API_URL}/api/mobile/logout`, {
      method: "POST",
      headers: cookie ? { Cookie: cookie } : {},
    });
  } catch {
    // Best effort; the local session is cleared regardless.
  }
}

export function getApiUrl(): string {
  return API_URL;
}
