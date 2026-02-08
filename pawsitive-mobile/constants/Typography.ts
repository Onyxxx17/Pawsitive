import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

export const Typography = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '700', color: Colors.primary.brown },
  h2: { fontSize: 24, fontWeight: '600', color: Colors.primary.brown },
  h3: { fontSize: 20, fontWeight: '600', color: Colors.primary.brown },
  body: { fontSize: 16, fontWeight: '400', color: Colors.neutral.text },
  caption: { fontSize: 14, fontWeight: '400', color: Colors.neutral.textLight },
});
