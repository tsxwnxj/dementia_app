import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { generateQuizData, Quiz } from '../../services/quizGenerator';
import { useFontSize } from '../../context/FontSizeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUIZ_POOL: Quiz[] = generateQuizData(300);

function getRandomQuiz(exclude: number[]): Quiz {
  const pool = QUIZ_POOL.filter(q => !exclude.includes(q.id));
  if (pool.length === 0) return QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

type GamePhase = 'ready' | 'playing' | 'gameover';

export default function QuizScreen() {
  const { fontScale } = useFontSize();
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [usedIds, setUsedIds] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('quiz_best').then(val => {
      if (val) setBestScore(parseInt(val));
    });
  }, []);

  const handleStart = useCallback(() => {
    const quiz = getRandomQuiz([]);
    setCurrentQuiz(quiz);
    setUsedIds([quiz.id]);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsNewRecord(false);
    setPhase('playing');
  }, []);

  const handleAnswer = useCallback(async (optionValue: string) => {
    if (showResult) return;
    setSelectedAnswer(optionValue);
    setShowResult(true);

    const isCorrect = optionValue === currentQuiz?.answer;

    if (isCorrect) {
      // 정답 → 바로 다음 문제
      const newScore = score + 1;
      setScore(newScore);
      setTimeout(() => {
        const nextQuiz = getRandomQuiz(usedIds);
        setCurrentQuiz(nextQuiz);
        setUsedIds(prev => [...prev, nextQuiz.id]);
        setSelectedAnswer(null);
        setShowResult(false);
      }, 800);
    } else {
      // 오답 → 게임 오버
      setTimeout(async () => {
        if (score > bestScore) {
          await AsyncStorage.setItem('quiz_best', String(score));
          setBestScore(score);
          setIsNewRecord(true);
        }
        setPhase('gameover');
      }, 1000);
    }
  }, [showResult, currentQuiz, score, bestScore, usedIds]);

  if (!currentQuiz && phase === 'playing') return null;

  // 시작 화면
  if (phase === 'ready') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: 28 * fontScale }]}>🧠 퀴즈 게임</Text>
        <Text style={[styles.subtitle, { fontSize: 16 * fontScale }]}>
          정답을 맞추면 다음 문제로!{'\n'}틀리면 게임 오버!{'\n'}최고 점수에 도전하세요!
        </Text>

        <View style={styles.bestScoreCard}>
          <Text style={[styles.bestScoreLabel, { fontSize: 16 * fontScale }]}>🏆 최고 점수</Text>
          <Text style={[styles.bestScoreValue, { fontSize: 56 * fontScale }]}>{bestScore}</Text>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
          <Text style={[styles.startBtnText, { fontSize: 20 * fontScale }]}>게임 시작! 🎮</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // 게임 화면
  if (phase === 'playing' && currentQuiz) {
    const isCorrect = selectedAnswer === currentQuiz.answer;

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => setPhase('ready')}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>

        <Text style={[styles.scoreTopText, { fontSize: 20 * fontScale, textAlign: 'center', marginBottom: 16 }]}>
          점수: {score}
        </Text>

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
            <View style={[styles.explanationBox, isCorrect ? styles.explanationCorrect : styles.explanationWrong]}>
              <Text style={[styles.explanationText, { fontSize: 17 * fontScale }]}>
                {isCorrect ? '✅ 정답! 다음 문제로...' : `❌ 오답! 정답: ${currentQuiz.answer}`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // 게임 오버 화면
  return (
    <View style={[styles.container, styles.centerContainer]}>
      <Text style={[styles.resultEmoji, { fontSize: 60 * fontScale }]}>💀</Text>
      <Text style={[styles.gameOverTitle, { fontSize: 30 * fontScale }]}>게임 오버!</Text>
      <Text style={[styles.resultWord, { fontSize: 18 * fontScale }]}>정답: {currentQuiz?.answer}</Text>

      {isNewRecord && (
        <View style={styles.newRecordBadge}>
          <Text style={[styles.newRecordText, { fontSize: 16 * fontScale }]}>🎊 새로운 최고 점수!</Text>
        </View>
      )}

      <View style={styles.bestScoreCard}>
        <Text style={[styles.bestScoreLabel, { fontSize: 16 * fontScale }]}>이번 점수</Text>
        <Text style={[styles.bestScoreValue, { fontSize: 56 * fontScale }]}>{score}</Text>
        <Text style={[styles.scoreSub, { fontSize: 14 * fontScale }]}>🏆 최고 점수: {bestScore}</Text>
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
        <Text style={[styles.startBtnText, { fontSize: 18 * fontScale }]}>다시 도전! 🎮</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quitBtn} onPress={() => setPhase('ready')}>
        <Text style={[styles.quitBtnText, { fontSize: 16 * fontScale }]}>메인으로</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 22, paddingTop: 64 },
  centerContainer: { justifyContent: 'center', alignItems: 'center' },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#2D6A4F', fontWeight: '600' },
  title: { fontWeight: '700', color: '#212121', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 28 },
  bestScoreCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  bestScoreLabel: { color: '#9E9E9E', marginBottom: 4 },
  bestScoreValue: { fontWeight: '700', color: '#4DA56F' },
  scoreSub: { color: '#9E9E9E', marginTop: 4 },
  scoreTopText: { fontWeight: '700', color: '#4DA56F' },
  startBtn: { backgroundColor: '#4DA56F', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 12, width: '100%' },
  startBtnText: { color: '#fff', fontWeight: '700' },
  quizCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  quizQuestion: { color: '#212121', lineHeight: 30, marginBottom: 16 },
  optionBtn: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, marginBottom: 10 },
  correct: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4CAF50' },
  wrong: { backgroundColor: '#FFEBEE', borderWidth: 2, borderColor: '#EF5350' },
  optionText: { color: '#424242', lineHeight: 26 },
  explanationBox: { borderRadius: 14, padding: 16, marginTop: 10 },
  explanationCorrect: { backgroundColor: '#E8F5E9' },
  explanationWrong: { backgroundColor: '#FFEBEE' },
  explanationText: { lineHeight: 26, fontWeight: '600', color: '#424242' },
  resultEmoji: { textAlign: 'center', marginBottom: 16 },
  resultWord: { color: '#EF5350', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  gameOverTitle: { fontWeight: '700', color: '#EF5350', textAlign: 'center', marginBottom: 8 },
  newRecordBadge: { backgroundColor: '#FFF8E1', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 16 },
  newRecordText: { color: '#F57F17', fontWeight: '700' },
  quitBtn: { backgroundColor: '#F5F5F5', borderRadius: 24, padding: 18, alignItems: 'center', width: '100%' },
  quitBtnText: { color: '#9E9E9E', fontWeight: '700' },
});