import type { Reminder } from '../store/reminderStore';

// Detect if running inside Capacitor (native iOS/Android)
const isNative = () =>
  typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform === 'function' &&
  (window as unknown as { Capacitor: { isNativePlatform: () => boolean } })
    .Capacitor.isNativePlatform();

async function getCapacitorNotifications() {
  if (!isNative()) return null;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const cap = await getCapacitorNotifications();
  if (cap) {
    const result = await cap.requestPermissions();
    return result.display === 'granted';
  }
  // Browser fallback
  if ('Notification' in window) {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  return false;
}

export async function scheduleReminder(reminder: Reminder): Promise<void> {
  const [year, month, day] = reminder.date.split('-').map(Number);
  const [hour, minute] = reminder.time.split(':').map(Number);
  const fireAt = new Date(year, month - 1, day, hour, minute, 0);

  if (fireAt <= new Date()) return; // already past

  const cap = await getCapacitorNotifications();

  if (cap) {
    await cap.schedule({
      notifications: [
        {
          id: Math.abs(reminder.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 2147483647,
          title: 'afavers reminder',
          body: reminder.title,
          schedule: { at: fireAt },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
        },
      ],
    });
    return;
  }

  // Browser fallback: use setTimeout + Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    const ms = fireAt.getTime() - Date.now();
    if (ms > 0 && ms < 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        new Notification('afavers reminder', { body: reminder.title, icon: '/logo.png' });
      }, ms);
    }
  }
}

export async function cancelReminder(reminderId: string): Promise<void> {
  const cap = await getCapacitorNotifications();
  if (cap) {
    const notifId = Math.abs(reminderId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 2147483647;
    await cap.cancel({ notifications: [{ id: notifId }] });
  }
}
