import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityItem } from '../types';
import { useThemeStore } from '../store/themeStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';

interface ActivityCardProps {
  activity: ActivityItem;
  onPress?: () => void;
  onAction?: (action: string) => void;
}

export default function ActivityCard({ activity, onPress, onAction }: ActivityCardProps) {
  const { colors } = useThemeStore();

  const getStatusColor = () => {
    switch (activity.status) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      default:
        return colors.info;
    }
  };

  const getTypeIcon = () => {
    switch (activity.type) {
      case 'command':
        return 'terminal';
      case 'error':
        return 'alert-circle';
      case 'ai_message':
        return 'sparkles';
      case 'team_activity':
        return 'people';
      default:
        return 'information-circle';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.sm,
      borderLeftWidth: 3,
      borderLeftColor: getStatusColor(),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: spacing.sm,
    },
    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    content: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    userName: {
      fontSize: 14,
      fontFamily: fonts.display.bold,
      color: colors.text,
      marginRight: spacing.xs,
    },
    timestamp: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
    },
    moreButton: {
      padding: spacing.xs,
    },
    badges: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      borderRadius: borderRadius.full,
      marginRight: spacing.xs,
    },
    badgeText: {
      fontSize: 10,
      fontFamily: fonts.display.medium,
      color: colors.textSecondary,
      marginLeft: spacing.xs / 2,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      borderRadius: borderRadius.full,
      marginRight: spacing.xs,
    },
    statusBadgeText: {
      fontSize: 10,
      fontFamily: fonts.display.bold,
      color: 'white',
    },
    description: {
      fontSize: 14,
      fontFamily: fonts.display.regular,
      color: colors.text,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    codeBlock: {
      backgroundColor: '#1e1e1e',
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    codeText: {
      fontFamily: fonts.mono.regular,
      fontSize: 12,
      color: '#d4d4d4',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.background,
      marginRight: spacing.sm,
    },
    actionButtonText: {
      fontSize: 12,
      fontFamily: fonts.display.medium,
      color: colors.text,
      marginLeft: spacing.xs / 2,
    },
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        {activity.user.avatar ? (
          <Image source={{ uri: activity.user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name={getTypeIcon()} size={20} color="white" />
          </View>
        )}
        
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{activity.user.name}</Text>
              <Text style={styles.timestamp}>• {formatTime(activity.timestamp)}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.badges}>
            {activity.terminal && (
              <View style={styles.badge}>
                <Ionicons name="terminal" size={12} color={colors.textSecondary} />
                <Text style={styles.badgeText}>{activity.terminal.name}</Text>
              </View>
            )}
            {activity.status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusBadgeText}>
                  {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.description}>{activity.description}</Text>

          {activity.type === 'command' && (
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>
                <Text style={{ color: '#6366f1' }}>➜</Text> {activity.title}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onAction?.('view')}
              >
                <Ionicons name="eye" size={14} color={colors.text} />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
              
              {activity.type === 'command' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => onAction?.('rerun')}
                >
                  <Ionicons name="refresh" size={14} color={colors.success} />
                  <Text style={[styles.actionButtonText, { color: colors.success }]}>Rerun</Text>
                </TouchableOpacity>
              )}
              
              {activity.type === 'ai_message' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => onAction?.('chat')}
                >
                  <Ionicons name="chatbubble" size={14} color={colors.info} />
                  <Text style={[styles.actionButtonText, { color: colors.info }]}>Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}