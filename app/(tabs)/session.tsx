import { useReducer, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { requireNativeModule, requireNativeViewManager, EventEmitter } from 'expo-modules-core';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { refreshNotifications } from '../notifications';
import { getTodaySessionCount, updateStreak } from '../../services/firestore';

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

type State = {
  step: number;
  success: boolean;
  sessionDone: boolean;
  passCount: number;
  lastPassedStep: number | null;
  isRetryMode: boolean;
  retrySteps: number[];
  practiceMode: boolean;
  currentGesture: string;
  handDetected: boolean;
};

type Action =
  | { type: 'GESTURE_RESULT'; gestureKo: string; handDetected: boolean }
  | { type: 'SUCCESS' }
  | { type: 'NEXT' }
  | { type: 'PASS' }
  | { type: 'COMPLETE' }
  | { type: 'SET_PRACTICE_MODE' }
  | { type: 'RESET'; practiceMode: boolean };

const initialState = (practiceMode: boolean): State => ({
  step: 0,
  success: false,
  sessionDone: false,
  passCount: 0,
  lastPassedStep: null,
  isRetryMode: false,
  retrySteps: [],
  practiceMode,
  currentGesture: '',
  handDetected: false,
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GESTURE_RESULT':
      return {
        ...state,
        currentGesture: action.gestureKo,
        handDetected: action.handDetected,
        success:
          action.handDetected && action.gestureKo === GESTURES[state.step].name
            ? state.success
            : false,
      };

    case 'SUCCESS':
      return { ...state, success: true };

    case 'NEXT': {
      if (state.isRetryMode) {
        if (state.retrySteps.length > 0) {
          return {
            ...state,
            step: state.retrySteps[0],
            retrySteps: state.retrySteps.slice(1),
            success: false,
            lastPassedStep: null,
          };
        }
        return { ...state, sessionDone: true };
      }
      const nextStep = state.step + 1;
      if (nextStep >= GESTURES.length) {
        if (state.retrySteps.length > 0) {
          return {
            ...state,
            isRetryMode: true,
            step: state.retrySteps[0],
            retrySteps: state.retrySteps.slice(1),
            success: false,
          };
        }
        return { ...state, sessionDone: true };
      }
      return { ...state, step: nextStep, success: false, lastPassedStep: null };
    }

    case 'PASS': {
      if (state.lastPassedStep !== null && state.lastPassedStep === state.step - 1) {
        return state;
      }
      if (state.passCount >= 2) {
        return state;
      }
      const newPassCount = state.passCount + 1;
      const newLastPassedStep = state.step;

      if (state.isRetryMode) {
        if (state.retrySteps.length > 0) {
          return {
            ...state,
            passCount: newPassCount,
            lastPassedStep: newLastPassedStep,
            step: state.retrySteps[0],
            retrySteps: state.retrySteps.slice(1),
            success: false,
          };
        }
        return { ...state, passCount: newPassCount, sessionDone: true };
      }

      const newRetrySteps = [...state.retrySteps, state.step];
      const nextStep = state.step + 1;
      if (nextStep >= GESTURES.length) {
        return {
          ...state,
          passCount: newPassCount,
          lastPassedStep: newLastPassedStep,
          isRetryMode: true,
          step: newRetrySteps[0],
          retrySteps: newRetrySteps.slice(1),
          success: false,
        };
      }
      return {
        ...state,
        passCount: newPassCount,
        lastPassedStep: newLastPassedStep,
        retrySteps: newRetrySteps,
        step: nextStep,
        success: false,
      };
    }

    case 'SET_PRACTICE_MODE':
      if (state.sessionDone) return state;
      return { ...state, practiceMode: true };

    case 'RESET':
      return initialState(action.practiceMode);

    default:
      return state;
  }
}

export default function SessionScreen() {
  const { isPractice } = useLocalSearchParams<{ isPractice?: string }>();
  const [state, dispatch] = useReducer(reducer, initialState(isPractice === 'true'));
  const [isFocused, setIsFocused] = useStateSimple(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 항상 최신 state를 ref로 유지 — stale closure 완전 차단
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const {
    step, success, sessionDone, passCount,
    lastPassedStep, isRetryMode, practiceMode,
    currentGesture, handDetected,
  } = state;

  // handleComplete를 ref로 감싸서 항상 최신 함수 참조
  const handleCompleteRef = useRef<() => Promise<void>>();
  handleCompleteRef.current = async () => {
    const uid = auth.currentUser?.uid;
    const pm = isPractice === 'true';

    console.log('{handleComplete] pm:', pm, 'uid:', uid);

    try {
      if (pm || !uid) {
        Alert.alert('연습 완료! 👏', '연습이 끝났어요. 기록은 저장되지 않아요 😊', [
          { text: '확인', onPress: () => router.replace('/(tabs)') },
        ]);
        return;
      }

      const count = await getTodaySessionCount();
      if (count < 2) {
        await addDoc(collection(db, `users/${uid}/sessions`), {
          completedAt: Timestamp.now(),
        });
        await refreshNotifications();
        if (count + 1 >= 2) await updateStreak();
      }

      const message = count + 1 >= 2 ? '오늘 목표 달성! 🎉' : '오늘도 수고하셨어요 😊';
      Alert.alert('운동 완료!', message, [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      console.error('[Session] 저장 실패:', e);
    }
  };

  // sessionDone이 true가 되면 완료 처리
  useEffect(() => {
    if (!sessionDone) return;
    handleCompleteRef.current?.();
  }, [sessionDone]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);

      const checkCount = async () => {
        try {
          const count = await getTodaySessionCount();
          if (count >= 2) dispatch({ type: 'SET_PRACTICE_MODE' });
        } catch (e) {
          console.error(e);
        }
      };
      checkCount();

      return () => {
        setIsFocused(false);
        // sessionDone 중이면 RESET 건너뜀 — navigation 타이밍 충돌 방지
        if (!stateRef.current.sessionDone) {
          dispatch({ type: 'RESET', practiceMode: isPractice === 'true' });
        }
        if (successTimer.current) clearTimeout(successTimer.current);
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
        console.error('[Session] 초기화 실패:', e);
      }
    };
    init();

    const debugSub = emitter.addListener('onDebug', (_: any) => {});
    const subscription = emitter.addListener('onGestureResult', (result: any) => {
      dispatch({
        type: 'GESTURE_RESULT',
        gestureKo: result.gestureKo,
        handDetected: result.handDetected ?? false,
      });
    });

    return () => {
      debugSub.remove();
      subscription.remove();
      GestureRecognition.stopDetection();
    };
  }, [isFocused]);

  // 제스처 인식 성공 감지
  useEffect(() => {
<<<<<<< HEAD
    if (sessionDone) return;
    if (successTimer.current) clearTimeout(successTimer.current);
=======
    if (sessionDone || success) return;
>>>>>>> 50a9a062076942c60a6b23c10f671f268a782483

    if (handDetected && currentGesture === GESTURES[step].name) {
      dispatch({ type: 'SUCCESS' });
      successTimer.current = setTimeout(() => {
        dispatch({ type: 'NEXT' });
      }, 2000);
    }

    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [currentGesture, handDetected, step, sessionDone]);

  const handlePass = (): void => {
    if (lastPassedStep !== null && lastPassedStep === step - 1) {
      Alert.alert('연속 패스 불가 🚫', '연달아 패스할 수 없어요! 이 동작을 먼저 해보세요 💪');
      return;
    }
    if (passCount >= 2) {
      Alert.alert('패스 불가 🚫', '패스는 총 2번만 사용할 수 있어요!');
      return;
    }
    if (successTimer.current) clearTimeout(successTimer.current);
    dispatch({ type: 'PASS' });
  };

  return (
    <View style={styles.container}>
      {isFocused && <GestureRecognitionView style={styles.camera} />}

      {practiceMode && (
        <View style={styles.practiceBadge}>
          <Text style={styles.practiceBadgeText}>연습 모드 📝</Text>
        </View>
      )}

      <View style={styles.handRatioBar}>
        <Text style={[styles.handRatioText, { color: handDetected ? '#00FF00' : '#FF0000' }]}>
          {handDetected ? '손 감지됨' : '손을 카메라에 보여주세요'}
        </Text>
      </View>

      <View style={styles.stepBar}>
        <Text style={styles.stepText}>
          {isRetryMode ? '재도전 🔄 ' : ''}{step + 1} / {GESTURES.length}
        </Text>
      </View>

      {!sessionDone && handDetected && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionLabel}>
            {isRetryMode ? '다시 도전해보세요 🔄' : '이렇게 해보세요'}
          </Text>
          <Text style={styles.instructionName}>{GESTURES[step].name}</Text>
          {success && <Text style={styles.successText}>✅ 잘 하셨어요!</Text>}
        </View>
      )}

      {currentGesture !== '' && (
        <View style={styles.gestureBox}>
          <Text style={styles.gestureName}>{currentGesture}</Text>
        </View>
      )}

      {!sessionDone && (
        <TouchableOpacity
          style={[
            styles.passButton,
            (passCount >= 2 || (lastPassedStep !== null && lastPassedStep === step - 1))
              && styles.passButtonDisabled,
          ]}
          onPress={handlePass}
        >
          <Text style={styles.passButtonText}>
            {isRetryMode
              ? `재도전 중 🔄  패스 (${2 - passCount}회 남음)`
              : `패스 (${2 - passCount}회 남음)`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function useStateSimple(init: boolean) {
  const [v, setV] = require('react').useState(init);
  return [v, setV] as const;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  practiceBadge: { position: 'absolute', top: 50, left: '50%', transform: [{ translateX: -60 }], backgroundColor: 'rgba(255,165,0,0.8)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, zIndex: 10 },
  practiceBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  handRatioBar: { position: 'absolute', top: 90, left: 20 },
  handRatioText: { fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  stepBar: { position: 'absolute', top: 90, right: 20 },
  stepText: { fontSize: 14, fontWeight: '600', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  instructionBox: { position: 'absolute', top: 140, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  instructionLabel: { color: '#9E9E9E', fontSize: 14, marginBottom: 6 },
  instructionName: { color: '#fff', fontSize: 26, fontWeight: '700' },
  successText: { color: '#4DA56F', fontSize: 18, fontWeight: '600', marginTop: 8 },
  gestureBox: { position: 'absolute', bottom: 120, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20 },
  gestureName: { color: '#00FF00', fontSize: 24, fontWeight: '700' },
  passButton: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24, paddingVertical: 16, alignItems: 'center' },
  passButtonDisabled: { opacity: 0.4 },
  passButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});