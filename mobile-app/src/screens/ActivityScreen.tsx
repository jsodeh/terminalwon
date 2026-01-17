import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useActivityStore } from '../store/activityStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';
import ActivityCard from '../components/ActivityCard';

export default function ActivityScreen() {
  const { colors } = useThemeStore();
  const { filter, setFilter } = useActivityStore();
  const [refreshing, setRefreshing] = useState(false);

  // Mock activity data
  const mockActivities = [
    {
      id: '1',
      type: 'command' as const,
      title: 'npm install && npm run build',
      description: 'Executed initialization script for the new backend service.',
      timestamp: new Date(Date.now() - 120000),
      user: {
        id: 'devin-ai',
        name: 'Devin (AI Agent)',
        email: 'devin@ai.com',
        avatar: '',
        isOnline: true,
      },
      terminal: {
        id: '1',
        name: 'Project-Terminal',
        sessionId: 'session-1',
        cwd: '/var/www/project',
        tool: 'vscode' as const,
        status: 'active' as const,
        createdAt: new Date(),
        lastActivity: new Date(),
        userId: 'user-1',
      },
      status: 'success' as const,
    },
    {
      id: '2',
      type: 'error' as const,
      title: 'Connection timeout',
      description: 'Connection timeout during migration. Rolling back changes.',
      timestamp: new Date(Date.now() - 900000),
      user: {
        id: 'sarah-chen',
        name: 'Sarah Chen',
        email: 'sarah@company.com',
        avatar: 'https://via.placeholder.com/40',
        isOnline: true,
      },
      terminal: {
        id: '2',
        name: 'prod-db-cluster-01',
        sessionId: 'session-2',
        cwd: '/var/db',
        tool: 'cursor' as const,
        status: 'error' as const,
        createdAt: new Date(),
        lastActivity: new Date(),
        userId: 'user-2',
      },
      status: 'error' as const,
    },
    {
      id: '3',
      type: 'ai_message' as const,
      title: 'Performance suggestion',
      description: 'High memory usage detected in worker-node-3. I recommend increasing the heap size limit or scaling horizontally.',
      timestamp: new Date(Date.now() - 3600000),
      user: {
        id: 'terminalwon-ai',
        name: 'TerminalWON AI',
        email: 'ai@terminalwon.com',
        avatar: '',
        isOnline: true,
      },
      status: 'warning' as const,
    },
    {
      id: '4',
      type: 'team_activity' as const,
      title: 'New session connected',
      description: 'Connected to a new local session.',
      timestamp: new Date(Date.now() - 7200000),
      user: {
        id: 'mike-ross',
        name: 'Mike Ross',
        email: 'mike@company.com',
        avatar: 'https://via.placeholder.com/40',
        isOnline: false,
      },
      terminal: {
        id: '3',
        name: 'Local-Env',
        sessionId: 'session-3',
        cwd: '/home/mike',
        tool: 'vscode' as const,
        status: 'idle' as const,
        createdAt: new Date(),
        lastActivity: new Date(),
        userId: 'user-3',
      },
      status: 'info' as const,
    },
  ];

  const filters = [
    { key: 'all', label: 'All Activity', icon: 'list' },
    { key: 'commands', label: 'Commands', icon: 'terminal' },
    { key: 'errors', label: 'Errors', icon: 'alert-circle' },
    { key: 'ai', label: 'AI Messages', icon: 'sparkles' },
    { key: 'team', label: 'Team', icon: 'people' },
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getFilteredActivities = () => {
    if (filter === 'all') return mockActivities;
    
    return mockActivities.filter(activity => {
      switch (filter) {
        case 'commands':
          return activity.type === 'command';
        case 'errors':
          return activity.status === 'error';
        case 'ai':
          return activity.type === 'ai_message';
        case 'team':
          return activity.type === 'team_activity';
        default:
          return true;
      }
    });
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
    logo: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    title: {
      fontSize: 18,
      fontFamily: fonts.display.bold,
      color: colors.text,
    },
    searchButton: {
      padding: spacing.sm,
    },
    filtersContainer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filtersScroll: {
      flexDirection: 'row',
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      marginRight: spacing.sm,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    filterChipText: {
      fontSize: 14,
      fontFamily: fonts.display.medium,
      color: colors.text,
      marginLeft: spacing.xs,
    },
    filterChipTextActive: {
      color: colors.surface,
    },
    newActivityIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.md,
      backgroundColor: colors.background + 'CC',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    newActivityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: spacing.sm,
    },
    newActivityText: {
      fontSize: 14,
      fontFamily: fonts.display.semiBold,
      color: colors.primary,
    },
    content: {
      flex: 1,
    },
    activitiesContainer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    loadMoreButton: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    loadMoreText: {
      fontSize: 14,
      fontFamily: fonts.display.medium,
      color: colors.primary,
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
          <View style={styles.logo}>
            <Ionicons name="terminal" size={20} color="black" />
          </View>
          <Text style={styles.title}>Activity Feed</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {filters.map((filterItem) => (
            <TouchableOpacity
              key={filterItem.key}
              style={[
                styles.filterChip,
                filter === filterItem.key && styles.filterChipActive,
              ]}
              onPress={() => setFilter(filterItem.key as any)}
            >
              <Ionicons
                name={filterItem.icon as any}
                size={16}
                color={filter === filterItem.key ? colors.surface : colors.text}
              />
              <Text
                style={[
                  styles.filterChipText,
                  filter === filterItem.key && styles.filterChipTextActive,
                ]}
              >
                {filterItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.newActivityIndicator}>
        <View style={styles.newActivityDot} />
        <Text style={styles.newActivityText}>New activity detected</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.activitiesContainer}>
          {getFilteredActivities().map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onPress={() => console.log('Activity pressed:', activity.id)}
              onAction={(action) => console.log(`${action} on activity ${activity.id}`)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Show more activity</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add-circle" size={28} color="black" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}