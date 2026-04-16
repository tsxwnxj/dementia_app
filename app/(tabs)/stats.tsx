import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { db, auth } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useFontSize } from '../../context/FontSizeContext';

interface Session {
  score: number;
  completedAt: Timestamp;
}

type DayStatus = 'complete' | 'partial' | 'none' | 'future';

export default function StatsScreen() {
  const { fontScale } = useFontSize();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [weekDays, setWeekDays] = useState<{ label: string; date: number; status: DayStatus }[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDays, setCalendarDays] = useState<{ date: number; status: DayStatus }[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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
        setWeeklyRate(Math.min(Math.round((data.length / 14) * 100), 100));
      }

      const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
      const days: { label: string; date: number; status: DayStatus }[] = [];
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const isFuture = date > today;
        const count = data.filter((s) => {
          const d = s.completedAt?.toDate?.();
          return d && d >= date && d < nextDate;
        }).length;

        days.push({
          label: dayLabels[date.getDay()],
          date: date.getDate(),
          status: isFuture ? 'future' : count >= 2 ? 'complete' : count === 1 ? 'partial' : 'none',
        });
      }
      setWeekDays(days);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !calendarOpen) return;

    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

    const q = query(
      collection(db, `users/${uid}/sessions`),
      where('completedAt', '>=', Timestamp.fromDate(firstDay)),
      where('completedAt', '<=', Timestamp.fromDate(lastDay)),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Session);
      const days: { date: number; status: DayStatus }[] = [];
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d);
        const nextDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d + 1);
        const isFuture = date > today;
        const count = data.filter((s) => {
          const sd = s.completedAt?.toDate?.();
          return sd && sd >= date && sd < nextDate;
        }).length;
        days.push({
          date: d,
          status: isFuture ? 'future' : count >= 2 ? 'complete' : count === 1 ? 'partial' : 'none',
        });
      }
      setCalendarDays(days);
    });
    return unsubscribe;
  }, [calendarOpen, calendarMonth]);

const statusEmoji = (status: DayStatus) => {
  if (status === 'complete') return '✅';
  if (status === 'partial') return '△';
  if (status === 'future') return '';
  return '❌';
};

  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthLabel = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  const goPrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  // 날짜별 그룹화
  const groupedSessions = (() => {
    const grouped: { [key: string]: number } = {};
    sessions.forEach((s) => {
      const date = s.completedAt?.toDate?.()?.toLocaleDateString('ko-KR') ?? '-';
      grouped[date] = (grouped[date] || 0) + 1;
    });
    return Object.entries(grouped).slice(0, 10);
  })();

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { fontSize: 34 * fontScale }]}>이번 주 통계</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 32 * fontScale }]}>{weeklyRate}%</Text>
          <Text style={[styles.summaryLabel, { fontSize: 14 * fontScale }]}>주간 달성률</Text>
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
        <Text style={[styles.cardTitle, { fontSize: 20 * fontScale }]}>최근 7일</Text>
        <View style={styles.weekRow}>
          {weekDays.map((day, i) => (
            <View key={i} style={styles.dayItem}>
              <Text style={[styles.dayLabel, { fontSize: 13 * fontScale }]}>{day.label}</Text>
              <Text style={[styles.dayDate, { fontSize: 12 * fontScale }]}>{day.date}</Text>
              <Text style={{ fontSize: 22 * fontScale }}>{statusEmoji(day.status)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legendRow}>
          <Text style={[styles.legendText, { fontSize: 13 * fontScale }]}>✅ 2회 완료</Text>
          <Text style={[styles.legendText, { fontSize: 13 * fontScale }]}>△ 1회 완료</Text>
          <Text style={[styles.legendText, { fontSize: 13 * fontScale }]}>❌ 미완료</Text>
        </View>

        <TouchableOpacity
          style={styles.calendarToggle}
          onPress={() => setCalendarOpen(!calendarOpen)}
        >
          <Text style={[styles.calendarToggleText, { fontSize: 14 * fontScale }]}>
            {calendarOpen ? '달력 접기 ▲' : '달력 펼치기 ▼'}
          </Text>
        </TouchableOpacity>

        {calendarOpen && (
          <View style={styles.calendar}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goPrevMonth} style={styles.navButton}>
                <Text style={[styles.navButtonText, { fontSize: 18 * fontScale }]}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { fontSize: 16 * fontScale }]}>{monthLabel}</Text>
              <TouchableOpacity onPress={goNextMonth} style={styles.navButton}>
                <Text style={[styles.navButtonText, { fontSize: 18 * fontScale }]}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarHeader}>
              {dayLabels.map((d, i) => (
                <Text key={i} style={[styles.calendarDayLabel, { fontSize: 12 * fontScale }]}>{d}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calendarCell} />
              ))}
              {calendarDays.map((day, i) => (
                <View key={i} style={styles.calendarCell}>
                  <Text style={[styles.calendarDate, { fontSize: 12 * fontScale }]}>{day.date}</Text>
                  <Text style={{ fontSize: 14 * fontScale }}>{statusEmoji(day.status)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { fontSize: 20 * fontScale }]}>최근 기록</Text>
        {groupedSessions.length === 0 ? (
          <Text style={[styles.emptyText, { fontSize: 18 * fontScale }]}>아직 운동 기록이 없어요</Text>
        ) : (
          groupedSessions.map(([date, count], i) => (
            <View key={i} style={styles.sessionRow}>
              <Text style={[styles.sessionDate, { fontSize: 18 * fontScale }]}>{date}</Text>
              <View style={[styles.scoreBadge, count >= 2 ? styles.scoreHigh : styles.scoreMid]}>
                <Text style={[styles.scoreText, { fontSize: 16 * fontScale }]}>{count}회 완료</Text>
              </View>
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
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayItem: { alignItems: 'center', gap: 4 },
  dayLabel: { color: '#9E9E9E', fontWeight: '600' },
  dayDate: { color: '#424242', fontWeight: '500' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  legendText: { color: '#9E9E9E' },
  calendarToggle: { marginTop: 16, alignItems: 'center', paddingVertical: 8, backgroundColor: '#F5F5F5', borderRadius: 12 },
  calendarToggleText: { color: '#4DA56F', fontWeight: '600' },
  calendar: { marginTop: 16 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navButton: { padding: 8 },
  navButtonText: { color: '#4DA56F', fontWeight: '700' },
  monthLabel: { fontWeight: '700', color: '#212121', textAlign: 'center' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  calendarDayLabel: { color: '#9E9E9E', fontWeight: '600', width: 36, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  calendarDate: { color: '#424242', marginBottom: 2 },
  emptyText: { color: '#BDBDBD', textAlign: 'center', paddingVertical: 20 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  sessionDate: { color: '#616161' },
  scoreBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  scoreHigh: { backgroundColor: '#E8F5E9' },
  scoreMid: { backgroundColor: '#FFF8E1' },
  scoreLow: { backgroundColor: '#FFEBEE' },
  scoreText: { fontWeight: '600', color: '#424242' },
});