import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView
} from 'react-native';
import { requireNativeModule, requireNativeViewManager, EventEmitter } from 'expo-modules-core';
import { useFocusEffect } from 'expo-router';

const GestureRecognition = requireNativeModule('GestureRecognition');
const GestureRecognitionView = requireNativeViewManager('GestureRecognition');
const emitter = new EventEmitter(GestureRecognition);

const GESTURES = [
  { key: 'finger_wave',    name: '손가락 움직이기' },
  { key: 'hand_shake',     name: '손 털기' },
  { key: 'finger_fold',    name: '손가락 접기' },
  { key: 'fist_open',      name: '주먹 쥐고 펴기' },
  { key: 'cross_fist',     name: '엇갈려 주먹 쥐고 펴기' },
  { key: 'fingertip_clap', name: '손끝 박수' },
];

type Gesture = typeof GESTURES[0];
const TARGET_COUNT = 50;

export default function CollectScreen() {
  const [isFocused, setIsFocused]           = useState(false);
  const [isCollecting, setIsCollecting]     = useState(false);
  const [selectedGesture, setSelectedGesture] = useState<Gesture | null>(null);
  const [progress, setProgress]             = useState(0);
  const [countdown, setCountdown]           = useState(0);
  const [savedFiles, setSavedFiles]         = useState<string[]>([]);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      loadSavedFiles();
      return () => {
        setIsFocused(false);
        stopCollecting();
      };
    }, [])
  );

  useEffect(() => {
    const progressSub = emitter.addListener('onCollectProgress', (result: any) => {
      setProgress(result.saved);
    });

    const completeSub = emitter.addListener('onCollectComplete', (result: any) => {
      setIsCollecting(false);
      setSelectedGesture(null);
      setProgress(0);
      loadSavedFiles();
      Alert.alert('수집 완료! 🎉', `${result.gesture}: ${result.total}개 저장됨`);
    });

    return () => {
      progressSub.remove();
      completeSub.remove();
    };
  }, []);

  const loadSavedFiles = async () => {
    try {
      const files = GestureRecognition.getSavedFiles();
      setSavedFiles(files || []);
    } catch (e) {
      console.error(e);
    }
  };

  const startCountdown = (gesture: Gesture) => {
    setSelectedGesture(gesture);
    setCountdown(3);
    setProgress(0);

    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current!);
          startCollecting(gesture.key);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startCollecting = async (gestureKey: string) => {
    try {
      setIsCollecting(true);
      await GestureRecognition.startCollecting(gestureKey, TARGET_COUNT);
    } catch (e) {
      console.error(e);
    }
  };

  const stopCollecting = async () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    try {
      await GestureRecognition.stopCollecting();
    } catch (e) {}
    setIsCollecting(false);
    setSelectedGesture(null);
    setProgress(0);
    setCountdown(0);
  };

  const shareFiles = async () => {
    Alert.alert(
      '파일 전송',
      '아이폰 파일 앱에서\n"나의 iPhone > dementiaapp > gesture_data"\n폴더를 Mac으로 AirDrop 하세요.',
      [{ text: '확인' }]
    );
  };
useEffect(() => {
  const debugSub = emitter.addListener('onDebug', (result: any) => {
    console.log('[DEBUG]', result.msg);
  });
  return () => debugSub.remove();
}, []);
  return (
    <View style={styles.container}>
      {isFocused && <GestureRecognitionView style={styles.camera} />}

      {/* 카운트다운 */}
      {countdown > 0 && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.countdownSub}>{selectedGesture?.name} 준비하세요!</Text>
        </View>
      )}

      {/* 수집 중 진행률 */}
      {isCollecting && (
        <View style={styles.progressBox}>
          <Text style={styles.progressGesture}>{selectedGesture?.name}</Text>
          <Text style={styles.progressText}>{progress} / {TARGET_COUNT}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(progress / TARGET_COUNT) * 100}%` }]} />
          </View>
          <TouchableOpacity style={styles.stopButton} onPress={stopCollecting}>
            <Text style={styles.stopButtonText}>중단</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 동작 선택 버튼 */}
      {!isCollecting && countdown === 0 && (
        <View style={styles.gestureList}>
          <Text style={styles.title}>수집할 동작 선택</Text>
          <ScrollView>
            {GESTURES.map(g => {
              const isDone = savedFiles.includes(g.key);
              return (
                <TouchableOpacity
                  key={g.key}
                  style={styles.gestureButton}
                  onPress={() => startCountdown(g)}
                >
                  <Text style={styles.gestureButtonText}>{g.name}</Text>
                  <Text style={styles.gestureButtonSub}>
                    {isDone ? '✅ 수집됨' : '50개 수집'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 파일 전송 버튼 */}
          <TouchableOpacity style={styles.shareButton} onPress={shareFiles}>
            <Text style={styles.shareButtonText}>📤 수집 데이터 전송 방법</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#000' },
  camera:           { flex: 1 },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  countdownText:    { fontSize: 120, fontWeight: '900', color: '#fff' },
  countdownSub:     { fontSize: 20, color: '#ccc', marginTop: 16 },
  progressBox:      { position: 'absolute', top: 80, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 16, padding: 20, alignItems: 'center' },
  progressGesture:  { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  progressText:     { color: '#00FF00', fontSize: 32, fontWeight: '900', marginBottom: 12 },
  progressBarBg:    { width: '100%', height: 10, backgroundColor: '#333', borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  progressBarFill:  { height: '100%', backgroundColor: '#00FF00', borderRadius: 5 },
  stopButton:       { backgroundColor: 'rgba(255,0,0,0.6)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  stopButtonText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  gestureList:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.85)', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  title:            { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  gestureButton:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  gestureButtonText:{ color: '#fff', fontSize: 16, fontWeight: '600' },
  gestureButtonSub: { color: '#aaa', fontSize: 13 },
  shareButton:      { backgroundColor: 'rgba(0,122,255,0.8)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  shareButtonText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
