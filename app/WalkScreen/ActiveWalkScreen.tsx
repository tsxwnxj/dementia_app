/**
 * activeWalkScreen.tsx
 *
 * 실외 산책 시 STT → LLM → TTS 파이프라인을 포함한 AI 동반자 화면.
 *
 * 필요 패키지 설치 (아직 미설치 시):
 *   npx expo install expo-av expo-speech expo-image-picker
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  StyleSheet,
  Modal,
  SafeAreaView,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';

import {
  ChatMessage,
  fetchWalkGreeting,
  sendWalkChat,
} from '../../services/walkChatService';

// ─── 타입 ────────────────────────────────────────────────────────────────────

type WalkType = 'indoor' | 'outdoor';

interface Props {
  walkType: WalkType;
  onEnd: () => void;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

type MicState = 'idle' | 'recording' | 'processing';

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const WALK_INTERVAL = 10 * 60;

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function ActiveWalkScreen({ walkType, onEnd }: Props) {
  // 산책 통계
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [steps, setSteps] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // AI 대화
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micState, setMicState] = useState<MicState>('idle');
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);

  const locationRef = useRef<Coordinate | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── 헬퍼: 메시지 추가 ──────────────────────────────────────────────────────

  const addMessage = useCallback((role: ChatMessage['role'], content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ── TTS 재생 ───────────────────────────────────────────────────────────────

  const speak = useCallback((text: string) => {
    Speech.stop();
    Speech.speak(text, {
      language: 'ko-KR',
      rate: 0.9,
      pitch: 1.0,
    });
  }, []);

  // ── 산책 시작 인사말 (실외만) ─────────────────────────────────────────────

  useEffect(() => {
    if (walkType !== 'outdoor') return;

    (async () => {
      try {
        const greeting = await fetchWalkGreeting(
          currentLocation?.latitude,
          currentLocation?.longitude,
        );
        addMessage('assistant', greeting);
        speak(greeting);
      } catch {
        const fallback = '반갑습니다! 오늘도 건강한 산책을 시작해 볼까요? 주변에 어떤 것들이 보이시나요?';
        addMessage('assistant', fallback);
        speak(fallback);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 1회만

  // ── 알림 권한 ──────────────────────────────────────────────────────────────

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  // ── 타이머 ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next > 0 && next % WALK_INTERVAL === 0) {
            sendNotification();
            setShowModal(true);
          }
          return next;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  // ── GPS 추적 (실외) ───────────────────────────────────────────────────────

  useEffect(() => {
    if (walkType !== 'outdoor') return;

    (async () => {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '실외 산책 거리 측정을 위해 위치 권한이 필요합니다.\n설정 > 개인 정보 보호 > 위치 서비스에서 허용해 주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정 열기', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      await Location.requestBackgroundPermissionsAsync();

      locationSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setCurrentLocation({ latitude, longitude });
          if (locationRef.current) {
            const d = getDistance(
              locationRef.current.latitude, locationRef.current.longitude,
              latitude, longitude,
            );
            if (d < 50) {
              setDistance((prev) => prev + d);
              setSteps((prev) => prev + Math.round(d / 0.75));
            }
          }
          locationRef.current = { latitude, longitude };
        },
      );
    })();

    return () => { locationSubRef.current?.remove(); };
  }, [walkType]);

  // ── 실내 걸음 수 추정 ────────────────────────────────────────────────────

  useEffect(() => {
    if (walkType === 'indoor') setSteps(Math.round(elapsed * 1.5));
  }, [elapsed, walkType]);

  // ── 알림 ─────────────────────────────────────────────────────────────────

  const sendNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: { title: '🎉 산책 10분 달성!', body: '정말 잘하셨어요! 10분 더 걸으시겠어요?', sound: true },
      trigger: null,
    });
  };

  // ── 포맷 ─────────────────────────────────────────────────────────────────

  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDistance = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  // ─── STT: 녹음 시작 ──────────────────────────────────────────────────────

  const startRecording = async () => {
    if (micState !== 'idle') return;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('마이크 권한 필요', '음성 입력을 위해 마이크 권한이 필요합니다.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setMicState('recording');
    } catch (e) {
      Alert.alert('오류', '녹음을 시작할 수 없습니다.');
    }
  };

  // ─── STT: 녹음 종료 → 서버 전송 ─────────────────────────────────────────

  const stopRecordingAndSend = async () => {
    if (!recordingRef.current || micState !== 'recording') return;
    setMicState('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('녹음 파일 없음');

      const result = await sendWalkChat(messages, uri);

      if (result.user_text) addMessage('user', result.user_text);
      addMessage('assistant', result.ai_text);
      speak(result.ai_text);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '음성 처리 중 오류가 발생했습니다.');
    } finally {
      setMicState('idle');
    }
  };

  // ─── 카메라: 사진 찍어서 전송 ───────────────────────────────────────────

  const takePicture = async () => {
    if (micState === 'processing') return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('카메라 권한 필요', '사진 전송을 위해 카메라 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const imageUri = result.assets[0].uri;
    const mimeType = result.assets[0].mimeType ?? 'image/jpeg';

    setMicState('processing');
    try {
      addMessage('user', '📷 사진을 전송했습니다.');
      const response = await sendWalkChat(messages, undefined, imageUri, mimeType);
      addMessage('assistant', response.ai_text);
      speak(response.ai_text);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '사진 처리 중 오류가 발생했습니다.');
    } finally {
      setMicState('idle');
    }
  };

  // ─── 산책 종료 ────────────────────────────────────────────────────────────

  const handleEnd = () => {
    Speech.stop();
    setShowModal(false);
    if (timerRef.current) clearInterval(timerRef.current);
    locationSubRef.current?.remove();
    onEnd();
  };

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  const isOutdoor = walkType === 'outdoor';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.typeLabel}>
        {isOutdoor ? '🌳 실외 산책' : '🏠 실내 산책'}
      </Text>

      {/* 타이머 */}
      <View style={styles.timerBox}>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        <Text style={styles.timerSub}>
          목표까지 {formatTime(Math.max(0, WALK_INTERVAL - (elapsed % WALK_INTERVAL)))}
        </Text>
      </View>

      {/* 통계 */}
      <View style={styles.statsRow}>
        {isOutdoor && (
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDistance(distance)}</Text>
            <Text style={styles.statLabel}>거리</Text>
          </View>
        )}
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{steps.toLocaleString()}</Text>
          <Text style={styles.statLabel}>걸음 수</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Math.round(steps * 0.04)} kcal</Text>
          <Text style={styles.statLabel}>칼로리</Text>
        </View>
      </View>

      {/* AI 대화 패널 (실외 전용) */}
      {isOutdoor && (
        <View style={styles.chatPanel}>
          <Text style={styles.chatPanelTitle}>💬 AI 산책 동반자</Text>
          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <Text style={styles.chatEmpty}>AI가 인사말을 준비하고 있습니다...</Text>
            ) : (
              messages.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
                  ]}
                >
                  <Text style={msg.role === 'user' ? styles.bubbleUserText : styles.bubbleAIText}>
                    {msg.content}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* 마이크 + 카메라 버튼 */}
          <View style={styles.inputRow}>
            {/* 마이크: PressIn → 녹음 시작 / PressOut → 전송 */}
            <TouchableHighlight
              style={[
                styles.micBtn,
                micState === 'recording' && styles.micBtnRecording,
                micState === 'processing' && styles.micBtnProcessing,
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecordingAndSend}
              underlayColor="transparent"
              disabled={micState === 'processing'}
            >
              <View style={styles.micBtnInner}>
                {micState === 'processing' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.micIcon}>
                    {micState === 'recording' ? '🔴' : '🎤'}
                  </Text>
                )}
                <Text style={styles.micLabel}>
                  {micState === 'idle' ? '누르고\n말하기' : micState === 'recording' ? '듣는 중...' : '처리 중...'}
                </Text>
              </View>
            </TouchableHighlight>

            {/* 카메라 버튼 */}
            <TouchableOpacity
              style={[styles.cameraBtn, micState === 'processing' && styles.btnDisabled]}
              onPress={takePicture}
              disabled={micState === 'processing'}
              activeOpacity={0.8}
            >
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.cameraLabel}>사진 전송</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 컨트롤 버튼 */}
      <TouchableOpacity
        style={styles.pauseBtn}
        onPress={() => setIsRunning((r) => !r)}
        activeOpacity={0.85}
      >
        <Text style={styles.pauseBtnText}>{isRunning ? '⏸ 일시정지' : '▶️ 재개'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.endBtn} onPress={handleEnd} activeOpacity={0.85}>
        <Text style={styles.endBtnText}>🛑 산책 종료</Text>
      </TouchableOpacity>

      {/* 10분 달성 모달 */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🎉</Text>
            <Text style={styles.modalTitle}>10분 산책 달성!</Text>
            <Text style={styles.modalDesc}>정말 잘하셨어요!{'\n'}조금 더 걸어볼까요?</Text>
            <TouchableOpacity style={styles.extendBtn} onPress={() => setShowModal(false)} activeOpacity={0.85}>
              <Text style={styles.extendBtnText}>⏱ 10분 더 걷기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.finishBtn} onPress={handleEnd} activeOpacity={0.85}>
              <Text style={styles.finishBtnText}>✅ 오늘은 여기까지</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B4332',
    alignItems: 'center',
    padding: 16,
  },
  typeLabel: { color: '#95D5B2', fontSize: 18, marginTop: 20, marginBottom: 6 },

  // 타이머
  timerBox: { alignItems: 'center', marginVertical: 16 },
  timerText: { fontSize: 64, fontWeight: 'bold', color: '#fff' },
  timerSub: { color: '#95D5B2', fontSize: 14, marginTop: 4 },

  // 통계
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: {
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    minWidth: 90,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#95D5B2', marginTop: 3 },

  // AI 대화 패널
  chatPanel: {
    flex: 1,
    width: '100%',
    backgroundColor: '#2D6A4F',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  chatPanelTitle: { color: '#B7E4C7', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chatScroll: { flex: 1 },
  chatContent: { paddingBottom: 8, gap: 6 },
  chatEmpty: { color: '#95D5B2', textAlign: 'center', marginTop: 20, fontSize: 13 },

  // 말풍선
  bubble: { maxWidth: '85%', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleAI: { backgroundColor: '#40916C', alignSelf: 'flex-start' },
  bubbleUser: { backgroundColor: '#52B788', alignSelf: 'flex-end' },
  bubbleAIText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  bubbleUserText: { color: '#fff', fontSize: 14, lineHeight: 20 },

  // 입력 버튼 행
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  micBtn: {
    flex: 1,
    backgroundColor: '#52B788',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: { backgroundColor: '#E63946' },
  micBtnProcessing: { backgroundColor: '#F4A261' },
  micBtnInner: { alignItems: 'center', gap: 4 },
  micIcon: { fontSize: 24 },
  micLabel: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  cameraBtn: {
    width: 80,
    backgroundColor: '#40916C',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cameraIcon: { fontSize: 24 },
  cameraLabel: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 },
  btnDisabled: { opacity: 0.5 },

  // 컨트롤 버튼
  pauseBtn: {
    backgroundColor: '#52B788',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 36,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  pauseBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  endBtn: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 36,
    width: '100%',
    alignItems: 'center',
  },
  endBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: 'bold' },

  // 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 25,
    padding: 30, alignItems: 'center', width: '85%',
  },
  modalIcon: { fontSize: 50, marginBottom: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#2D6A4F', marginBottom: 10 },
  modalDesc: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  extendBtn: {
    backgroundColor: '#2D6A4F', borderRadius: 15,
    padding: 16, width: '100%', alignItems: 'center', marginBottom: 10,
  },
  extendBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  finishBtn: {
    backgroundColor: '#F0F7F0', borderRadius: 15,
    padding: 16, width: '100%', alignItems: 'center',
  },
  finishBtnText: { color: '#2D6A4F', fontSize: 17, fontWeight: '600' },
});
