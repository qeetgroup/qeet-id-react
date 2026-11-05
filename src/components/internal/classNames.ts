/** Joins the class names that are set. */
export function cx(...names: Array<string | false | null | undefined>): string | undefined {
  const joined = names.filter(Boolean).join(" ");
  return joined === "" ? undefined : joined;
}

/** What a composite component takes to style its parts. */
export interface StylingProps<Part extends string> {
  /** Added to the root element. */
  className?: string;
  /** Added to each named part, after the SDK's own class. */
  classNames?: Partial<Record<Part, string>>;
  /** Leaves out the SDK's own `qeet-id-*` classes, so `@qeet-id/react/styles.css` doesn't apply. */
  unstyled?: boolean;
}

/**
 * A function giving each part its class: the SDK's BEM class
 * (`qeet-id-user-button__trigger`) unless unstyled, then the app's.
 */
export function partClasses<Part extends string>(block: string, props: StylingProps<Part>): (part: Part | "root") => string | undefined {
  return (part) =>
    cx(
      !props.unstyled && (part === "root" ? block : `${block}__${part.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`),
      part === "root" ? props.className : props.classNames?.[part as Part],
    );
}
