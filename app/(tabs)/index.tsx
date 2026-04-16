import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getTodaySessionCount, getUserProgress, getLastSessionTime } from '../../services/firestore';
import { generateQuizData, Quiz } from '../../services/quizGenerator';
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

const QUIZ_POOL: Quiz[] = generateQuizData(300);

function getRandomQuiz(excludeId: number): Quiz {
  let q: Quiz;
  do {
    q = QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)];
  } while (QUIZ_POOL.length > 1 && q.id === excludeId);
  return q;
}

export default function HomeScreen() {
  const { fontScale } = useFontSize();
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [todayTip, setTodayTip] = useState<string>('');
  const [quiz, setQuiz] = useState<Quiz>(() => {
    const dayOfYear = Math.floor(Date.now() / 86400000);
    return QUIZ_POOL[dayOfYear % QUIZ_POOL.length];
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
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

      const dayOfYear = Math.floor(Date.now() / 86400000);
      setTodayTip(TIPS[dayOfYear % TIPS.length]);
    }, [])
  );

  const handleStartExercise = async (): Promise<void> => {
    try {
      const lastSessionTime = await getLastSessionTime();
      if (lastSessionTime) {
        const sixHoursLater = new Date(lastSessionTime.getTime() + 6 * 60 * 60 * 1000);
        const now = new Date();
        if (now < sixHoursLater && sessionCount === 1) {
          const hours = sixHoursLater.getHours();
          const minutes = sixHoursLater.getMinutes().toString().padStart(2, '0');
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

  const getNewQuiz = useCallback(() => {
    setQuiz((prev: Quiz) => getRandomQuiz(prev.id));
    setSelectedAnswer(null);
    setShowResult(false);
  }, []);

  const handleAnswer = useCallback((optionValue: string) => {
    if (showResult) return;
    setSelectedAnswer(optionValue);
    setShowResult(true);
  }, [showResult]);

  const isCorrect = selectedAnswer === quiz.answer;
  const isDone = sessionCount >= 2;

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
        <Text style={[styles.progressLabel, { fontSize: 18 * fontScale }]}>오늘 손 협응 운동</Text>
        <Text style={[styles.progressCount, { fontSize: 38 * fontScale }]}>{sessionCount} / 2 회</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min((sessionCount / 2) * 100, 100)}%` }]} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.startButton, isDone && styles.startButtonDone]}
        onPress={handleStartExercise}
        disabled={isDone}
      >
        <Text style={[styles.startButtonText, { fontSize: 22 * fontScale }]}>
          {isDone ? '오늘 완료! 수고하셨어요 👏' : '▶  운동 시작하기'}
        </Text>
      </TouchableOpacity>

      <View style={styles.tipCard}>
        <Text style={[styles.tipTitle, { fontSize: 20 * fontScale }]}>💡 오늘의 건강 팁</Text>
        <Text style={[styles.tipText, { fontSize: 19 * fontScale }]}>{todayTip}</Text>
      </View>

      <View style={styles.quizCard}>
        <View style={styles.quizHeader}>
          <Text style={[styles.quizTitle, { fontSize: 20 * fontScale }]}>🧠 오늘의 퀴즈</Text>
          <TouchableOpacity onPress={getNewQuiz} style={styles.refreshBtnContainer}>
            <Text style={[styles.refreshBtn, { fontSize: 16 * fontScale }]}>새 문제</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.quizQuestion, { fontSize: 19 * fontScale }]}>{quiz.question}</Text>

        {quiz.options.map((opt: string, idx: number) => {
          const isAnswerCorrect = opt === quiz.answer;
          const isSelected = selectedAnswer === opt;

          const optionStyle: ViewStyle = showResult
            ? isAnswerCorrect
              ? { ...styles.optionBtn, ...styles.correct }
              : isSelected
              ? { ...styles.optionBtn, ...styles.wrong }
              : styles.optionBtn
            : styles.optionBtn;

          return (
            <TouchableOpacity
              key={`${quiz.id}-${idx}`}
              style={optionStyle}
              onPress={() => handleAnswer(opt)}
              disabled={showResult}
            >
              <Text style={[styles.optionText, { fontSize: 18 * fontScale }]}>
                {String.fromCharCode(9312 + idx)}  {opt}
              </Text>
            </TouchableOpacity>
          );
        })}

        {showResult && (
          <View style={styles.explanationBox}>
            <Text style={[styles.explanationText, { fontSize: 17 * fontScale }]}>
              {isCorrect ? '✅ 정답입니다!' : `❌ 오답입니다. 정답: ${quiz.answer}`}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 22, paddingTop: 64 },
  greeting: { fontWeight: '700', color: '#212121', marginBottom: 20, textAlign: 'center', letterSpacing: -1 },
  streakCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  streakEmoji: { marginRight: 14 },
  streakCount: { fontWeight: '700', color: '#E65100' },
  streakSub: { fontWeight: '600', color: '#FF6D00', marginTop: 2 },
  progressCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  progressLabel: { fontWeight: '700', color: '#000', marginBottom: 8 },
  progressCount: { fontWeight: '700', color: '#4DA56F', marginBottom: 14 },
  progressBar: { height: 12, backgroundColor: '#E3F2FD', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4A90E2', borderRadius: 6 },
  startButton: { backgroundColor: '#4DA56F', padding: 22, borderRadius: 36, alignItems: 'center', marginBottom: 20 },
  startButtonDone: { backgroundColor: '#B0BEC5' },
  startButtonText: { color: '#fff', fontWeight: '700' },
  tipCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20 },
  tipTitle: { fontWeight: '700', color: '#000', marginBottom: 10 },
  tipText: { color: '#000', lineHeight: 28 },
  quizCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 40, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  quizTitle: { fontWeight: '700', color: '#212121' },
  refreshBtnContainer: { backgroundColor: '#4DA56F', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  refreshBtn: { color: '#fff', fontWeight: '600' },
  quizQuestion: { color: '#212121', lineHeight: 30, marginBottom: 16 },
  optionBtn: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, marginBottom: 10 },
  correct: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4CAF50' },
  wrong: { backgroundColor: '#FFEBEE', borderWidth: 2, borderColor: '#EF5350' },
  optionText: { color: '#424242', lineHeight: 26 },
  explanationBox: { backgroundColor: '#F3E5F5', borderRadius: 14, padding: 16, marginTop: 10 },
  explanationText: { color: '#6A1B9A', lineHeight: 26 },
});