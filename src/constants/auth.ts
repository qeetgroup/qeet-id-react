/** The backend's CSRF double-submit cookie (readable JS-side, echoed on mutations). */
export const CSRF_COOKIE_NAME = "qe_csrf";

/** The header the backend expects the CSRF token echoed back on. */
export const CSRF_HEADER_NAME = "X-CSRF-Token";

/** Default hosted-login redirect paths, overridable via `<QeetIDProvider>` props. */
export const DEFAULT_LOGIN_URL = "/api/auth/login";
export const DEFAULT_LOGOUT_URL = "/api/auth/logout";
export const DEFAULT_SIGNUP_URL = "/api/auth/sign-up";
