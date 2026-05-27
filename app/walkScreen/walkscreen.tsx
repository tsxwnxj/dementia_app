import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import ActivewalkScreen from './activewalkscreen';
import WalkCourseScreen from './walkcoursescreen';
import { router } from 'expo-router';

type Mode = null | 'active' | 'course';

export default function WalkScreen() {
  const [mode, setMode] = useState<Mode>(null);

  const handleQuit = () => {
    router.replace('/(tabs)');
  };

  if (mode === 'active') {
    return (
      <ActivewalkScreen
        walkType="outdoor"
        onEnd={() => setMode(null)}
      />
    );
  }

  if (mode === 'course') {
    return <WalkCourseScreen onBack={() => setMode(null)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.quitBtn} onPress={handleQuit}>
        <Text style={styles.quitText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>산책하기</Text>
      <Text style={styles.subtitle}>오늘도 건강하게 걸어봐요!</Text>

      <TouchableOpacity
        style={[styles.card, styles.walkCard]}
        onPress={() => setMode('active')}
        activeOpacity={0.85}
      >
        <Text style={styles.cardIcon}>🏃</Text>
        <Text style={styles.cardTitle}>산책 시작</Text>
        <Text style={styles.cardDesc}>GPS로 운동량을 측정해요</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.courseCard]}
        onPress={() => setMode('course')}
        activeOpacity={0.85}
      >
        <Text style={styles.cardIcon}>🗺️</Text>
        <Text style={styles.cardTitle}>산책 코스 추천</Text>
        <Text style={styles.cardDesc}>주변 공원·등산로를 찾아드려요</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 20 },
  title: { fontSize: 35, fontWeight: 'bold', color: '#2D6A4F', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 25, color: '#666', marginBottom: 30, textAlign: 'center' },
  card: {
    borderRadius: 40,
    padding: 30,
    marginBottom: 25,
    marginHorizontal: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  walkCard: { backgroundColor: '#4DA56F' },
  courseCard: { backgroundColor: '#4DA56F' },
  cardIcon: { fontSize: 40, marginBottom: 8 },
  cardTitle: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  cardDesc: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
  quitBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quitText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
});