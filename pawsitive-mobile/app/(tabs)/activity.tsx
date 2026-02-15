import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function ActivityScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.calendarStrip}>
        {['S','M','T','W','T','F','S'].map((day, i) => (
          <View key={i} style={[styles.dayItem, i === 3 && styles.activeDay]}>
            <Text style={[styles.dayText, i === 3 && styles.activeText]}>{day}</Text>
            <Text style={[styles.dateText, i === 3 && styles.activeText]}>{12 + i}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.header}>Daily Goals</Text>
      
      <ScrollView style={styles.list}>
        <CheckItem title="Morning Walk (30m)" isDone={true} />
        <CheckItem title="Breakfast (1 Cup)" isDone={true} />
        <CheckItem title="Brush Teeth" isDone={false} />
        <CheckItem title="Evening Playtime" isDone={false} />
      </ScrollView>
    </View>
  );
}

const CheckItem = ({ title, isDone }: { title: string, isDone: boolean }) => (
  <View style={styles.checkRow}>
    <Ionicons 
      name={isDone ? "checkbox" : "square-outline"} 
      size={24} 
      color={isDone ? Colors.primary.orangeDark : Colors.neutral.border} 
    />
    <Text style={[styles.checkText, isDone && styles.strikeText]}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background, padding: 20 },
  calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, paddingVertical: 10 },
  dayItem: { alignItems: 'center', padding: 10, borderRadius: 12 },
  activeDay: { backgroundColor: Colors.primary.brown },
  dayText: { fontSize: 12, color: Colors.neutral.textLight, marginBottom: 5 },
  dateText: { fontSize: 16, fontWeight: 'bold', color: Colors.neutral.text },
  activeText: { color: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: Colors.neutral.text },
  list: { flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  checkText: { fontSize: 16, marginLeft: 15, color: Colors.neutral.text },
  strikeText: { textDecorationLine: 'line-through', color: Colors.neutral.textLight },
});