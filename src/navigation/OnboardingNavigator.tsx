import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import CategoryScreen from '../screens/onboarding/CategoryScreen';
import QuestionsScreen from '../screens/onboarding/QuestionsScreen';
import OnboardingSignUpScreen from '../screens/onboarding/OnboardingSignUpScreen';
import OnboardingSignInScreen from '../screens/onboarding/OnboardingSignInScreen';
import PlanScreen from '../screens/onboarding/PlanScreen';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="Questions" component={QuestionsScreen} />
      <Stack.Screen name="OnboardingSignUp" component={OnboardingSignUpScreen} />
      <Stack.Screen name="OnboardingSignIn" component={OnboardingSignInScreen} />
      <Stack.Screen name="Plan" component={PlanScreen} />
    </Stack.Navigator>
  );
}

