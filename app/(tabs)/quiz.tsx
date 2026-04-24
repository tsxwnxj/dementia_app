import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { generateQuizData, Quiz } from '../../services/quizGenerator';
import { useFontSize } from '../../context/FontSizeContext';
import { completeQuizToday } from '../../services/firestore';

const QUIZ_POOL: Quiz[] = generateQuizData(300);

function getTodayQuizSet(): Quiz[] {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const start = (dayOfYear * 10) % (QUIZ_POOL.length - 10);
  return QUIZ_POOL.slice(start, start + 10);
}

export default function QuizScreen() {
  const { fontScale } = useFontSize();
  const [quizSet] = useState<Quiz[]>(() => getTodayQuizSet());
  const [step, setStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [wrongQuizzes, setWrongQuizzes] = useState<Quiz[]>([]);
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [retrySet, setRetrySet] = useState<Quiz[]>([]);
  const [retryStep, setRetryStep] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const currentQuiz = isRetryMode ? retrySet[retryStep] : quizSet[step];
  const totalSteps = isRetryMode ? retrySet.length : quizSet.length;
  const currentStep = isRetryMode ? retryStep : step;

  const handleAnswer = useCallback(async (optionValue: string) => {
    if (showResult) return;
    setSelectedAnswer(optionValue);
    setShowResult(true);

    const isCorrect = optionValue === currentQuiz.answer;
    if (!isCorrect && !isRetryMode) {
      setWrongQuizzes(prev => [...prev, currentQuiz]);
    }
  }, [showResult, currentQuiz, isRetryMode]);

  const handleNext = useCallback(async () => {
    if (isRetryMode) {
      if (retryStep + 1 < retrySet.length) {
        setRetryStep(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        await completeSession();
      }
    } else {
      if (step + 1 < quizSet.length) {
        setStep(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        if (wrongQuizzes.length > 0) {
          setIsRetryMode(true);
          setRetrySet(wrongQuizzes);
          setRetryStep(0);
          setSelectedAnswer(null);
          setShowResult(false);
          Alert.alert('재도전! 🔄', `틀린 문제 ${wrongQuizzes.length}개를 다시 풀어볼게요!`);
        } else {
          await completeSession();
        }
      }
    }
  }, [isRetryMode, retryStep, retrySet, step, quizSet, wrongQuizzes]);

  const completeSession = async () => {
    try {
      await completeQuizToday();
      setSessionDone(true);
      Alert.alert(
        '퀴즈 완료! 🎉',
        '오늘 퀴즈를 완료했어요!',
        [{ text: '확인', onPress: () => router.back() }]
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!currentQuiz) return null;

  const isCorrect = selectedAnswer === currentQuiz.answer;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { fontSize: 28 * fontScale }]}>🧠 오늘의 퀴즈</Text>

      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { fontSize: 15 * fontScale }]}>
          {isRetryMode ? '재도전 🔄 ' : ''}{currentStep + 1} / {totalSteps}
        </Text>
        {wrongQuizzes.length > 0 && !isRetryMode && (
          <Text style={[styles.wrongCount, { fontSize: 15 * fontScale }]}>
            틀린 문제 {wrongQuizzes.length}개
          </Text>
        )}
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentStep + 1) / totalSteps) * 100}%` }]} />
      </View>

      <View style={styles.quizCard}>
        <Text style={[styles.quizQuestion, { fontSize: 19 * fontScale }]}>{currentQuiz.question}</Text>

        {currentQuiz.options.map((opt: string, idx: number) => {
          const isAnswerCorrect = opt === currentQuiz.answer;
          const isSelected = selectedAnswer === opt;

          const optionStyle = showResult
            ? isAnswerCorrect
              ? { ...styles.optionBtn, ...styles.correct }
              : isSelected
              ? { ...styles.optionBtn, ...styles.wrong }
              : styles.optionBtn
            : styles.optionBtn;

          return (
            <TouchableOpacity
              key={`${currentQuiz.id}-${idx}`}
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
          <>
            <View style={styles.explanationBox}>
              <Text style={[styles.explanationText, { fontSize: 17 * fontScale }]}>
                {isCorrect ? '✅ 정답입니다!' : `❌ 오답입니다. 정답: ${currentQuiz.answer}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={[styles.nextBtnText, { fontSize: 16 * fontScale }]}>
                {isRetryMode
                  ? retryStep + 1 < retrySet.length ? '다음 문제 →' : '완료하기 ✅'
                  : step + 1 < quizSet.length ? '다음 문제 →' : wrongQuizzes.length > 0 ? '재도전하기 🔄' : '완료하기 ✅'
                }
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 22, paddingTop: 64 },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#2D6A4F', fontWeight: '600' },
  title: { fontWeight: '700', color: '#212121', marginBottom: 16, textAlign: 'center' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { color: '#4DA56F', fontWeight: '700' },
  wrongCount: { color: '#EF5350', fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: '#E3F2FD', borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: '100%', backgroundColor: '#4DA56F', borderRadius: 4 },
  quizCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 40, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  quizQuestion: { color: '#212121', lineHeight: 30, marginBottom: 16 },
  optionBtn: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, marginBottom: 10 },
  correct: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4CAF50' },
  wrong: { backgroundColor: '#FFEBEE', borderWidth: 2, borderColor: '#EF5350' },
  optionText: { color: '#424242', lineHeight: 26 },
  explanationBox: { backgroundColor: '#F3E5F5', borderRadius: 14, padding: 16, marginTop: 10 },
  explanationText: { color: '#6A1B9A', lineHeight: 26 },
  nextBtn: { backgroundColor: '#4DA56F', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 12 },
  nextBtnText: { color: '#fff', fontWeight: '700' },
});