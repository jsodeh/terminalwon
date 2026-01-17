import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';

export default function SettingsScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useThemeStore();
  const [notifications, setNotifications] = React.useState(true);
  const [autoConnect, setAutoConnect] = React.useState(false);
  const [biometrics, setBiometrics] = React.useState(true);

  const settingSections = [
    {
      title: 'Appearance',
      items: [
        {
          id: 'theme',
          title: 'Dark Mode',
          subtitle: 'Switch between light and dark themes',
          icon: 'moon',
          type: 'switch',
          value: isDark,
          onToggle: toggleTheme,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive alerts for terminal activities',
          icon: 'notifications',
          type: 'switch',
          value: notifications,
          onToggle: setNotifications,
        },
        {
          id: 'notification-settings',
          title: 'Notification Settings',
          subtitle: 'Customize what notifications you receive',
          icon: 'settings',
          type: 'navigation',
          onPress: () => console.log('Navigate to notification settings'),
        },
      ],
    },
    {
      title: 'Connection',
      items: [
        {
          id: 'auto-connect',
          title: 'Auto Connect',
          subtitle: 'Automatically connect to saved terminals',
          icon: 'link',
          type: 'switch',
          value: autoConnect,
          onToggle: setAutoConnect,
        },
        {
          id: 'connection-timeout',
          title: 'Connection Timeout',
          subtitle: '30 seconds',
          icon: 'time',
          type: 'navigation',
          onPress: () => console.log('Navigate to timeout settings'),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          id: 'biometrics',
          title: 'Biometric Authentication',
          subtitle: 'Use Face ID or Touch ID to unlock',
          icon: 'finger-print',
          type: 'switch',
          value: biometrics,
          onToggle: setBiometrics,
        },
        {
          id: 'change-password',
          title: 'Change Password',
          subtitle: 'Update your account password',
          icon: 'lock-closed',
          type: 'navigation',
          onPress: () => console.log('Navigate to change password'),
        },
        {
          id: 'two-factor',
          title: 'Two-Factor Authentication',
          subtitle: 'Add an extra layer of security',
          icon: 'shield-checkmark',
          type: 'navigation',
          onPress: () => console.log('Navigate to 2FA settings'),
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          id: 'clear-cache',
          title: 'Clear Cache',
          subtitle: 'Free up storage space',
          icon: 'trash',
          type: 'action',
          onPress: () => {
            Alert.alert(
              'Clear Cache',
              'Are you sure you want to clear the cache? This will remove temporary files.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => console.log('Cache cleared') },
              ]
            );
          },
        },
        {
          id: 'export-data',
          title: 'Export Data',
          subtitle: 'Download your terminal history',
          icon: 'download',
          type: 'navigation',
          onPress: () => console.log('Navigate to export data'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & Documentation',
          subtitle: 'Get help using TerminalWON',
          icon: 'help-circle',
          type: 'navigation',
          onPress: () => console.log('Navigate to help'),
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          subtitle: 'Help us improve the app',
          icon: 'chatbubble-ellipses',
          type: 'navigation',
          onPress: () => console.log('Navigate to feedback'),
        },
        {
          id: 'contact',
          title: 'Contact Support',
          subtitle: 'Get in touch with our team',
          icon: 'mail',
          type: 'navigation',
          onPress: () => console.log('Navigate to contact'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          id: 'version',
          title: 'Version',
          subtitle: '1.0.0 (Build 1)',
          icon: 'information-circle',
          type: 'info',
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          subtitle: 'Read our privacy policy',
          icon: 'document-text',
          type: 'navigation',
          onPress: () => console.log('Navigate to privacy policy'),
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          subtitle: 'Read our terms of service',
          icon: 'document',
          type: 'navigation',
          onPress: () => console.log('Navigate to terms'),
        },
      ],
    },
  ];

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: () => {
            console.log('User signed out');
            // Handle sign out logic here
          }
        },
      ]
    );
  };

  const renderSettingItem = (item: any) => {
    const styles = StyleSheet.create({
      settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      settingItemLast: {
        borderBottomWidth: 0,
      },
      settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
      },
      settingContent: {
        flex: 1,
      },
      settingTitle: {
        fontSize: 16,
        fontFamily: fonts.display.medium,
        color: colors.text,
        marginBottom: 2,
      },
      settingSubtitle: {
        fontSize: 14,
        fontFamily: fonts.display.regular,
        color: colors.textSecondary,
      },
      settingAction: {
        marginLeft: spacing.sm,
      },
    });

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingItem}
        onPress={item.onPress}
        disabled={item.type === 'switch' || item.type === 'info'}
        activeOpacity={item.type === 'info' ? 1 : 0.7}
      >
        <View style={styles.settingIcon}>
          <Ionicons name={item.icon} size={20} color={colors.text} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
        <View style={styles.settingAction}>
          {item.type === 'switch' && (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={item.value ? colors.primary : colors.textSecondary}
            />
          )}
          {item.type === 'navigation' && (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
          {item.type === 'action' && (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const mainStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontFamily: fonts.display.bold,
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeader: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: fonts.display.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sectionContent: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      marginHorizontal: spacing.md,
      overflow: 'hidden',
      ...shadows.sm,
    },
    signOutSection: {
      marginTop: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    signOutButton: {
      backgroundColor: colors.error,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      ...shadows.sm,
    },
    signOutButtonText: {
      fontSize: 16,
      fontFamily: fonts.display.semiBold,
      color: 'white',
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

  return (
    <SafeAreaView style={mainStyles.container} edges={['top']}>
      <View style={mainStyles.header}>
        <View style={mainStyles.headerLeft}>
          <Text style={mainStyles.title}>Settings</Text>
        </View>
      </View>

      <ScrollView style={mainStyles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section, sectionIndex) => (
          <View key={section.title} style={mainStyles.section}>
            <View style={mainStyles.sectionHeader}>
              <Text style={mainStyles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={mainStyles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <View key={item.id}>
                  {renderSettingItem(item)}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={mainStyles.signOutSection}>
          <TouchableOpacity style={mainStyles.signOutButton} onPress={handleSignOut}>
            <Text style={mainStyles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={mainStyles.footer}>
          <Text style={mainStyles.footerText}>
            TerminalWON helps you monitor and control your development terminals from anywhere.
            {'\n\n'}
            Made with ❤️ for developers
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}