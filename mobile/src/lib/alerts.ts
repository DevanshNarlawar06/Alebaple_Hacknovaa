import { Platform, Vibration } from 'react-native'
import { loadNative } from './native'

/**
 * Local alerts only: sound, vibration and a notification, raised by the app itself when the threat level turns RED.
 * (The web app plays a tone; the phone's own notification sound and vibration are the native version.)
 * Remote push is not needed: the app polls the server.
 *
 * Notifications and haptics are loaded on demand (see native.ts): if this build of Expo Go lacks the module, alerts
 * fall back to vibration and nothing crashes.
 */
const native = Platform.OS !== 'web'
const CHANNEL = 'alerts'

const loadNotifications = (() => {
  let once: Promise<typeof import('expo-notifications') | null> | null = null
  return () => {
    if (!native) return Promise.resolve(null)
    once ??= loadNative(() => import('expo-notifications')).then((N) => {
      N?.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
      })
      return N
    })
    return once
  }
})()

export type EnableResult = 'ok' | 'denied' | 'unavailable'

/**
 * Ask for notification permission (and create the Android channel).
 *  ok          alerts can show a notification
 *  denied      the user refused: nothing is turned on
 *  unavailable this build cannot show notifications: alerts will vibrate only
 */
export async function enableAlerts(): Promise<EnableResult> {
  if (!native) return 'ok'
  const N = await loadNotifications()
  if (!N) return 'unavailable'
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL, {
        name: 'Threat alerts',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 150, 300],
      })
    }
    const cur = await N.getPermissionsAsync()
    if (cur.granted) return 'ok'
    return (await N.requestPermissionsAsync()).granted ? 'ok' : 'denied'
  } catch {
    return 'unavailable'
  }
}

/** Short tap feedback when a check finishes. Silently does nothing where haptics are missing. */
export async function buzz(kind: 'success' | 'warning'): Promise<void> {
  if (!native) return
  const H = await loadNative(() => import('expo-haptics'))
  await H?.notificationAsync(kind === 'warning' ? H.NotificationFeedbackType.Warning : H.NotificationFeedbackType.Success).catch(() => {})
}

/** Vibration + a banner with sound. Safe when permission was refused or notifications are missing: it just does less. */
export async function fireAlert(title: string, body: string): Promise<void> {
  if (!native) return
  Vibration.vibrate([0, 300, 150, 300, 150, 300])
  const N = await loadNotifications()
  try {
    await N?.scheduleNotificationAsync({
      content: { title, body },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    })
  } catch {
    /* no permission */
  }
}
