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
import { ErrorBoundary } from './components/ui/ErrorBoundary';

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
    <ErrorBoundary
      resetKey={activeSection}
      heading="Something went wrong displaying this section"
      description="Your locally saved preferences and schedules remain safe. Try reloading this view or returning to the Air Quality Dashboard."
      secondaryLabel="Return to Dashboard"
      onSecondaryAction={() => setActiveSection('dashboard')}
    >
      {renderSection()}
    </ErrorBoundary>
  );
};

const RootRouter: React.FC = () => {
  const { viewMode, openHome } = useApp();

  return (
    <ErrorBoundary
      resetKey={viewMode}
      heading="Something went wrong loading VayuMitra"
      description="Your locally saved settings remain intact. Retry loading or return to the homepage."
      secondaryLabel="Go to Homepage"
      onSecondaryAction={openHome}
    >
      {viewMode === 'home' ? (
        <HomePage />
      ) : viewMode === 'auth' ? (
        <AuthPage />
      ) : (
        <AppShell>
          <ActiveSectionRouter />
        </AppShell>
      )}
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <AppProvider>
      <RootRouter />
    </AppProvider>
  );
}
