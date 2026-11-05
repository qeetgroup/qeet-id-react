import type { Session, SessionOrganization, SessionUser } from "../contract";

/** What `createTestSession` takes: any part of a session to change. */
export interface TestSessionOverrides {
  user?: Partial<SessionUser>;
  organization?: Partial<SessionOrganization> | null;
  roles?: readonly string[];
  permissions?: readonly string[];
  expiresAt?: string;
}

/**
 * A realistic session for tests: Meera Iyer, signed in to Brightleaf Foods as
 * a finance approver, until 2099. Pass any part to change it.
 *
 * ```ts
 * createTestSession({ user: { name: null }, permissions: [] });
 * ```
 */
export function createTestSession(overrides: TestSessionOverrides = {}): Session {
  const organization =
    overrides.organization === null
      ? null
      : { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: "Brightleaf Foods", ...overrides.organization };
  return {
    user: {
      id: "0b9a2c7e-5d41-4f1e-9a3b-6c2d8e7f1a90",
      email: "meera@brightleaffoods.in",
      emailVerified: true,
      name: "Meera Iyer",
      picture: null,
      ...overrides.user,
    },
    organization,
    roles: overrides.roles ?? ["Finance approver"],
    permissions: overrides.permissions ?? ["invoice.approve", "invoice.read"],
    expiresAt: overrides.expiresAt ?? "2099-01-01T00:00:00.000Z",
  };
}
