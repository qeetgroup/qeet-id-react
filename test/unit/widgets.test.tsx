import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QeetIDProvider } from "../../src/client/provider.js";
import { SignIn } from "../../src/widgets/SignIn.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("<SignIn/> when the organisation requires a second factor", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    document.cookie = "qe_csrf=tok_csrf_seeded";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "qe_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  });

  function signIn() {
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  }

  it("sets up an authenticator app, shows the recovery codes once, then signs in", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { mfa_required: true, mfa_token: "tok_e", methods: ["totp"], enrollment_required: true }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { secret: "JBSWY3DP", provisioning_url: "otpauth://totp/x?secret=JBSWY3DP" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user_id: "u1", recovery_codes: ["aaaa-bbbb"] }));
    const onSuccess = vi.fn();

    render(
      <QeetIDProvider apiUrl="https://api.id.qeet.in">
        <SignIn onSuccess={onSuccess} />
      </QeetIDProvider>,
    );
    signIn();
    await screen.findByRole("heading", { name: "Set up two-step verification" });
    expect(screen.queryByRole("button", { name: "Skip for now" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Set up an authenticator app" }));
    await screen.findByText("JBSWY3DP");
    expect(screen.getByRole("link", { name: "Open in authenticator app" }).getAttribute("href")).toBe("otpauth://totp/x?secret=JBSWY3DP");

    fireEvent.change(screen.getByLabelText("Code from the app"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await screen.findByRole("heading", { name: "Save your recovery codes" });
    expect(screen.getByText("aaaa-bbbb")).not.toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("offers to skip during the grace period", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        mfa_required: true,
        mfa_token: "tok_g",
        methods: ["totp"],
        enrollment_required: true,
        enrollment_due_at: "2026-11-01T00:00:00Z",
      }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user_id: "u1" }));
    const onSuccess = vi.fn();

    render(
      <QeetIDProvider apiUrl="https://api.id.qeet.in">
        <SignIn onSuccess={onSuccess} />
      </QeetIDProvider>,
    );
    signIn();
    fireEvent.click(await screen.findByRole("button", { name: "Skip for now" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
