"use client";

import { type ReactElement, useEffect, useRef, useState } from "react";
import { PersonIcon } from "./icons";

/** Props of the internal avatar. */
export interface AvatarProps {
  /** A picture URL; only `https:` and `http:` URLs are shown. */
  src?: string | null | undefined;
  /** The name the initials come from. */
  name?: string | null | undefined;
  /** Where the initial comes from when there is no name, such as an email address. */
  fallback?: string | null | undefined;
  className?: string | undefined;
  imageClassName?: string | undefined;
  initialsClassName?: string | undefined;
}

/**
 * A picture, or initials when there is none or it fails to load, or a person
 * icon when there are no initials either. Decorative (`aria-hidden`): the
 * control it sits in carries the name.
 */
export function Avatar({ src, name, fallback, className, imageClassName, initialsClassName }: AvatarProps): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const picture = isPictureUrl(src) && failedSrc !== src ? src : null;

  // An image that failed before hydration fired its error event before React listened.
  useEffect(() => {
    const element = image.current;
    if (picture !== null && element?.complete && element.naturalWidth === 0 && element.currentSrc !== "") {
      setFailedSrc(picture);
    }
  }, [picture]);

  const initials = initialsOf(name, fallback);
  return (
    <span className={className} aria-hidden="true">
      {picture !== null ? (
        <img
          ref={image}
          className={imageClassName}
          src={picture}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(picture)}
        />
      ) : initials !== "" ? (
        <span className={initialsClassName}>{initials}</span>
      ) : (
        <PersonIcon className={initialsClassName} />
      )}
    </span>
  );
}

/** Up to two initials: the first letters of the first and last words of `name`, else the first letter of `fallback`. */
export function initialsOf(name: string | null | undefined, fallback?: string | null | undefined): string {
  const words = (name ?? "")
    .trim()
    .split(/\s+/u)
    .filter((word) => word !== "");
  const first = words[0];
  if (first !== undefined) {
    const last = words.length > 1 ? words[words.length - 1] : undefined;
    return `${firstLetter(first)}${last === undefined ? "" : firstLetter(last)}`.toLocaleUpperCase();
  }
  const other = (fallback ?? "").trim();
  return other === "" ? "" : firstLetter(other).toLocaleUpperCase();
}

function firstLetter(word: string): string {
  // Whole user-perceived characters where the browser can segment them, so "Ñ" or "இ" stays whole.
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segment = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(word)[Symbol.iterator]().next();
    if (!segment.done) return segment.value.segment;
  }
  return Array.from(word)[0] ?? "";
}

function isPictureUrl(value: string | null | undefined): value is string {
  if (typeof value !== "string" || value === "") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
