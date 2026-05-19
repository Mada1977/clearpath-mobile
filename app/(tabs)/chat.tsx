import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../src/context/AuthContext';
import { usePremium } from '../../src/context/PremiumContext';
import { COLORS, API_BASE_URL } from '../../src/constants';
import { UpgradePrompt } from '../../src/components/UpgradePrompt';

const FREE_DAILY_LIMIT = 10;
const UPGRADE_PROMPT_THRESHOLD = 3;

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export default function ChatScreen() {
  const { user, refreshUser } = useAuth();
  const { isPremium, messagesUsedToday } = usePremium();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [crisis, setCrisis] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const listRef = useRef<FlatList>(null);
  const sessionMessageCount = useRef(0);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const res = await fetch(`${API_BASE_URL}/ai/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })));
      }
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const trimmed = input.trim();
    setLastMessage(trimmed);

    // Hard limit reached
    if (!isPremium && messagesUsedToday >= FREE_DAILY_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);
    setCrisis(null);

    const token = await SecureStore.getItemAsync('accessToken');

    // XHR with onprogress is the reliable SSE approach in React Native.
    // fetch ReadableStream is not consistently supported across RN versions.
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      let buffer = '';

      xhr.open('POST', `${API_BASE_URL}/ai/chat`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onprogress = () => {
        // xhr.responseText grows with each chunk — diff against what we've seen
        const newChunk = xhr.responseText.slice(buffer.length);
        buffer = xhr.responseText;

        const lines = newChunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw);
            // Backend sends { type: 'token', content: '...' }
            if (event.type === 'token' && event.content) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.content }
                  : m
              ));
              listRef.current?.scrollToEnd({ animated: false });
            }
            if (event.type === 'crisis') {
              setCrisis(event);
            }
            if (event.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: event.message } : m
              ));
            }
          } catch {}
        }
      };

      xhr.onloadend = () => {
        setStreaming(false);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        resolve();
        // Show upgrade prompt after 3rd message in session for free users
        sessionMessageCount.current += 1;
        if (!isPremium && sessionMessageCount.current >= UPGRADE_PROMPT_THRESHOLD) {
          refreshUser(); // refresh to get updated aiMessagesUsedToday
          setTimeout(() => setShowUpgrade(true), 600);
          sessionMessageCount.current = 0;
        }
      };

      xhr.onerror = () => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: 'Connection error. Please try again.' } : m
        ));
        setStreaming(false);
        resolve();
      };

      xhr.send(JSON.stringify({ message: userMsg.content }));
    });
  }

  const remainingMessages = Math.max(0, FREE_DAILY_LIMIT - messagesUsedToday);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Coach</Text>
        <Text style={styles.headerSub}>Powered by Claude</Text>
      </View>

      {!isPremium && messagesUsedToday > 0 && (
        <TouchableOpacity style={styles.limitBanner} onPress={() => setShowUpgrade(true)} activeOpacity={0.8}>
          <Text style={styles.limitBannerText}>
            {remainingMessages > 0
              ? `${remainingMessages} free message${remainingMessages !== 1 ? 's' : ''} left today`
              : 'Daily limit reached — tap to upgrade'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={remainingMessages > 0 ? COLORS.textMuted : COLORS.danger} />
        </TouchableOpacity>
      )}

      {crisis && (
        <View style={styles.crisisBox}>
          <Text style={styles.crisisTitle}>If you need immediate help:</Text>
          {crisis.helplines?.map((h: any, i: number) => (
            <Text key={i} style={styles.crisisLine}>{h.name}: {h.number}</Text>
          ))}
        </View>
      )}

      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        triggerMessage={lastMessage}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {item.role === 'user' ? (
                <Text style={[styles.bubbleText, styles.userText]}>
                  {item.content}
                </Text>
              ) : (
                <Text style={[styles.bubbleText, styles.aiText]}>
                  {renderBold(item.content || (streaming ? '...' : ''))}
                </Text>
              )}
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="How are you feeling?"
            placeholderTextColor={COLORS.textMuted}
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={streaming}>
            {streaming
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={20} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function renderBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/s);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Text key={i} style={styles.bold}>{part}</Text>
      : part
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  header:      { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  headerSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  limitBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 7, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  limitBannerText: { fontSize: 12, color: COLORS.textMuted },
  crisisBox:   { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: COLORS.danger, padding: 16, margin: 12, borderRadius: 8 },
  crisisTitle: { color: COLORS.danger, fontWeight: '700', marginBottom: 6 },
  crisisLine:  { color: '#7F1D1D', fontSize: 13, marginBottom: 2 },
  messageList: { padding: 16, paddingBottom: 8 },
  bubble:      { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  userBubble:  { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble:    { backgroundColor: COLORS.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  bubbleText:  { fontSize: 15, lineHeight: 22 },
  bold:        { fontWeight: '700' as const },
  userText:    { color: '#fff' },
  aiText:      { color: COLORS.text },
  inputRow:    { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.card, gap: 10 },
  input:       { flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: COLORS.text, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn:     { backgroundColor: COLORS.primary, borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
