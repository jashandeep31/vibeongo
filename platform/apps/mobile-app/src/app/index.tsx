import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
const authRedirectUrl = 'exp://fedora:8081/--/auth/callback';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isAuthenticated = false;

  const handleGithubLogin = async () => {
    if (!backendUrl) {
      console.error('EXPO_PUBLIC_BACKEND_URL is not configured');
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(
      `${backendUrl}/api/v1/auth/github`,
      authRedirectUrl,
    );

    if (result.type !== 'success') return;

    const token = new URL(result.url).searchParams.get('token');
    if (!token) return;

    router.push({ pathname: '/auth/callback', params: { token } });
  };

  return (
    <ThemedView style={styles.container}>
      {isAuthenticated ? (
        <ThemedText style={styles.message}>Hello World</ThemedText>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleGithubLogin()}
          style={({ pressed }) => [
            styles.githubButton,
            colorScheme === 'dark' ? styles.githubButtonDark : styles.githubButtonLight,
            pressed && styles.githubButtonPressed,
          ]}>
          <ThemedText
            style={[
              styles.githubButtonText,
              colorScheme === 'dark' ? styles.githubButtonTextDark : styles.githubButtonTextLight,
            ]}>
            Continue with GitHub
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    fontSize: 32,
    fontWeight: '600',
  },
  githubButton: {
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  githubButtonLight: {
    backgroundColor: '#24292f',
  },
  githubButtonDark: {
    backgroundColor: '#f0f6fc',
  },
  githubButtonPressed: {
    opacity: 0.75,
  },
  githubButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  githubButtonTextLight: {
    color: '#ffffff',
  },
  githubButtonTextDark: {
    color: '#24292f',
  },
});
