import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import TerminalsScreen from '../screens/TerminalsScreen';
import TerminalDetailScreen from '../screens/TerminalDetailScreen';
import ActivityScreen from '../screens/ActivityScreen';
import AIConversationScreen from '../screens/AIConversationScreen';
import TeamScreen from '../screens/TeamScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ConnectTerminalScreen from '../screens/ConnectTerminalScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TerminalStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TerminalsList" component={TerminalsScreen} />
      <Stack.Screen name="TerminalDetail" component={TerminalDetailScreen} />
      <Stack.Screen name="AIConversation" component={AIConversationScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors, isDark } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Terminals') {
            iconName = focused ? 'terminal' : 'terminal-outline';
          } else if (route.name === 'Activity') {
            iconName = focused ? 'pulse' : 'pulse-outline';
          } else if (route.name === 'Team') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'SplineSans-Medium',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Terminals" component={TerminalStack} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="ConnectTerminal" component={ConnectTerminalScreen} />
    </Stack.Navigator>
  );
}