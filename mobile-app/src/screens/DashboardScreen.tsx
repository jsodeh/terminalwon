import React, { useEffect } from 'react';
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
import { useTerminalStore } from '../store/terminalStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';
import TerminalCard from '../components/TerminalCard';

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const { terminals, setActiveTerminal } = useTerminalStore();
  const [refreshing, setRefreshing] = React.useState(false);

  // Mock data for demo
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
  ];

  const stats = {
    activeTerminals: mockTerminals.filter(t => t.status === 'active').length,
    totalAgents: 12,
    errors: 0,
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleTerminalPress = (terminal: any) => {
    setActiveTerminal(terminal);
    navigation.navigate('Terminals', { 
      screen: 'TerminalDetail', 
      params: { terminalId: terminal.id } 
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
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    notificationButton: {
      position: 'relative',
      padding: spacing.sm,
      marginRight: spacing.sm,
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
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    content: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: fonts.display.regular,
      color: colors.text,
      marginLeft: spacing.sm,
    },
    welcomeSection: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    welcomeText: {
      fontSize: 24,
      fontFamily: fonts.display.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    statsContainer: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginRight: spacing.sm,
      ...shadows.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statCardLast: {
      marginRight: 0,
    },
    statHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    statBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.success + '20',
    },
    statBadgeText: {
      fontSize: 10,
      fontFamily: fonts.display.bold,
      color: colors.success,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: fonts.display.medium,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    statValue: {
      fontSize: 28,
      fontFamily: fonts.display.bold,
      color: colors.text,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: fonts.display.bold,
      color: colors.text,
    },
    viewAllButton: {
      fontSize: 14,
      fontFamily: fonts.display.medium,
      color: colors.primary,
    },
    terminalsContainer: {
      paddingHorizontal: spacing.md,
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
          <Text style={styles.title}>TerminalWON</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color={colors.text} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <Image
            source={{ uri: 'https://via.placeholder.com/32' }}
            style={styles.avatar}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <Text style={[styles.searchInput, { color: colors.textSecondary }]}>
              Search terminals, agents...
            </Text>
          </View>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Good Morning, Dev.</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.statsContainer}>
              <View style={[styles.statCard]}>
                <View style={styles.statHeader}>
                  <Ionicons name="server" size={24} color={colors.primary} />
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>+20%</Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.activeTerminals}</Text>
                <Text style={styles.statLabel}>Active Terminals</Text>
              </View>

              <View style={[styles.statCard]}>
                <View style={styles.statHeader}>
                  <Ionicons name="sparkles" size={24} color={colors.info} />
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>+5%</Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.totalAgents}</Text>
                <Text style={styles.statLabel}>Total Agents</Text>
              </View>

              <View style={[styles.statCard, styles.statCardLast]}>
                <View style={styles.statHeader}>
                  <Ionicons name="warning" size={24} color={colors.error} />
                  <View style={[styles.statBadge, { backgroundColor: colors.textSecondary + '20' }]}>
                    <Text style={[styles.statBadgeText, { color: colors.textSecondary }]}>0%</Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.errors}</Text>
                <Text style={styles.statLabel}>Errors</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Terminals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Terminals')}>
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.terminalsContainer}>
          {mockTerminals.map((terminal) => (
            <TerminalCard
              key={terminal.id}
              terminal={terminal}
              onPress={() => handleTerminalPress(terminal)}
              onAction={(action) => console.log(`${action} on ${terminal.name}`)}
            />
          ))}
        </View>
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