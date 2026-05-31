import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global React Error Boundary — prevents white-screen-of-death by catching
 * any uncaught rendering exceptions and displaying a graceful recovery UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100dvh',
            width: '100vw',
            backgroundColor: '#F8F9FA',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 8px 24px rgba(255,59,48,0.25)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#1D1D1F',
              marginBottom: 8,
              letterSpacing: '-0.3px',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: 14,
              color: '#8E8E93',
              fontWeight: 600,
              maxWidth: 360,
              lineHeight: '1.5',
              marginBottom: 32,
            }}
          >
            Lumi Note encountered an unexpected error. Your notes are safe — try
            reloading the page.
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 28px',
                backgroundColor: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,122,255,0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 28px',
                backgroundColor: '#F2F2F7',
                color: '#1D1D1F',
                border: 'none',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Try Again
            </button>
          </div>

          {/* Error detail for debugging (collapsed) */}
          {this.state.error && (
            <details
              style={{
                marginTop: 32,
                maxWidth: 500,
                width: '100%',
                textAlign: 'left',
              }}
            >
              <summary
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#8E8E93',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Error Details
              </summary>
              <pre
                style={{
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: '#ECECEC',
                  borderRadius: 10,
                  fontSize: 11,
                  color: '#555',
                  overflow: 'auto',
                  maxHeight: 200,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
