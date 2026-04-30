import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFontSize } from '../../context/FontSizeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORDS = [
  '사과', '바나나', '딸기', '포도', '수박', '복숭아', '귤', '감',
  '고양이', '강아지', '토끼', '곰', '호랑이', '사자', '코끼리', '기린',
  '학교', '병원', '도서관', '공원', '시장', '마트', '카페', '식당',
  '봄', '여름', '가을', '겨울', '하늘', '바다', '산', '강',
  '사랑', '행복', '희망', '기쁨', '슬픔', '화남', '두려움', '평화',
  '밥', '국', '김치', '떡볶이', '라면', '피자', '치킨', '빵',
  '책', '연필', '지우개', '가방', '안경', '시계', '핸드폰', '컴퓨터',
  '버스', '기차', '비행기', '자동차', '자전거', '오토바이', '배', '택시',
  '의사', '간호사', '선생님', '경찰', '소방관', '요리사', '운전사', '농부',
  '노래', '춤', '그림', '글', '운동', '독서', '요리', '여행',
];

type GamePhase = 'ready' | 'showing' | 'guessing' | 'gameover';

const SHOW_TIME = 3;
const EXTRA_CHARS = 6;

function getRandomWord(exclude: string[]): string {
  const pool = WORDS.filter(w => !exclude.includes(w));
  if (pool.length === 0) return WORDS[Math.floor(Math.random() * WORDS.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getKeyboard(word: string): string[] {
  const wordChars = Array.from(new Set(word.split('')));
  const others = WORDS.join('').split('').filter(c => !wordChars.includes(c));
  const uniqueOthers = Array.from(new Set(others));
  const shuffledOthers = uniqueOthers.sort(() => Math.random() - 0.5).slice(0, EXTRA_CHARS);
  return [...wordChars, ...shuffledOthers].sort(() => Math.random() - 0.5);
}

export default function WordGameScreen() {
  const { fontScale } = useFontSize();
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [currentWord, setCurrentWord] = useState('');
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(SHOW_TIME);
  const [inputChars, setInputChars] = useState<string[]>([]);
  const [keyboard, setKeyboard] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('korgame_best').then(val => {
      if (val) setBestScore(parseInt(val));
    });
  }, []);

  useEffect(() => {
    if (phase !== 'showing') return;
    if (countdown <= 0) {
      setPhase('guessing');
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const startNewWord = useCallback((exclude: string[]) => {
    const word = getRandomWord(exclude);
    setCurrentWord(word);
    setKeyboard(getKeyboard(word));
    setUsedWords(prev => [...prev, word]);
    setCountdown(SHOW_TIME);
    setInputChars([]);
    setPhase('showing');
  }, []);

  const handleStart = useCallback(() => {
    setScore(0);
    setUsedWords([]);
    setIsNewRecord(false);
    const word = getRandomWord([]);
    setCurrentWord(word);
    setKeyboard(getKeyboard(word));
    setUsedWords([word]);
    setCountdown(SHOW_TIME);
    setInputChars([]);
    setPhase('showing');
  }, []);

  const handleKeyPress = useCallback((char: string) => {
    const newInput = [...inputChars, char];
    setInputChars(newInput);

    if (newInput.length === currentWord.length) {
      const correct = newInput.join('') === currentWord;
      if (correct) {
        const newScore = score + 1;
        setScore(newScore);
        startNewWord([...usedWords]);
      } else {
        const handleGameOver = async () => {
          if (score > bestScore) {
            await AsyncStorage.setItem('korgame_best', String(score));
            setBestScore(score);
            setIsNewRecord(true);
          }
          setPhase('gameover');
        };
        handleGameOver();
      }
    }
  }, [inputChars, currentWord, score, bestScore, usedWords, startNewWord]);

  const handleDelete = useCallback(() => {
    setInputChars(prev => prev.slice(0, -1));
  }, []);

  // 시작 화면
  if (phase === 'ready') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: 28 * fontScale }]}>🇰🇷 한국어 기억 게임</Text>
        <Text style={[styles.subtitle, { fontSize: 16 * fontScale }]}>
          단어를 {SHOW_TIME}초 동안 기억하고{'\n'}글자를 눌러 단어를 맞춰보세요!{'\n'}틀리면 게임 오버!
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

  // 단어 보여주는 화면
  if (phase === 'showing') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setPhase('ready')}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.showingContainer}>
          <Text style={[styles.scoreTopText, { fontSize: 20 * fontScale }]}>점수: {score}</Text>
          <Text style={[styles.countdownText, { fontSize: 64 * fontScale }]}>{countdown}</Text>
          <Text style={[styles.showingLabel, { fontSize: 16 * fontScale }]}>이 단어를 기억하세요!</Text>
          <View style={styles.wordBox}>
            <Text style={[styles.wordText, { fontSize: 48 * fontScale }]}>{currentWord}</Text>
          </View>
        </View>
      </View>
    );
  }

  // 정답 맞추는 화면
  if (phase === 'guessing') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => setPhase('ready')}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>

        <Text style={[styles.scoreTopText, { fontSize: 20 * fontScale, textAlign: 'center', marginBottom: 8 }]}>
          점수: {score}
        </Text>

        <Text style={[styles.title, { fontSize: 22 * fontScale }]}>단어를 맞춰보세요!</Text>

        {/* 빈칸 표시 */}
        <View style={styles.blankRow}>
          {currentWord.split('').map((_, i) => (
            <View key={i} style={styles.blankBox}>
              <Text style={[styles.blankText, { fontSize: 28 * fontScale }]}>
                {inputChars[i] ?? ''}
              </Text>
            </View>
          ))}
        </View>

        {/* 지우기 버튼 */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={[styles.deleteBtnText, { fontSize: 16 * fontScale }]}>⌫ 지우기</Text>
        </TouchableOpacity>

        {/* 글자 키패드 */}
        <View style={styles.keyboard}>
          {keyboard.map((char, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(char)}
            >
              <Text style={[styles.keyText, { fontSize: 20 * fontScale }]}>{char}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // 게임 오버 화면
  return (
    <View style={[styles.container, styles.centerContainer]}>
      <Text style={[styles.resultEmoji, { fontSize: 60 * fontScale }]}>💀</Text>
      <Text style={[styles.gameOverTitle, { fontSize: 30 * fontScale }]}>게임 오버!</Text>
      <Text style={[styles.resultWord, { fontSize: 18 * fontScale }]}>정답: {currentWord}</Text>

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
  showingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  countdownText: { fontWeight: '700', color: '#4DA56F' },
  showingLabel: { color: '#666' },
  wordBox: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 40, paddingVertical: 24, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  wordText: { fontWeight: '700', color: '#212121' },
  blankRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 20, marginTop: 10 },
  blankBox: { width: 56, height: 56, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E0E0E0', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  blankText: { fontWeight: '700', color: '#212121' },
  deleteBtn: { backgroundColor: '#FFEBEE', borderRadius: 20, padding: 14, alignItems: 'center', marginBottom: 16 },
  deleteBtnText: { color: '#EF5350', fontWeight: '700' },
  keyboard: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 40 },
  keyBtn: { width: 56, height: 56, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  keyText: { fontWeight: '700', color: '#212121' },
  resultEmoji: { textAlign: 'center', marginBottom: 16 },
  resultWord: { color: '#EF5350', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  gameOverTitle: { fontWeight: '700', color: '#EF5350', textAlign: 'center', marginBottom: 8 },
  newRecordBadge: { backgroundColor: '#FFF8E1', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 16 },
  newRecordText: { color: '#F57F17', fontWeight: '700' },
  quitBtn: { backgroundColor: '#F5F5F5', borderRadius: 24, padding: 18, alignItems: 'center', width: '100%' },
  quitBtnText: { color: '#9E9E9E', fontWeight: '700' },
});