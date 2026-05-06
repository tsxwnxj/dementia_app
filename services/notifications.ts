import * as Notifications from 'expo-notifications';
import { auth } from '../services/firebase';
import { getLastSessionTime, getTodaySessionCount } from '../services/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('알림 권한이 필요해요!');
    return;
  }

  await refreshNotifications();
}

export async function refreshNotifications(): Promise<void> {
  if (!auth.currentUser) return;

  // 🔥 기존 알림 제거
  await Notifications.cancelScheduledNotificationAsync('morning_11');
  await Notifications.cancelScheduledNotificationAsync('evening_6');

  const lastTime = await getLastSessionTime();
  const count = await getTodaySessionCount();

  let didMorning = false;
  let didAfternoon = false;

  if (lastTime) {
    const hour = lastTime.getHours();
    if (hour < 12) didMorning = true;
    else didAfternoon = true;
  }

  // ✅ 오전 안 했으면 → 11시 알림
  if (!didMorning) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'morning_11',
      content: {
        title: '🖐️ 손 운동 시간이에요!',
        body: '아직 아침 운동을 안 하셨어요 😊',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 11,
        minute: 0,
      },
    });
  }

  // ✅ 오후 안 했으면 → 18시 알림
  if (!didAfternoon && count < 2) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'evening_6',
      content: {
        title: '🖐️ 오늘 한 번 더 해볼까요?',
        body: '오후 운동이 아직 남았어요 💪',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    });
  }

  // ✅ 둘 다 했으면 알림 제거
  if (count >= 2) {
    await Notifications.cancelScheduledNotificationAsync('morning_11');
    await Notifications.cancelScheduledNotificationAsync('evening_6');
  }

  console.log(`✅ 알림 설정 완료 (count:${count}, 오전:${didMorning}, 오후:${didAfternoon})`);
}