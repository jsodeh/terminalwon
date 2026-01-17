import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';

export default function ConnectTerminalScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const integrations = [
    {
      id: 'vscode',
      name: 'VSCode',
      description: 'Standard & Insiders',
      icon: 'code-slash',
      color: '#007ACC',
      badge: 'POPULAR',
      badgeColor: colors.success,
    },
    {
      id: 'cursor',
      name: 'Cursor AI',
      description: 'AI-First Editor',
      icon: 'sparkles',
      color: '#8B5CF6',
      badge: null,
      badgeColor: null,
    },
    {
      id: 'claude-code',
      name: 'Claude Code',
      description: 'Anthropic Developer Console',
      icon: 'chatbubble-ellipses',
      color: '#F59E0B',
      badge: 'NEW',
      badgeColor: colors.primary,
    },
  ];

  const handleIntegrationPress = (integration: any) => {
    console.log('Selected integration:', integration.name);
    // Navigate to specific integration setup
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const styles = StyleSheet.create({
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
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    stepIndicator: {
      fontSize: 12,
      fontFamily: fonts.display.semiBold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    skipButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    skipButtonText: {
      fontSize: 14,
      fontFamily: fonts.display.medium,
      color: colors.primary,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      marginHorizontal: spacing.xs,
    },
    progressDotActive: {
      width: 32,
      backgroundColor: colors.primary,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.md,
    },
    heroSection: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    heroImage: {
      width: 200,
      height: 150,
      marginBottom: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroImagePlaceholder: {
      fontSize: 60,
      color: colors.textSecondary,
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.display.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.md,
      lineHeight: 36,
    },
    description: {
      fontSize: 16,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: spacing.md,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: fonts.display.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.md,
      paddingLeft: spacing.xs,
    },
    integrationsContainer: {
      marginTop: spacing.xl,
    },
    integrationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    integrationLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    integrationIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    integrationInfo: {
      flex: 1,
    },
    integrationName: {
      fontSize: 16,
      fontFamily: fonts.display.semiBold,
      color: colors.text,
      marginBottom: 2,
    },
    integrationDescription: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
    },
    integrationRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      borderRadius: borderRadius.sm,
      marginRight: spacing.sm,
    },
    badgeText: {
      fontSize: 10,
      fontFamily: fonts.display.bold,
      color: 'white',
    },
    chevron: {
      marginLeft: spacing.sm,
    },
    manualSetup: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    manualButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    manualButtonText: {
      fontSize: 14,
      fontFamily: fonts.display.medium,
      color: colors.textSecondary,
      marginLeft: spacing.sm,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      backgroundColor: colors.surface + 'E6',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    primaryButton: {
      backgroundColor: colors.text,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
      ...shadows.md,
    },
    primaryButtonText: {
      fontSize: 16,
      fontFamily: fonts.display.bold,
      color: colors.surface,
      marginLeft: spacing.sm,
    },
    helpText: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    helpLink: {
      color: colors.primary,
      textDecorationLine: 'underline',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step {currentStep} of {totalSteps}</Text>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index + 1 === currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroImage}>
            <Text style={styles.heroImagePlaceholder}>🔗</Text>
          </View>
          <Text style={styles.title}>Connect Your First Terminal</Text>
          <Text style={styles.description}>
            Install the TerminalWON extension on your preferred IDE to start monitoring instantly.
          </Text>
        </View>

        <View style={styles.integrationsContainer}>
          <Text style={styles.sectionTitle}>Supported Integrations</Text>
          
          {integrations.map((integration) => (
            <TouchableOpacity
              key={integration.id}
              style={styles.integrationCard}
              onPress={() => handleIntegrationPress(integration)}
              activeOpacity={0.7}
            >
              <View style={styles.integrationLeft}>
                <View style={[styles.integrationIcon, { backgroundColor: integration.color + '20' }]}>
                  <Ionicons name={integration.icon as any} size={24} color={integration.color} />
                </View>
                <View style={styles.integrationInfo}>
                  <Text style={styles.integrationName}>{integration.name}</Text>
                  <Text style={styles.integrationDescription}>{integration.description}</Text>
                </View>
              </View>
              <View style={styles.integrationRight}>
                {integration.badge && (
                  <View style={[styles.badge, { backgroundColor: integration.badgeColor }]}>
                    <Text style={styles.badgeText}>{integration.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.manualSetup}>
          <TouchableOpacity style={styles.manualButton}>
            <Ionicons name="terminal" size={18} color={colors.textSecondary} />
            <Text style={styles.manualButtonText}>Manual Connection via SSH/API Key</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons name="qr-code" size={20} color={colors.surface} />
          <Text style={styles.primaryButtonText}>Scan Extension QR Code</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>
          Need help? <Text style={styles.helpLink}>View Documentation</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}