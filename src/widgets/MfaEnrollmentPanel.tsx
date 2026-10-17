"use client";

import { useState, type CSSProperties } from "react";
import type * as React from "react";

import type { AppearanceElements, MfaEnrollmentStatus } from "../types/index.js";

export interface MfaEnrollmentPanelProps {
  status: MfaEnrollmentStatus;
  elements: AppearanceElements;
  vars: Record<string, string>;
  onStart(): Promise<void>;
  onConfirm(code: string): Promise<void>;
  onSkip(): Promise<void>;
  onFinish(): void;
}

/**
 * The setup of an authenticator app inside `<SignIn/>` and `<SignUp/>`, for an
 * organisation that requires a second factor: start the app, enter its key
 * (or open the otpauth:// link on a phone), confirm with a code, then save the
 * recovery codes shown once. While the grace period runs it can be skipped.
 */
export function MfaEnrollmentPanel({ status, elements: el, vars, onStart, onConfirm, onSkip, onFinish }: MfaEnrollmentPanelProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  if (status.step === "recovery_codes") {
    return (
      <div className={el.card} style={{ ...vars, maxWidth: 400, margin: "0 auto" }}>
        <h2 className={el.headerTitle} style={{ marginBottom: 4 }}>
          Save your recovery codes
        </h2>
        <p className={el.headerSubtitle} style={subtitleStyle}>
          Each code signs you in once if you lose your authenticator app. They won&apos;t be shown again.
        </p>
        <ul style={codesStyle}>
          {status.codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button type="button" onClick={onFinish} className={el.buttonPrimary ?? el.button} style={primaryButtonStyle}>
          Continue
        </button>
      </div>
    );
  }

  const due = status.dueAt ? new Date(status.dueAt).toLocaleDateString(undefined, { dateStyle: "long" }) : null;

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(() => onConfirm(code.trim()));
  }

  return (
    <div className={el.card} style={{ ...vars, maxWidth: 400, margin: "0 auto" }}>
      <h2 className={el.headerTitle} style={{ marginBottom: 4 }}>
        Set up two-step verification
      </h2>
      <p className={el.headerSubtitle} style={subtitleStyle}>
        {due
          ? `Your organisation requires a second step when you sign in from ${due}. Set it up now, or skip until then.`
          : "Your organisation requires a second step when you sign in. Set up an authenticator app to continue."}
      </p>
      {status.error && (
        <p
          className={el.errorMessage}
          role="alert"
          style={{ color: "var(--qeetid-color-danger, #ef4444)", fontSize: 13, marginBottom: 12 }}
        >
          {status.error}
        </p>
      )}
      {status.enrollment ? (
        <form onSubmit={handleConfirm}>
          <div className={el.formField} style={{ marginBottom: 16 }}>
            <span className={el.formLabel} style={labelStyle}>
              Setup key
            </span>
            <code style={keyStyle}>{status.enrollment.secret}</code>
            <a href={status.enrollment.provisioningUrl} className={el.footerLink} style={{ ...linkStyle, fontSize: 13 }}>
              Open in authenticator app
            </a>
          </div>
          <div className={el.formField} style={{ marginBottom: 16 }}>
            <label className={el.formLabel} style={labelStyle} htmlFor="qeetid-enroll-code">
              Code from the app
            </label>
            <input
              id="qeetid-enroll-code"
              className={el.formInput}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={busy} className={el.buttonPrimary ?? el.button} style={primaryButtonStyle}>
            {busy ? "Verifying…" : "Confirm and continue"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(onStart)}
          className={el.buttonPrimary ?? el.button}
          style={primaryButtonStyle}
        >
          Set up an authenticator app
        </button>
      )}
      {due && (
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          <button type="button" disabled={busy} onClick={() => void run(onSkip)} className={el.footerLink} style={linkStyle}>
            Skip for now
          </button>
        </p>
      )}
    </div>
  );
}

const subtitleStyle: CSSProperties = { marginBottom: 20, color: "var(--qeetid-color-text-muted, #6b7280)", fontSize: 14 };

const labelStyle: CSSProperties = { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 };

const keyStyle: CSSProperties = {
  display: "block",
  padding: "8px 12px",
  marginBottom: 8,
  border: "1px solid var(--qeetid-color-border, #d1d5db)",
  borderRadius: "var(--qeetid-border-radius, 8px)",
  fontSize: 13,
  wordBreak: "break-all",
};

const codesStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  padding: 12,
  margin: "0 0 16px",
  listStyle: "none",
  border: "1px solid var(--qeetid-color-border, #d1d5db)",
  borderRadius: "var(--qeetid-border-radius, 8px)",
  fontFamily: "monospace",
  fontSize: 13,
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--qeetid-color-border, #d1d5db)",
  borderRadius: "var(--qeetid-border-radius, 8px)",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
  background: "transparent",
  color: "inherit",
};

const primaryButtonStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 16px",
  background: "var(--qeetid-color-primary, #F26D0E)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--qeetid-border-radius, 8px)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

const linkStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--qeetid-color-primary, #F26D0E)",
  cursor: "pointer",
  fontSize: "inherit",
  padding: 0,
  textDecoration: "underline",
};
