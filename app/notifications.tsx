import * as Notifications from 'expo-notifications';
import { getTodaySessionCount } from '../services/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('알림 권한이 필요해요!');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily_9am',
    content: {
      title: '🖐️ HandFit 손 체조 시간이에요!',
      body: '오늘 아직 운동을 안 하셨어요. 지금 시작해볼까요?',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });

  await refreshNotifications();
}

export async function refreshNotifications(): Promise<void> {
  const count = await getTodaySessionCount();

  if (count === 1) {
    await Notifications.cancelScheduledNotificationAsync('daily_9am');

    await Notifications.scheduleNotificationAsync({
      identifier: 'daily_9am',
      content: {
        title: '🖐️ HandFit 손 체조 시간이에요!',
        body: '오늘 아직 운동을 안 하셨어요. 지금 시작해볼까요?',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });

    await Notifications.scheduleNotificationAsync({
      identifier: 'daily_10pm',
      content: {
        title: '🖐️ HandFit 손 체조 한 번 더!',
        body: '오늘 목표까지 한 번 남았어요. 자기 전에 같이 해봐요 💪',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 22,
        minute: 0,
      },
    });
  } else if (count >= 2) {
    await Notifications.cancelScheduledNotificationAsync('daily_10pm');
  }

  console.log(`✅ 알림 재설정 완료 (오늘 운동 횟수: ${count})`);
}