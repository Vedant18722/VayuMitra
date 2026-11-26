import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './components/pages/HomePage';
import { AuthPage } from './components/pages/AuthPage';
import { DashboardSection } from './components/sections/DashboardSection';
import { AdvancedIntelligenceSection } from './components/sections/AdvancedIntelligenceSection';
import { AssistantSection } from './components/sections/AssistantSection';
import { DailyPlannerSection } from './components/sections/DailyPlannerSection';
import { IndoorGuideSection } from './components/sections/IndoorGuideSection';
import { GreenTravelSection } from './components/sections/GreenTravelSection';
import { ImpactCalculatorSection } from './components/sections/ImpactCalculatorSection';
import { CommunityInsightsSection } from './components/sections/CommunityInsightsSection';
import { SettingsSection } from './components/sections/SettingsSection';

interface ErrorBoundaryProps {
  resetKey: string;
  onReturnDashboard: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
      return (
        <section
          role="alert"
          className="bg-white dark:bg-[#131E1A] border border-red-300 dark:border-red-900 rounded-lg p-6 space-y-4 max-w-xl"
        >
          <h1 className="text-lg font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Something went wrong displaying this section
          </h1>
          <p className="text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Your locally saved preferences and schedules remain safe. Try reloading this view or returning to the Air Quality Dashboard.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-medium min-h-[40px]"
            >
              Retry Section
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReturnDashboard();
              }}
              className="px-4 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] min-h-[40px]"
            >
              Return to Dashboard
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

const ActiveSectionRouter: React.FC = () => {
  const { activeSection, setActiveSection } = useApp();

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />;
      case 'intelligence':
        return <AdvancedIntelligenceSection />;
      case 'assistant':
        return <AssistantSection />;
      case 'planner':
        return <DailyPlannerSection />;
      case 'indoor':
        return <IndoorGuideSection />;
      case 'travel':
        return <GreenTravelSection />;
      case 'impact':
        return <ImpactCalculatorSection />;
      case 'community':
        return <CommunityInsightsSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <SectionErrorBoundary
      resetKey={activeSection}
      onReturnDashboard={() => setActiveSection('dashboard')}
    >
      {renderSection()}
    </SectionErrorBoundary>
  );
};

const RootRouter: React.FC = () => {
  const { viewMode } = useApp();

  if (viewMode === 'home') {
    return <HomePage />;
  }
  if (viewMode === 'auth') {
    return <AuthPage />;
  }
  return (
    <AppShell>
      <ActiveSectionRouter />
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <RootRouter />
    </AppProvider>
  );
}
