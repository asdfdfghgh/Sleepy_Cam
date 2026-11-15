import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useAppContext } from './hooks/useAppContext';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { CameraSetupPage } from './pages/CameraSetupPage';
import { QuickAssessmentPage } from './pages/QuickAssessmentPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { SessionHistoryPage } from './pages/SessionHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

const ActiveRouteView: React.FC = () => {
  const { route } = useAppContext();

  const renderPage = () => {
    switch (route) {
      case 'home':
        return <HomePage />;
      case 'setup':
        return <CameraSetupPage />;
      case 'assessment':
        return <QuickAssessmentPage />;
      case 'monitoring':
        return <LiveMonitoringPage />;
      case 'history':
        return <SessionHistoryPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={route}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell>
        <ActiveRouteView />
      </AppShell>
    </AppProvider>
  );
}
