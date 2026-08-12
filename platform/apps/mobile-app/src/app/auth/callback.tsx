import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function AuthCallbackScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>GitHub authentication succeeded</ThemedText>
      <ThemedText themeColor="textSecondary">Temporary JWT:</ThemedText>
      <ScrollView style={styles.tokenContainer} contentContainerStyle={styles.tokenContent}>
        <ThemedText selectable style={styles.token}>
          {token ?? 'No token was returned.'}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    padding: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  tokenContainer: {
    flexGrow: 0,
    maxHeight: 280,
  },
  tokenContent: {
    padding: 16,
  },
  token: {
    fontFamily: 'monospace',
    fontSize: 13,
  },
});
