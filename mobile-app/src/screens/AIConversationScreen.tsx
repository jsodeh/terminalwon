import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { fonts, spacing, borderRadius, shadows } from '../constants/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isCode?: boolean;
}

export default function AIConversationScreen({ navigation, route }: any) {
  const { colors } = useThemeStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system-1',
      role: 'system',
      content: 'System connected to remote agent at 192.168.1.42 via SSH.',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 'user-1',
      role: 'user',
      content: "I'm getting a 500 error on the /auth/login route. Can you check the nginx logs and see what's failing?",
      timestamp: new Date(Date.now() - 3000000),
    },
    {
      id: 'assistant-1',
      role: 'assistant',
      content: "I found the issue. It looks like the database connection pool is exhausted. The application is timing out while waiting for a connection.\n\nHere is the traceback from the log:",
      timestamp: new Date(Date.now() - 2900000),
    },
    {
      id: 'assistant-2',
      role: 'assistant',
      content: `File "/app/api/auth.py", line 45, in login
    user = db.query(User).filter_by(email=email).first()
File "/usr/local/lib/python3.9/site-packages/sqlalchemy/orm/query.py", line 2819, in first
    return self.limit(1).all()
sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00`,
      timestamp: new Date(Date.now() - 2880000),
      isCode: true,
    },
    {
      id: 'assistant-3',
      role: 'assistant',
      content: "I recommend increasing the DB_POOL_SIZE in your configuration.",
      timestamp: new Date(Date.now() - 2870000),
    },
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const quickActions = [
    { id: 'cmd', label: '/cmd', icon: 'terminal' },
    { id: 'file', label: '@file', icon: 'document' },
  ];

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: inputText.trim(),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      setIsTyping(true);

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: "I'll help you with that. Let me analyze the issue and provide a solution.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
      }, 2000);
    }
  };

  const handleQuickAction = (action: string) => {
    setInputText(prev => prev + action + ' ');
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) {
      return (
        <View key={message.id} style={styles.systemMessage}>
          <View style={styles.systemIcon}>
            <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.systemText}>{message.content}</Text>
        </View>
      );
    }

    return (
      <View key={message.id} style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        <View style={[styles.messageAvatar, isUser && styles.userAvatar]}>
          <Ionicons 
            name={isUser ? 'person' : 'sparkles'} 
            size={16} 
            color={isUser ? 'black' : colors.primary} 
          />
        </View>
        
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageSender}>
              {isUser ? 'You' : 'Terminal Agent'}
            </Text>
            {!isUser && (
              <Text style={styles.modelBadge}>GPT-4o</Text>
            )}
          </View>
          
          <View style={[styles.messageBubble, isUser && styles.userMessageBubble]}>
            {message.isCode ? (
              <View style={styles.codeBlock}>
                <View style={styles.codeHeader}>
                  <Text style={styles.codeLanguage}>python-traceback</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Ionicons name="copy" size={14} color={colors.textSecondary} />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal style={styles.codeContent}>
                  <Text style={styles.codeText}>{message.content}</Text>
                </ScrollView>
              </View>
            ) : (
              <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                {message.content}
              </Text>
            )}
          </View>

          {!isUser && !message.isCode && (
            <View style={styles.messageActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="checkmark" size={14} color={colors.success} />
                <Text style={[styles.actionButtonText, { color: colors.success }]}>Apply Fix</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="refresh" size={14} color={colors.textSecondary} />
                <Text style={styles.actionButtonText}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
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
    },
    headerCenter: {
      alignItems: 'center',
      flex: 1,
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
    moreButton: {
      padding: spacing.sm,
    },
    chatContainer: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    timestampSeparator: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    timestampText: {
      fontSize: 12,
      fontFamily: fonts.display.medium,
      color: colors.textSecondary,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    systemMessage: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
      opacity: 0.7,
    },
    systemIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
      marginTop: spacing.xs,
    },
    systemText: {
      flex: 1,
      fontSize: 14,
      fontFamily: fonts.display.medium,
      color: colors.textSecondary,
      fontStyle: 'italic',
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    messageContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    userMessageContainer: {
      flexDirection: 'row-reverse',
    },
    messageAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userAvatar: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      marginRight: 0,
      marginLeft: spacing.sm,
    },
    messageContent: {
      flex: 1,
      maxWidth: '85%',
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    messageSender: {
      fontSize: 14,
      fontFamily: fonts.display.bold,
      color: colors.text,
    },
    modelBadge: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      marginLeft: spacing.sm,
    },
    messageBubble: {
      backgroundColor: colors.surface,
      padding: spacing.sm,
      borderRadius: borderRadius.lg,
      borderTopLeftRadius: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userMessageBubble: {
      backgroundColor: colors.primary,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: spacing.xs,
      borderColor: colors.primary,
    },
    messageText: {
      fontSize: 14,
      fontFamily: fonts.display.regular,
      color: colors.text,
      lineHeight: 20,
    },
    userMessageText: {
      color: 'black',
    },
    codeBlock: {
      backgroundColor: '#1e1e1e',
      borderRadius: borderRadius.sm,
      overflow: 'hidden',
    },
    codeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: '#2d2d2d',
      borderBottomWidth: 1,
      borderBottomColor: '#3e3e3e',
    },
    codeLanguage: {
      fontSize: 12,
      fontFamily: fonts.mono.regular,
      color: '#888',
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    copyButtonText: {
      fontSize: 12,
      fontFamily: fonts.display.regular,
      color: colors.textSecondary,
      marginLeft: spacing.xs / 2,
    },
    codeContent: {
      padding: spacing.sm,
    },
    codeText: {
      fontFamily: fonts.mono.regular,
      fontSize: 12,
      color: '#d4d4d4',
      lineHeight: 18,
    },
    messageActions: {
      flexDirection: 'row',
      marginTop: spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.background,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 12,
      fontFamily: fonts.display.bold,
      color: colors.textSecondary,
      marginLeft: spacing.xs / 2,
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    typingBubble: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      borderTopLeftRadius: spacing.xs,
      marginLeft: 44,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typingDots: {
      flexDirection: 'row',
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textSecondary,
      marginRight: spacing.xs,
    },
    fabContainer: {
      position: 'absolute',
      bottom: 100,
      right: spacing.md,
    },
    fab: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputContainer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickActions: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    quickAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.background,
      borderRadius: borderRadius.sm,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionText: {
      fontSize: 12,
      fontFamily: fonts.mono.regular,
      color: colors.textSecondary,
      marginLeft: spacing.xs / 2,
    },
    inputRow: {
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
      maxHeight: 120,
    },
    textInput: {
      fontSize: 16,
      fontFamily: fonts.display.regular,
      color: colors.text,
      minHeight: 24,
    },
    inputActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modelBadgeInput: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      backgroundColor: colors.background,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    modelBadgeInputText: {
      fontSize: 10,
      fontFamily: fonts.display.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.terminalName}>backend-api-v2</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.timestampSeparator}>
        <Text style={styles.timestampText}>Today, 10:02 AM</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}

          {isTyping && (
            <View style={styles.typingIndicator}>
              <View style={[styles.messageAvatar]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.fab}>
            <Ionicons name="add-circle" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickAction}
                onPress={() => handleQuickAction(action.label)}
              >
                <Text style={styles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask TerminalWON..."
                placeholderTextColor={colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
            </View>
            <View style={styles.inputActions}>
              <View style={styles.modelBadgeInput}>
                <Text style={styles.modelBadgeInputText}>GPT-4</Text>
              </View>
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                <Ionicons name="arrow-up" size={20} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}