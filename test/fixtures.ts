import type { Session } from "../src/contract";

/** The app's origin in every browser test (vitest.config.ts). */
export const origin = "https://app.brightleaffoods.in";

/** Meera, signed in to Brightleaf Foods, as the app's server reports her. */
export const meera: Session = {
  user: {
    id: "0b9a2c7e-5d41-4f1e-9a3b-6c2d8e7f1a90",
    email: "meera@brightleaffoods.in",
    emailVerified: true,
    name: "Meera Iyer",
    picture: "https://cdn.brightleaffoods.in/people/meera.png",
  },
  organization: { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: "Brightleaf Foods" },
  roles: ["Finance approver"],
  permissions: ["invoice.approve", "invoice.read"],
  expiresAt: "2099-11-05T21:30:00.000Z",
};

/** Arjun, signed in to Brightleaf Foods with no name, picture, roles or permissions. */
export const arjun: Session = {
  user: { id: "7c1e4b2a-9d3f-4e6a-8b5c-1f2e3d4c5b6a", email: "arjun@brightleaffoods.in", emailVerified: false, name: null, picture: null },
  organization: { id: "5f0c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f", name: null },
  roles: [],
  permissions: [],
  expiresAt: "2099-11-05T21:30:00.000Z",
};
