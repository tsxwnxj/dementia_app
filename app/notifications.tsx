import * as Notifications from 'expo-notifications';

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

  // 권한 승인되면 자동으로 알림 예약
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 오후 2시
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🖐️ HandFit 손 체조 시간이에요!',
      body: '잠깐 손을 움직여 치매를 예방해요. 지금 바로 시작해볼까요?',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 14,
      minute: 0,
    },
  });

  // 오후 9시
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🖐️ HandFit 손 체조 시간이에요!',
      body: '오늘 마지막 손 운동! 잠들기 전에 같이 해봐요 💪',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });

  console.log('✅ 매일 오후 2시, 9시 알림 예약 완료');
}