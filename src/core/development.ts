/**
 * Whether the app runs a development build. Bundlers replace
 * `process.env.NODE_ENV`, as they must for React itself; where nothing does and
 * `process` doesn't exist, this is a production build.
 */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

const warned = new Set<string>();

/** Warns once per message, in development builds only. */
export function warnOnce(message: string): void {
  if (!isDevelopment() || warned.has(message)) return;
  warned.add(message);
  console.warn(`[@qeet-id/react] ${message}`);
}
