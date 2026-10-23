/**
 * Load a native module only when it is needed. Expo Go (and older development builds) may not contain every native
 * module this app asks for; a plain top-level import of a missing one crashes the whole app at start-up. This returns
 * null instead, so the one feature that needs it switches off and everything else keeps working.
 *
 *   const Clipboard = await loadNative(() => import('expo-clipboard'))
 *   if (!Clipboard) return // not available here
 */
export async function loadNative<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load()
  } catch {
    return null
  }
}
