import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { requireNativeModule, requireNativeViewManager, EventEmitter } from 'expo-modules-core';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useFocusEffect, router } from 'expo-router';

const GestureRecognition = requireNativeModule('GestureRecognition');
const GestureRecognitionView = requireNativeViewManager('GestureRecognition');
const emitter = new EventEmitter(GestureRecognition);

const GESTURES = [
  { name: '손가락 움직이기', key: 'finger_wave' },
  { name: '손 털기', key: 'hand_shake' },
  { name: '손가락 접기', key: 'finger_fold' },
  { name: '주먹 쥐고 펴기', key: 'fist_open' },
  { name: '엇갈려 주먹 쥐고 펴기', key: 'cross_fist' },
  { name: '손끝 박수', key: 'fingertip_clap' },
];

export default function SessionScreen() {
  const [currentGesture, setCurrentGesture] = useState('');
  const [handDetected, setHandDetected] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [step, setStep] = useState(0); // 현재 몇 번째 동작인지
  const [success, setSuccess] = useState(false); // 현재 동작 성공 여부
  const [sessionDone, setSessionDone] = useState(false); // 전체 완료 여부
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        setCurrentGesture('');
        setHandDetected(false);
        setStep(0);
        setSuccess(false);
        setSessionDone(false);
        if (successTimer.current) clearTimeout(successTimer.current);
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
      // console.log('[DEBUG]', result.msg);
    });

    const subscription = emitter.addListener('onGestureResult', (result: any) => {
      // console.log('[Session] 결과:', JSON.stringify(result));
      setCurrentGesture(result.gestureKo);
      setHandDetected(result.handDetected ?? false);
    });

    return () => {
      debugSub.remove();
      subscription.remove();
      GestureRecognition.stopDetection();
    };
  }, [isFocused]);

  // 제스처 인식 시 정답 판단
  useEffect(() => {
    if (sessionDone || success) return;
    if (currentGesture === GESTURES[step].name && handDetected) {
      setSuccess(true);
      successTimer.current = setTimeout(() => {
        if (step + 1 >= GESTURES.length) {
          handleComplete();
        } else {
          setStep((prev) => prev + 1);
          setSuccess(false);
        }
      }, 2000); // 2초 유지
    }
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [currentGesture, handDetected]);

const handleComplete = async (): Promise<void> => {
    setSessionDone(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, `users/${uid}/sessions`), {
        completedAt: Timestamp.now(),
      });
      Alert.alert('운동 완료! 🎉', '오늘도 수고하셨어요 😊', [
        {
          text: '확인',
          onPress: () => router.push('/(tabs)/stats'),
        },
      ]);
    } catch (e) {
      console.error('[Session] 저장 실패:', e);
    }
  };

  const handlePass = (): void => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess(false);
    if (step + 1 >= GESTURES.length) {
      handleComplete();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  return (
    <View style={styles.container}>
      {isFocused && <GestureRecognitionView style={styles.camera} />}

      {/* 손 감지 상태 */}
      <View style={styles.handRatioBar}>
        <Text style={[styles.handRatioText, { color: handDetected ? '#00FF00' : '#FF0000' }]}>
          {handDetected ? '손 감지됨' : '손을 카메라에 보여주세요'}
        </Text>
      </View>

      {/* 진행 단계 */}
      <View style={styles.stepBar}>
        <Text style={styles.stepText}>{step + 1} / {GESTURES.length}</Text>
      </View>

      {/* 지시 메시지 */}
      {!sessionDone && handDetected && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionLabel}>이렇게 해보세요</Text>
          <Text style={styles.instructionName}>{GESTURES[step].name}</Text>
          {success && <Text style={styles.successText}>✅ 잘 하셨어요!</Text>}
        </View>
      )}

      {/* 인식된 제스처 */}
      {currentGesture !== '' && (
        <View style={styles.gestureBox}>
          <Text style={styles.gestureName}>{currentGesture}</Text>
        </View>
      )}

      {/* 패스 버튼 */}
      {!sessionDone && (
        <TouchableOpacity style={styles.passButton} onPress={handlePass}>
          <Text style={styles.passButtonText}>패스</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  handRatioBar: { position: 'absolute', top: 50, left: 20 },
  handRatioText: { fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  stepBar: { position: 'absolute', top: 50, right: 20 },
  stepText: { fontSize: 14, fontWeight: '600', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  instructionBox: { position: 'absolute', top: 100, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  instructionLabel: { color: '#9E9E9E', fontSize: 14, marginBottom: 6 },
  instructionName: { color: '#fff', fontSize: 26, fontWeight: '700' },
  successText: { color: '#4DA56F', fontSize: 18, fontWeight: '600', marginTop: 8 },
  gestureBox: { position: 'absolute', bottom: 120, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20 },
  gestureName: { color: '#00FF00', fontSize: 24, fontWeight: '700' },
  passButton: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24, paddingVertical: 16, alignItems: 'center' },
  passButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
