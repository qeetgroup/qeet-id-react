"use client";

import { Component, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Rendered when a descendant throws during render. Either a fixed node,
   * or a function receiving the caught error. Defaults to a generic message.
   */
  fallback?: ReactNode | ((error: Error) => ReactNode);
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * A standard React error boundary — must be class-based, since hooks can't
 * implement `getDerivedStateFromError`/`componentDidCatch`. Wrap any subtree
 * that renders this SDK's components to contain unexpected render errors.
 *
 *   <ErrorBoundary fallback={(error) => <p>{error.message}</p>}>
 *     <UserProfile />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback(error);
      if (fallback !== undefined) return fallback;
      return <p>Something went wrong.</p>;
    }
    return this.props.children;
  }
}
