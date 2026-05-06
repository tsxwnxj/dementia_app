import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

type WalkType = 'indoor' | 'outdoor';

interface Props {
  walkType: WalkType;
  onEnd: () => void;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

const WALK_INTERVAL = 10 * 60; // 10분(초)

export default function ActiveWalkScreen({ walkType, onEnd }: Props) {
  const [elapsed, setElapsed] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  const locationRef = useRef<Coordinate | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (walkType !== 'outdoor') return;

    (async () => {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status: asked } = await Location.requestForegroundPermissionsAsync();
        finalStatus = asked;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '실외 산책 거리 측정을 위해 위치 권한이 필요합니다.\n설정 > 개인 정보 보호 > 위치 서비스에서 허용해 주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정 열기', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      await Location.requestBackgroundPermissionsAsync();

      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          if (locationRef.current) {
            const d = getDistance(
              locationRef.current.latitude,
              locationRef.current.longitude,
              latitude,
              longitude
            );
            if (d < 50) {
              setDistance((prev) => prev + d);
              setSteps((prev) => prev + Math.round(d / 0.75));
            }
          }
          locationRef.current = { latitude, longitude };
        }
      );
    })();

    return () => {
      locationSubRef.current?.remove();
    };
  }, [walkType]);

  useEffect(() => {
    if (walkType === 'indoor') {
      setSteps(Math.round(elapsed * 1.5));
    }
  }, [elapsed, walkType]);

  const sendNotification = async (): Promise<void> => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 산책 10분 달성!',
        body: '정말 잘하셨어요! 10분 더 걸으시겠어요?',
        sound: true,
      },
      trigger: null,
    });
  };

  const formatTime = (sec: number): string => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDistance = (m: number): string => {
    return m >= 1000
      ? `${(m / 1000).toFixed(2)} km`
      : `${Math.round(m)} m`;
  };

  const handleExtend = (): void => {
    setShowModal(false);
  };

  const handleEnd = (): void => {
    setShowModal(false);
    if (timerRef.current) clearInterval(timerRef.current);
    locationSubRef.current?.remove();
    onEnd();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.typeLabel}>
        {walkType === 'outdoor' ? '🌳 실외 산책' : '🏠 실내 산책'}
      </Text>

      <View style={styles.timerBox}>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        <Text style={styles.timerSub}>
          목표까지 {formatTime(Math.max(0, WALK_INTERVAL - (elapsed % WALK_INTERVAL)))}
        </Text>
      </View>

      <View style={styles.statsRow}>
        {walkType === 'outdoor' && (
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
          <Text style={styles.statValue}>
            {Math.round(steps * 0.04)} kcal
          </Text>
          <Text style={styles.statLabel}>칼로리</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.pauseBtn}
        onPress={() => setIsRunning((r) => !r)}
        activeOpacity={0.85}
      >
        <Text style={styles.pauseBtnText}>
          {isRunning ? '⏸ 일시정지' : '▶️ 재개'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.endBtn} onPress={handleEnd} activeOpacity={0.85}>
        <Text style={styles.endBtnText}>🛑 산책 종료</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🎉</Text>
            <Text style={styles.modalTitle}>10분 산책 달성!</Text>
            <Text style={styles.modalDesc}>
              정말 잘하셨어요!{'\n'}조금 더 걸어볼까요?
            </Text>
            <TouchableOpacity style={styles.extendBtn} onPress={handleExtend} activeOpacity={0.85}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B4332',
    alignItems: 'center',
    padding: 20,
  },
  typeLabel: { color: '#95D5B2', fontSize: 18, marginTop: 20, marginBottom: 10 },
  timerBox: { alignItems: 'center', marginVertical: 30 },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerSub: { color: '#95D5B2', fontSize: 16, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 40 },
  statBox: {
    backgroundColor: '#2D6A4F',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 100,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 13, color: '#95D5B2', marginTop: 4 },
  pauseBtn: {
    backgroundColor: '#52B788',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 15,
  },
  pauseBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  endBtn: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  endBtnText: { color: '#FF6B6B', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    width: '85%',
  },
  modalIcon: { fontSize: 50, marginBottom: 10 },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  extendBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 15,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  extendBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  finishBtn: {
    backgroundColor: '#F0F7F0',
    borderRadius: 15,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  finishBtnText: { color: '#2D6A4F', fontSize: 17, fontWeight: '600' },
});