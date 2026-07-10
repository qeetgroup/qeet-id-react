"use client";

import type { CSSProperties } from "react";
import { useSession } from "../../hooks/authentication/useSession.js";
import { describeSession } from "../../utils/session.js";

export interface SessionStatusProps {
  className?: string;
}

/**
 * Lists the current user's active sessions with a revoke action on each —
 * a drop-in "manage your devices" panel. Requires `apiUrl` on
 * `<QeetIDProvider>` (embedded mode).
 *
 *   <SessionStatus />
 */
export function SessionStatus({ className }: SessionStatusProps) {
  const { isLoaded, sessions, revoke } = useSession();

  if (!isLoaded) return null;
  if (sessions.length === 0) {
    return (
      <p className={className} style={emptyStyle}>
        No active sessions.
      </p>
    );
  }

  return (
    <ul className={className} style={listStyle}>
      {sessions.map((session) => (
        <li key={session.id} style={itemStyle}>
          <span>
            {describeSession(session)}
            {session.current && <em style={currentStyle}> (this device)</em>}
          </span>
          {!session.current && (
            <button type="button" onClick={() => revoke(session.id)} style={revokeStyle}>
              Revoke
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

const listStyle: CSSProperties = { listStyle: "none", margin: 0, padding: 0, fontSize: 14 };
const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid var(--qeetid-color-border, #e5e7eb)",
};
const currentStyle: CSSProperties = { color: "var(--qeetid-color-text-muted, #6b7280)" };
const revokeStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--qeetid-color-primary, #F26D0E)",
  cursor: "pointer",
  fontSize: "inherit",
  padding: 0,
  textDecoration: "underline",
};
const emptyStyle: CSSProperties = { color: "var(--qeetid-color-text-muted, #6b7280)", fontSize: 14 };
