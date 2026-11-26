import React from 'react';
import { BrandLoader } from './components/BrandLoader';
import { LoginScreen } from './screens/LoginScreen';

export interface AppProps {
  initializing?: boolean;
}

export default function App({ initializing = false }: AppProps) {
  if (initializing) {
    return <BrandLoader />;
  }
  return <LoginScreen />;
}
