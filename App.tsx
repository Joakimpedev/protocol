import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { PremiumProvider } from './src/contexts/PremiumContext';
import { DevModeProvider } from './src/contexts/DevModeContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <PremiumProvider>
        <DevModeProvider>
          <OnboardingProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </OnboardingProvider>
        </DevModeProvider>
      </PremiumProvider>
    </AuthProvider>
  );
}

