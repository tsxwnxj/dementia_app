import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { saveSession } from '../../services/firestore';
import labelsData from '../../assets/labels.json';
import { Worklets } from 'react-native-worklets-core';

const SEQUENCE_LEN = 30;

export default function SessionScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const [isRunning, setIsRunning] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [currentGesture, setCurrentGesture] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [mediapipeReady, setMediapipeReady] = useState(false);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);

  const webViewRef = useRef<WebView>(null);
  const frameBuffer = useRef<number[][]>([]);
  const frameCount = useRef(0);

  useEffect(() => {
    const loadHtml = async () => {
      const asset = Asset.fromModule(require('../../assets/mediapipe.html'));
      await asset.downloadAsync();
      setHtmlUri(asset.localUri);
    };
    loadHtml();
  }, []);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  const sendFrameToWebView = Worklets.createRunOnJS((base64: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.processFrame('data:image/jpeg;base64,${base64}'); true;`
      );
    }
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    frameCount.value = (frameCount.value ?? 0) + 1;
    if (frameCount.value % 3 !== 0) return; // 3프레임마다 1번 처리
    // 프레임을 base64로 변환해서 WebView로 전송
    // TODO: frame to base64 변환
  }, []);

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setMediapipeReady(true);
        return;
      }
      if (msg.type === 'landmarks') {
        frameBuffer.current.push(msg.data);
        if (frameBuffer.current.length > SEQUENCE_LEN) {
          frameBuffer.current.shift();
        }
        if (frameBuffer.current.length === SEQUENCE_LEN) {
          predictGesture(frameBuffer.current);
          frameBuffer.current = [];
        }
      }
    } catch (e) {
      console.error('WebView 메시지 오류:', e);
    }
  };

  const predictGesture = async (sequence: number[][]) => {
    const mockScore = Math.floor(Math.random() * 30) + 70;
    const mockIdx = Math.floor(Math.random() * labelsData.labels.length);
    const mockGesture = labelsData.labels[mockIdx];
    const gestureKo = labelsData.labels_ko[mockGesture as keyof typeof labelsData.labels_ko] ?? mockGesture;
    setCurrentGesture(gestureKo);
    setConfidence(mockScore);
    setRepCount(prev => prev + 1);
    setTotalScore(prev => prev + mockScore);
  };

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
        isActive={isRunning}
        frameProcessor={isRunning ? frameProcessor : undefined}
      />
      {htmlUri && (
        <WebView
          ref={webViewRef}
          source={{ uri: htmlUri }}
          style={styles.hidden}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          originWhitelist={['*']}
        />
      )}
      {!mediapipeReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>MediaPipe 로딩 중...</Text>
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
          onPress={() => setIsRunning(!isRunning)}
          disabled={!mediapipeReady}
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
  hidden: { width: 0, height: 0, opacity: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFE' },
  permissionText: { fontSize: 16, color: '#424242', marginBottom: 16 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
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
  button: { backgroundColor: '#4A90E2', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
