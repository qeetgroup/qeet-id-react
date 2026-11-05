"use client";

import { type FocusEvent, type KeyboardEvent, type RefObject, useCallback, useEffect, useId, useRef, useState } from "react";

const ITEM_SELECTOR = '[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"]';
/** Keys typed within this long of each other make one type-ahead search. */
const TYPEAHEAD_MS = 500;

/** The props the menu button's parts take. */
export interface MenuButton {
  /** Whether the menu is open. */
  open: boolean;
  /** Closes the menu, sending focus back to the button when `returnFocus` is set. */
  close: (returnFocus: boolean) => void;
  rootProps: {
    ref: RefObject<HTMLDivElement | null>;
    onBlur: (event: FocusEvent<HTMLDivElement>) => void;
    "data-state": "open" | "closed";
  };
  triggerProps: {
    ref: RefObject<HTMLButtonElement | null>;
    id: string;
    type: "button";
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  };
  menuProps: {
    ref: RefObject<HTMLDivElement | null>;
    id: string;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  };
}

/**
 * The WAI-ARIA APG menu button pattern: Enter, Space and Down Arrow open the
 * menu on its first item, Up Arrow on its last; inside it, the arrows move
 * (wrapping), Home and End jump, a typed letter finds the next item starting
 * with it, Escape closes it and returns focus to the button, and Tab closes it
 * and moves on. A pointer press outside, or focus leaving, closes it too.
 *
 * The menu element takes `role="menu"` and `menuProps`; items are any element
 * with a `menuitem` role and `tabIndex={-1}`.
 */
export function useMenuButton(): MenuButton {
  const [open, setOpen] = useState(false);
  const [focusOnOpen, setFocusOnOpen] = useState<"first" | "last">("first");
  const id = useId();
  const triggerId = `${id}-button`;
  const menuId = `${id}-menu`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", at: 0 });

  const items = useCallback(
    (): HTMLElement[] =>
      Array.from(menu.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []).filter(
        (item) => item.getAttribute("aria-disabled") !== "true",
      ),
    [],
  );

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }, []);

  const show = (focus: "first" | "last"): void => {
    setFocusOnOpen(focus);
    setOpen(true);
  };

  // Focus moves into the menu when it opens (APG: authors must move it).
  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusOnOpen === "last" ? list[list.length - 1] : list[0])?.focus();
  }, [open, focusOnOpen, items]);

  // A press anywhere outside closes it, leaving focus where the press put it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (!(event.target instanceof Node) || !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const list = items();
    if (list.length === 0) return;
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number): void => list[(next + list.length) % list.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index < 0 ? -1 : index - 1);
        return;
      case "Home":
        event.preventDefault();
        focusAt(0);
        return;
      case "End":
        event.preventDefault();
        focusAt(-1);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case "Tab":
        setOpen(false);
        return;
      case " ":
        // A link item activates on Space as a button does.
        if (event.target instanceof HTMLAnchorElement) {
          event.preventDefault();
          event.target.click();
        }
        return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const state = typeahead.current;
      state.text = now - state.at > TYPEAHEAD_MS ? event.key.toLocaleLowerCase() : state.text + event.key.toLocaleLowerCase();
      state.at = now;
      const ordered = [...list.slice(index + 1), ...list.slice(0, index + 1)];
      const match =
        ordered.find((item) => label(item).startsWith(state.text)) ??
        (state.text.length > 1 ? undefined : ordered.find((item) => label(item).startsWith(state.text[0] ?? "")));
      match?.focus();
    }
  };

  return {
    open,
    close,
    rootProps: {
      ref: root,
      "data-state": open ? "open" : "closed",
      // Focus moving to another element outside (Shift+Tab, say) closes it. Focus
      // going nowhere doesn't: Safari blurs on a press of a button inside, and the
      // outside-press listener handles presses elsewhere.
      onBlur: (event) => {
        const next = event.relatedTarget;
        if (open && next instanceof Node && !root.current?.contains(next)) setOpen(false);
      },
    },
    triggerProps: {
      ref: trigger,
      id: triggerId,
      type: "button",
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-controls": open ? menuId : undefined,
      onClick: () => (open ? close(false) : show("first")),
      onKeyDown: (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          show("first");
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          show("last");
        }
      },
    },
    menuProps: { ref: menu, id: menuId, onKeyDown: onMenuKeyDown },
  };
}

function label(item: HTMLElement): string {
  return (item.textContent ?? "").trim().toLocaleLowerCase();
}
