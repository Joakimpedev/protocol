import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from '../constants/theme';
import TodayStackNavigator from './TodayStackNavigator';
import ProtocolStackNavigator from './ProtocolStackNavigator';
import ProgressStackNavigator from './ProgressStackNavigator';
import SocialStackNavigator from './SocialStackNavigator';

// Wrapper component that resets stack when tab loses focus
function TodayStackWithReset() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const wasFocused = useRef(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (wasFocused.current && !isFocused) {
      // Tab lost focus - reset to initial screen after a brief delay
      // Clear any pending reset
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        const state = navigation.getState();
        const todayState = state.routes.find(r => r.name === 'Today')?.state;
        // Only reset if we're not already on the main screen
        if (todayState && todayState.index !== undefined && todayState.index > 0) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'TodayMain' as never }],
          });
        }
      }, 100);
    }
    wasFocused.current = isFocused;
    
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [isFocused]); // Removed navigation from dependencies

  return <TodayStackNavigator />;
}

function ProtocolStackWithReset() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const wasFocused = useRef(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (wasFocused.current && !isFocused) {
      // Tab lost focus - reset to initial screen after a brief delay
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        const state = navigation.getState();
        const protocolState = state.routes.find(r => r.name === 'Protocol')?.state;
        if (protocolState && protocolState.index !== undefined && protocolState.index > 0) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'ProtocolMain' as never }],
          });
        }
      }, 100);
    }
    wasFocused.current = isFocused;
    
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [isFocused]);

  return <ProtocolStackNavigator />;
}

function ProgressStackWithReset() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const wasFocused = useRef(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (wasFocused.current && !isFocused) {
      // Tab lost focus - reset to initial screen after a brief delay
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        const state = navigation.getState();
        const progressState = state.routes.find(r => r.name === 'Progress')?.state;
        if (progressState && progressState.index !== undefined && progressState.index > 0) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'ProgressMain' as never }],
          });
        }
      }, 100);
    }
    wasFocused.current = isFocused;
    
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [isFocused]);

  return <ProgressStackNavigator />;
}

function SocialStackWithReset() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const wasFocused = useRef(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (wasFocused.current && !isFocused) {
      // Tab lost focus - reset to initial screen after a brief delay
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        const state = navigation.getState();
        const socialState = state.routes.find(r => r.name === 'Social')?.state;
        if (socialState && socialState.index !== undefined && socialState.index > 0) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'FriendsList' as never }],
          });
        }
      }, 100);
    }
    wasFocused.current = isFocused;
    
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [isFocused]);

  return <SocialStackNavigator />;
}

const Tab = createBottomTabNavigator();

// Custom tab bar button that makes the full height tappable
function CustomTabBarButton(props: any) {
  const { children, onPress, style, ...otherProps } = props;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[customTabBarButtonStyles.button, style]}
      {...otherProps}
    >
      {children}
    </TouchableOpacity>
  );
}

const customTabBarButtonStyles = StyleSheet.create({
  button: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function AppNavigator() {
  return (
    <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            ...typography.headingSmall,
          },
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 30,
            paddingBottom: 30,
            height: 102,
          },
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 0,
            height: '100%',
          },
          tabBarButton: (props: any) => <CustomTabBarButton {...props} />,
          tabBarLabelStyle: {
            ...typography.label,
            fontSize: 11,
            marginTop: 4,
            marginBottom: 0,
            textAlign: 'center',
          },
          tabBarLabelPosition: 'below-icon',
        }}
      >
        <Tab.Screen 
          name="Today" 
          component={TodayStackWithReset}
          options={{
            title: 'Today',
            headerShown: false,
          }}
        />
        <Tab.Screen 
          name="Progress" 
          component={ProgressStackWithReset}
          options={{
            title: 'Progress',
            headerShown: false,
          }}
        />
        <Tab.Screen 
          name="Social" 
          component={SocialStackWithReset}
          options={{
            title: 'Social',
            headerShown: false,
          }}
        />
        <Tab.Screen 
          name="Protocol" 
          component={ProtocolStackWithReset}
          options={{
            title: 'Protocol',
            headerShown: false,
          }}
        />
      </Tab.Navigator>
  );
}

