import { SIGN_IN_PARAMETERS, safeReturnTo } from "../contract";
import { warnOnce } from "./development";

/** Sends the whole page to a URL. Session routes are server routes, so this is never a client-side route change. */
export type Navigate = (url: string) => void;

/** An `https:` or `http:` URL, or a path: never `javascript:` or another scheme a page could be sent to. */
export function isHttpOrPath(value: string): boolean {
  if (value === "") return false;
  try {
    const { protocol } = new URL(value, "https://placeholder.invalid/");
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * The default `Navigate`: `window.location.assign`.
 *
 * @throws {TypeError} when `url` isn't an http(s) URL or a path.
 */
export function assignLocation(url: string): void {
  if (!isHttpOrPath(url)) throw new TypeError(`Refusing to navigate to ${JSON.stringify(url)}: not an http(s) URL or a path.`);
  window.location.assign(url);
}

/**
 * `returnTo` as a path on this site; the current page when it is absent or
 * isn't on this site; `undefined` outside a browser.
 */
export function returnPath(returnTo: string | undefined): string | undefined {
  if (typeof window === "undefined") return undefined;
  const { href, origin } = window.location;
  if (returnTo !== undefined) {
    const path = safeReturnTo(returnTo, origin);
    if (path !== undefined) return path;
    warnOnce(`returnTo ${JSON.stringify(returnTo)} isn't a path on this site, so the current page is used instead.`);
  }
  return safeReturnTo(href, origin);
}

/** What `signIn` and `signUp` take. */
export interface SignInOptions {
  /** A path on this site to come back to. Defaults to the current page; a value on another site is ignored. */
  returnTo?: string;
  /** The id of the organisation to sign in to. Qeet ID doesn't take it yet; the server passes it on when it does. */
  organization?: string;
  /** An email address for the hosted page to prefill. Qeet ID doesn't take it yet; the server passes it on when it does. */
  loginHint?: string;
}

/** The URL of the `sign-in` or `sign-up` route with its query parameters. */
export function signInUrl(route: string, options: SignInOptions | undefined): string {
  const query = new URLSearchParams();
  const returnTo = returnPath(options?.returnTo);
  if (returnTo !== undefined) query.set(SIGN_IN_PARAMETERS.returnTo, returnTo);
  if (options?.organization) query.set(SIGN_IN_PARAMETERS.organization, options.organization);
  if (options?.loginHint) query.set(SIGN_IN_PARAMETERS.loginHint, options.loginHint);
  const search = query.toString();
  return search === "" ? route : `${route}?${search}`;
}
