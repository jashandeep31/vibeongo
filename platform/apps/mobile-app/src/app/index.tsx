import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { clearAccessToken, exchangeMobileToken, getAccessToken } from '@/lib/auth';

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'mobileapp',
  path: 'auth/callback',
});

WebBrowser.maybeCompleteAuthSession();

export default function HomeScreen() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isExchangingToken, setIsExchangingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discovery = useMemo(
    () => (backendUrl ? { authorizationEndpoint: `${backendUrl}/api/v1/auth/github` } : null),
    [],
  );
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: 'vibeongo-mobile',
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
    },
    discovery,
  );

  useEffect(() => {
    void getAccessToken()
      .then(setAccessToken)
      .catch(() => setError('Could not restore the saved session.'))
      .finally(() => setIsRestoringSession(false));
  }, []);

  useEffect(() => {
    if (!response) return;

    if (response.type !== 'success') {
      if (response.type === 'error') {
        setError(response.error?.message ?? 'Authentication failed.');
      }
      return;
    }

    const exchangeToken = response.params.token;
    if (!exchangeToken) {
      setError('The authentication callback did not include a token.');
      return;
    }

    setIsExchangingToken(true);
    setError(null);
    void exchangeMobileToken(exchangeToken)
      .then(setAccessToken)
      .catch((exchangeError: unknown) =>
        setError(exchangeError instanceof Error ? exchangeError.message : 'Authentication failed.'),
      )
      .finally(() => setIsExchangingToken(false));
  }, [response]);

  const handleLogin = async () => {
    setError(null);
    await promptAsync();
  };

  const handleLogout = async () => {
    await clearAccessToken();
    setAccessToken(null);
  };

  if (isRestoringSession || isExchangingToken) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
        <ThemedText>{isExchangingToken ? 'Finishing sign in…' : 'Restoring session…'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        {accessToken ? 'You are authenticated' : 'Sign in to VibeOngo'}
      </ThemedText>

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <Pressable
        accessibilityRole="button"
        disabled={!accessToken && !request}
        onPress={() => void (accessToken ? handleLogout() : handleLogin())}
        style={({ pressed }) => [
          styles.button,
          (!accessToken && !request) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}>
        <ThemedText style={styles.buttonText}>
          {accessToken ? 'Sign out' : 'Continue with GitHub'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#24292f',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
