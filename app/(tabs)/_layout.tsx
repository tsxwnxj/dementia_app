import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4DA56F',
        tabBarInactiveTintColor: '#000000',
        tabBarStyle: { backgroundColor: '#ffffff', borderTopWidth: 0.5 },
        tabBarLabelStyle: { fontSize: 17 },
        tabBarIcon: () => null,
      }}
    >
      <Tabs.Screen name="index"   options={{ title: '홈' }} />
      <Tabs.Screen name="session" options={{ href: null }} />
      <Tabs.Screen name="stats"   options={{ title: '통계' }} />
      <Tabs.Screen name="profile" options={{ title: '설정' }} />
    </Tabs>
  );
}