import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import TodayScreen from '../screens/TodayScreen';
import SessionScreen from '../screens/SessionScreen';
import ExerciseHubScreen from '../screens/ExerciseHubScreen';
import MewingSettingsScreen from '../screens/MewingSettingsScreen';
import ChewingTimerScreen from '../screens/ChewingTimerScreen';
import CyclingExerciseScreen from '../screens/CyclingExerciseScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function TodayStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="TodayMain" component={TodayScreen} />
      <Stack.Screen 
        name="Session" 
        component={SessionScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTransparent: true,
          headerStyle: {
            backgroundColor: 'transparent',
            borderBottomWidth: 0,
            borderBottomColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 0 },
          },
          headerTintColor: colors.text,
          headerTitle: '',
        }}
      />
      <Stack.Screen 
        name="ExerciseHub" 
        component={ExerciseHubScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: 'Exercises',
          headerBackTitle: 'Today',
        }}
      />
      <Stack.Screen 
        name="MewingSettings" 
        component={MewingSettingsScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: 'Mewing Settings',
          headerBackTitle: 'Exercises',
        }}
      />
      <Stack.Screen 
        name="ChewingTimer" 
        component={ChewingTimerScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: '',
          headerBackTitle: 'Exercises',
        }}
      />
      <Stack.Screen 
        name="CyclingExercise" 
        component={CyclingExerciseScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: '',
          headerBackTitle: 'Exercises',
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: 'Settings',
          headerBackTitle: 'Today',
        }}
      />
    </Stack.Navigator>
  );
}

