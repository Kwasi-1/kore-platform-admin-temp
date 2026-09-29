import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center p-6">
          <div className="bg-card border border-destructive/30 max-w-md rounded-2xl p-6 shadow-xl flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
              <p className="text-xs text-muted-foreground">
                An unexpected UI rendering error occurred. Refreshing the view usually resolves this.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="w-full bg-muted/60 p-3 rounded-lg text-left overflow-x-auto text-[11px] font-mono text-destructive">
                {this.state.error.message}
              </div>
            )}
            <Button onClick={this.handleReset} size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
