/**
 * Every string the components show or announce. Override any of them on
 * `<QeetIDProvider localization={…}>`; `{name}` and `{organization}` are
 * replaced where a string mentions them.
 */
export interface QeetIDLocalization {
  /** `<SignInButton>`'s label. */
  signIn: string;
  /** `<SignUpButton>`'s label. */
  signUp: string;
  /** `<SignOutButton>`'s label, and `<UserButton>`'s sign-out item. */
  signOut: string;
  /** The accessible name of `<UserButton>`'s button; `{name}` is the person's name or email. */
  userButtonLabel: string;
  /** Stands in for a person with neither a name nor an email address. */
  userFallback: string;
  /** The accessible name of `<OrganizationSwitcher>`'s menu. */
  organizationSwitcherLabel: string;
  /** Stands in for an organisation whose name the server didn't send. */
  organizationFallback: string;
  /** Announced on `<OrganizationSwitcher>` while a switch is on its way; `{organization}` is where to. */
  organizationSwitching: string;
  /** Shown when a switch failed. */
  organizationSwitchFailed: string;
}

/** The English strings the components use unless the app overrides them. */
export const defaultLocalization: Readonly<QeetIDLocalization> = Object.freeze({
  signIn: "Sign in",
  signUp: "Sign up",
  signOut: "Sign out",
  userButtonLabel: "Account menu for {name}",
  userFallback: "Your account",
  organizationSwitcherLabel: "Switch organisation",
  organizationFallback: "Organisation",
  organizationSwitching: "Switching to {organization}…",
  organizationSwitchFailed: "Couldn't switch organisation. Try again.",
});

/** `template` with each `{key}` replaced by `values[key]`; unknown keys are left as written. */
export function format(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (Object.hasOwn(values, key) ? (values[key] as string) : match));
}
