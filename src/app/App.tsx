import React from 'react';
import { AppProviders } from 'app/providers/AppProviders';
import { RootNavigator } from 'app/navigation/RootNavigator';

export function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
