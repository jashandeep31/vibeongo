import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { exchangeMobileToken } from '@/lib/auth';

export default function AuthCallbackScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('The authentication callback did not include a token.');
      return;
    }

    void exchangeMobileToken(token)
      .then(() => router.replace('/'))
      .catch((exchangeError: unknown) =>
        setError(exchangeError instanceof Error ? exchangeError.message : 'Authentication failed.'),
      );
  }, [router, token]);

  return (
    <ThemedView style={styles.container}>
      {error ? (
        <ThemedText style={styles.error}>{error}</ThemedText>
      ) : (
        <>
          <ActivityIndicator size="large" />
          <ThemedText>Finishing sign in…</ThemedText>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
  },
});
