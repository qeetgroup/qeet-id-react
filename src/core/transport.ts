import {
  CSRF_HEADER,
  CSRF_HEADER_VALUE,
  parseSession,
  type Session,
  type SessionRoutes,
  type SignOutRequest,
  type SignOutResponse,
  type SwitchOrganizationRequest,
} from "../contract";
import { QeetIDError } from "../errors";
import { isHttpOrPath } from "./navigation";

/** How the store reaches the app's session routes. */
export interface SessionTransport {
  /** `GET {basePath}/session`. */
  getSession(): Promise<Session | null>;
  /** `POST {basePath}/sign-out`. */
  signOut(request: SignOutRequest): Promise<SignOutResponse>;
  /** `POST {basePath}/switch-organization`. */
  switchOrganization(request: SwitchOrganizationRequest): Promise<Session>;
}

/** The transport over `fetch`, to the app's own origin. */
export function fetchTransport(routes: SessionRoutes): SessionTransport {
  return {
    async getSession() {
      const body = await send("GET", routes.session, undefined);
      if (!isRecord(body) || !("session" in body)) throw invalid(`GET ${routes.session} answered with JSON that isn't { "session": … }.`);
      return body.session === null ? null : parse(body.session, `GET ${routes.session}`);
    },
    async signOut(request) {
      const body = await send("POST", routes.signOut, request);
      if (!isRecord(body) || typeof body.redirectTo !== "string" || !isHttpOrPath(body.redirectTo)) {
        throw invalid(`POST ${routes.signOut} answered without a redirectTo that is an http(s) URL or a path.`);
      }
      return { redirectTo: body.redirectTo };
    },
    async switchOrganization(request) {
      const body = await send("POST", routes.switchOrganization, request);
      if (!isRecord(body) || !isRecord(body.session)) throw invalid(`POST ${routes.switchOrganization} answered without a session.`);
      return parse(body.session, `POST ${routes.switchOrganization}`);
    },
  };
}

async function send(method: "GET" | "POST", url: string, json: object | undefined): Promise<unknown> {
  // The custom header is the CSRF defence: another site can't send it without
  // a CORS preflight the session routes never allow.
  const headers: Record<string, string> = { Accept: "application/json", [CSRF_HEADER]: CSRF_HEADER_VALUE };
  if (json !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  let text: string;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: json === undefined ? undefined : JSON.stringify(json),
      credentials: "same-origin",
      cache: "no-store",
      redirect: "manual",
    });
    text = await response.text();
  } catch (cause) {
    throw new QeetIDError(`${method} ${url} got no response.`, { code: "network_error", cause });
  }

  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    throw new QeetIDError(
      `${method} ${url} answered with a redirect. Session routes answer JSON: is a middleware sending this route to a sign-in page?`,
      { code: "invalid_response", status: response.status || undefined },
    );
  }
  const body = parseJson(text);
  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : {};
    const code = typeof error.code === "string" && error.code !== "" ? error.code : `http_${response.status}`;
    const message =
      typeof error.message === "string" && error.message !== ""
        ? error.message
        : response.status === 404
          ? `${method} ${url} was not found. Is the session route mounted at this path?`
          : `${method} ${url} failed with HTTP status ${response.status}.`;
    throw new QeetIDError(message, { code, status: response.status });
  }
  if (body === undefined) {
    throw invalid(
      `${method} ${url} didn't answer with JSON. Is the session route mounted at this path, or is the app's HTML answering it?`,
      response.status,
    );
  }
  return body;
}

function parse(value: unknown, request: string): Session {
  try {
    return parseSession(value);
  } catch (cause) {
    throw new QeetIDError(`${request} answered with a session that doesn't fit the contract: ${(cause as Error).message}`, {
      code: "invalid_response",
      status: 200,
      cause,
    });
  }
}

function invalid(message: string, status = 200): QeetIDError {
  return new QeetIDError(message, { code: "invalid_response", status });
}

function parseJson(text: string): unknown {
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
