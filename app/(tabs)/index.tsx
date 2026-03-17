import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { getTodaySessionCount, getUserProgress } from '../../services/firestore';

export default function HomeScreen() {
  const [sessionCount, setSessionCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const count = await getTodaySessionCount();
        const progress = await getUserProgress();
        setSessionCount(count);
        setStreak(progress.streak ?? 0);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const isDone = sessionCount >= 2;

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>오늘의 운동</Text>
      <View style={styles.streakCard}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={styles.streakCount}>{streak}일 연속</Text>
      </View>
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>오늘 완료</Text>
        <Text style={styles.progressCount}>{sessionCount} / 2</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(sessionCount / 2) * 100}%` }]} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.startButton, isDone && styles.startButtonDone]}
        onPress={() => router.push('/(tabs)/session')}
        disabled={isDone}
      >
        <Text style={styles.startButtonText}>
          {isDone ? '오늘 완료! 내일 또 만나요 👏' : '운동 시작하기'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFE', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#212121', marginBottom: 24 },
  streakCard: { backgroundColor: '#FFF3E0', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  streakEmoji: { fontSize: 32, marginRight: 12 },
  streakCount: { fontSize: 22, fontWeight: '700', color: '#E65100' },
  progressCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 32, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  progressLabel: { fontSize: 14, color: '#9E9E9E', marginBottom: 8 },
  progressCount: { fontSize: 32, fontWeight: '700', color: '#4A90E2', marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: '#E3F2FD', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4A90E2', borderRadius: 4 },
  startButton: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 30, alignItems: 'center' },
  startButtonDone: { backgroundColor: '#B0BEC5' },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
