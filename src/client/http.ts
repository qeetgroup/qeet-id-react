// Browser HTTP transport for the hosted-login / embedded auth flows. Unlike
// the server SDK (bearer/ApiKey auth), this client is cookie-based: the
// backend sets an HttpOnly SSO cookie, so every request uses `credentials:
// "include"`. Mutations echo the CSRF double-submit token, which the
// backend issues on any GET.
//
// (Not part of the tree the rest of `client/` follows literally — split out
// from `client.ts` as its own file the same way the Node SDK splits
// `transport/` from resource files, since the raw fetch mechanics and the
// domain methods built on them are a natural seam.)

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../constants/auth.js";
import { AuthenticationError } from "../errors/AuthenticationError.js";
import { readCookie } from "../utils/cookies.js";

export class Http {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    // Normalize to no trailing slash so `url()` joins predictably.
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /** Absolute URL for an API path (e.g. "/v1/auth/session"). Exposed so callers can build redirect URLs (social start) themselves. */
  url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    return this.parse<T>(res);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(await this.csrfHeader()),
      },
      body: JSON.stringify(body ?? {}),
      credentials: "include",
    });
    return this.parse<T>(res);
  }

  async del<T = unknown>(path: string): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "DELETE",
      headers: { Accept: "application/json", ...(await this.csrfHeader()) },
      credentials: "include",
    });
    return this.parse<T>(res);
  }

  // Seeds and echoes the double-submit CSRF token. The backend issues it on
  // any GET; we read it back and send it on mutations. (In dev CSRF is
  // disabled; in prod the cookie must be readable here — a shared cookie
  // domain across the login and API subdomains is required.)
  private async csrfHeader(): Promise<Record<string, string>> {
    let tok = readCookie(CSRF_COOKIE_NAME);
    if (!tok) {
      try {
        await fetch(this.url("/healthz"), { credentials: "include" });
      } catch {
        // best-effort seed
      }
      tok = readCookie(CSRF_COOKIE_NAME);
    }
    return tok ? { [CSRF_HEADER_NAME]: tok } : {};
  }

  private async parse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? safeParse(text) : null;
    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
      throw new AuthenticationError(res.status, err?.code ?? `http_${res.status}`, err?.message ?? "Request failed", res.headers.get("x-request-id") ?? undefined);
    }
    return data as T;
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
