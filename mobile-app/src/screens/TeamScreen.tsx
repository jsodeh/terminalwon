import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';

export default function TeamScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);

  // Mock team data
  const teamData = {
    id: 'team-1',
    name: 'Engineering Alpha',
    description: 'Core infrastructure monitoring and unified remote terminal hub for the backend team.',
    memberCount: 12,
    role: 'admin',
    isPremium: true,
  };

  const sharedTerminals = [
    {
      id: 'terminal-1',
      name: 'prod-api-01',
      status: 'active',
      type: 'production',
      activeUsers: [
        { id: 'user-1', name: 'Sarah Jenkins', avatar: 'https://via.placeholder.com/32' },
        { id: 'user-2', name: 'Mike Chen', avatar: 'https://via.placeholder.com/32' },
      ],
      lastActivity: new Date(Date.now() - 120000),
    },
    {
      id: 'terminal-2',
      name: 'db-shard-04',
      status: 'idle',
      type: 'database',
      activeUsers: [],
      lastActivity: new Date(Date.now() - 900000),
    },
    {
      id: 'terminal-3',
      name: 'payment-gw-02',
      status: 'error',
      type: 'gateway',
      activeUsers: [
        { id: 'user-3', name: 'Alex Rodriguez', avatar: 'https://via.placeholder.com/32' },
      ],
      lastActivity: new Date(Date.now() - 300000),
    },
  ];

  const activityFeed = [
    {
      id: 'activity-1',
      type: 'deployment',
      user: { name: 'Sarah Jenkins', avatar: 'https://via.placeholder.com/32' },
      action: 'deployed to',
      target: 'prod-api-01',
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: 'activity-2',
      type: 'session',
      user: { name: 'Mike Chen', avatar: 'https://via.placeholder.com/32' },
      action: 'joined session',
      target: '#882',
      timestamp: new Date(Date.now() - 900000),
    },
    {
      id: 'activity-3',
      type: 'alert',
      user: null,
      action: 'High latency detected on',
      target: 'db-shard-04',
      timestamp: new Date(Date.now() - 1920000),
    },
  ];

  const teamMembers = [
    {
      id: 'user-1',
      name: 'Sarah Jenkins',
      role: 'DevOps Lead',
      avatar: 'https://via.placeholder.com/40',
      isOnline: true,
      lastSeen: new Date(),
    },
    {
      id: 'user-2',
      name: 'Mike Chen',
      role: 'Backend Engineer',
      avatar: 'https://via.placeholder.com/40',
      isOnline: true,
      lastSeen: new Date(),
    },
    {
      id: 'user-3',
      name: 'David Kim',
      role: 'Security Engineer',
      avatar: 'https://via.placeholder.com/40',
      isOnline: false,
      lastSeen: new Date(Date.now() - 3600000),
    },
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'error':
        return colors.error;
      case 'idle':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'idle':
        return 'pause-circle';
      default:
        return 'help-circle';
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
    menuButton: {
      padding: spacing.sm,
      marginRight: spacing.sm,
    },
    headerTitle: {
      fontSize: 12,
      fontFamily: fonts.display.bold,
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    notificationButton: {
      position: 'relative',
      padding: spacing.sm,
    },
    notificationBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.error,
    },
    content: {
      flex: 1,
    },
    teamHeader: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
      ...shadows.sm,
    },
    teamTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    teamName: {
      fontSize: 24,
      fontFamily: fonts.display.bold,
      color: colors.text,
      flex: 1,
      lineHeight: 32,
    },
    moreButton: {
      padding: spacing.sm,
    },
    teamDescription: {
      fontSize: 14,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    teamBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.lg,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      marginRight: spacing.sm,
      marginBottom: spacing.xs,
      borderWidth: 1,
    },
    membersBadge: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    adminBadge: {
      backgroundColor: colors.info + '20',
      borderColor: colors.info + '30',
    },
    premiumBadge: {
      backgroundColor: colors.warning + '20',
      borderColor: colors.warning + '30',
    },
    badgeText: {
      fontSize: 12,
      fontFamily: fonts.display.semiBold,
      marginLeft: spacing.xs / 2,
    },
    inviteButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.md,
    },
    inviteButtonText: {
      fontSize: 16,
      fontFamily: fonts.display.semiBold,
      color: 'black',
      marginLeft: spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: fonts.display.bold,
      color: colors.text,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    viewAllText: {
      fontSize: 12,
      fontFamily: fonts.display.semiBold,
      color: colors.primary,
      marginRight: spacing.xs / 2,
    },
    terminalsContainer: {
      paddingHorizontal: spacing.md,
    },
    terminalCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderLeftWidth: 4,
      ...shadows.sm,
    },
    terminalCardActive: {
      borderLeftColor: colors.success,
    },
    terminalCardIdle: {
      borderLeftColor: colors.textSecondary,
    },
    terminalCardError: {
      borderLeftColor: colors.error,
    },
    terminalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    terminalInfo: {
      flex: 1,
    },
    terminalName: {
      fontSize: 14,
      fontFamily: fonts.mono.medium,
      color: colors.text,
      marginBottom: 2,
    },
    terminalStatus: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    terminalStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: spacing.xs,
    },
    terminalStatusText: {
      fontSize: 10,
      fontFamily: fonts.display.medium,
      textTransform: 'capitalize',
    },
    terminalActions: {
      padding: spacing.sm,
    },
    terminalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activeUsers: {
      flexDirection: 'row',
    },
    userAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginRight: -8,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    userCount: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    userCountText: {
      fontSize: 10,
      fontFamily: fonts.display.bold,
      color: colors.textSecondary,
    },
    joinButton: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    joinButtonText: {
      fontSize: 12,
      fontFamily: fonts.display.bold,
      color: colors.primary,
    },
    connectButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    connectButtonText: {
      fontSize: 12,
      fontFamily: fonts.display.bold,
      color: colors.textSecondary,
    },
    activitySection: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      marginTop: spacing.lg,
      ...shadows.lg,
    },
    activityHeader: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    activityTitle: {
      fontSize: 12,
      fontFamily: fonts.display.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    activityList: {
      paddingHorizontal: spacing.md,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
      position: 'relative',
    },
    activityLine: {
      position: 'absolute',
      left: 11,
      top: 24,
      bottom: -spacing.md,
      width: 2,
      backgroundColor: colors.border,
    },
    activityIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
      zIndex: 1,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    activityContent: {
      flex: 1,
    },
    activityText: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.text,
      lineHeight: 16,
    },
    activityTarget: {
      fontFamily: fonts.mono.regular,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xs / 2,
      borderRadius: borderRadius.sm,
    },
    activityTime: {
      fontSize: 10,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      marginTop: spacing.xs / 2,
    },
    membersSection: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    memberLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    memberAvatarContainer: {
      position: 'relative',
      marginRight: spacing.sm,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    offlineIndicator: {
      backgroundColor: colors.textSecondary,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 14,
      fontFamily: fonts.display.semiBold,
      color: colors.text,
    },
    memberRole: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
    },
    chatButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: 80,
      right: spacing.md,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>TerminalWON</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color={colors.text} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.teamHeader}>
          <View style={styles.teamTitleRow}>
            <Text style={styles.teamName}>{teamData.name}</Text>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.teamDescription}>{teamData.description}</Text>
          
          <View style={styles.teamBadges}>
            <View style={[styles.badge, styles.membersBadge]}>
              <Ionicons name="people" size={14} color={colors.textSecondary} />
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {teamData.memberCount} Members
              </Text>
            </View>
            <View style={[styles.badge, styles.adminBadge]}>
              <Ionicons name="shield-checkmark" size={14} color={colors.info} />
              <Text style={[styles.badgeText, { color: colors.info }]}>Admin</Text>
            </View>
            {teamData.isPremium && (
              <View style={[styles.badge, styles.premiumBadge]}>
                <Ionicons name="diamond" size={14} color={colors.warning} />
                <Text style={[styles.badgeText, { color: colors.warning }]}>Premium</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity style={styles.inviteButton}>
            <Ionicons name="person-add" size={20} color="black" />
            <Text style={styles.inviteButtonText}>Invite Members</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Terminals</Text>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.terminalsContainer}>
          {sharedTerminals.map((terminal) => (
            <View
              key={terminal.id}
              style={[
                styles.terminalCard,
                terminal.status === 'active' && styles.terminalCardActive,
                terminal.status === 'idle' && styles.terminalCardIdle,
                terminal.status === 'error' && styles.terminalCardError,
              ]}
            >
              <View style={styles.terminalHeader}>
                <View style={styles.terminalInfo}>
                  <Text style={styles.terminalName}>{terminal.name}</Text>
                  <View style={styles.terminalStatus}>
                    <View
                      style={[
                        styles.terminalStatusDot,
                        { backgroundColor: getStatusColor(terminal.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.terminalStatusText,
                        { color: getStatusColor(terminal.status) },
                      ]}
                    >
                      {terminal.status}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.terminalActions}>
                  <Ionicons name="expand" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.terminalFooter}>
                <View style={styles.activeUsers}>
                  {terminal.activeUsers.slice(0, 2).map((user, index) => (
                    <Image
                      key={user.id}
                      source={{ uri: user.avatar }}
                      style={[styles.userAvatar, { zIndex: 10 - index }]}
                    />
                  ))}
                  {terminal.activeUsers.length > 2 && (
                    <View style={styles.userCount}>
                      <Text style={styles.userCountText}>+{terminal.activeUsers.length - 2}</Text>
                    </View>
                  )}
                </View>

                {terminal.activeUsers.length > 0 ? (
                  <TouchableOpacity style={styles.joinButton}>
                    <Text style={styles.joinButtonText}>Join Session</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.connectButton}>
                    <Text style={styles.connectButtonText}>Connect</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Live Feed</Text>
          </View>

          <View style={styles.activityList}>
            {activityFeed.map((activity, index) => (
              <View key={activity.id} style={styles.activityItem}>
                {index < activityFeed.length - 1 && <View style={styles.activityLine} />}
                <View
                  style={[
                    styles.activityIcon,
                    {
                      backgroundColor:
                        activity.type === 'deployment'
                          ? colors.success + '20'
                          : activity.type === 'session'
                          ? colors.info + '20'
                          : colors.warning + '20',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      activity.type === 'deployment'
                        ? 'checkmark'
                        : activity.type === 'session'
                        ? 'terminal'
                        : 'warning'
                    }
                    size={12}
                    color={
                      activity.type === 'deployment'
                        ? colors.success
                        : activity.type === 'session'
                        ? colors.info
                        : colors.warning
                    }
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {activity.user && (
                      <Text style={{ fontFamily: fonts.display.semiBold }}>
                        {activity.user.name}{' '}
                      </Text>
                    )}
                    {activity.action}{' '}
                    <Text style={styles.activityTarget}>{activity.target}</Text>
                  </Text>
                  <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
          </View>

          <View style={styles.membersSection}>
            {teamMembers.map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={styles.memberLeft}>
                  <View style={styles.memberAvatarContainer}>
                    <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                    <View
                      style={[
                        styles.onlineIndicator,
                        !member.isOnline && styles.offlineIndicator,
                      ]}
                    />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRole}>{member.role}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.chatButton}>
                  <Ionicons
                    name={member.isOnline ? 'chatbubble' : 'mail'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="black" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}