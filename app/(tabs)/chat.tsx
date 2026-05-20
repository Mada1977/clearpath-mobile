import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as secureStorage from '../../src/services/secureStorage';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuth } from '../../src/context/AuthContext';
import { usePremium } from '../../src/context/PremiumContext';
import { COLORS, API_BASE_URL } from '../../src/constants';
import { openHelpline } from '../../src/constants/helplines';
import { UpgradePrompt } from '../../src/components/UpgradePrompt';

// expo-speech-recognition requires a custom native build.
// Skip require() in Expo Go and on web — native module is not registered in either.
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const IS_WEB = Platform.OS === 'web';
let SpeechModule: any = null;
if (!IS_EXPO_GO && !IS_WEB) {
  try {
    SpeechModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  } catch {}
}
const VOICE_AVAILABLE = !!SpeechModule;

const FREE_DAILY_LIMIT = 10;
const UPGRADE_PROMPT_THRESHOLD = 3;
const TTS_KEY = 'bp_tts_enabled';

type Message = { id: string; role: 'user' | 'assistant'; content: string; fromVoice?: boolean };

export default function ChatScreen() {
  const { user, refreshUser } = useAuth();
  const { isPremium, messagesUsedToday } = usePremium();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [crisis, setCrisis] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const sessionMessageCount = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const speakerAnim = useRef(new Animated.Value(1)).current;
  const pendingVoiceRef = useRef<string | null>(null);
  // Ref so the speech 'end' closure always calls the latest sendMessageText
  const sendVoiceRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    loadHistory();
    AsyncStorage.getItem(TTS_KEY).then(val => {
      setTtsEnabled(val === null ? true : val === 'true');
    });
    return () => { Speech.stop(); };
  }, []);

  // Keep the voice-send ref up to date every render
  sendVoiceRef.current = (text: string) => sendMessageText(text, true);

  // Subscribe to speech events once on mount — uses refs so no stale closures
  useEffect(() => {
    if (!SpeechModule) return;
    const subs: any[] = [
      SpeechModule.addListener('result', (event: any) => {
        const transcript = event.results?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          if (event.isFinal) pendingVoiceRef.current = transcript;
        }
      }),
      SpeechModule.addListener('end', () => {
        setIsRecording(false);
        if (pendingVoiceRef.current) {
          const text = pendingVoiceRef.current;
          pendingVoiceRef.current = null;
          sendVoiceRef.current(text);
        }
      }),
      SpeechModule.addListener('error', (event: any) => {
        setIsRecording(false);
        pendingVoiceRef.current = null;
        if (event.error !== 'aborted' && event.error !== 'no-speech') setInput('');
      }),
    ];
    return () => subs.forEach(s => s?.remove?.());
  }, []); // intentionally empty — uses refs

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [isRecording]);

  // Speaker wave animation
  useEffect(() => {
    if (speakingMsgId) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(speakerAnim, { toValue: 1.3, duration: 400, useNativeDriver: true }),
          Animated.timing(speakerAnim, { toValue: 0.8, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      speakerAnim.stopAnimation();
      speakerAnim.setValue(1);
    }
  }, [speakingMsgId]);

  async function loadHistory() {
    try {
      const token = await secureStorage.getItemAsync('accessToken');
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

  async function handleMicPress() {
    // Native module not loaded — graceful degradation for Expo Go
    if (!VOICE_AVAILABLE) {
      Alert.alert(
        'Voice input unavailable',
        'Voice input is available in the full app build (App Store / Google Play), not in Expo Go.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    if (isRecording) {
      SpeechModule.stop();
      return;
    }
    const { granted } = await SpeechModule.requestPermissionsAsync();
    if (!granted) return;

    pendingVoiceRef.current = null;
    setInput('');
    setIsRecording(true);
    SpeechModule.start({
      lang: user?.locale ?? 'en-US',
      interimResults: true,
      continuous: false,
    });
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    await sendMessageText(input.trim(), false);
  }

  async function sendMessageText(text: string, fromVoice: boolean) {
    if (!text || streaming) return;

    setLastMessage(text);

    if (!isPremium && messagesUsedToday >= FREE_DAILY_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, fromVoice };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);
    setCrisis(null);

    const token = await secureStorage.getItemAsync('accessToken');
    let fullAiResponse = '';

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      let buffer = '';

      xhr.open('POST', `${API_BASE_URL}/ai/chat`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onprogress = () => {
        const newChunk = xhr.responseText.slice(buffer.length);
        buffer = xhr.responseText;

        const lines = newChunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === 'token' && event.content) {
              fullAiResponse += event.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.content }
                  : m
              ));
              listRef.current?.scrollToEnd({ animated: false });
            }
            if (event.type === 'crisis') setCrisis(event);
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

        if (ttsEnabled && fullAiResponse) speakMessage(fullAiResponse, assistantId);

        sessionMessageCount.current += 1;
        if (!isPremium && sessionMessageCount.current >= UPGRADE_PROMPT_THRESHOLD) {
          refreshUser();
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

      xhr.send(JSON.stringify({ message: text }));
    });
  }

  function speakMessage(text: string, msgId: string) {
    Speech.stop();
    setSpeakingMsgId(msgId);
    Speech.speak(text.replace(/\*\*/g, ''), {
      language: user?.locale ?? 'en-US',
      onDone: () => setSpeakingMsgId(null),
      onStopped: () => setSpeakingMsgId(null),
      onError: () => setSpeakingMsgId(null),
    });
  }

  function toggleSpeakMessage(text: string, msgId: string) {
    if (speakingMsgId === msgId) { Speech.stop(); setSpeakingMsgId(null); }
    else speakMessage(text, msgId);
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
          <View style={styles.crisisHeader}>
            <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.crisisTitle}>If you need immediate help:</Text>
          </View>
          <Text style={styles.crisisNote}>
            Not sure which number to call? Dial 112 — works in 190+ countries.
          </Text>
          {crisis.helplines?.map((h: any, i: number) => (
            <TouchableOpacity
              key={i}
              style={[styles.crisisRow, i === 0 && styles.crisisRowEmergency]}
              onPress={() => openHelpline(h)}
              activeOpacity={0.7}
            >
              <Text style={[styles.crisisName, i === 0 && styles.crisisNameEmergency]}>
                {h.name}
              </Text>
              <Text style={[styles.crisisNumber, i === 0 && styles.crisisNumberEmergency]}>
                {h.number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        triggerMessage={lastMessage}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.role === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
              {item.role === 'assistant' && (
                <TouchableOpacity
                  style={styles.speakerBtn}
                  onPress={() => toggleSpeakMessage(item.content, item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {speakingMsgId === item.id ? (
                    <Animated.View style={{ transform: [{ scale: speakerAnim }] }}>
                      <Ionicons name="volume-high" size={16} color={COLORS.primary} />
                    </Animated.View>
                  ) : (
                    <Ionicons name="volume-medium-outline" size={16} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>
              )}
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                {item.fromVoice && item.role === 'user' && (
                  <View style={styles.voiceTag}>
                    <Ionicons name="mic" size={10} color={COLORS.primary} />
                    <Text style={styles.voiceTagText}>voice</Text>
                  </View>
                )}
                {item.role === 'user' ? (
                  <Text style={[styles.bubbleText, styles.userText]}>{item.content}</Text>
                ) : (
                  <Text style={[styles.bubbleText, styles.aiText]}>
                    {renderBold(item.content || (streaming ? '...' : ''))}
                  </Text>
                )}
              </View>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isRecording ? 'Listening...' : 'How are you feeling?'}
            placeholderTextColor={isRecording ? COLORS.danger : COLORS.textMuted}
            multiline
            onSubmitEditing={sendMessage}
            editable={!isRecording}
          />

          <Pressable onPress={handleMicPress}>
            <Animated.View style={[
              styles.micBtn,
              isRecording && styles.micBtnActive,
              { transform: [{ scale: pulseAnim }] },
            ]}>
              <Ionicons
                name={isRecording ? 'mic' : 'mic-outline'}
                size={20}
                color={isRecording ? '#fff' : COLORS.textMuted}
              />
            </Animated.View>
          </Pressable>

          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={streaming || isRecording}>
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
    i % 2 === 1 ? <Text key={i} style={styles.bold}>{part}</Text> : part
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.background },
  header:          { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle:     { fontSize: 20, fontWeight: '800', color: COLORS.text },
  headerSub:       { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  limitBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 7, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  limitBannerText: { fontSize: 12, color: COLORS.textMuted },
  crisisBox:            { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: COLORS.danger, padding: 16, margin: 12, borderRadius: 8 },
  crisisHeader:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  crisisTitle:          { color: COLORS.danger, fontWeight: '700', fontSize: 14 },
  crisisNote:           { fontSize: 11, color: '#9B1C1C', marginBottom: 10, lineHeight: 16 },
  crisisRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#FECACA' },
  crisisRowEmergency:   { backgroundColor: '#FEE2E2', marginHorizontal: -16, paddingHorizontal: 16, borderTopColor: '#FCA5A5' },
  crisisName:           { fontSize: 12, color: '#7F1D1D', flex: 1, marginRight: 8 },
  crisisNameEmergency:  { fontWeight: '700', color: COLORS.danger },
  crisisNumber:         { fontSize: 13, color: '#991B1B', fontWeight: '600' },
  crisisNumberEmergency:{ fontSize: 15, fontWeight: '800', color: COLORS.danger },
  messageList:     { padding: 16, paddingBottom: 8 },
  bubbleRow:       { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  bubbleRowRight:  { justifyContent: 'flex-end' },
  bubbleRowLeft:   { justifyContent: 'flex-start' },
  speakerBtn:      { marginRight: 4, marginBottom: 2 },
  bubble:          { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble:      { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  aiBubble:        { backgroundColor: COLORS.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  voiceTag:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  voiceTagText:    { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  bubbleText:      { fontSize: 15, lineHeight: 22 },
  bold:            { fontWeight: '700' as const },
  userText:        { color: '#fff' },
  aiText:          { color: COLORS.text },
  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.card, gap: 8 },
  input:           { flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: COLORS.text, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  micBtn:          { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  micBtnActive:    { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  sendBtn:         { backgroundColor: COLORS.primary, borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
