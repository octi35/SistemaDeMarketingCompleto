import { STORAGE_KEYS, getStored } from "./storageKeys";

/**
 * Small fetch wrapper for the backend API.
 * - Automatically attaches the user's Gemini/Anthropic keys as headers.
 * - Parses JSON and throws a useful error on non-OK responses.
 */
export async function apiPost<T = any>(
  path: string,
  body: unknown,
  opts: { includeAnthropic?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Gemini-Key": getStored(STORAGE_KEYS.geminiApiKey),
  };
  if (opts.includeAnthropic) {
    headers["X-Anthropic-Key"] = getStored(STORAGE_KEYS.anthropicApiKey);
  }

  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g. an HTML error page)
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
    return {} as T;
  }

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status} en ${path}`);
  }
  return data as T;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status} en ${path}`);
  return data as T;
}
