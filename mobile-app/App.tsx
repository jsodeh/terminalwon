import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { useThemeStore } from './src/store/themeStore';
import { hubService } from './src/services/HubService';

export default function App() {
  const { isDark } = useThemeStore();
  
  // Initialize hub service connection
  useEffect(() => {
    // Hub service auto-connects on initialization
    console.log('🚀 TerminalWON Mobile App starting...');
    
    return () => {
      // Cleanup on app unmount
      hubService.disconnect();
    };
  }, []);
  
  const [fontsLoaded] = useFonts({
    'SplineSans-Regular': require('./assets/fonts/SplineSans-Regular.ttf'),
    'SplineSans-Medium': require('./assets/fonts/SplineSans-Medium.ttf'),
    'SplineSans-SemiBold': require('./assets/fonts/SplineSans-SemiBold.ttf'),
    'SplineSans-Bold': require('./assets/fonts/SplineSans-Bold.ttf'),
    'JetBrainsMono-Regular': require('./assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrainsMono-Medium': require('./assets/fonts/JetBrainsMono-Medium.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});