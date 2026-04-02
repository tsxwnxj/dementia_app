import * as Notifications from 'expo-notifications';
import { db, auth } from '../services/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 오늘 운동 횟수 확인
async function getTodaySessionCount(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 0;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, `users/${uid}/sessions`),
    where('completedAt', '>=', Timestamp.fromDate(start)),
    where('completedAt', '<=', Timestamp.fromDate(end))
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function setupNotifications(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('알림 권한이 필요해요!');
    return;
  }
  await refreshNotifications();
}

// 앱 시작 or 운동 완료 시 알림 재설정
export async function refreshNotifications(): Promise<void> {
  const count = await getTodaySessionCount();
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (count === 0) {
    // 오늘 운동 안 했으면 오전 9시 알림
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🖐️ HandFit 손 체조 시간이에요!',
        body: '오늘 아직 운동을 안 하셨어요. 지금 시작해볼까요?',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 48,
      },
    });
  } else if (count === 9) {
    // 1번만 했으면 밤 10시 알림
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🖐️ HandFit 손 체조 한 번 더!',
        body: '오늘 목표까지 한 번 남았어요. 자기 전에 같이 해봐요 💪',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 58,
      },
    });
  }
  // 2번 완료 시 모든 알림 취소 (이미 위에서 취소됨)

  console.log(`✅ 알림 재설정 완료 (오늘 운동 횟수: ${count})`);
}