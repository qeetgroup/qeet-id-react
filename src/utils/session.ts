import type { Session } from "../types/session.js";

/** A short, human-readable label for a session list row (e.g. in `<SessionStatus/>`), from whatever descriptive fields the backend included. */
export function describeSession(session: Session): string {
  const device = typeof session["device"] === "string" ? session["device"] : undefined;
  const ip = typeof session["ip"] === "string" ? session["ip"] : undefined;
  const parts = [device, ip].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : session.id;
}
