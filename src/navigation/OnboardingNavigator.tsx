import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import CategoryScreen from '../screens/onboarding/CategoryScreen';
import QuestionsScreen from '../screens/onboarding/QuestionsScreen';
import ProtocolLoadingScreen from '../screens/onboarding/ProtocolLoadingScreen';
import WhatToExpectScreen from '../screens/onboarding/WhatToExpectScreen';
import OnboardingSignUpScreen from '../screens/onboarding/OnboardingSignUpScreen';
import OnboardingSignInScreen from '../screens/onboarding/OnboardingSignInScreen';
import ShoppingScreen from '../screens/onboarding/ShoppingScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  const { user } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const determineInitialRoute = async () => {
      if (!user) {
        // No user - start from Welcome
        setInitialRoute('Welcome');
        setLoading(false);
        return;
      }

      try {
        // Check if user has already completed some onboarding steps
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // If user has concerns but no routineStarted, they should go to Shopping
          if (userData.concerns && userData.concerns.length > 0 && !userData.routineStarted) {
            setInitialRoute('Shopping');
          } else {
            // Otherwise start from Welcome
            setInitialRoute('Welcome');
          }
        } else {
          // User doesn't exist in Firestore yet - start from Welcome
          setInitialRoute('Welcome');
        }
      } catch (error) {
        console.error('Error checking user state:', error);
        // On error, default to Welcome
        setInitialRoute('Welcome');
      } finally {
        setLoading(false);
      }
    };

    determineInitialRoute();
  }, [user]);

  if (loading || !initialRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="Questions" component={QuestionsScreen} />
      <Stack.Screen name="ProtocolLoading" component={ProtocolLoadingScreen} />
      <Stack.Screen name="WhatToExpect" component={WhatToExpectScreen} />
      <Stack.Screen name="OnboardingSignUp" component={OnboardingSignUpScreen} />
      <Stack.Screen name="OnboardingSignIn" component={OnboardingSignInScreen} />
      <Stack.Screen name="Shopping" component={ShoppingScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

