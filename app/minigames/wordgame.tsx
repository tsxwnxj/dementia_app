import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFontSize } from '../../context/FontSizeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORDS = [
'cat', 'dog', 'sun', 'hat', 'pen', 'cup', 'box', 'map', 'bus', 'egg',
'arm', 'bed', 'car', 'ear', 'fan', 'gum', 'hop', 'ink', 'jam', 'key',
'apple', 'bread', 'chair', 'dream', 'earth', 'flame', 'grape', 'house',
'image', 'juice', 'knife', 'light', 'money', 'night', 'ocean', 'paint',
'queen', 'river', 'sugar', 'tiger',
'bridge', 'castle', 'doctor', 'engine', 'flight', 'garden', 'hammer',
'island', 'jungle', 'kitten', 'mirror', 'nature', 'orange', 'purple',
'rocket', 'silver', 'tunnel', 'village', 'winter', 'yellow',
];

type GamePhase = 'ready' | 'showing' | 'guessing' | 'gameover';

const SHOW_TIME = 3;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const EXTRA_LETTERS = 6; // 정답 외 추가 알파벳 수

function getRandomWord(exclude: string[]): string {
  const pool = WORDS.filter(w => !exclude.includes(w));
  if (pool.length === 0) return WORDS[Math.floor(Math.random() * WORDS.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getKeyboard(word: string): string[] {
  const wordLetters = Array.from(new Set(word.split('')));
  const others = ALPHABET.filter(l => !wordLetters.includes(l));
  const shuffledOthers = others.sort(() => Math.random() - 0.5).slice(0, EXTRA_LETTERS);
  return [...wordLetters, ...shuffledOthers].sort(() => Math.random() - 0.5);
}

export default function WordGameScreen() {
  const { fontScale } = useFontSize();
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [currentWord, setCurrentWord] = useState('');
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(SHOW_TIME);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<(string | undefined)[]>([]);
  const [keyboard, setKeyboard] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('wordgame_best').then(val => {
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

  const startNewWord = useCallback((exclude: string[], currentScore: number) => {
    const word = getRandomWord(exclude);
    setCurrentWord(word);
    setKeyboard(getKeyboard(word));
    setUsedWords(prev => [...prev, word]);
    setCountdown(SHOW_TIME);
    setRevealedIndices([]);
    setSelectedLetters([]);
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
    setRevealedIndices([]);
    setSelectedLetters([]);
    setPhase('showing');
  }, []);

  const revealHint = useCallback(() => {
    const unrevealed = currentWord.split('').map((_, i) => i).filter(i => !revealedIndices.includes(i));
    if (unrevealed.length === 0) return;
    const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setRevealedIndices(prev => [...prev, randomIndex]);
  }, [currentWord, revealedIndices]);

  const handleLetterSelect = useCallback((letter: string) => {
    const nextEmptyIndex = currentWord.split('').findIndex(
      (_, i) => !revealedIndices.includes(i) && !selectedLetters[i]
    );
    if (nextEmptyIndex === -1) return;

    const newSelected = [...selectedLetters];
    newSelected[nextEmptyIndex] = letter;
    setSelectedLetters(newSelected);

    const allFilled = currentWord.split('').every(
      (_, i) => revealedIndices.includes(i) || newSelected[i]
    );

    if (allFilled) {
      const answer = currentWord.split('').map(
        (l, i) => revealedIndices.includes(i) ? l : newSelected[i]
      ).join('');
      const correct = answer === currentWord;

      if (correct) {
        // 정답 → 바로 다음 문제
        const newScore = score + 1;
        setScore(newScore);
        startNewWord([...usedWords], newScore);
      } else {
        // 오답 → 게임 오버
        const handleGameOver = async () => {
          if (score > bestScore) {
            await AsyncStorage.setItem('wordgame_best', String(score));
            setBestScore(score);
            setIsNewRecord(true);
          }
          setPhase('gameover');
        };
        handleGameOver();
      }
    }
  }, [selectedLetters, currentWord, revealedIndices, score, bestScore, usedWords, startNewWord]);

  const handleDelete = useCallback(() => {
    const newSelected = [...selectedLetters];
    for (let i = newSelected.length - 1; i >= 0; i--) {
      if (newSelected[i] && !revealedIndices.includes(i)) {
        newSelected[i] = undefined;
        break;
      }
    }
    setSelectedLetters(newSelected);
  }, [selectedLetters, revealedIndices]);

  // 시작 화면
  if (phase === 'ready') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: 28 * fontScale }]}>🔤 영단어 기억 게임</Text>
        <Text style={[styles.subtitle, { fontSize: 16 * fontScale }]}>
          단어를 {SHOW_TIME}초 동안 기억하고{'\n'}알파벳을 맞춰보세요!{'\n'}틀리면 게임 오버!
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
          <View style={styles.wordContainer}>
            {currentWord.split('').map((letter, i) => (
              <View key={i} style={styles.letterBox}>
                <Text style={[styles.letterText, { fontSize: 36 * fontScale }]}>{letter}</Text>
              </View>
            ))}
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

        <View style={styles.blankRow}>
          {currentWord.split('').map((letter, i) => (
            <View key={i} style={[styles.blankBox, revealedIndices.includes(i) && styles.blankBoxRevealed]}>
              <Text style={[styles.blankText, { fontSize: 28 * fontScale }]}>
                {revealedIndices.includes(i) ? letter : selectedLetters[i] ?? ''}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.hintBtn, revealedIndices.length >= currentWord.length && styles.hintBtnDisabled]}
          onPress={revealHint}
          disabled={revealedIndices.length >= currentWord.length}
        >
          <Text style={[styles.hintBtnText, { fontSize: 16 * fontScale }]}>
            💡 힌트 ({currentWord.length - revealedIndices.length}개 남음)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={[styles.deleteBtnText, { fontSize: 16 * fontScale }]}>⌫ 지우기</Text>
        </TouchableOpacity>

        {/* 줄인 키패드 */}
        <View style={styles.keyboard}>
          {keyboard.map((letter) => {
            const isRevealed = revealedIndices.some(i => currentWord[i] === letter);
            return (
              <TouchableOpacity
                key={letter}
                style={[styles.keyBtn, isRevealed && styles.keyBtnRevealed]}
                onPress={() => handleLetterSelect(letter)}
                disabled={isRevealed}
              >
                <Text style={[styles.keyText, { fontSize: 18 * fontScale }]}>{letter}</Text>
              </TouchableOpacity>
            );
          })}
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
  bestScoreCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  bestScoreLabel: { color: '#9E9E9E', marginBottom: 4 },
  bestScoreValue: { fontWeight: '700', color: '#4DA56F' },
  scoreSub: { color: '#9E9E9E', marginTop: 4 },
  scoreTopText: { fontWeight: '700', color: '#4DA56F' },
  startBtn: { backgroundColor: '#4DA56F', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 12, width: '100%' },
  startBtnText: { color: '#fff', fontWeight: '700' },
  showingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  countdownText: { fontWeight: '700', color: '#4DA56F' },
  showingLabel: { color: '#666' },
  wordContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  letterBox: { width: 52, height: 52, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  letterText: { fontWeight: '700', color: '#212121' },
  blankRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20, marginTop: 10 },
  blankBox: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E0E0E0' },
  blankBoxRevealed: { backgroundColor: '#E8F5E9', borderColor: '#4DA56F' },
  blankText: { fontWeight: '700', color: '#212121' },
  hintBtn: { backgroundColor: '#FFF8E1', borderRadius: 20, padding: 14, alignItems: 'center', marginBottom: 10 },
  hintBtnDisabled: { opacity: 0.4 },
  hintBtnText: { color: '#F57F17', fontWeight: '700' },
  deleteBtn: { backgroundColor: '#FFEBEE', borderRadius: 20, padding: 14, alignItems: 'center', marginBottom: 16 },
  deleteBtnText: { color: '#EF5350', fontWeight: '700' },
  keyboard: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 40 },
  keyBtn: { width: 52, height: 52, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  keyBtnRevealed: { backgroundColor: '#E8F5E9' },
  keyText: { fontWeight: '700', color: '#212121' },
  resultEmoji: { textAlign: 'center', marginBottom: 16 },
  resultWord: { color: '#EF5350', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  gameOverTitle: { fontWeight: '700', color: '#EF5350', textAlign: 'center', marginBottom: 8 },
  newRecordBadge: { backgroundColor: '#FFF8E1', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 16 },
  newRecordText: { color: '#F57F17', fontWeight: '700' },
  quitBtn: { backgroundColor: '#F5F5F5', borderRadius: 24, padding: 18, alignItems: 'center', width: '100%' },
  quitBtnText: { color: '#9E9E9E', fontWeight: '700' },
});