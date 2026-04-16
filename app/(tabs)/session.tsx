import { useReducer, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { requireNativeModule, requireNativeViewManager, EventEmitter } from 'expo-modules-core';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { refreshNotifications } from '../../services/notifications';
import { getTodaySessionCount, updateStreak, getLastSessionTime } from '../../services/firestore';
import { useFontSize } from '../../context/FontSizeContext';

const GestureRecognition = requireNativeModule('GestureRecognition');
const GestureRecognitionView = requireNativeViewManager('GestureRecognition');
const emitter = new EventEmitter(GestureRecognition) as any;

const GESTURES = [
  { name: '손가락 움직이기', key: 'finger_wave' },
  { name: '손 털기', key: 'hand_shake' },
  { name: '손가락 접기', key: 'finger_fold' },
  { name: '주먹 쥐고 펴기', key: 'fist_open' },
  { name: '엇갈려 주먹 쥐고 펴기', key: 'cross_fist' },
  { name: '손끝 박수', key: 'fingertip_clap' },
];

const STEP_TIME_LIMIT = 30;
const SUCCESS_HOLD_TIME = 1500;

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
  const { fontScale } = useFontSize();
  const [state, dispatch] = useReducer(reducer, initialState(isPractice === 'true'));
  const [isFocused, setIsFocused] = useStateSimple(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPassTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const remainingRatio = useRef(1);
  const stepStartTime = useRef<number>(0);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const {
    step, success, sessionDone,
    isRetryMode, practiceMode,
    currentGesture, handDetected,
  } = state;

  const handleQuit = () => {
    if (sessionDone) {
      router.replace('/(tabs)');
      return;
    }
    Alert.alert(
      '운동을 중단할까요?',
      '지금까지의 기록은 저장되지 않아요.',
      [
        { text: '계속하기', style: 'cancel' },
        { text: '중단하기', style: 'destructive', onPress: () => router.replace('/(tabs)') },
      ]
    );
  };

  const resetStepTimer = useCallback(() => {
    remainingRatio.current = 1;
    progressAnim.setValue(1);

    if (stepTimer.current) clearTimeout(stepTimer.current);
    if (autoPassTimer.current) clearTimeout(autoPassTimer.current);
    if (progressAnimation.current) progressAnimation.current.stop();

    autoPassTimer.current = setTimeout(() => {
      dispatch({ type: 'PASS' });
    }, STEP_TIME_LIMIT * 1000);
  }, []);

  useEffect(() => {
    if (sessionDone || !isFocused) return;
    resetStepTimer();
    return () => {
      if (stepTimer.current) clearTimeout(stepTimer.current);
      if (autoPassTimer.current) clearTimeout(autoPassTimer.current);
      if (progressAnimation.current) progressAnimation.current.stop();
    };
  }, [step, isFocused, sessionDone]);

  useEffect(() => {
    if (sessionDone || success) return;

    if (handDetected) {
      if (progressAnimation.current) progressAnimation.current.stop();
      const remainingDuration = remainingRatio.current * STEP_TIME_LIMIT * 1000;
      stepStartTime.current = Date.now();

      progressAnimation.current = Animated.timing(progressAnim, {
        toValue: 0,
        duration: remainingDuration,
        useNativeDriver: false,
      });
      progressAnimation.current.start();
    } else {
      if (progressAnimation.current) progressAnimation.current.stop();
      const elapsed = (Date.now() - stepStartTime.current) / 1000;
      const elapsedRatio = elapsed / STEP_TIME_LIMIT;
      remainingRatio.current = Math.max(0, remainingRatio.current - elapsedRatio);
      progressAnim.setValue(remainingRatio.current);
    }
  }, [handDetected, sessionDone, success]);

  useEffect(() => {
    if (success) {
      if (stepTimer.current) clearTimeout(stepTimer.current);
      if (autoPassTimer.current) clearTimeout(autoPassTimer.current);
      if (progressAnimation.current) progressAnimation.current.stop();
    }
  }, [success]);

  const handleCompleteRef = useRef<(() => Promise<void>) | undefined>(undefined);
  handleCompleteRef.current = async () => {
    const uid = auth.currentUser?.uid;
    const pm = stateRef.current.practiceMode;

    try {
      if (pm || !uid) {
        Alert.alert('연습 완료! 👏', '연습이 끝났어요. 기록은 저장되지 않아요 😊', [
          { text: '확인', onPress: () => router.replace('/(tabs)') },
        ]);
        return;
      }

      const count = await getTodaySessionCount();

      if (count < 2) {
        if (count === 1) {
          const lastTime = await getLastSessionTime();
          if (lastTime) {
            const sixHoursLater = new Date(lastTime.getTime() + 6 * 60 * 60 * 1000);
            if (new Date() < sixHoursLater) {
              Alert.alert('연습 완료! 👏', '연습이 끝났어요. 기록은 저장되지 않아요 😊', [
                { text: '확인', onPress: () => router.replace('/(tabs)') },
              ]);
              return;
            }
          }
        }

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
        dispatch({ type: 'RESET', practiceMode: isPractice === 'true' });
        if (successTimer.current) clearTimeout(successTimer.current);
        if (stepTimer.current) clearTimeout(stepTimer.current);
        if (autoPassTimer.current) clearTimeout(autoPassTimer.current);
        if (progressAnimation.current) progressAnimation.current.stop();
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

  useEffect(() => {
    if (sessionDone) return;
    if (successTimer.current) clearTimeout(successTimer.current);

    if (handDetected && currentGesture === GESTURES[step].name) {
      dispatch({ type: 'SUCCESS' });
      successTimer.current = setTimeout(() => {
        dispatch({ type: 'NEXT' });
      }, SUCCESS_HOLD_TIME);
    }

    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [currentGesture, handDetected, step, sessionDone]);

  const handlePass = (): void => {
    if (successTimer.current) clearTimeout(successTimer.current);
    if (stepTimer.current) clearTimeout(stepTimer.current);
    if (autoPassTimer.current) clearTimeout(autoPassTimer.current);
    if (progressAnimation.current) progressAnimation.current.stop();
    dispatch({ type: 'PASS' });
  };

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#FF6B6B', '#FFA500', '#4DA56F'],
  });

  return (
    <View style={styles.container}>
      {/* 상단 연두색 배경 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleQuit}>
          <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
        </TouchableOpacity>

        <View style={styles.stepBar}>
          <Text style={[styles.stepText, { fontSize: 14 * fontScale }]}>
            {isRetryMode ? '재도전 🔄 ' : ''}{step + 1} / {GESTURES.length}
          </Text>
        </View>
      </View>

      {/* 카메라 */}
      <View style={styles.cameraContainer}>
        {isFocused && <GestureRecognitionView style={styles.camera} />}


        {/* 정중앙 손 감지 상태 */}
        {!handDetected && (
          <View style={styles.handRatioCenter}>
            <Text style={[styles.handRatioText, { fontSize: 60* fontScale }]}>
              {'손을 카메라에 \n보여주세요'}
            </Text>
          </View>
        )}

        {!sessionDone && handDetected && (
          <>
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>

            <View style={styles.instructionBox}>
              <Text style={[styles.instructionLabel, { fontSize: 14 * fontScale }]}>
                {isRetryMode ? '다시 도전해보세요 🔄' : '이렇게 해보세요'}
              </Text>
              <Text style={[styles.instructionName, { fontSize: 26 * fontScale }]}>{GESTURES[step].name}</Text>
              {success && <Text style={[styles.successText, { fontSize: 18 * fontScale }]}>✅ 잘 하셨어요!</Text>}
            </View>
          </>
        )}

        {currentGesture !== '' && (
          <View style={styles.gestureBox}>
            <Text style={[styles.gestureName, { fontSize: 24 * fontScale }]}>{currentGesture}</Text>
          </View>
        )}
      </View>

      {/* 하단 연두색 배경 */}
      {!sessionDone && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.quitButton} onPress={handleQuit}>
            <Text style={[styles.quitButtonText, { fontSize: 18 * fontScale }]}>중단하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.passButton} onPress={handlePass}>
            <Text style={[styles.passButtonText, { fontSize: 18 * fontScale }]}>패스</Text>
          </TouchableOpacity>
        </View>
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
  topBar: { height: 100, backgroundColor: '#C2E7BB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40 },
  backButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  backButtonText: { color: '#2D6A4F', fontWeight: '600' },
  practiceBadge: { position: 'absolute', top: 12, left: '50%', transform: [{ translateX: -60 }], backgroundColor: 'rgba(255,165,0,0.8)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, zIndex: 10 },
  practiceBadgeText: { color: '#fff', fontWeight: '700' },
  stepBar: {},
  stepText: { fontWeight: '600', color: '#2D6A4F' },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  handRatioCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  handRatioText: { color: '#ffffffb6', fontWeight: '700', textAlign: 'center', backgroundColor: 'rgba(0,0,0,)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, overflow: 'hidden' },
  progressBarContainer: { position: 'absolute', top: 54, left: 20, right: 20, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 20, borderRadius: 2 },
  progressBarFill: { height: '100%', borderRadius: 2 },
  instructionBox: { position: 'absolute', top: 58, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  instructionLabel: { color: '#9E9E9E', marginBottom: 6 },
  instructionName: { color: '#fff', fontWeight: '700' },
  successText: { color: '#4DA56F', fontWeight: '600', marginTop: 8 },
  gestureBox: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20 },
  gestureName: { color: '#00FF00', fontWeight: '700' },
  bottomBar: { height: 100, backgroundColor: '#C2E7BB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  quitButton: { flex: 1, backgroundColor: '#FF3B30', borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  quitButtonText: { color: '#FFFFFF', fontWeight: '700' },
  passButton: { flex: 1, backgroundColor: '#2D6A4F', borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  passButtonText: { color: '#FFFFFF', fontWeight: '700' },
});