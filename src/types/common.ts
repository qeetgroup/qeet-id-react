export interface Branding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/** The hosted-login UI context for a given OAuth client_id, from `GET /v1/oauth/login-context`. */
export interface LoginContext {
  clientName: string;
  tenantId: string;
  providers: string[];
  selfRegistrationEnabled: boolean;
  rememberDeviceEnabled: boolean;
  branding?: Branding;
}

/** CSS-variable overrides applied to prebuilt components. */
export interface AppearanceVariables {
  /** Primary brand color (hex or oklch). */
  colorPrimary?: string;
  /** Background color of the card/modal. */
  colorBackground?: string;
  /** Default text color. */
  colorText?: string;
  /** Muted/secondary text color. */
  colorTextMuted?: string;
  /** Border color. */
  colorBorder?: string;
  /** Border radius applied to cards. */
  borderRadius?: string;
  /** Font family for body text. */
  fontFamily?: string;
}

/** Element-level className overrides for fine-grained styling. */
export interface AppearanceElements {
  card?: string;
  formField?: string;
  formLabel?: string;
  formInput?: string;
  button?: string;
  buttonPrimary?: string;
  buttonSecondary?: string;
  dividerText?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  footerLink?: string;
  socialButton?: string;
  errorMessage?: string;
}

export type AppearanceTheme = "light" | "dark" | "system";

/** Theming/styling overrides accepted by `<QeetIDProvider>` and every embedded component. */
export interface Appearance {
  /** Color scheme preference. Default "system". */
  theme?: AppearanceTheme;
  /** CSS variable overrides (map to --qeetid-* custom properties). */
  variables?: AppearanceVariables;
  /** Per-element className overrides (merged with internal classes). */
  elements?: AppearanceElements;
}
