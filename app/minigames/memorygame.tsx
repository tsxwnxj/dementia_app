import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFontSize } from '../../context/FontSizeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMOJIS = ['🍎','🍌','🍇','🍓','🍒','🍉'];
const SHOW_TIME = 5;

type CardType = {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
};

function createBoard(): CardType[] {
  const doubled = [...EMOJIS, ...EMOJIS];
  const shuffled = doubled.sort(() => Math.random() - 0.5);

  return shuffled.map((emoji, idx) => ({
    id: idx,
    emoji,
    flipped: true, // 🔥 처음엔 전부 보이게
    matched: false,
  }));
}

export default function MemoryGameScreen() {
  const { fontScale } = useFontSize();

  const [cards, setCards] = useState<CardType[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'showing' | 'playing' | 'gameover'>('ready');
  const [countdown, setCountdown] = useState(SHOW_TIME);

  useEffect(() => {
    AsyncStorage.getItem('memory_best').then(val => {
      if (val) setBestScore(parseInt(val));
    });
  }, []);

  // 🔥 시작
  const startGame = () => {
    const board = createBoard();
    setCards(board);
    setScore(0);
    setSelected([]);
    setCountdown(SHOW_TIME);
    setPhase('showing');
  };

  // 🔥 3초 카운트 후 뒤집기
  useEffect(() => {
    if (phase !== 'showing') return;

    if (countdown <= 0) {
      setCards(prev => prev.map(c => ({ ...c, flipped: false })));
      setPhase('playing');
      return;
    }

    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const handleFlip = (index: number) => {
    if (cards[index].flipped || cards[index].matched || selected.length === 2) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    const newSelected = [...selected, index];

    setCards(newCards);
    setSelected(newSelected);

    if (newSelected.length === 2) {
      const [a, b] = newSelected;

      if (newCards[a].emoji === newCards[b].emoji) {
        newCards[a].matched = true;
        newCards[b].matched = true;

        setScore(prev => prev + 1);

        setTimeout(() => {
          setSelected([]);

          if (newCards.every(c => c.matched)) {
            // 🔥 다음 판
            const next = createBoard();
            setCards(next);
            setCountdown(SHOW_TIME);
            setPhase('showing');
          } else {
            setCards([...newCards]);
          }
        }, 500);
      } else {
        // ❌ 틀림 → 그냥 보여주고 끝
        setTimeout(async () => {
          if (score > bestScore) {
            await AsyncStorage.setItem('memory_best', String(score));
            setBestScore(score);
          }
          setPhase('gameover');
        }, 1000);
      }
    }
  };

  // 시작 화면
  if (phase === 'ready') {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: 28 * fontScale }]}>🃏 카드 기억 게임</Text>
        <Text style={[styles.subtitle, { fontSize: 16 * fontScale }]}>
          카드를 기억하고 같은 그림을 맞춰보세요!
        </Text>

        <View style={styles.bestScoreCard}>
          <Text style={[styles.bestScoreLabel, { fontSize: 16 * fontScale }]}>🏆 최고 점수</Text>
          <Text style={[styles.bestScoreValue, { fontSize: 56 * fontScale }]}>{bestScore}</Text>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={startGame}>
          <Text style={[styles.startBtnText, { fontSize: 20 * fontScale }]}>게임 시작</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // 카드 보여주는 화면
  if (phase === 'showing') {
    return (
      <View style={styles.container}>
        <Text style={[styles.countdownText, { fontSize: 64 * fontScale }]}>{countdown}</Text>

        <View style={styles.grid}>
          {cards.map((card) => (
            <View key={card.id} style={styles.card}>
              <Text style={{ fontSize: 32 }}>{card.emoji}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // 게임 진행
  if (phase === 'playing') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setPhase('ready')}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>

        <Text style={[styles.scoreTopText, { fontSize: 20 * fontScale }]}>점수: {score}</Text>

        <View style={styles.grid}>
          {cards.map((card, i) => (
            <TouchableOpacity
              key={card.id}
              style={styles.card}
              onPress={() => handleFlip(i)}
            >
              <Text style={{ fontSize: 32 }}>
                {card.flipped || card.matched ? card.emoji : '❓'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 게임오버
  return (
    <View style={[styles.container, styles.centerContainer]}>
      <Text style={[styles.gameOverTitle, { fontSize: 30 * fontScale }]}>게임 오버!</Text>

      <View style={styles.bestScoreCard}>
        <Text style={[styles.bestScoreLabel, { fontSize: 16 * fontScale }]}>이번 점수</Text>
        <Text style={[styles.bestScoreValue, { fontSize: 56 * fontScale }]}>{score}</Text>
        <Text style={[styles.scoreSub, { fontSize: 14 * fontScale }]}>
          🏆 최고 점수: {bestScore}
        </Text>
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={startGame}>
        <Text style={[styles.startBtnText, { fontSize: 18 * fontScale }]}>다시 시작</Text>
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

  title: { fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', marginBottom: 24 },

  bestScoreCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    elevation: 5,
  },

  bestScoreLabel: { color: '#9E9E9E' },
  bestScoreValue: { fontWeight: '700', color: '#4DA56F' },
  scoreSub: { color: '#9E9E9E', marginTop: 4 },

  startBtn: {
    backgroundColor: '#4DA56F',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },

  startBtnText: { color: '#fff', fontWeight: '700' },

  quitBtn: {
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    width: '100%',
  },

  quitBtnText: { color: '#9E9E9E', fontWeight: '700' },

  scoreTopText: {
    fontWeight: '700',
    color: '#4DA56F',
    marginBottom: 10,
    textAlign: 'center',
  },

  countdownText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#4DA56F',
    marginBottom: 20,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  card: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    margin: 5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
});