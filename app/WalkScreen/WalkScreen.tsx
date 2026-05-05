import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import ActiveWalkScreen from './ActiveWalkScreen';
import WalkCourseScreen from './WalkCourseScreen';
import { router } from 'expo-router';

type Mode = null | 'select' | 'active' | 'course';
type WalkType = 'indoor' | 'outdoor';

export default function WalkScreen() {
  const [mode, setMode] = useState<Mode>(null);
  const [walkType, setWalkType] = useState<WalkType | null>(null);

  const handleWalkStart = (type: WalkType) => {
    setWalkType(type);
    setMode('active');
  };

  const handleQuit = () => {
        router.replace('/(tabs)');
        return;
      }

  if (mode === 'active' && walkType) {
    return (
      <ActiveWalkScreen
        walkType={walkType}
        onEnd={() => setMode(null)}
      />
    );
  }

  if (mode === 'course') {
    return <WalkCourseScreen onBack={() => setMode(null)} />;
  }

  return (
    <SafeAreaView style={styles.container}>

      <TouchableOpacity style={styles.quitBtn} onPress={handleQuit}>
        <Text style={styles.quitText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>산책하기</Text>
      <Text style={styles.subtitle}>오늘도 건강하게 걸어봐요!</Text>

      <TouchableOpacity
        style={[styles.card, styles.walkCard]}
        onPress={() => setMode('select')}
        activeOpacity={0.85}
      >
        <Text style={styles.cardIcon}>🏃</Text>
        <Text style={styles.cardTitle}>산책 시작</Text>
        <Text style={styles.cardDesc}>GPS로 운동량을 측정해요</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.courseCard]}
        onPress={() => setMode('course')}
        activeOpacity={0.85}
      >
        <Text style={styles.cardIcon}>🗺️</Text>
        <Text style={styles.cardTitle}>산책 코스 추천</Text>
        <Text style={styles.cardDesc}>주변 공원·등산로를 찾아드려요</Text>
      </TouchableOpacity>

      <Modal visible={mode === 'select'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>어디서 산책하실 건가요?</Text>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => handleWalkStart('outdoor')}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnIcon}>🌳</Text>
              <View>
                <Text style={styles.modalBtnText}>실외 산책</Text>
                <Text style={styles.modalBtnDesc}>GPS 경로 + 거리 측정</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => handleWalkStart('indoor')}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnIcon}>🏠</Text>
              <View>
                <Text style={styles.modalBtnText}>실내 산책</Text>
                <Text style={styles.modalBtnDesc}>시간 + 걸음 수 측정</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode(null)}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 20 },
  title: { fontSize: 35, fontWeight: 'bold', color: '#2D6A4F', marginTop: 20,marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 25, color: '#666', marginBottom: 30, textAlign: 'center' },
  card: {
    borderRadius: 40,
    padding: 30,
    marginBottom: 25,
    marginHorizontal: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  walkCard: { backgroundColor: '#4DA56F' },
  courseCard: { backgroundColor: '#4DA56F' },
  cardIcon: { fontSize: 40, marginBottom: 8 },
  cardTitle: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  cardDesc: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#F0F7F0',
    borderRadius: 15,
    marginBottom: 12,
    gap: 15,
  },
  modalBtnIcon: { fontSize: 28 },
  modalBtnText: { fontSize: 18, fontWeight: 'bold', color: '#2D6A4F' },
  modalBtnDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  cancelText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 10,
    padding: 10,
  },
   quitBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quitText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
});