import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-wide safety net for runtime exceptions in any descendant component.
 * Without this, a single throw inside (say) a malformed scene render would
 * white-screen the entire app — leaving the user with no way back. Here we
 * surface a calm error card with a "Reload" and a "Back to Library" exit so
 * the user can always recover. Error details are logged for debugging.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background dark px-4 py-12">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-semibold">
              Something broke mid-scene.
            </h1>
            <p className="text-sm text-muted-foreground">
              We've logged the issue. You can reload the page or jump back to
              your library and try again.
            </p>
            {import.meta.env.DEV && (
              <pre className="mt-3 text-[11px] text-left whitespace-pre-wrap break-words text-red-300/80 bg-black/30 p-3 rounded-md max-h-40 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-white/20"
            >
              Reload page
            </Button>
            <Link href="/library">
              <Button
                onClick={this.handleReset}
                className="bg-primary text-primary-foreground hover:bg-[var(--jtb-accent-hi)]"
              >
                Back to library
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
