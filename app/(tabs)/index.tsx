import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { getTodaySessionCount, getUserProgress } from '../../services/firestore';

const TIPS = [
  "매일 새로운 것을 배우면 뇌 신경 연결이 강화됩니다.",
  "규칙적인 운동은 치매 위험을 30% 낮춥니다.",
  "충분한 수면은 뇌의 노폐물을 제거하는 데 도움이 됩니다.",
  "사회적 활동은 인지 기능 유지에 큰 도움이 됩니다.",
  "지중해식 식단은 치매 예방에 효과적입니다.",
  "독서와 글쓰기는 뇌를 활성화시킵니다.",
  "스트레스 관리는 뇌 건강에 매우 중요합니다.",
];

const QUIZZES = [
  { question: "규칙적인 유산소 운동이 치매 예방에 도움이 되는 이유는?", options: ["근육 강화", "뇌 혈류 증가", "소화 개선", "시력 향상"], answer: 1, explanation: "유산소 운동은 뇌로 가는 혈류를 증가시키고 뇌세포를 보호하는 단백질 생성을 촉진합니다." },
  { question: "치매 예방에 효과적인 식단은?", options: ["고지방 식단", "지중해식 식단", "탄수화물 위주 식단", "단백질 위주 식단"], answer: 1, explanation: "지중해식 식단은 올리브유, 생선, 채소, 견과류가 풍부해 뇌 건강에 매우 효과적입니다." },
  { question: "수면 중 뇌에서 일어나는 중요한 활동은?", options: ["기억 강화와 노폐물 제거", "새로운 세포 생성", "산소 소비 증가", "신경 연결 차단"], answer: 0, explanation: "수면 중 뇌는 기억을 장기 저장하고 독소와 노폐물을 제거하는 중요한 과정을 수행합니다." },
  { question: "다음 중 인지 기능 유지에 가장 도움이 되는 활동은?", options: ["TV 시청", "독서와 퍼즐", "과도한 낮잠", "스마트폰 게임"], answer: 1, explanation: "독서와 퍼즐은 뇌의 여러 영역을 동시에 활성화시켜 인지 기능 유지에 효과적입니다." },
  { question: "손 협응 운동이 뇌 건강에 좋은 이유는?", options: ["근력 강화", "소뇌와 전두엽 동시 활성화", "심폐 기능 향상", "관절 유연성 증가"], answer: 1, explanation: "손의 정교한 움직임은 뇌의 여러 영역을 동시에 자극해 신경 연결을 강화합니다." },
];

export default function HomeScreen() {
  const [sessionCount, setSessionCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [todayTip, setTodayTip] = useState('');
  const [quiz, setQuiz] = useState(QUIZZES[0]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const count = await getTodaySessionCount();
        const progress = await getUserProgress();
        setSessionCount(count);
        setStreak(progress.streak ?? 0);
      } catch (e) { console.error(e); }
    };
    load();
    const dayOfYear = Math.floor(Date.now() / 86400000);
    setTodayTip(TIPS[dayOfYear % TIPS.length]);
    setQuiz(QUIZZES[dayOfYear % QUIZZES.length]);
  }, []);

  const getNewQuiz = () => {
    const randomIdx = Math.floor(Math.random() * QUIZZES.length);
    setQuiz(QUIZZES[randomIdx]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleAnswer = (idx: number) => {
    if (showResult) return;
    setSelectedAnswer(idx);
    setShowResult(true);
  };

  const isDone = sessionCount >= 2;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.greeting}>오늘의 두뇌 훈련</Text>

      <View style={styles.streakCard}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <View>
          <Text style={styles.streakCount}>{streak}일 연속</Text>
          <Text style={styles.streakSub}>꾸준히 하고 있어요!</Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>오늘 손 협응 운동</Text>
        <Text style={styles.progressCount}>{sessionCount} / 2 회</Text>
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
          {isDone ? '오늘 완료! 수고하셨어요 👏' : '▶  운동 시작하기'}
        </Text>
      </TouchableOpacity>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>💡 오늘의 건강 팁</Text>
        <Text style={styles.tipText}>{todayTip}</Text>
      </View>

      <View style={styles.quizCard}>
        <View style={styles.quizHeader}>
          <Text style={styles.quizTitle}>🧠 오늘의 퀴즈</Text>
          <TouchableOpacity onPress={getNewQuiz} style={styles.refreshBtnContainer}>
            <Text style={styles.refreshBtn}>새 문제</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.quizQuestion}>{quiz.question}</Text>
        {quiz.options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.optionBtn,
              selectedAnswer === idx && (idx === quiz.answer ? styles.correct : styles.wrong),
              showResult && idx === quiz.answer && styles.correct,
            ]}
            onPress={() => handleAnswer(idx)}
            disabled={showResult}
          >
            <Text style={styles.optionText}>{String.fromCharCode(9312 + idx)}  {opt}</Text>
          </TouchableOpacity>
        ))}
        {showResult && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationText}>
              {selectedAnswer === quiz.answer ? '✅ 정답입니다!' : '❌ 오답입니다.'}{'\n'}{quiz.explanation}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFE', padding: 22, paddingTop: 64 },
  greeting: { fontSize: 34, fontWeight: '700', color: '#212121', marginBottom: 20 },
  streakCard: { backgroundColor: '#FFF3E0', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  streakEmoji: { fontSize: 40, marginRight: 14 },
  streakCount: { fontSize: 26, fontWeight: '700', color: '#E65100' },
  streakSub: { fontSize: 16, color: '#FF6D00', marginTop: 2 },
  progressCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  progressLabel: { fontSize: 18, color: '#9E9E9E', marginBottom: 8 },
  progressCount: { fontSize: 38, fontWeight: '700', color: '#4A90E2', marginBottom: 14 },
  progressBar: { height: 12, backgroundColor: '#E3F2FD', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4A90E2', borderRadius: 6 },
  startButton: { backgroundColor: '#4A90E2', padding: 22, borderRadius: 36, alignItems: 'center', marginBottom: 20 },
  startButtonDone: { backgroundColor: '#B0BEC5' },
  startButtonText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  tipCard: { backgroundColor: '#E8F5E9', borderRadius: 20, padding: 20, marginBottom: 20 },
  tipTitle: { fontSize: 18, fontWeight: '700', color: '#2E7D32', marginBottom: 10 },
  tipText: { fontSize: 18, color: '#388E3C', lineHeight: 28 },
  quizCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 40, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  quizTitle: { fontSize: 20, fontWeight: '700', color: '#212121' },
  refreshBtnContainer: { backgroundColor: '#E3F2FD', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  refreshBtn: { fontSize: 16, color: '#4A90E2', fontWeight: '600' },
  quizQuestion: { fontSize: 19, color: '#212121', lineHeight: 30, marginBottom: 16 },
  optionBtn: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, marginBottom: 10 },
  correct: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4CAF50' },
  wrong: { backgroundColor: '#FFEBEE', borderWidth: 2, borderColor: '#EF5350' },
  optionText: { fontSize: 18, color: '#424242', lineHeight: 26 },
  explanationBox: { backgroundColor: '#F3E5F5', borderRadius: 14, padding: 16, marginTop: 10 },
  explanationText: { fontSize: 17, color: '#6A1B9A', lineHeight: 26 },
});
