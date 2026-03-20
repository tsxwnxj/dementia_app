import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { router } from 'expo-router';
import { saveSession } from '../../services/firestore';
import labels from '../../assets/labels.json';

const SEQUENCE_LEN = 30;
const INPUT_SIZE = 126;

export default function SessionScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const [isRunning, setIsRunning] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [currentGesture, setCurrentGesture] = useState('');
  const [confidence, setConfidence] = useState(0);
  
  const frameBuffer = useRef<number[][]>([]);
  const isProcessing = useRef(false);

  // MediaPipe Hand Landmarker 모델
  const handModel = useTensorflowModel(
    require('../../assets/hand_landmarker.task')
  );

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  const processLandmarks = useCallback(async (landmarks: number[]) => {
    frameBuffer.current.push(landmarks);
    
    if (frameBuffer.current.length > SEQUENCE_LEN) {
      frameBuffer.current.shift();
    }
    
    if (frameBuffer.current.length === SEQUENCE_LEN && !isProcessing.current) {
      isProcessing.current = true;
      
      try {
        // Core ML 모델로 예측 (NativeModules 통해 호출)
        const sequence = frameBuffer.current.flat();
        // 예측 결과 처리
        const mockScore = Math.floor(Math.random() * 30) + 70;
        const mockGestureIdx = Math.floor(Math.random() * labels.labels.length);
        const mockGesture = labels.labels[mockGestureIdx];
        
        setCurrentGesture(labels.labels_ko[mockGesture as keyof typeof labels.labels_ko] ?? mockGesture);
        setConfidence(mockScore);
        setRepCount(prev => prev + 1);
        setTotalScore(prev => prev + mockScore);
        
        frameBuffer.current = [];
      } finally {
        isProcessing.current = false;
      }
    }
  }, []);

  const finishSession = async () => {
    if (repCount === 0) {
      Alert.alert('운동을 먼저 진행해주세요');
      return;
    }
    try {
      await saveSession({
        score: Math.round(totalScore / repCount),
        exerciseType: 'finger_coordination',
        durationSeconds: repCount * 1,
        feedback: currentGesture,
      });
      Alert.alert('운동 완료! 🎉', `평균 점수: ${Math.round(totalScore / repCount)}점`, [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      Alert.alert('저장 중 오류가 발생했어요');
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>카메라 권한이 필요해요</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>권한 허용</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>카메라를 찾을 수 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
      />
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
          onPress={() => setIsRunning(!isRunning)}
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
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFE' },
  permissionText: { fontSize: 16, color: '#424242', marginBottom: 16 },
  infoBar: { position: 'absolute', top: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 },
  infoText: { color: '#fff', fontSize: 18, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  feedbackCard: { position: 'absolute', bottom: 160, left: 24, right: 24, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(76,175,80,0.85)' },
  feedbackText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  feedbackScore: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 12 },
  controls: { position: 'absolute', bottom: 40, left: 24, right: 24, gap: 12 },
  captureButton: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 30, alignItems: 'center' },
  buttonActive: { backgroundColor: '#E53935' },
  finishButton: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 14, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  button: { backgroundColor: '#4A90E2', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
