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
import { useTerminalStore } from '../store/terminalStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';
import TerminalCard from '../components/TerminalCard';

export default function TerminalsScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const { setActiveTerminal } = useTerminalStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'idle' | 'error'>('all');

  // Mock terminals data
  const mockTerminals = [
    {
      id: '1',
      sessionId: 'session-1',
      name: 'Backend-API',
      cwd: '/var/www/backend',
      tool: 'vscode' as const,
      status: 'active' as const,
      createdAt: new Date(),
      lastActivity: new Date(),
      userId: 'user-1',
    },
    {
      id: '2',
      sessionId: 'session-2',
      name: 'Frontend-Build',
      cwd: '/var/www/frontend',
      tool: 'cursor' as const,
      status: 'active' as const,
      createdAt: new Date(),
      lastActivity: new Date(Date.now() - 60000),
      userId: 'user-1',
    },
    {
      id: '3',
      sessionId: 'session-3',
      name: 'Docker-Stack',
      cwd: '/var/www/docker',
      tool: 'claude-code' as const,
      status: 'idle' as const,
      createdAt: new Date(),
      lastActivity: new Date(Date.now() - 900000),
      userId: 'user-1',
    },
    {
      id: '4',
      sessionId: 'session-4',
      name: 'Database-Migration',
      cwd: '/var/db/migrations',
      tool: 'vscode' as const,
      status: 'error' as const,
      createdAt: new Date(),
      lastActivity: new Date(Date.now() - 300000),
      userId: 'user-1',
    },
    {
      id: '5',
      sessionId: 'session-5',
      name: 'Test-Runner',
      cwd: '/var/www/tests',
      tool: 'cursor' as const,
      status: 'idle' as const,
      createdAt: new Date(),
      lastActivity: new Date(Date.now() - 1800000),
      userId: 'user-1',
    },
  ];

  const filters = [
    { key: 'all', label: 'All', count: mockTerminals.length },
    { key: 'active', label: 'Active', count: mockTerminals.filter(t => t.status === 'active').length },
    { key: 'idle', label: 'Idle', count: mockTerminals.filter(t => t.status === 'idle').length },
    { key: 'error', label: 'Error', count: mockTerminals.filter(t => t.status === 'error').length },
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getFilteredTerminals = () => {
    if (filter === 'all') return mockTerminals;
    return mockTerminals.filter(terminal => terminal.status === filter);
  };

  const handleTerminalPress = (terminal: any) => {
    setActiveTerminal(terminal);
    navigation.navigate('TerminalDetail', { terminalId: terminal.id });
  };

  const handleTerminalAction = (terminal: any, action: string) => {
    console.log(`${action} on ${terminal.name}`);
    // Handle terminal actions here
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
    backButton: {
      padding: spacing.sm,
      marginRight: spacing.sm,
    },
    title: {
      fontSize: 18,
      fontFamily: fonts.display.bold,
      color: colors.text,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      padding: spacing.sm,
      marginLeft: spacing.sm,
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
    },
    filterChipTextActive: {
      color: colors.surface,
    },
    filterCount: {
      marginLeft: spacing.xs,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary,
      minWidth: 20,
      alignItems: 'center',
    },
    filterCountActive: {
      backgroundColor: colors.surface,
    },
    filterCountText: {
      fontSize: 10,
      fontFamily: fonts.display.bold,
      color: 'black',
    },
    filterCountTextActive: {
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    terminalsContainer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: fonts.display.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 16,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.xl,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      flexDirection: 'row',
      alignItems: 'center',
    },
    emptyButtonText: {
      fontSize: 16,
      fontFamily: fonts.display.semiBold,
      color: 'black',
      marginLeft: spacing.sm,
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

  const filteredTerminals = getFilteredTerminals();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Terminals</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="filter" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
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
              <Text
                style={[
                  styles.filterChipText,
                  filter === filterItem.key && styles.filterChipTextActive,
                ]}
              >
                {filterItem.label}
              </Text>
              <View
                style={[
                  styles.filterCount,
                  filter === filterItem.key && styles.filterCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    filter === filterItem.key && styles.filterCountTextActive,
                  ]}
                >
                  {filterItem.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTerminals.length > 0 ? (
          <View style={styles.terminalsContainer}>
            {filteredTerminals.map((terminal) => (
              <TerminalCard
                key={terminal.id}
                terminal={terminal}
                onPress={() => handleTerminalPress(terminal)}
                onAction={(action) => handleTerminalAction(terminal, action)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="terminal" size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No {filter} terminals</Text>
            <Text style={styles.emptyDescription}>
              {filter === 'all' 
                ? "You don't have any terminals connected yet. Connect your first terminal to get started."
                : `No terminals with ${filter} status found. Try a different filter or connect new terminals.`
              }
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('ConnectTerminal')}
            >
              <Ionicons name="add" size={20} color="black" />
              <Text style={styles.emptyButtonText}>Connect Terminal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('ConnectTerminal')}
      >
        <Ionicons name="add" size={28} color="black" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}