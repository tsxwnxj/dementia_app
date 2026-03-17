import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { analyzeMotion, MotionResult } from '../../services/modelApi';
import { saveSession } from '../../services/firestore';

export default function SessionScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MotionResult | null>(null);
  const [score, setScore] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const captureAndAnalyze = async () => {
    if (!cameraRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      if (!photo) return;
      const motionResult = await analyzeMotion(photo.uri);
      setResult(motionResult);
      setScore((prev) => prev + motionResult.score);
      setRepCount((prev) => prev + 1);
    } catch (e) {
      console.error('분석 오류:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const finishSession = async () => {
    if (repCount === 0) { Alert.alert('운동을 먼저 진행해주세요'); return; }
    try {
      await saveSession({ score: Math.round(score / repCount), exerciseType: 'finger_coordination', durationSeconds: repCount * 3, feedback: result?.feedback ?? '' });
      Alert.alert('운동 완료! 🎉', `평균 점수: ${Math.round(score / repCount)}점`, [{ text: '확인', onPress: () => router.replace('/(tabs)') }]);
    } catch (e) {
      Alert.alert('저장 중 오류가 발생했어요');
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>카메라 권한이 필요해요</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>권한 허용</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>횟수: {repCount}</Text>
        <Text style={styles.infoText}>평균: {repCount > 0 ? Math.round(score / repCount) : 0}점</Text>
      </View>
      {result && (
        <View style={[styles.feedbackCard, result.is_correct ? styles.correct : styles.incorrect]}>
          <Text style={styles.feedbackText}>{result.feedback}</Text>
          <Text style={styles.feedbackScore}>{result.score}점</Text>
        </View>
      )}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.captureButton, isAnalyzing && styles.buttonDisabled]} onPress={captureAndAnalyze} disabled={isAnalyzing}>
          <Text style={styles.buttonText}>{isAnalyzing ? '분석 중...' : '동작 감지'}</Text>
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
  feedbackCard: { position: 'absolute', bottom: 160, left: 24, right: 24, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  correct: { backgroundColor: 'rgba(76,175,80,0.85)' },
  incorrect: { backgroundColor: 'rgba(244,67,54,0.85)' },
  feedbackText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  feedbackScore: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 12 },
  controls: { position: 'absolute', bottom: 40, left: 24, right: 24, gap: 12 },
  captureButton: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 30, alignItems: 'center' },
  finishButton: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 14, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  buttonDisabled: { backgroundColor: '#90A4AE' },
  button: { backgroundColor: '#4A90E2', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
