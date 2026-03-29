import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "oklch(0.12 0.025 260)",
            color: "oklch(0.97 0.005 255)",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "oklch(0.15 0.03 258)",
              border: "1px solid oklch(0.28 0.04 260)",
              borderRadius: "1rem",
              padding: "2rem",
              maxWidth: "480px",
            }}
          >
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1.25rem" }}>
              Something went wrong
            </h2>
            <p
              style={{
                color: "oklch(0.65 0.02 255)",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
              }}
            >
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.6 0.2 262), oklch(0.55 0.24 290))",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.625rem 1.5rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "600",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
