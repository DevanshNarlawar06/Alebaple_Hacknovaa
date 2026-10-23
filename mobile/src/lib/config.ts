import Constants from 'expo-constants'
import { Platform } from 'react-native'

/**
 * Where the SachVerify API lives.
 *  - EXPO_PUBLIC_API_BASE wins if set (e.g. in mobile/.env).
 *  - Otherwise: the computer running Metro (Expo reports its address), port 8000, which is what the
 *    backend uses. A phone on the same Wi-Fi can then reach the laptop without any setup.
 * The user can also type an address in Settings; it is saved and applied by setApiBase().
 */
export function guessApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_BASE
  if (env) return env.replace(/\/$/, '')
  if (Platform.OS === 'web') {
    const host = typeof location !== 'undefined' ? location.hostname : 'localhost'
    return `http://${host}:8000`
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return host ? `http://${host}:8000` : 'http://10.0.2.2:8000' // 10.0.2.2 = the host machine from an Android emulator
}

let base = guessApiBase()

export const getApiBase = () => base
export const setApiBase = (value: string) => {
  const v = value.trim().replace(/\/$/, '')
  base = /^https?:\/\//i.test(v) ? v : v ? `http://${v}` : guessApiBase()
}
