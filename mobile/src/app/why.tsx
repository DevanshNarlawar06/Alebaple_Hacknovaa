import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import BeaconHeader from '@/components/BeaconHeader'
import { FadeUp, text } from '@/components/ui'
import { hhmm, shortSource } from '@/lib/format'
import { useBeacon } from '@/state/beacon'
import { colors } from '@/theme'

/** "Why this alert?": the rule, and the official alerts behind the status. */
export default function Why() {
  const { status } = useBeacon()
  const level = status?.level ?? 'GREEN'
  const label = level === 'RED' ? 'alert' : 'status'
  const alerts = [...(status?.alerts_covering ?? []), ...(status?.alerts_nearby ?? [])].slice(0, 4)
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <BeaconHeader />
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.title}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back"><Feather name="chevron-left" size={22} color={colors.ink} /></Pressable>
          <Text style={text.h2}>Why this {label}?</Text>
        </View>
        <Text style={s.lead}>
          Beacon only sounds an alarm when an <Text style={s.strong}>official alert</Text> covers your area or a report is{' '}
          <Text style={s.strong}>verified</Text> by trusted sources. Social media posts alone can raise “Stay alert”, never an alarm.
        </Text>
        {alerts.map((a) => (
          <FadeUp key={a.evidence_id} style={s.alert}>
            <View style={s.alertTop}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink }}>{shortSource(a.source_name)} · official</Text>
              <Text style={text.faint}>{a.distance_km != null ? `${a.distance_km} km` : 'covers your area'}</Text>
            </View>
            <Text style={[text.muted, { marginTop: 8 }]}>{a.raw_evidence_text}</Text>
            <View style={s.alertTop}>
              <Text style={[text.faint, { marginTop: 8 }]}>valid until {hhmm(a.valid_until) || '-'}{a.is_synthetic ? ' · demo data' : ''}</Text>
              {!!a.source_url && (
                <Pressable onPress={() => Linking.openURL(a.source_url as string)} style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.accent, fontSize: 12 }}>Source ↗</Text>
                </Pressable>
              )}
            </View>
          </FadeUp>
        ))}
        {!alerts.length && <Text style={[text.muted, { color: colors.ink3 }]}>No official alerts near you right now.</Text>}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 16 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lead: { fontSize: 15, lineHeight: 23, color: colors.ink2 },
  strong: { fontWeight: '700', color: colors.ink },
  alert: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16 },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})
