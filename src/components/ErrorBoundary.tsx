import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected operational error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as {
          error?: string;
          operationType?: string;
          path?: string;
        };
        if (parsed && parsed.error) {
          friendly = `${parsed.operationType?.toUpperCase() || 'SYNC'} failed on ${parsed.path || 'workspace'}: ${parsed.error}`;
        }
      } catch {
        // Plain error string
      }

      return (
        <div className="min-h-screen bg-[#F5F7F3] flex items-center justify-center p-6">
          <div className="modal-surface rounded-2xl max-w-lg w-full p-8">
            <div className="flex items-center gap-3 text-[#732B1A] mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#E9A18D]/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#C24C2C]" />
              </div>
              <div>
                <h1 className="font-display text-lg font-semibold text-[#17211E]">
                  Workspace Interrupted
                </h1>
                <p className="text-xs text-[#7C8982]">
                  Kinetic Ledger caught an operational exception.
                </p>
              </div>
            </div>
            <p className="text-sm text-[#434846] bg-[#F5F7F3] border border-[#E2E8E4] rounded-lg p-3 font-mono break-words mb-6">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#14211D] text-white text-sm font-semibold hover:bg-[#23332D] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
