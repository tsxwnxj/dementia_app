import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { db, auth } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { useFontSize } from '../../context/FontSizeContext';

interface Session {
  completedAt: Timestamp;
}

type DayStatus = 'complete' | 'partial' | 'none' | 'future';

interface RecordItem {
  date: string;
  time: string;
  type: 'session' | 'speak';
  count: number;
  max: number;
}

export default function StatsScreen() {
  const { fontScale } = useFontSize();
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [weekDays, setWeekDays] = useState<{ label: string; date: number; status: DayStatus }[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDays, setCalendarDays] = useState<{ date: number; status: DayStatus }[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [recentRecords, setRecentRecords] = useState<RecordItem[]>([]);

  const checkDayComplete = async (uid: string, date: Date): Promise<{ status: DayStatus; sessionCount: number; speakCount: number }> => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [sessionSnap, speakSnap] = await Promise.all([
      getDocs(query(collection(db, `users/${uid}/sessions`), where('completedAt', '>=', Timestamp.fromDate(start)), where('completedAt', '<=', Timestamp.fromDate(end)))),
      getDocs(query(collection(db, `users/${uid}/speakSessions`), where('completedAt', '>=', Timestamp.fromDate(start)), where('completedAt', '<=', Timestamp.fromDate(end)))),
    ]);

    const sessionCount = Math.min(sessionSnap.size, 2);
    const speakCount = Math.min(speakSnap.size, 2);

    const allComplete = sessionCount >= 2 && speakCount >= 2;
    const anyDone = sessionCount > 0 || speakCount > 0;

    return {
      status: allComplete ? 'complete' : anyDone ? 'partial' : 'none',
      sessionCount,
      speakCount,
    };
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours < 12 ? '오전' : '오후';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${period} ${displayHour}:${minutes}`;
  };

  const loadRecentRecords = async (uid: string) => {
    const records: RecordItem[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const dateStr = date.toLocaleDateString('ko-KR');

      const [sessionSnap, speakSnap] = await Promise.all([
        getDocs(query(
          collection(db, `users/${uid}/sessions`),
          where('completedAt', '>=', Timestamp.fromDate(date)),
          where('completedAt', '<', Timestamp.fromDate(nextDate)),
          orderBy('completedAt', 'asc')
        )),
        getDocs(query(
          collection(db, `users/${uid}/speakSessions`),
          where('completedAt', '>=', Timestamp.fromDate(date)),
          where('completedAt', '<', Timestamp.fromDate(nextDate)),
          orderBy('completedAt', 'asc')
        )),
      ]);

      const items: { time: number; timeStr: string; type: 'session' | 'speak' }[] = [];

      sessionSnap.docs.forEach(doc => {
        const d = doc.data().completedAt?.toDate?.();
        if (d) items.push({ time: d.getTime(), timeStr: formatTime(d), type: 'session' });
      });
      speakSnap.docs.forEach(doc => {
        const d = doc.data().completedAt?.toDate?.();
        if (d) items.push({ time: d.getTime(), timeStr: formatTime(d), type: 'speak' });
      });

      items.sort((a, b) => a.time - b.time);

      const counts = { session: 0, speak: 0 };
      const maxCounts = { session: 2, speak: 2 };
      const lastTime: { session: string; speak: string } = { session: '', speak: '' };

      items.forEach(item => {
        counts[item.type] = Math.min(counts[item.type] + 1, maxCounts[item.type]);
        lastTime[item.type] = item.timeStr;
      });

      if (counts.session > 0) {
        records.push({ date: dateStr, time: lastTime.session, type: 'session', count: counts.session, max: maxCounts.session });
      }
      if (counts.speak > 0) {
        records.push({ date: dateStr, time: lastTime.speak, type: 'speak', count: counts.speak, max: maxCounts.speak });
      }
    }

    setRecentRecords(records.reverse());
  };

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
    const unsubscribe = onSnapshot(q, async () => {
      const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const dayPromises = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        return date;
      });

      const results = await Promise.all(
        dayPromises.map(date => {
          const isFuture = date > today;
          if (isFuture) return Promise.resolve({ status: 'future' as DayStatus, sessionCount: 0, speakCount: 0 });
          return checkDayComplete(uid, date);
        })
      );

      const completeDays = results.filter(r => r.status === 'complete').length;
      setWeeklyRate(Math.min(Math.round((completeDays / 7) * 100), 100));

      setWeekDays(dayPromises.map((date, i) => ({
        label: dayLabels[date.getDay()],
        date: date.getDate(),
        status: results[i].status,
      })));

      await loadRecentRecords(uid);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !calendarOpen) return;

    const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const loadCalendar = async () => {
      const dayPromises = Array.from({ length: lastDay.getDate() }, (_, i) =>
        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i + 1)
      );

      const results = await Promise.all(
        dayPromises.map(date => {
          const isFuture = date > today;
          if (isFuture) return Promise.resolve({ status: 'future' as DayStatus, sessionCount: 0, speakCount: 0 });
          return checkDayComplete(uid, date);
        })
      );

      setCalendarDays(dayPromises.map((date, i) => ({
        date: date.getDate(),
        status: results[i].status,
      })));
    };

    loadCalendar();
  }, [calendarOpen, calendarMonth]);

  const statusEmoji = (status: DayStatus) => {
    if (status === 'complete') return '✅';
    if (status === 'partial') return '△';
    if (status === 'future') return '';
    return ' ';
  };

  const typeLabel = (type: 'session' | 'speak') => {
    if (type === 'session') return '손운동';
    return '말하기';
  };

  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthLabel = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  const goPrevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const goNextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { fontSize: 34 * fontScale }]}>이번 주 통계</Text>

      <View style={styles.card}>
        <View style={styles.rateRow}>
          <Text style={[styles.cardTitle, { fontSize: 20 * fontScale }]}>주간 달성률</Text>
          <Text style={[styles.rateValue, { fontSize: 32 * fontScale }]}>{weeklyRate}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${weeklyRate}%` }]} />
        </View>
        <Text style={[styles.progressText, { fontSize: 16 * fontScale }]}>손 운동과 산책하기를 완료하세요!</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { fontSize: 20 * fontScale }]}>
            {calendarOpen ? monthLabel : '최근 7일'}
          </Text>
          <TouchableOpacity
            style={styles.calendarToggle}
            onPress={() => setCalendarOpen(!calendarOpen)}
          >
            <Text style={[styles.calendarToggleText, { fontSize: 14 * fontScale }]}>
              {calendarOpen ? '접기 ▲' : '달력 ▼'}
            </Text>
          </TouchableOpacity>
        </View>

        {!calendarOpen ? (
          <>
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
              <Text style={[styles.legendText, { fontSize: 13 * fontScale }]}>✅ 전체 완료</Text>
              <Text style={[styles.legendText, { fontSize: 13 * fontScale }]}>△ 일부 완료</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goPrevMonth} style={styles.navButton}>
                <Text style={[styles.navButtonText, { fontSize: 18 * fontScale }]}>{'<'}</Text>
              </TouchableOpacity>
              <View style={styles.monthNavCenter} />
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
            <View style={styles.legendRow}>
              <Text style={[styles.legendText, { fontSize: 13 * fontScale }]}>✅ 전체 완료</Text>
              <Text style={[styles.legendText, { fontSize: 13 * fontScale }]}>△ 일부 완료</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { fontSize: 20 * fontScale }]}>최근 기록</Text>
        {recentRecords.length === 0 ? (
          <Text style={[styles.emptyText, { fontSize: 18 * fontScale }]}>아직 기록이 없어요</Text>
        ) : (
          recentRecords.map((record, i) => (
            <View key={i} style={styles.recordRow}>
              <View>
                <Text style={[styles.recordDate, { fontSize: 15 * fontScale }]}>{record.date}</Text>
                <Text style={[styles.recordTime, { fontSize: 13 * fontScale }]}>{record.time}</Text>
              </View>
              <Text style={[styles.recordDetail, { fontSize: 16 * fontScale }]}>
                {typeLabel(record.type)} {record.count}/{record.max}
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
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rateValue: { fontWeight: '700', color: '#4DA56F' },
  cardTitle: { fontWeight: '700', color: '#212121' },
  progressBar: { height: 14, backgroundColor: '#E9F8E7', borderRadius: 7, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', backgroundColor: '#58b84b', borderRadius: 7 },
  progressText: { color: '#9E9E9E', textAlign: 'right' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayItem: { alignItems: 'center', gap: 4 },
  dayLabel: { color: '#9E9E9E', fontWeight: '600' },
  dayDate: { color: '#424242', fontWeight: '500' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  legendText: { color: '#9E9E9E' },
  calendarToggle: { backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  calendarToggleText: { color: '#4DA56F', fontWeight: '600' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthNavCenter: { flex: 1 },
  navButton: { padding: 8 },
  navButtonText: { color: '#4DA56F', fontWeight: '700' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  calendarDayLabel: { color: '#9E9E9E', fontWeight: '600', width: 36, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  calendarDate: { color: '#424242', marginBottom: 2 },
  emptyText: { color: '#BDBDBD', textAlign: 'center', paddingVertical: 20 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  recordDate: { color: '#616161', fontWeight: '600' },
  recordTime: { color: '#9E9E9E', marginTop: 2 },
  recordDetail: { color: '#4DA56F', fontWeight: '700' },
});