import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import TodayStackNavigator from './TodayStackNavigator';
import ProtocolStackNavigator from './ProtocolStackNavigator';
import ProgressStackNavigator from './ProgressStackNavigator';
import SocialStackNavigator from './SocialStackNavigator';
import { useTabNotifications } from '../hooks/useTabNotifications';

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

// Custom Tab Label with Badge
function TabLabelWithBadge({ label, showBadge, color }: { label: string; showBadge: boolean; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', minWidth: 60, paddingHorizontal: 4 }}>
      <Text style={[theme.typography.label, { fontSize: 11, textAlign: 'center', color }]}>{label}</Text>
      {showBadge && (
        <View style={{ position: 'absolute', top: -22, right: 0, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent }} />
        </View>
      )}
    </View>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  const notifications = useTabNotifications();

  return (
    <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            ...theme.typography.headingSmall,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.tabBarBackground,
            borderTopWidth: 1,
            borderTopColor: theme.colors.tabBarBorder,
            paddingTop: 30,
            paddingBottom: 30,
            height: 102,
          },
          tabBarActiveTintColor: theme.colors.tabBarActive,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 0,
            height: '100%',
          },
          tabBarButton: (props: any) => <CustomTabBarButton {...props} />,
          tabBarLabelStyle: {
            ...theme.typography.label,
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
          options={({ route }) => ({
            title: 'Today',
            headerShown: false,
            tabBarLabel: ({ color }) => <TabLabelWithBadge label="Today" showBadge={notifications.today} color={color} />,
          })}
        />
        <Tab.Screen 
          name="Progress" 
          component={ProgressStackWithReset}
          options={({ route }) => ({
            title: 'Progress',
            headerShown: false,
            tabBarLabel: ({ color }) => <TabLabelWithBadge label="Progress" showBadge={notifications.progress} color={color} />,
          })}
        />
        <Tab.Screen 
          name="Social" 
          component={SocialStackWithReset}
          options={({ route }) => ({
            title: 'Social',
            headerShown: false,
            tabBarLabel: ({ color }) => <TabLabelWithBadge label="Social" showBadge={notifications.social} color={color} />,
          })}
        />
        <Tab.Screen 
          name="Protocol" 
          component={ProtocolStackWithReset}
          options={({ route }) => ({
            title: 'Protocol',
            headerShown: false,
            tabBarLabel: ({ color }) => <TabLabelWithBadge label="Protocol" showBadge={notifications.protocol} color={color} />,
          })}
        />
      </Tab.Navigator>
  );
}

