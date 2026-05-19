import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerPushToken(): Promise<void> {
  try {
    const granted = await requestPermissions();
    if (!granted) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await api.patch('/users/me/push-token', { expoPushToken: token });
  } catch {
    // Silently fail — push notifications are non-critical
  }
}

export async function markActive(): Promise<void> {
  try {
    await api.patch('/users/me/active');
  } catch {}
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerHours: number,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerHours * 3600, repeats: false },
  });
}

export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
