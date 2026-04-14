import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { onAuthChanged } from '../services/auth';
import { User } from 'firebase/auth';
import { setupNotifications } from './notifications';
import { initializeKakaoSDK } from '@react-native-kakao/core';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initializeKakaoSDK('e762d1d9bb4d6747b68bef981907a99a');
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
      setupNotifications();
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, initializing]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
