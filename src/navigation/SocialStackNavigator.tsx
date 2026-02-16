import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import FriendsListScreen from '../screens/FriendsListScreen';
import AddFriendScreen from '../screens/AddFriendScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PublicStatsScreen from '../screens/PublicStatsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import FAQScreen from '../screens/FAQScreen';
import TermsOfUseScreen from '../screens/TermsOfUseScreen';

const Stack = createNativeStackNavigator();

export default function SocialStackNavigator() {
  const theme = useTheme();

  const headerStyle = {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle,
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontFamily: theme.typography.body.fontFamily,
          fontSize: 18,
          fontWeight: '600' as const,
        },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="FriendsList"
        component={FriendsListScreen}
        options={{
          title: 'Social',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddFriend"
        component={AddFriendScreen}
        options={{
          title: 'Add Friend',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="PublicStats"
        component={PublicStatsScreen}
        options={{
          title: 'Public Stats',
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="FAQ"
        component={FAQScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
    </Stack.Navigator>
  );
}
