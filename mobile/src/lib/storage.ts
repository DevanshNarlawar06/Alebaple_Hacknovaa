import AsyncStorage from '@react-native-async-storage/async-storage'

/** Small JSON helpers. Storage can fail (full disk, private mode on web), so nothing here throws. */
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback
  } catch {
    return fallback
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* losing a saved setting is not worth a crash */
  }
}
