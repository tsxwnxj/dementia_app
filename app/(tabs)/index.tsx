import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getTodaySessionCount, getUserProgress, getLastSessionTime } from '../../services/firestore';
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
  const [walkDone, setWalkDone] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!auth.currentUser) return;
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
          Alert.alert(
            '잠깐만요! 🧠',
            `지금은 연습모드만 가능해요! 오후에 다시 시도해 주세요`,
            [
              { text: '나중에 하기', style: 'cancel' },
              {
                text: '연습하기',
                onPress: () => router.push({ pathname: '/tutorial', params: { isPractice: 'true' } }),
              },
            ]
          );
          return;
        }
      }
      router.push({ pathname: '/tutorial', params: { isPractice: 'false' } });
    } catch (e) {
      console.error(e);
      router.push({ pathname: '/tutorial', params: { isPractice: 'false' } });
    }
  };

  const isDone = sessionCount >= 2;
  const totalDone = (isDone ? 1 : 0) + (walkDone ? 1 : 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <Text style={[styles.greeting, { fontSize: 34 * fontScale }]}>오늘의 두뇌 훈련</Text>

      {/* 건강 팁 */}
      <View style={styles.tipCard}>
        <Text style={[styles.tipTitle, { fontSize: 20 * fontScale }]}>💡 오늘의 건강 팁</Text>
        <Text style={[styles.tipText, { fontSize: 19 * fontScale }]}>{todayTip}</Text>
      </View>

      {/* 상단 카드 */}
      <View style={styles.topRow}>
        <View style={[styles.streakCard, styles.half, styles.uniformCard]}>
          <Text style={[styles.streakEmoji, { fontSize: 40 * fontScale }]}>🔥</Text>
          <Text style={[styles.streakCount, { fontSize: 26 * fontScale }]}>{streak}일 연속</Text>
          <Text style={[styles.streakSub, { fontSize: 18 * fontScale }]}>파이팅!</Text>
        </View>

        <View style={[styles.progressCard, styles.half, styles.uniformCard]}>
          <Text style={[styles.progressLabel, { fontSize: 20 * fontScale }]}>오늘의 미션</Text>
          <Text style={[styles.progressLabel, { fontSize: 15 * fontScale }]}>손 운동과 산책하기를 완료하세요!</Text>
          <Text style={[styles.progressCount, { fontSize: 30 * fontScale }]}>{totalDone} / 2</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((totalDone / 2) * 100, 100)}%` }]} />
          </View>
        </View>
      </View>

      {/* 손 운동 */}
      <TouchableOpacity
        style={[styles.questCard, isDone && styles.questBtnDone]}
        onPress={handleStartExercise}
        disabled={isDone}
      >
        <Text style={[styles.questCardText, { fontSize: 22 * fontScale }]}>🖐️ 손 운동</Text>
        <Text style={[styles.questCount, isDone && styles.questCountDone]}>
          {isDone ? '✅' : sessionCount === 1 ? '1 / 2' : ''}
        </Text>
      </TouchableOpacity>

      {/* 산책 */}
      <TouchableOpacity
        style={[styles.questCard, walkDone && styles.questBtnDone]}
        disabled={walkDone}
        onPress={() => router.push('/walkScreen/walkscreen')}
      >
        <Text style={[styles.questCardText, { fontSize: 22 * fontScale }]}>🚶 산책하기</Text>
        <Text style={[styles.questCount, walkDone && styles.questCountDone]}>
          {walkDone ? '✅' : ''}
        </Text>
      </TouchableOpacity>

      {/* 미니게임 */}
      <TouchableOpacity
        style={styles.questCard}
        onPress={() => router.push('/(tabs)/minigame')}
      >
        <Text style={[styles.questCardText, { fontSize: 22 * fontScale }]}>🎮 미니게임</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 22, paddingTop: 64 },
  greeting: { fontWeight: '700', color: '#212121', marginBottom: 20, textAlign: 'center' },

  topRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  half: { flex: 1 },
  uniformCard: { minHeight: 150 },

  streakCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  streakEmoji: { marginBottom: 6 },
  streakCount: { fontWeight: '700', color: '#E65100', textAlign: 'center' },
  streakSub: { fontWeight: '600', color: '#FF6D00', marginTop: 2, textAlign: 'center' },

  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  progressLabel: { fontWeight: '700', marginBottom: 8 },
  progressCount: { fontWeight: '700', color: '#4DA56F', marginBottom: 14 },
  progressBar: { height: 12, backgroundColor: '#E3F2FD', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4A90E2', borderRadius: 6 },

  questCard: {
    backgroundColor: '#4DA56F',
    borderRadius: 20,
    padding: 24,
    minHeight: 110,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  questCardText: { fontWeight: '700', color: '#fff', textAlign: 'center' },
  questBtnDone: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4DA56F' },
  questCount: { color: '#fff', fontWeight: '700', fontSize: 16, position: 'absolute', right: 24 },
  questCountDone: { color: '#4DA56F' },

  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  tipTitle: { fontWeight: '700', marginBottom: 10 },
  tipText: { lineHeight: 28 },
});