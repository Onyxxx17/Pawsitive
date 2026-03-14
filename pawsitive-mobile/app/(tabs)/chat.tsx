import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const initialMessages = [
  { id: '1', text: "Woof! I'm PawPal 🐾\nAsk me anything about Mochi's health!", sender: 'bot' },
];

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });

    return () => {
      navigation.setOptions({
        headerShown: true,
        tabBarStyle: {
          backgroundColor: Colors.primary.orange,
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          height: 65,
          borderRadius: 35,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          elevation: 5,
        },
      });
    };
  }, [navigation]);

  const sendPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || isSending) return;

    const userMsg = { id: Date.now().toString(), text: trimmed, sender: 'user' as const };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMsg = { id: `${Date.now()}-bot`, text: data.response, sender: 'bot' as const };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg = {
          id: `${Date.now()}-error`,
          text: 'Oops! Something went wrong. Please try again.',
          sender: 'bot' as const,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg = {
        id: `${Date.now()}-offline`,
        text: 'Unable to connect. Please check your internet connection.',
        sender: 'bot' as const,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;
    setInputText('');
    await sendPrompt(trimmed);
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F7EADB', '#F4E9DE']}
        style={[styles.customHeader, { paddingTop: insets.top + 14 }]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary.brown} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles-outline" size={18} color={Colors.primary.brown} />
          </View>
          <View>
            <Text style={styles.headerTitle}>PawPal AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineBadge} />
              <Text style={styles.statusText}>Ready to help</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.sender === 'user' ? styles.userRow : styles.botRow]}>
              {item.sender === 'bot' ? (
                <View style={styles.botAvatar}>
                  <Ionicons name="paw-outline" size={16} color={Colors.primary.brown} />
                </View>
              ) : null}
              <View style={[styles.msgBox, item.sender === 'user' ? styles.userMsg : styles.botMsg]}>
                <Text style={[styles.msgText, item.sender === 'user' ? styles.userText : styles.botText]}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
        />

        <View style={[styles.composerShell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.composerCard}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask PawPal anything..."
              placeholderTextColor="#9D8F84"
              multiline={false}
              editable={!isSending}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || isSending) && styles.sendBtnDisabled,
              ]}
              onPress={sendMessage}
              disabled={isSending || !inputText.trim()}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFF9F2" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#FFF9F2" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCCD',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FFF7EE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  statusText: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    fontWeight: '600',
  },
  onlineBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.health.excellent,
  },
  headerSpacer: {
    width: 42,
  },
  keyboardContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  botRow: {
    alignSelf: 'flex-start',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: '#F3E5D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 6,
  },
  msgBox: {
    maxWidth: '82%',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  userMsg: {
    backgroundColor: Colors.primary.brown,
    borderColor: Colors.primary.brown,
  },
  botMsg: {
    backgroundColor: '#FFF9F3',
    borderColor: '#EADDCF',
  },
  msgText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  userText: {
    color: '#FFF9F2',
  },
  botText: {
    color: Colors.primary.brown,
  },
  composerShell: {
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  composerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F3',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EADDCF',
    paddingLeft: 16,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.primary.brown,
    height: 44,
    paddingTop: 0,
    paddingBottom: 0,
    paddingRight: 12,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary.brown,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: '#C6B9AF',
  },
});
