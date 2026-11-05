"use client";

import { type Context, createContext, useContext } from "react";
import type { SessionStore } from "../core/store";
import type { QeetIDLocalization } from "./localization";

/** What the provider shares. Its identity changes only when the store or the strings do. */
export interface QeetIDContextValue {
  readonly store: SessionStore;
  readonly localization: Readonly<QeetIDLocalization>;
}

const registryKey = Symbol.for("@qeet-id/react:context");

/**
 * One context per React copy, shared by this package's ES module and CommonJS
 * builds: when an app loads both, a provider from one still reaches hooks
 * from the other.
 */
function sharedContext(): Context<QeetIDContextValue | null> {
  const global = globalThis as typeof globalThis & { [registryKey]?: Map<unknown, Context<QeetIDContextValue | null>> };
  global[registryKey] ??= new Map();
  const registry = global[registryKey];
  let context = registry.get(createContext);
  if (context === undefined) {
    context = createContext<QeetIDContextValue | null>(null);
    context.displayName = "QeetID";
    registry.set(createContext, context);
  }
  return context;
}

/** Holds the provider's value. Internal: read it through the hooks. */
export const QeetIDContext: Context<QeetIDContextValue | null> = sharedContext();

/**
 * The provider's value. `caller` names the hook or component in the error
 * thrown without a provider.
 */
export function useQeetIDContext(caller: string): QeetIDContextValue {
  const value = useContext(QeetIDContext);
  if (value === null) {
    throw new Error(
      `${caller} must be used inside <QeetIDProvider>. Wrap the app (or, in tests, the component) in <QeetIDProvider> or <QeetIDTestProvider> from "@qeet-id/react/testing".`,
    );
  }
  return value;
}
