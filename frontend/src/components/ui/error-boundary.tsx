import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { ErrorState } from "@/components/ui/states";

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches unexpected render errors in a page subtree and shows a plain,
 * non-technical message instead of a blank screen or raw stack trace.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics in the browser console; never surface them to visitors.
    console.error("Unexpected render error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-3xl px-5 py-24">
          <ErrorState
            message={
              this.props.label ??
              "Something went wrong while rendering this page. Reload the page or return to the homepage."
            }
          />
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 inline-flex h-9 items-center border border-line-strong px-3.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-paper hover:border-paper"
          >
            Try this section again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
