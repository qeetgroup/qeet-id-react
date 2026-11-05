import {
  type ButtonHTMLAttributes,
  cloneElement,
  Fragment,
  isValidElement,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { warnOnce } from "../../core/development";
import { cx } from "./classNames";

/** The props every trigger button takes: a `<button>`'s, and its content or the app's own element. */
export interface TriggerButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /**
   * The button's label, or the app's own button as the **single child
   * element**, which receives the click handler instead of a `<button>` being
   * rendered: `<SignInButton><Button variant="primary">Sign in</Button></SignInButton>`.
   */
  children?: ReactNode;
}

interface TriggerProps extends TriggerButtonProps {
  /** The component's name, for warnings. */
  component: string;
  /** The label when there are no children. */
  label: string;
  /** Called on a click nobody prevented. */
  onActivate: () => void;
  /** Whether the action is waiting for the server. */
  busy?: boolean;
}

/**
 * A `<button type="button">`, or the app's single child element with the
 * button's props merged in: its own handlers run first, and calling
 * `event.preventDefault()` in one stops the action.
 */
export function Trigger({ component, label, onActivate, busy = false, children, ...buttonProps }: TriggerProps): ReactElement {
  const activate = (event: MouseEvent<HTMLElement>): void => {
    if (!event.defaultPrevented) onActivate();
  };
  const state = busy ? { "aria-busy": true, "data-pending": "" } : {};

  if (isValidElement<Record<string, unknown>>(children) && children.type !== Fragment) {
    if (typeof children.type === "string" && children.type !== "button") {
      warnOnce(
        `<${component}> got a <${children.type}> as its child. Give it a <button>, or a component that renders one, so keyboards and screen readers can use it.`,
      );
    }
    return cloneElement(children, { ...merge(buttonProps as Record<string, unknown>, children.props, activate), ...state });
  }

  return (
    <button
      type="button"
      {...buttonProps}
      {...state}
      onClick={(event) => {
        buttonProps.onClick?.(event);
        activate(event);
      }}
    >
      {children ?? label}
    </button>
  );
}

/** The trigger's props merged into the child's: handlers chained (the child's first), classes joined, the child's other props kept. */
function merge(
  outer: Record<string, unknown>,
  inner: Record<string, unknown>,
  activate: (event: MouseEvent<HTMLElement>) => void,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...outer, ...inner };
  for (const [key, value] of Object.entries(outer)) {
    const own = inner[key];
    if (/^on[A-Z]/.test(key) && typeof value === "function" && typeof own === "function") {
      merged[key] = (...args: unknown[]) => {
        own(...args);
        value(...args);
      };
    }
  }
  merged.className = cx(outer.className as string | undefined, inner.className as string | undefined);
  const outerClick = outer.onClick as ((event: MouseEvent<HTMLElement>) => void) | undefined;
  const innerClick = inner.onClick as ((event: MouseEvent<HTMLElement>) => void) | undefined;
  merged.onClick = (event: MouseEvent<HTMLElement>) => {
    innerClick?.(event);
    outerClick?.(event);
    activate(event);
  };
  return merged;
}
