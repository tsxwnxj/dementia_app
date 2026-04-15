import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { db, auth } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useFontSize } from '../../context/FontSizeContext';

interface Session {
  score: number;
  completedAt: Timestamp;
}

export default function StatsScreen() {
  const { fontScale } = useFontSize();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const q = query(
      collection(db, `users/${uid}/sessions`),
      where('completedAt', '>=', Timestamp.fromDate(weekAgo)),
      orderBy('completedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Session);
      setSessions(data);
      if (data.length > 0) {
        setAvgScore(Math.round(data.reduce((sum, s) => sum + s.score, 0) / data.length));
        setWeeklyRate(Math.min(Math.round((data.length / 14) * 100), 100));
      }
    });
    return unsubscribe;
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { fontSize: 34 * fontScale }]}>이번 주 통계</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 32 * fontScale }]}>{weeklyRate}%</Text>
          <Text style={[styles.summaryLabel, { fontSize: 14 * fontScale }]}>주간 달성률</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 32 * fontScale }]}>{avgScore}</Text>
          <Text style={[styles.summaryLabel, { fontSize: 14 * fontScale }]}>평균 점수</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 32 * fontScale }]}>{sessions.length}</Text>
          <Text style={[styles.summaryLabel, { fontSize: 14 * fontScale }]}>완료 횟수</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { fontSize: 20 * fontScale }]}>주간 달성률</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${weeklyRate}%` }]} />
        </View>
        <Text style={[styles.progressText, { fontSize: 16 * fontScale }]}>{sessions.length} / 14회</Text>
      </View>
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { fontSize: 20 * fontScale }]}>최근 기록</Text>
        {sessions.length === 0 ? (
          <Text style={[styles.emptyText, { fontSize: 18 * fontScale }]}>아직 운동 기록이 없어요</Text>
        ) : (
          sessions.slice(0, 10).map((s, i) => (
            <View key={i} style={styles.sessionRow}>
              <Text style={[styles.sessionDate, { fontSize: 18 * fontScale }]}>
                {s.completedAt?.toDate?.()?.toLocaleDateString('ko-KR') ?? '-'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 22, paddingTop: 64 },
  title: { fontWeight: '700', color: '#212121', marginBottom: 24, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  summaryValue: { fontWeight: '700', color: '#4DA56F' },
  summaryLabel: { color: '#9E9E9E', marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontWeight: '700', color: '#212121', marginBottom: 16 },
  progressBar: { height: 14, backgroundColor: '#E9F8E7', borderRadius: 7, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', backgroundColor: '#58b84b', borderRadius: 7 },
  progressText: { color: '#9E9E9E', textAlign: 'right' },
  emptyText: { color: '#BDBDBD', textAlign: 'center', paddingVertical: 20 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  sessionDate: { color: '#616161' },
  scoreBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  scoreHigh: { backgroundColor: '#E8F5E9' },
  scoreMid: { backgroundColor: '#FFF8E1' },
  scoreLow: { backgroundColor: '#FFEBEE' },
  scoreText: { fontWeight: '600', color: '#424242' },
});