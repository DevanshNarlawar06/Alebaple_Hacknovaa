import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { api, type BeaconStatus } from '@/lib/api'
import { enableAlerts, fireAlert } from '@/lib/alerts'
import { getApiBase, setApiBase } from '@/lib/config'
import { loadJSON, saveJSON } from '@/lib/storage'

/** The demo areas from the web app. "My location" is added from the phone's GPS. */
export const PLACES: Record<string, [number, number]> = {
  'Kothrud, Pune': [18.5074, 73.8077],
  'Sinhagad Road, Pune': [18.4745, 73.818],
  'Laxmi Nagar, Delhi': [28.6304, 77.2777],
  Mumbai: [19.076, 72.8777],
  'Anantapur, AP': [14.6819, 77.6006],
}
export const MY_LOCATION = 'My location'

interface Saved {
  place: string
  radius: number
  sound: boolean
  mine: [number, number] | null
  apiBase: string
}
const KEY = 'beacon.settings.v1'
const DEFAULTS: Saved = { place: 'Kothrud, Pune', radius: 10, sound: false, mine: null, apiBase: '' }
const REFRESH_MS = 15000

interface Ctx {
  ready: boolean
  place: string
  coords: [number, number]
  radius: number
  sound: boolean
  safe: boolean
  status: BeaconStatus | null
  error: string | null
  refreshing: boolean
  apiBase: string
  setPlace: (name: string, mine?: [number, number]) => void
  setRadius: (km: number) => void
  /** Turns alerts on or off. Resolves to a message to show the user, or null when there is nothing to say. */
  setSound: (on: boolean) => Promise<string | null>
  setSafe: (v: boolean) => void
  setServer: (url: string) => void
  refresh: () => Promise<void>
}

const BeaconContext = createContext<Ctx | null>(null)

export function useBeacon(): Ctx {
  const c = useContext(BeaconContext)
  if (!c) throw new Error('useBeacon must be used inside <BeaconProvider>')
  return c
}

export function BeaconProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<BeaconStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [safe, setSafe] = useState(false)
  const lastLevel = useRef<string | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    loadJSON(KEY, DEFAULTS).then((s) => {
      if (s.apiBase) setApiBase(s.apiBase)
      setSaved(s)
      setReady(true)
    })
  }, [])

  const update = useCallback((patch: Partial<Saved>) => {
    setSaved((prev) => {
      const next = { ...prev, ...patch }
      saveJSON(KEY, next)
      return next
    })
  }, [])

  const coords: [number, number] = useMemo(
    () => (saved.place === MY_LOCATION && saved.mine ? saved.mine : PLACES[saved.place] ?? PLACES['Kothrud, Pune']),
    [saved.place, saved.mine],
  )
  const [lat, lon] = coords
  const { radius, sound } = saved

  const refresh = useCallback(async () => {
    const mine = ++seq.current
    setRefreshing(true)
    try {
      const s = await api.beacon(lat, lon, radius)
      if (mine !== seq.current) return // a newer request (e.g. after changing area) owns the screen
      setStatus(s)
      setError(null)
      if (s.level === 'RED' && lastLevel.current && lastLevel.current !== 'RED') {
        setSafe(false)
        if (sound) fireAlert('Beacon: alert for your area', s.reason)
      }
      lastLevel.current = s.level
    } catch (e) {
      if (mine === seq.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (mine === seq.current) setRefreshing(false)
    }
  }, [lat, lon, radius, sound])

  // refresh on start, on any change of area/radius, every 15 s, and whenever the app comes back to the front
  useEffect(() => {
    if (!ready) return
    lastLevel.current = null
    const first = setTimeout(refresh, 0)
    const t = setInterval(refresh, REFRESH_MS)
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh())
    return () => {
      clearTimeout(first)
      clearInterval(t)
      sub.remove()
    }
  }, [ready, refresh, saved.apiBase])

  const value: Ctx = {
    ready,
    place: saved.place,
    coords,
    radius,
    sound,
    safe,
    status,
    error,
    refreshing,
    apiBase: getApiBase(),
    setPlace: (name, mine) => {
      setSafe(false)
      // the server only ever sees a rounded area (about 1 km), never the exact position
      update(mine ? { place: name, mine: [Math.round(mine[0] * 100) / 100, Math.round(mine[1] * 100) / 100] } : { place: name })
    },
    setRadius: (km) => update({ radius: km }),
    setSound: async (on) => {
      if (!on) {
        update({ sound: false })
        return null
      }
      const r = await enableAlerts()
      if (r === 'denied') return 'Notifications are blocked. Allow them in your phone settings to get alerts.'
      update({ sound: true })
      return r === 'unavailable' ? "This version of Expo Go can't show notifications, so alerts will vibrate the phone instead." : null
    },
    setSafe,
    setServer: (url) => {
      setApiBase(url)
      update({ apiBase: url.trim() })
    },
    refresh,
  }
  return <BeaconContext.Provider value={value}>{children}</BeaconContext.Provider>
}
