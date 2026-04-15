import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { onAuthChanged } from '../services/auth';
import { User } from 'firebase/auth';
import { setupNotifications } from '../services/notifications';
import { FontSizeProvider } from '../context/FontSizeContext';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setupNotifications();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, initializing]);

  return (
    <FontSizeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </FontSizeProvider>
  );
}