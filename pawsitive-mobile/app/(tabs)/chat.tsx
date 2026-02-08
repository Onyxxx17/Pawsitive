import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';

const messages = [
  { id: 1, text: "Hi! I'm your pet health assistant. How can I help Mochi today?", sender: 'bot' },
];

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState(messages);
  const flatListRef = useRef(null);

  const sendMessage = () => {
    if (inputText.trim()) {
      const userMsg = { id: Date.now(), text: inputText, sender: 'user' };
      setChatMessages(prev => [...prev, userMsg]);
      setInputText('');
      
      // Simulate bot response
      setTimeout(() => {
        const botResponses = [
          "Mochi's health score looks great! Keep up the good work 🐶",
          "Try adding more playtime for better mental health benefits.",
          "Perfect feeding schedule! Consistency is key.",
        ];
        const botMsg = { 
          id: Date.now() + 1, 
          text: botResponses[Math.floor(Math.random() * botResponses.length)], 
          sender: 'bot' 
        };
        setChatMessages(prev => [...prev, botMsg]);
      }, 1000);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Text style={styles.title}>AI Health Assistant</Text>
      <Card style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={({ item }) => (
            <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
              <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.botText]}>
                {item.text}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about Mochi's health..."
            placeholderTextColor={Colors.neutral.textLight}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown, marginBottom: 20, paddingHorizontal: 20, paddingTop: 12 },
  chatContainer: { flex: 1, marginHorizontal: 20, padding: 20 },
  messages: { flexGrow: 1, paddingBottom: 20 },
  messageContainer: { marginBottom: 16, maxWidth: '80%' },
  userMessage: { alignSelf: 'flex-end' },
  botMessage: { alignSelf: 'flex-start' },
  messageText: { fontSize: 16, lineHeight: 22, padding: 12, borderRadius: 20 },
  userText: { backgroundColor: Colors.primary.orange, color: Colors.primary.brown },
  botText: { backgroundColor: Colors.neutral.card, color: Colors.primary.brown },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: Colors.neutral.border, paddingTop: 16
  },
  input: { 
    flex: 1, padding: 14, borderRadius: 20, 
    backgroundColor: Colors.neutral.card, 
    fontSize: 16, color: Colors.primary.brown 
  },
  sendButton: { 
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary.orange, justifyContent: 'center', alignItems: 'center'
  },
});
