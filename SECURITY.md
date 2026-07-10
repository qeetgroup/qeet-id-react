# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately — do not open a public
GitHub issue. Email **security@qeet.in** with:

- A description of the vulnerability and its impact.
- Steps to reproduce (a minimal code sample against this SDK, not the Qeet
  ID backend).
- The SDK version and browser/React version affected.

We aim to acknowledge reports within 2 business days.

## Scope

This policy covers the `qeet-id-react` SDK itself. The highest-sensitivity
surfaces are: the WebAuthn ceremony wrappers (`src/client/webauthn.ts`),
the CSRF double-submit handling in the HTTP transport
(`src/client/http.ts`), and anything touching the session cookie. Note this
SDK never reads, writes, or has access to the actual session token — it's
an HttpOnly cookie by design, invisible to JavaScript — so a vulnerability
here would most likely be about CSRF, XSS-adjacent DOM injection in a
prebuilt component, or a WebAuthn ceremony correctness bug, not token
theft. Vulnerabilities in the Qeet ID platform/backend itself should be
reported through Qeet ID's own security channel, not here.

## Supported versions

Only the latest minor version receives security fixes pre-1.0. Once the
SDK reaches 1.0, the most recent two minor versions will be supported.

## Disclosure

We'll credit reporters (unless anonymity is requested) in the release
notes once a fix ships.
