import React from 'react';
import { BrandLoader } from './components/BrandLoader';
import { DashboardScreen } from './screens/DashboardScreen';
import { LoginScreen } from './screens/LoginScreen';

export interface AppProps {
  initializing?: boolean;
  authenticated?: boolean;
}

export default function App({ initializing = false, authenticated = false }: AppProps) {
  if (initializing) {
    return <BrandLoader />;
  }
  if (!authenticated) {
    return <LoginScreen />;
  }
  return (
    <DashboardScreen
      assignedCount={0}
      pendingSyncCount={0}
      isOnline
      onNavigate={() => undefined}
    />
  );
}
