import type { SessionErrorCode, SignInErrorCode } from "./contract";

/**
 * Why something failed: a `SessionErrorCode` the server answered with, a
 * `SignInErrorCode` the callback reported, `http_<status>` when an answer
 * carried no code (`http_404`: the route isn't mounted), `invalid_response`
 * when an answer wasn't the contract's JSON, or `network_error` when no answer
 * came. A newer server may add codes.
 */
export type QeetIDErrorCode = SessionErrorCode | SignInErrorCode | "invalid_response" | "network_error" | `http_${number}` | (string & {});

/** Options of `new QeetIDError`. */
export interface QeetIDErrorOptions {
  /** A stable, machine-readable code. */
  code: QeetIDErrorCode;
  /** The HTTP status of the answer, when one came. */
  status?: number | undefined;
  /** The underlying failure, such as a `TypeError` from `fetch`. */
  cause?: unknown;
}

/**
 * The one error this SDK throws and reports. Branch on `code`, never on
 * `message`, which is for developers. It never carries a token: the browser
 * holds none.
 */
export class QeetIDError extends Error {
  /** A stable, machine-readable code. */
  readonly code: QeetIDErrorCode;
  /** The HTTP status of the answer, when one came. */
  readonly status: number | undefined;

  constructor(message: string, options: QeetIDErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.code = options.code;
    this.status = options.status;
  }
}
Object.defineProperty(QeetIDError.prototype, "name", { value: "QeetIDError", enumerable: false, writable: true, configurable: true });
