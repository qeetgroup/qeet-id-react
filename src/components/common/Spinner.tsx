"use client";

import { useId, type CSSProperties } from "react";

export interface SpinnerProps {
  /** Diameter in pixels. Default 16. */
  size?: number;
  className?: string;
}

// Scoped keyframes + animation binding for this instance only, so multiple
// spinners on a page don't collide (mirrors qeet-button.tsx's scopedCss/useId
// pattern, kept to just a rotating border here).
function scopedCss(cls: string): string {
  return `@keyframes ${cls}-spin{to{transform:rotate(360deg)}}.${cls}{animation:${cls}-spin .6s linear infinite}`;
}

/**
 * A small inline spinning-circle animation. Pure presentational — no auth
 * logic — for use anywhere a loading state needs a visual affordance.
 *
 *   <Spinner size={20} />
 */
export function Spinner({ size = 16, className }: SpinnerProps) {
  const cls = `qspin-${useId().replace(/:/g, "")}`;
  const style: CSSProperties = {
    display: "inline-block",
    width: size,
    height: size,
    boxSizing: "border-box",
    border: "2px solid var(--qeetid-color-border, #e5e7eb)",
    borderTopColor: "var(--qeetid-color-primary, #F26D0E)",
    borderRadius: "50%",
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scopedCss(cls) }} />
      <span className={[cls, className].filter(Boolean).join(" ")} style={style} role="status" aria-label="Loading" />
    </>
  );
}
