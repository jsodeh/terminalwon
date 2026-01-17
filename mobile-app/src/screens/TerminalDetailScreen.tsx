import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useTerminalStore } from '../store/terminalStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';

export default function TerminalDetailScreen({ navigation, route }: any) {
  const { colors } = useThemeStore();
  const { activeTerminal } = useTerminalStore();
  const [activeTab, setActiveTab] = useState<'assistant' | 'history' | 'snippets'>('assistant');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const panY = useRef(new Animated.Value(0)).current;
  const terminalHeight = useRef(new Animated.Value(0.55)).current; // 55% of screen

  // Mock terminal output
  const terminalOutput = `[10:41:58] Connecting to 192.168.1.45:22...
[10:42:01] Connection established successfully.
~ ➜ cd /var/www/project-alpha
/var/www/project-alpha ➜ ls -la
drwxr-xr-x  5 user  staff   160 Oct 24 10:00 .
drwxr-xr-x  3 user  staff    96 Oct 24 09:55 ..
-rw-r--r--  1 user  staff   420 Oct 24 10:00 package.json
drwxr-xr-x 12 user  staff   384 Oct 24 10:01 src
/var/www/project-alpha ➜ npm run build
> project-alpha@1.0.0 build
> next build
info  - Loaded env from .env.local
info  - Checking validity of types...
error - ESLint: 2 errors found.
    src/components/Header.tsx:42:15 - Missing semicolon.
    src/utils/api.ts:10:5 - 'res' is defined but never used.
/var/www/project-alpha ➜ `;

  // Mock AI conversation
  const aiMessages = [
    {
      id: '1',
      role: 'assistant',
      content: 'The build failed due to ESLint errors. Would you like me to attempt an auto-fix for the missing semicolon in Header.tsx?',
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: '2',
      role: 'user',
      content: 'Yes, please fix that and rerun the build.',
      timestamp: new Date(Date.now() - 30000),
    },
  ];

  const quickCommands = ['npm run dev', 'git status', 'docker ps', 'kill all'];

  const handleSendMessage = () => {
    if (inputText.trim()) {
      console.log('Sending message:', inputText);
      setInputText('');
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  const handleQuickCommand = (command: string) => {
    console.log('Executing command:', command);
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: panY } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY } = event.nativeEvent;
      const newHeight = Math.max(0.3, Math.min(0.8, 0.55 - translationY / 1000));
      
      Animated.spring(terminalHeight, {
        toValue: newHeight,
        useNativeDriver: false,
      }).start();
      
      panY.setValue(0);
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
    headerCenter: {
      alignItems: 'center',
    },
    terminalName: {
      fontSize: 18,
      fontFamily: fonts.display.bold,
      color: colors.text,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
      marginRight: spacing.xs,
    },
    statusText: {
      fontSize: 12,
      fontFamily: fonts.display.medium,
      color: colors.textSecondary,
    },
    settingsButton: {
      padding: spacing.sm,
    },
    contextChips: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      fontSize: 12,
      fontFamily: fonts.display.medium,
      color: colors.text,
      marginLeft: spacing.xs / 2,
    },
    terminalSection: {
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    terminalContainer: {
      backgroundColor: '#1e1e1e',
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      overflow: 'hidden',
      ...shadows.lg,
    },
    terminalHeader: {
      height: 32,
      backgroundColor: '#2d2d2d',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: '#3e3e3e',
    },
    terminalControls: {
      flexDirection: 'row',
    },
    terminalControl: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.xs,
    },
    terminalTitle: {
      fontSize: 12,
      fontFamily: fonts.mono.regular,
      color: '#888',
    },
    terminalActions: {
      flexDirection: 'row',
    },
    terminalActionButton: {
      padding: spacing.xs,
      marginLeft: spacing.xs,
    },
    terminalContent: {
      padding: spacing.sm,
      minHeight: 200,
    },
    terminalText: {
      fontFamily: fonts.mono.regular,
      fontSize: 12,
      color: '#d4d4d4',
      lineHeight: 18,
    },
    cursor: {
      width: 8,
      height: 16,
      backgroundColor: '#d4d4d4',
    },
    resizeHandle: {
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    resizeBar: {
      width: 48,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
    },
    bottomSection: {
      flex: 1,
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      ...shadows.lg,
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontFamily: fonts.display.medium,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.text,
      fontFamily: fonts.display.semiBold,
    },
    chatContainer: {
      flex: 1,
      padding: spacing.md,
    },
    messageContainer: {
      marginBottom: spacing.md,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    messageAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    messageSender: {
      fontSize: 14,
      fontFamily: fonts.display.semiBold,
      color: colors.text,
    },
    messageTime: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      marginLeft: spacing.xs,
    },
    messageBubble: {
      backgroundColor: colors.background,
      padding: spacing.sm,
      borderRadius: borderRadius.lg,
      marginLeft: 44,
    },
    messageBubbleUser: {
      backgroundColor: colors.primary,
      alignSelf: 'flex-end',
      marginLeft: 0,
      marginRight: 44,
    },
    messageText: {
      fontSize: 14,
      fontFamily: fonts.display.regular,
      color: colors.text,
      lineHeight: 20,
    },
    messageTextUser: {
      color: 'black',
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 44,
      paddingVertical: spacing.sm,
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textSecondary,
      marginRight: spacing.xs,
    },
    inputSection: {
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickCommands: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    quickCommand: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.background,
      borderRadius: borderRadius.full,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickCommandText: {
      fontSize: 12,
      fontFamily: fonts.mono.regular,
      color: colors.text,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    inputWrapper: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textInput: {
      fontSize: 16,
      fontFamily: fonts.display.regular,
      color: colors.text,
      maxHeight: 100,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorToast: {
      position: 'absolute',
      top: 80,
      left: spacing.md,
      right: spacing.md,
      backgroundColor: colors.error + 'E6',
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      ...shadows.lg,
    },
    errorToastText: {
      fontSize: 12,
      fontFamily: fonts.display.bold,
      color: 'white',
      marginLeft: spacing.sm,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.terminalName}>
            {activeTerminal?.name || 'Terminal-01'}
          </Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online • 12ms</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal style={styles.contextChips} showsHorizontalScrollIndicator={false}>
        <View style={styles.chip}>
          <Ionicons name="server" size={14} color={colors.textSecondary} />
          <Text style={styles.chipText}>Node.js</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="hardware-chip" size={14} color={colors.textSecondary} />
          <Text style={styles.chipText}>AWS-East</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="code-working" size={14} color={colors.textSecondary} />
          <Text style={styles.chipText}>v18.2.0</Text>
        </View>
      </ScrollView>

      <Animated.View style={[styles.terminalSection, { flex: terminalHeight }]}>
        <View style={styles.terminalContainer}>
          <View style={styles.terminalHeader}>
            <View style={styles.terminalControls}>
              <View style={[styles.terminalControl, { backgroundColor: '#ff5f56' }]} />
              <View style={[styles.terminalControl, { backgroundColor: '#ffbd2e' }]} />
              <View style={[styles.terminalControl, { backgroundColor: '#27c93f' }]} />
            </View>
            <Text style={styles.terminalTitle}>user@remote:~</Text>
            <View style={styles.terminalActions}>
              <TouchableOpacity style={styles.terminalActionButton}>
                <Ionicons name="search" size={16} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.terminalActionButton}>
                <Ionicons name="copy" size={16} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.terminalActionButton}>
                <Ionicons name="trash" size={16} color="#888" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.terminalContent}>
            <Text style={styles.terminalText}>
              {terminalOutput}
              <View style={styles.cursor} />
            </Text>
          </ScrollView>
        </View>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View style={styles.resizeHandle}>
            <View style={styles.resizeBar} />
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>

      <View style={styles.bottomSection}>
        <View style={styles.tabsContainer}>
          {['assistant', 'history', 'snippets'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'assistant' && (
          <>
            <ScrollView style={styles.chatContainer}>
              {aiMessages.map((message) => (
                <View key={message.id} style={styles.messageContainer}>
                  <View style={styles.messageHeader}>
                    <View style={styles.messageAvatar}>
                      <Ionicons 
                        name={message.role === 'user' ? 'person' : 'sparkles'} 
                        size={16} 
                        color="white" 
                      />
                    </View>
                    <Text style={styles.messageSender}>
                      {message.role === 'user' ? 'You' : 'AI Agent'}
                    </Text>
                    <Text style={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={[
                    styles.messageBubble,
                    message.role === 'user' && styles.messageBubbleUser
                  ]}>
                    <Text style={[
                      styles.messageText,
                      message.role === 'user' && styles.messageTextUser
                    ]}>
                      {message.content}
                    </Text>
                  </View>
                </View>
              ))}

              {isTyping && (
                <View style={styles.typingIndicator}>
                  <Animated.View style={styles.typingDot} />
                  <Animated.View style={styles.typingDot} />
                  <Animated.View style={styles.typingDot} />
                </View>
              )}
            </ScrollView>

            <View style={styles.inputSection}>
              <ScrollView horizontal style={styles.quickCommands} showsHorizontalScrollIndicator={false}>
                {quickCommands.map((command) => (
                  <TouchableOpacity
                    key={command}
                    style={styles.quickCommand}
                    onPress={() => handleQuickCommand(command)}
                  >
                    <Text style={styles.quickCommandText}>{command}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type a command or ask AI..."
                    placeholderTextColor={colors.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                  />
                </View>
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                  <Ionicons name="send" size={20} color="black" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.errorToast}>
        <Ionicons name="alert-circle" size={16} color="white" />
        <Text style={styles.errorToastText}>Build Error Detected</Text>
      </View>
    </SafeAreaView>
  );
}