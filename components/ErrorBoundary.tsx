'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown inside the boundary when a render error is caught. */
  fallback?: ReactNode;
  /** Optional label for the section, used in the default fallback. */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/**
 * React error boundary. Catches render errors inside league sections so that
 * one broken section does not crash the entire scores view.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  override componentDidCatch(err: Error, info: { componentStack: string }) {
    // Log to console (structured output in server context, browser console on client)
    console.error('[ErrorBoundary]', {
      error: err.message,
      stack: err.stack,
      componentStack: info.componentStack,
    });
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="px-4 py-3 mx-4 mb-4 rounded-xl bg-surface-50 border border-surface-200">
          <p className="text-xs font-semibold text-gray-400">
            {this.props.label ? `${this.props.label} — ` : ''}
            Something went wrong
          </p>
          <button
            className="text-xs text-accent mt-1 hover:underline"
            onClick={() => this.setState({ hasError: false, message: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
