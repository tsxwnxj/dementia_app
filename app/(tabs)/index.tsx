import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getTodaySessionCount, getUserProgress, getLastSessionTime, getTodaySpeakCount } from '../../services/firestore';
import { auth } from '../../services/firebase';
import { useFontSize } from '../../context/FontSizeContext';

const TIPS: string[] = [
  "매일 새로운 것을 배우면 뇌 신경 연결이 강화됩니다.",
  "규칙적인 운동은 치매 위험을 30% 낮춥니다.",
  "충분한 수면은 뇌의 노폐물을 제거하는 데 도움이 됩니다.",
  "사회적 활동은 인지 기능 유지에 큰 도움이 됩니다.",
  "지중해식 식단은 치매 예방에 효과적입니다.",
  "독서와 글쓰기는 뇌를 활성화시킵니다.",
  "스트레스 관리는 뇌 건강에 매우 중요합니다.",
];

export default function HomeScreen() {
  const { fontScale } = useFontSize();
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [todayTip, setTodayTip] = useState<string>('');
  const [speakCount, setSpeakCount] = useState<number>(0);
  const [walkDone, setWalkDone] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!auth.currentUser) return;
        try {
          const count = await getTodaySessionCount();
          const progress = await getUserProgress();
          const speak = await getTodaySpeakCount();
          setSessionCount(count);
          setStreak(progress.streak ?? 0);
          setSpeakCount(speak);
        } catch (e) {
          console.error(e);
        }
      };
      load();

      const dayOfYear = Math.floor(Date.now() / 86400000);
      setTodayTip(TIPS[dayOfYear % TIPS.length]);
    }, [])
  );

  const handleStartExercise = async (): Promise<void> => {
    try {
      const lastSessionTime = await getLastSessionTime();
      if (lastSessionTime) {
        const twoHoursLater = new Date(lastSessionTime.getTime() + 2 * 60 * 60 * 1000);
        const now = new Date();
        if (now < twoHoursLater && sessionCount === 1) {
          const hours = twoHoursLater.getHours();
          const minutes = twoHoursLater.getMinutes().toString().padStart(2, '0');
          const period = hours < 12 ? '오전' : '오후';
          const displayHour = hours > 12 ? hours - 12 : hours;
          const timeStr = `${period} ${displayHour}시 ${minutes}분`;

          Alert.alert(
            '잠깐만요! 🧠',
            `${timeStr} 이후에 하면 뇌 건강에 더 효과적이에요!`,
            [
              { text: '나중에 하기', style: 'cancel' },
              {
                text: '연습하기',
                onPress: () => router.push({ pathname: '/(tabs)/session', params: { isPractice: 'true' } }),
              },
            ]
          );
          return;
        }
      }
      router.push('/(tabs)/session');
    } catch (e) {
      console.error(e);
      router.push('/(tabs)/session');
    }
  };

  const isDone = sessionCount >= 2;
  const speakDone = speakCount >= 2;
  const totalDone = (isDone ? 1 : 0) + (walkDone ? 1 : 0) + (speakDone ? 1 : 0);

  const getCountLabel = (count: number) => {
    if (count === 0) return '';
    if (count === 1) return '1 / 2';
    return '2 / 2';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <Text style={[styles.greeting, { fontSize: 34 * fontScale }]}>오늘의 두뇌 훈련</Text>

      <View style={styles.streakCard}>
        <Text style={[styles.streakEmoji, { fontSize: 40 * fontScale }]}>🔥</Text>
        <View>
          <Text style={[styles.streakCount, { fontSize: 26 * fontScale }]}>{streak}일 연속</Text>
          <Text style={[styles.streakSub, { fontSize: 18 * fontScale }]}>꾸준히 하고 있어요!</Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <Text style={[styles.progressLabel, { fontSize: 18 * fontScale }]}>일일 퀘스트</Text>
        <Text style={[styles.progressCount, { fontSize: 38 * fontScale }]}>{totalDone} / 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min((totalDone / 3) * 100, 100)}%` }]} />
        </View>
      </View>

      <View style={styles.questRow}>
        <TouchableOpacity
          style={[styles.questBtn, isDone && styles.questBtnDone]}
          onPress={handleStartExercise}
          disabled={isDone}
        >
          <Text style={{ fontSize: 28 * fontScale }}>🖐️</Text>
          <Text style={[styles.questLabel, { fontSize: 13 * fontScale }]}>손 운동</Text>
          <Text style={[styles.questCount, { fontSize: 13 * fontScale }]}>
            {isDone ? '✅' : sessionCount === 1 ? '1 / 2' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.questBtn, walkDone && styles.questBtnDone]}
          disabled={walkDone}
          onPress={() => router.push('/WalkScreen/WalkScreen')}
        >
          <Text style={{ fontSize: 28 * fontScale }}>🚶</Text>
          <Text style={[styles.questLabel, { fontSize: 13 * fontScale }]}>산책하기</Text>
          <Text style={[styles.questCount, { fontSize: 13 * fontScale }]}>
            {walkDone ? '✅' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.questBtn, speakDone && styles.questBtnDone]}
          disabled={speakDone}
          onPress={() => Alert.alert('말하기 퀘스트', '준비 중이에요! 🎤')}
        >
          <Text style={{ fontSize: 28 * fontScale }}>🎤</Text>
          <Text style={[styles.questLabel, { fontSize: 13 * fontScale }]}>말하기</Text>
          <Text style={[styles.questCount, { fontSize: 13 * fontScale }]}>
            {getCountLabel(speakCount)}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipCard}>
        <Text style={[styles.tipTitle, { fontSize: 20 * fontScale }]}>💡 오늘의 건강 팁</Text>
        <Text style={[styles.tipText, { fontSize: 19 * fontScale }]}>{todayTip}</Text>
      </View>

      <TouchableOpacity
        style={styles.minigameBtn}
        onPress={() => router.push('/(tabs)/minigame')}
      >
        <Text style={[styles.minigameBtnText, { fontSize: 20 * fontScale }]}>🎮 미니게임</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 22, paddingTop: 64 },
  greeting: { fontWeight: '700', color: '#212121', marginBottom: 20, textAlign: 'center', letterSpacing: -1 },
  streakCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  streakEmoji: { marginRight: 14 },
  streakCount: { fontWeight: '700', color: '#E65100' },
  streakSub: { fontWeight: '600', color: '#FF6D00', marginTop: 2 },
  progressCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  progressLabel: { fontWeight: '700', color: '#000', marginBottom: 8 },
  progressCount: { fontWeight: '700', color: '#4DA56F', marginBottom: 14 },
  progressBar: { height: 12, backgroundColor: '#E3F2FD', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4A90E2', borderRadius: 6 },
  questRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  questBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 16, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  questBtnDone: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4DA56F' },
  questLabel: { color: '#424242', fontWeight: '600', textAlign: 'center' },
  questCount: { color: '#4DA56F', fontWeight: '700' },
  tipCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  tipTitle: { fontWeight: '700', color: '#000', marginBottom: 10 },
  tipText: { color: '#000', lineHeight: 28 },
  minigameBtn: { backgroundColor: '#4DA56F', padding: 20, borderRadius: 36, alignItems: 'center', marginBottom: 40 },
  minigameBtnText: { color: '#fff', fontWeight: '700' },
});