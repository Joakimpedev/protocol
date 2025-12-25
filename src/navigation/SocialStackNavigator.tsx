import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import FriendsListScreen from '../screens/FriendsListScreen';
import AddFriendScreen from '../screens/AddFriendScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PublicStatsScreen from '../screens/PublicStatsScreen';

const Stack = createNativeStackNavigator();

export default function SocialStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: 'System',
          fontSize: 18,
          fontWeight: '600',
        },
        contentStyle: { backgroundColor: colors.background },
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
    </Stack.Navigator>
  );
}


