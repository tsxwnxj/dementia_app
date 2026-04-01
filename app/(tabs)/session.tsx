import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { requireNativeModule, requireNativeViewManager, EventEmitter } from 'expo-modules-core';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

const GestureRecognition = requireNativeModule('GestureRecognition');
const GestureRecognitionView = requireNativeViewManager('GestureRecognition');
const emitter = new EventEmitter(GestureRecognition);

export default function SessionScreen() {
  const [currentGesture, setCurrentGesture] = useState('');
  const [handDetected, setHandDetected] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      // 운동 탭 진입 시 가로 모드
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

      return () => {
        setIsFocused(false);
        setCurrentGesture('');
        setHandDetected(false);
        // 운동 탭 떠날 시 세로 모드로 복귀
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [])
  );

  useEffect(() => {
    if (!isFocused) return;

    const init = async () => {
      try {
        await GestureRecognition.loadModel();
        console.log('[Session] 모델 로드 완료');
        await GestureRecognition.startDetection();
        console.log('[Session] 감지 시작');
      } catch (e) {
        console.error('[Session] 초기화 실패:', e);
      }
    };
    init();

    const debugSub = emitter.addListener('onDebug', (result: any) => {
      console.log('[DEBUG]', result.msg);
    });

    const subscription = emitter.addListener('onGestureResult', (result: any) => {
      setCurrentGesture(result.gestureKo);
      setHandDetected(result.handDetected ?? false);
    });

    return () => {
      debugSub.remove();
      subscription.remove();
      GestureRecognition.stopDetection();
    };
  }, [isFocused]);

  return (
    <View style={styles.container}>
      {isFocused && <GestureRecognitionView style={styles.camera} />}
      <View style={styles.handRatioBar}>
        <Text style={[styles.handRatioText, { color: handDetected ? '#00FF00' : '#FF0000' }]}>
          {handDetected ? '손 감지됨' : '손을 카메라에 보여주세요'}
        </Text>
      </View>
      {currentGesture !== '' && (
        <View style={styles.gestureBox}>
          <Text style={styles.gestureName}>{currentGesture}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  handRatioBar: { position: 'absolute', top: 30, left: 20 },
  handRatioText: { fontSize: 18, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  gestureBox: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24 },
  gestureName: { color: '#00FF00', fontSize: 32, fontWeight: '700' },
});
