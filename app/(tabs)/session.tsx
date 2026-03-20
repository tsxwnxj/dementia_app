import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { saveSession } from '../../services/firestore';
import { requireNativeModule, EventEmitter } from 'expo-modules-core';

const GestureRecognition = requireNativeModule('GestureRecognition');
const emitter = new EventEmitter(GestureRecognition);

export default function SessionScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [currentGesture, setCurrentGesture] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await GestureRecognition.loadModel();
        await GestureRecognition.startCamera();
        setIsReady(true);
        console.log('모듈 초기화 완료');
      } catch (e) {
        console.error('초기화 실패:', e);
      }
    };
    init();

    const subscription = emitter.addListener('onGestureResult', (result: any) => {
      setCurrentGesture(result.gestureKo);
      setConfidence(result.score);
      setRepCount(prev => prev + 1);
      setTotalScore(prev => prev + result.score);
    });

    return () => {
      subscription.remove();
      GestureRecognition.stopCamera();
    };
  }, []);

  const handleToggle = async () => {
    if (isRunning) {
      await GestureRecognition.stopDetection();
    } else {
      await GestureRecognition.startDetection();
    }
    setIsRunning(!isRunning);
  };

  const finishSession = async () => {
    if (repCount === 0) {
      Alert.alert('운동을 먼저 진행해주세요');
      return;
    }
    try {
      await GestureRecognition.stopDetection();
      await saveSession({
        score: Math.round(totalScore / repCount),
        exerciseType: 'finger_coordination',
        durationSeconds: repCount,
        feedback: currentGesture,
      });
      Alert.alert('운동 완료! 🎉', `평균 점수: ${Math.round(totalScore / repCount)}점`, [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      Alert.alert('저장 중 오류가 발생했어요');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.cameraText}>카메라 실행 중</Text>
      </View>
      {!isReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>초기화 중...</Text>
        </View>
      )}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>횟수: {repCount}</Text>
        <Text style={styles.infoText}>평균: {repCount > 0 ? Math.round(totalScore / repCount) : 0}점</Text>
      </View>
      {currentGesture !== '' && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>{currentGesture}</Text>
          <Text style={styles.feedbackScore}>{confidence}점</Text>
        </View>
      )}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton, isRunning && styles.buttonActive]}
          onPress={handleToggle}
          disabled={!isReady}
        >
          <Text style={styles.buttonText}>{isRunning ? '감지 중지' : '동작 감지 시작'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishButton} onPress={finishSession}>
          <Text style={styles.finishButtonText}>운동 완료</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  cameraText: { color: '#666', fontSize: 16 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  loadingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  infoBar: { position: 'absolute', top: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 },
  infoText: { color: '#fff', fontSize: 18, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  feedbackCard: { position: 'absolute', bottom: 160, left: 24, right: 24, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(76,175,80,0.85)' },
  feedbackText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  feedbackScore: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 12 },
  controls: { position: 'absolute', bottom: 40, left: 24, right: 24, gap: 12 },
  captureButton: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 30, alignItems: 'center' },
  buttonActive: { backgroundColor: '#E53935' },
  finishButton: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 14, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
