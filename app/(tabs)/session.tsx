import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { requireNativeModule, requireNativeViewManager, EventEmitter } from 'expo-modules-core';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

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
      return () => {
        setIsFocused(false);
        setCurrentGesture('');
        setHandDetected(false);
      };
    }, [])
  );

  useEffect(() => {
    if (!isFocused) return;

    const init = async () => {
      try {
        await GestureRecognition.loadModel();
        await GestureRecognition.startDetection();
      } catch (e) {
        console.error('초기화 실패:', e);
      }
    };
    init();

    const subscription = emitter.addListener('onGestureResult', (result: any) => {
      setCurrentGesture(result.gestureKo);
      setHandDetected(result.handDetected ?? true);
    });

    return () => {
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
  handRatioBar: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  handRatioText: {
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gestureBox: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  gestureName: {
    color: '#00FF00',
    fontSize: 24,
    fontWeight: '700',
  },
});
