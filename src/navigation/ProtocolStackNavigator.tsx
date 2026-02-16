import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import ProtocolScreen from '../screens/ProtocolScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import FAQScreen from '../screens/FAQScreen';
import TermsOfUseScreen from '../screens/TermsOfUseScreen';

const Stack = createNativeStackNavigator();

export default function ProtocolStackNavigator() {
  const theme = useTheme();

  const headerStyle = {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="ProtocolMain" component={ProtocolScreen} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: 'Settings',
          headerBackTitle: 'Protocol',
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="FAQ"
        component={FAQScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
    </Stack.Navigator>
  );
}
