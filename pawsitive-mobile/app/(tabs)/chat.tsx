import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const initialMessages = [
  { id: '1', text: "Woof! I'm PawPal 🐾\nAsk me anything about Mochi's health!", sender: 'bot' },
];

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({ 
      headerShown: false,
      tabBarStyle: { display: 'none' } 
    });

    return () => {
      navigation.setOptions({
        headerShown: true,
        tabBarStyle: {
          backgroundColor: Colors.primary.orange,
          position: 'absolute',
          bottom: 25, left: 20, right: 20, height: 65, borderRadius: 35, borderTopWidth: 0,
          shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, elevation: 5,
        }
      });
    };
  }, [navigation]);

  const sendMessage = () => {
    if (inputText.trim()) {
      const userMsg = { id: Date.now().toString(), text: inputText, sender: 'user' };
      setMessages(prev => [...prev, userMsg]);
      setInputText('');
      setTimeout(() => {
        const botMsg = { id: (Date.now()+1).toString(), text: "That's good to hear! 🐶", sender: 'bot' };
        setMessages(prev => [...prev, botMsg]);
      }, 1000);
    }
  };

  const handleBack = () => {
    router.push('/'); 
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.brown} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>PawPal AI</Text>
          <View style={styles.onlineBadge} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.msgBox, item.sender === 'user' ? styles.userMsg : styles.botMsg]}>
              <Text style={[styles.msgText, item.sender === 'user' ? styles.userText : styles.botText]}>
                {item.text}
              </Text>
            </View>
          )}
        />
        
        <View style={styles.inputArea}>
          <TextInput 
            style={styles.input} 
            value={inputText} 
            onChangeText={setInputText} 
            placeholder="Ask PawPal..." 
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="arrow-up" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: Colors.neutral.background,
  },
  backButton: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary.brown },
  onlineBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.health.excellent },

  keyboardContainer: { flex: 1 },
  list: { padding: 20, paddingBottom: 20 },
  
  msgBox: { marginBottom: 12, maxWidth: '80%' },
  userMsg: { alignSelf: 'flex-end' },
  botMsg: { alignSelf: 'flex-start' },
  
  msgText: { fontSize: 16, padding: 14, borderRadius: 20, overflow: 'hidden' },
  userText: { backgroundColor: Colors.primary.brown, color: Colors.primary.orange },
  botText: { backgroundColor: '#fff', color: Colors.primary.brown },
  
  inputArea: { 
    flexDirection: 'row', 
    padding: 16, 
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
    backgroundColor: '#fff', 
    gap: 10, 
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  input: { 
    flex: 1, 
    backgroundColor: Colors.neutral.background, 
    padding: 12, 
    paddingTop: 12,
    borderRadius: 24, 
    fontSize: 16,
    maxHeight: 100, 
  },
  sendBtn: { 
    width: 48, height: 48, 
    backgroundColor: Colors.primary.orange, 
    borderRadius: 24, 
    justifyContent: 'center', alignItems: 'center' 
  },
});