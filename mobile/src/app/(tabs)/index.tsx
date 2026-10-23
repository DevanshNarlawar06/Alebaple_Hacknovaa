import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button, FadeUp, StatusPill, Toggle, text, type IconName } from '@/components/ui'
import { ago, hhmm, shortSource } from '@/lib/format'
import { useBeacon } from '@/state/beacon'
import { LEVEL, colors, statusOf } from '@/theme'

type Action = [IconName, string]
const CHARGE: Action = ['battery-charging', 'Keep your phone charged']
const ACTIONS: Record<string, Action[]> = {
  flood: [['arrow-up', 'Move to higher floors'], ['slash', 'Avoid low-lying roads and riverbanks'], CHARGE],
  storm: [['shield', 'Stay indoors, away from windows'], ['slash', 'Avoid trees, poles and open fields'], CHARGE],
  earthquake: [['shield', 'Drop, cover and hold on'], ['slash', 'Stay away from damaged buildings'], CHARGE],
  default: [['info', 'Follow official instructions'], ['slash', 'Avoid the affected area'], CHARGE],
}

export default function Home() {
  const { ready, status, error, radius, sound, safe, setSafe, setSound, refresh, refreshing } = useBeacon()
  const [soundMsg, setSoundMsg] = useState('')

  if (!ready) return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>

  const level = status?.level ?? 'GREEN'
  const theme = LEVEL[level]
  const alert = status?.alerts_covering?.[0] ?? status?.alerts_nearby?.[0]
  const hazard = alert?.event_type ?? 'default'
  const nearby = (status?.nearby_claims ?? []).filter((c) => c.status !== 'CONFLICTING' && c.status !== 'OUTDATED')
  const title = level === 'RED' ? `${hazard === 'default' ? 'Alert' : hazard[0].toUpperCase() + hazard.slice(1) + ' alert'} for your area` : theme.title
  const verifiedBy = [
    alert && `${shortSource(alert.source_name)} alert`,
    ...nearby.filter((c) => c.status === 'VERIFIED').slice(0, 1).map(() => 'verified local reports'),
  ].filter(Boolean).join(' + ')

  const enableSound = async () => {
    setSoundMsg((await setSound(true)) ?? '')
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {!!error && !status && (
          <FadeUp style={s.offline}>
            <Feather name="wifi-off" size={16} color="#9F1239" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#881337' }}>Can&apos;t reach the server</Text>
              <Text style={{ fontSize: 12, color: '#9F1239', marginTop: 2 }}>Check the phone is on the same Wi-Fi as the computer, or set the server address in Settings.</Text>
            </View>
          </FadeUp>
        )}

        <FadeUp style={[s.card, { backgroundColor: theme.bg, borderColor: theme.ring }]}>
          <View style={s.cardTop}>
            <View style={s.cardTag}>
              <Feather name={level === 'RED' ? 'alert-triangle' : level === 'YELLOW' ? 'eye' : 'shield'} size={15} color={theme.color} />
              <Text style={{ color: theme.color, fontSize: 12, fontWeight: '600' }}>{theme.tag}</Text>
            </View>
            <Text style={text.faint}>Updated {ago(status?.updated_at)}</Text>
          </View>
          <Text style={[text.h1, { marginTop: 8 }]}>{title}</Text>
          {alert && level !== 'GREEN' ? (
            <Text style={[text.muted, { marginTop: 4 }]}>
              {shortSource(alert.source_name)}{alert.valid_until ? ` · until ${hhmm(alert.valid_until)}` : ''}{alert.is_synthetic ? '  ·  demo data' : ''}
            </Text>
          ) : (
            <Text style={[text.muted, { marginTop: 4 }]}>{level === 'GREEN' ? `No verified threats within ${radius} km` : status?.reason}</Text>
          )}

          {level === 'RED' && (
            <View style={s.actions}>
              {(ACTIONS[hazard] ?? ACTIONS.default).map(([icon, label], i) => (
                <View key={label} style={[s.action, i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }]}>
                  <Feather name={icon} size={18} color={colors.ink2} />
                  <Text style={{ fontSize: 15, color: colors.ink, flex: 1 }}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {level !== 'GREEN' && (
            <View style={{ marginTop: 16, gap: 8 }}>
              {level === 'RED' && (safe ? (
                <View style={s.safe}>
                  <Feather name="check-circle" size={17} color="#047857" />
                  <Text style={{ color: '#047857', fontSize: 14, fontWeight: '600' }}>Marked safe · alert muted</Text>
                </View>
              ) : (
                <Button title="I'm safe" onPress={() => setSafe(true)} />
              ))}
              <Button kind="ghost" title={`Why this ${level === 'RED' ? 'alert' : 'status'}?`} onPress={() => router.push('/why')} />
            </View>
          )}
          {!!verifiedBy && level === 'RED' && <Text style={[text.faint, { marginTop: 12 }]}>Verified by {verifiedBy}</Text>}
        </FadeUp>

        {!sound && (
          <FadeUp>
            <Pressable onPress={enableSound} style={s.soundRow}>
              <Feather name="bell-off" size={18} color={colors.ink2} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: colors.ink }}>Turn on alert sound</Text>
                <Text style={text.faint}>Only for official or verified threats</Text>
              </View>
              <Toggle value={false} onValueChange={enableSound} />
            </Pressable>
            {!!soundMsg && <Text style={[text.faint, { color: '#9F1239', marginTop: 6 }]}>{soundMsg}</Text>}
          </FadeUp>
        )}

        <FadeUp>
          <View style={s.sectionHead}>
            <Text style={text.h3}>Nearby updates</Text>
            <Text style={text.faint}>{nearby.length}</Text>
          </View>
          <View style={s.list}>
            {nearby.slice(0, 5).map((c, i) => (
              <View key={c.claim_id} style={[s.update, i > 0 && s.divider]}>
                <View style={s.updateTop}>
                  <StatusPill status={c.status} small />
                  <Text style={text.faint}>{c.distance_km} km · {ago(c.created_at)}</Text>
                </View>
                <Text numberOfLines={3} style={{ fontSize: 15, lineHeight: 21, color: colors.ink, marginTop: 8 }}>{c.claim_text}</Text>
              </View>
            ))}
            {!nearby.length && <Text style={[text.muted, { padding: 16, color: colors.ink3 }]}>No reports near you.</Text>}
          </View>
        </FadeUp>

        {!!status?.rumour_checks?.length && (
          <FadeUp>
            <Text style={[text.h3, { marginBottom: 8 }]}>Rumour check</Text>
            <View style={{ gap: 8 }}>
              {status.rumour_checks.map((c) => (
                <View key={c.claim_id} style={[s.rumour, { borderLeftColor: statusOf(c.status).hex }]}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{c.status === 'OUTDATED' ? 'Old news, not current' : 'Not true'}</Text>
                  <Text numberOfLines={3} style={[text.muted, { marginTop: 4 }]}>“{c.claim_text}”</Text>
                </View>
              ))}
            </View>
          </FadeUp>
        )}
        <View style={{ height: 70 }} />
      </ScrollView>

      <Pressable onPress={() => router.navigate('/check')} style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]} accessibilityLabel="Check a message">
        <Feather name="message-square" size={16} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Check a message</Text>
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { padding: 16, gap: 20 },
  offline: { flexDirection: 'row', gap: 10, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 12, padding: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  safe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, height: 48 },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.subtle, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  list: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' },
  update: { padding: 16 },
  updateTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  rumour: { borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, borderRadius: 12, padding: 16 },
  fab: {
    position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
})
