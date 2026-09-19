import React from 'react';
import { AppProviders } from 'app/providers/AppProviders';
import { TabNavigator } from 'widgets/tab-navigation';

export function App() {
  return (
    <AppProviders>
      <TabNavigator />
    </AppProviders>
  );
}
