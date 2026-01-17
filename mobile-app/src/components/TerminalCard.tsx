import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Terminal } from '../types';
import { useThemeStore } from '../store/themeStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';

interface TerminalCardProps {
  terminal: Terminal;
  onPress: () => void;
  onAction?: (action: 'view' | 'restart' | 'stop') => void;
}

export default function TerminalCard({ terminal, onPress, onAction }: TerminalCardProps) {
  const { colors } = useThemeStore();

  const getStatusColor = () => {
    switch (terminal.status) {
      case 'active':
        return colors.success;
      case 'error':
        return colors.error;
      case 'waiting-input':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = () => {
    switch (terminal.status) {
      case 'active':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'waiting-input':
        return 'time';
      default:
        return 'pause-circle';
    }
  };

  const getToolIcon = () => {
    switch (terminal.tool) {
      case 'vscode':
        return 'code-slash';
      case 'cursor':
        return 'sparkles';
      case 'claude-code':
        return 'chatbubble-ellipses';
      default:
        return 'terminal';
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadows.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    titleSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    toolIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontFamily: fonts.display.bold,
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing.xs,
    },
    terminalPreview: {
      backgroundColor: '#1e1e1e',
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      height: 80,
    },
    terminalText: {
      fontFamily: fonts.mono.regular,
      fontSize: 10,
      color: '#d4d4d4',
      lineHeight: 14,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    lastActivity: {
      fontSize: 10,
      fontFamily: fonts.mono.regular,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.xs,
    },
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <View style={styles.toolIcon}>
            <Ionicons name={getToolIcon()} size={20} color={colors.text} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{terminal.name}</Text>
            <Text style={styles.subtitle}>
              {terminal.tool} • {terminal.cwd}
            </Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Ionicons name={getStatusIcon()} size={16} color={getStatusColor()} />
        </View>
      </View>

      <View style={styles.terminalPreview}>
        <Text style={styles.terminalText}>
          $ npm run dev{'\n'}
          {'> server@1.0.0 dev'}{'\n'}
          {'> nodemon src/index.js'}{'\n'}
          Server listening on port 3000...
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.lastActivity}>
          Last activity: {new Date(terminal.lastActivity).toLocaleTimeString()}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('view')}
          >
            <Ionicons name="eye" size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('restart')}
          >
            <Ionicons name="refresh" size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('stop')}
          >
            <Ionicons name="stop" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}