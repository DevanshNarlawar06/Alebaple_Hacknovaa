import { Feather } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import type { JobUpdate } from '@/lib/api'
import { colors, mono } from '@/theme'
import { FadeUp, Pop, Spinner } from './ui'

const BASE: [string, string][] = [
  ['extract', 'Splitting it into checkable facts'],
  ['place', 'Finding the place'],
  ['search', 'Searching alerts, sensors and news'],
  ['compare', 'Comparing each fact with the evidence'],
  ['decide', 'Weighing it all up'],
]

/**
 * Live progress for a check: a timeline that fills in as the server works (same steps as the web app).
 * `job` is what checkLive() reports; `link` adds the "Reading the link" step.
 */
export default function CheckProgress({ job, link }: { job: JobUpdate | null; link: boolean }) {
  const order: [string, string][] = [...(link ? ([['link', 'Reading the link']] as [string, string][]) : []), ...BASE]
  const live = Object.fromEntries((job?.steps ?? []).map((st) => [st.id, st]))
  const done = order.filter(([id]) => live[id]?.state === 'done').length
  // before the server reports anything, show the first step as started so the screen never looks idle
  const activeId = order.find(([id]) => live[id]?.state === 'active')?.[0] ?? order.find(([id]) => live[id]?.state !== 'done')?.[0]
  const pct = Math.min(96, Math.round(((done + 0.45) / order.length) * 100))

  const [width] = useState(() => new Animated.Value(pct))
  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [pct, width])

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Checking">
      <View style={s.head}>
        <Text style={s.mono}>CHECKING</Text>
        <Text style={s.mono}>{job ? `${Math.round(job.elapsed)} s` : ''}</Text>
      </View>
      <View style={s.track}>
        <Animated.View style={[s.fill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      </View>
      {order.map(([id, label], i) => {
        const st = live[id]
        const state = st?.state === 'done' ? 'done' : id === activeId ? 'active' : 'pending'
        return (
          <View key={id} style={[s.row, state === 'pending' && { opacity: 0.4 }]}>
            <View style={s.iconCol}>
              <View style={s.iconBox}>
                {state === 'done' && (
                  <Pop style={s.doneDot}>
                    <Feather name="check" size={12} color="#fff" />
                  </Pop>
                )}
                {state === 'active' && <Spinner size={20} />}
                {state === 'pending' && <View style={s.pendingDot} />}
              </View>
              {i < order.length - 1 && <View style={s.rail} />}
            </View>
            <View style={s.body}>
              <Text style={[s.label, state !== 'pending' && { fontWeight: '600', color: colors.ink }]}>{label}</Text>
              {!!st?.detail && (
                <FadeUp key={st.detail}>
                  <Text style={s.detail}>{st.detail}</Text>
                </FadeUp>
              )}
              {(st?.subs ?? []).slice(-5).map((x, k) => (
                <FadeUp key={x + k}>
                  <Text numberOfLines={1} style={s.sub}>· {x}</Text>
                </FadeUp>
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  mono: { fontFamily: mono, fontSize: 11, color: colors.ink3 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginBottom: 20 },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  iconCol: { alignItems: 'center', width: 20 },
  iconBox: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  doneDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink3 },
  rail: { position: 'absolute', top: 24, bottom: -18, width: 1, backgroundColor: colors.line },
  body: { flex: 1 },
  label: { fontSize: 14, color: colors.ink2 },
  detail: { fontSize: 12.5, color: colors.ink2, marginTop: 2 },
  sub: { fontFamily: mono, fontSize: 11, color: colors.ink3, marginTop: 2 },
})
