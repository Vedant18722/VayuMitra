import React from 'react';

export interface ErrorBoundaryProps {
  resetKey?: string;
  heading?: string;
  description?: string;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Reusable accessible React error boundary that isolates render errors
 * without risking locally persisted user preferences or schedules.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      const {
        heading = 'Something went wrong displaying this view',
        description = 'Your locally saved preferences and schedules remain safe. Try reloading this view or returning to the main screen.',
        secondaryLabel,
        onSecondaryAction,
      } = this.props;

      return (
        <section
          role="alert"
          className="bg-white dark:bg-[#131E1A] border border-red-300 dark:border-red-900 rounded-lg p-6 space-y-4 max-w-xl mx-auto my-6"
        >
          <h1 className="text-lg font-semibold text-[#16211D] dark:text-[#EDF3F0]">{heading}</h1>
          <p className="text-sm text-[#4E5E58] dark:text-[#9BB0A7]">{description}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-medium min-h-[40px]"
            >
              Retry View
            </button>
            {secondaryLabel && onSecondaryAction && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  onSecondaryAction();
                }}
                className="px-4 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] min-h-[40px]"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
