import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { PremiumProvider } from './src/contexts/PremiumContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <PremiumProvider>
        <OnboardingProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </OnboardingProvider>
      </PremiumProvider>
    </AuthProvider>
  );
}

