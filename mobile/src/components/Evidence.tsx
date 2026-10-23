import { Feather } from '@expo/vector-icons'
import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { CheckResult, EvidenceCard } from '@/lib/api'
import { cleanSource, day, ago } from '@/lib/format'
import { colors, mono } from '@/theme'
import { Tag, type IconName } from './ui'

const LAYER: Record<string, string> = {
  official: 'Official', sensor: 'Sensor / data', local_news: 'Local news', national_global: 'National news',
  social: 'Post', humanitarian: 'Humanitarian', research: 'Research',
}

type Stance = EvidenceCard['stance']
const STANCE: Record<Stance, { icon: IconName; color: string; label: string; bg: string; border: string; fg: string }> = {
  supports: { icon: 'check', color: '#059669', label: 'Supports', bg: '#ECFDF5', border: '#A7F3D0', fg: '#065F46' },
  contradicts: { icon: 'x', color: '#D97706', label: 'Contradicts', bg: '#FFFBEB', border: '#FDE68A', fg: '#92400E' },
  stale: { icon: 'clock', color: colors.ink3, label: 'No longer current', bg: '#F1F5F9', border: '#E2E8F0', fg: '#334155' },
  neutral: { icon: 'circle', color: colors.ink3, label: "Didn't help", bg: '#fff', border: colors.line, fg: colors.ink3 },
}
const summary = (e: EvidenceCard) => (e.kind === 'alert' ? e.excerpt : e.interpretation || e.excerpt) || ''

function Badge({ kind, n }: { kind: Stance; n: number }) {
  const st = STANCE[kind]
  return (
    <View style={[s.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
      <Feather name={st.icon} size={10} color={st.fg} />
      <Text style={{ fontSize: 10.5, color: st.fg }}>{st.label}{n > 1 ? ` ×${n}` : ''}</Text>
    </View>
  )
}

function SourceLine({ e }: { e: EvidenceCard }) {
  const st = STANCE[e.stance] ?? STANCE.neutral
  return (
    <View style={s.line}>
      <Feather name={st.icon} size={14} color={st.color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <View style={s.lineHead}>
          <Text style={s.sourceName}>{cleanSource(e.source)}</Text>
          <Tag>{LAYER[e.layer ?? ''] ?? e.layer ?? 'Source'}</Tag>
          {e.is_synthetic && <Tag>demo data</Tag>}
          <Text style={s.when}>{[day(e.published_at), ago(e.published_at)].filter(Boolean).join(' · ')}</Text>
        </View>
        <Text numberOfLines={2} style={s.summary}>{summary(e)}</Text>
        <Text style={s.reason}>{st.label}: {e.plain_reason}{e.geo_basis ? ` · ${e.geo_basis}` : ''}</Text>
      </View>
      {!!e.url && (
        <Pressable onPress={() => Linking.openURL(e.url as string)} hitSlop={8} style={s.open}>
          <Text style={{ color: colors.accent, fontSize: 11 }}>Open</Text>
          <Feather name="external-link" size={10} color={colors.accent} />
        </Pressable>
      )}
    </View>
  )
}

/** Which sources were used, what each one said about each fact, and what was searched. */
export default function EvidenceBreakdown({ r }: { r: CheckResult }) {
  const [showLog, setShowLog] = useState(false)
  const all: EvidenceCard[] = [
    ...(r.supporting_evidence ?? []), ...(r.contradicting_evidence ?? []),
    ...(r.superseded_or_stale_evidence ?? []), ...(r.neutral_evidence ?? []),
  ]
  const facts = (r.atomic_propositions ?? []).filter((p) => p.factuality === 'FACTUAL')
  const board = r.source_scoreboard ?? []
  const log = r.search_log ?? []
  const order: Record<Stance, number> = { supports: 0, contradicts: 1, stale: 2, neutral: 3 }

  return (
    <View style={{ gap: 18 }}>
      {board.length > 0 && (
        <View>
          <Text style={s.label}>SOURCES USED ({board.length})</Text>
          <View style={s.box}>
            {board.map((b, i) => (
              <View key={b.source} style={[s.boardRow, i > 0 && s.divider]}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={s.sourceName}>{cleanSource(b.source)}</Text>
                  <Text style={s.faint}>
                    {LAYER[b.layer ?? ''] ?? b.layer}{b.credibility_tier ? ` · tier ${b.credibility_tier}` : ''}{b.is_synthetic ? ' · demo data' : ''}
                  </Text>
                </View>
                <View style={s.badges}>
                  {b.supports.length > 0 && <Badge kind="supports" n={b.supports.length} />}
                  {b.contradicts.length > 0 && <Badge kind="contradicts" n={b.contradicts.length} />}
                  {b.stale.length > 0 && <Badge kind="stale" n={b.stale.length} />}
                  {!b.supports.length && !b.contradicts.length && !b.stale.length && <Badge kind="neutral" n={b.neutral.length} />}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View>
        <Text style={s.label}>FACT BY FACT</Text>
        <View style={{ gap: 8 }}>
          {facts.map((p) => {
            const mine = all.filter((e) => e.proposition_id === p.id).sort((a, b) => order[a.stance] - order[b.stance] || (b.weight || 0) - (a.weight || 0))
            // one line per source and stance (the strongest), and no "didn't help" for a source that already helped
            const seen = new Set<string>()
            const decided = new Set(mine.filter((e) => e.stance !== 'neutral').map((e) => e.source))
            const cards = mine.filter((e) => {
              const k = e.source + '|' + e.stance
              if (seen.has(k) || (e.stance === 'neutral' && decided.has(e.source))) return false
              seen.add(k)
              return true
            })
            return (
              <View key={p.id} style={s.fact}>
                <View style={s.factHead}>
                  <Text style={s.factText}>{p.text}</Text>
                  <Tag>{(p.state ?? '').toLowerCase()}</Tag>
                </View>
                {cards.length ? (
                  cards.map((e, i) => <SourceLine key={e.evidence_id + e.stance + i} e={e} />)
                ) : (
                  <Text style={s.none}>No source confirmed or contradicted this. It was searched for, and absence of evidence is not treated as false.</Text>
                )}
              </View>
            )
          })}
        </View>
      </View>

      {log.length > 0 && (
        <View style={s.box}>
          <Pressable onPress={() => setShowLog(!showLog)} style={s.logHead}>
            <Feather name="search" size={12} color={colors.ink2} />
            <Text style={{ fontSize: 12, color: colors.ink2, flex: 1 }}>What was searched ({log.length} lookups)</Text>
            <Feather name={showLog ? 'chevron-up' : 'chevron-down'} size={14} color={colors.ink3} />
          </Pressable>
          {showLog && (
            <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 4 }}>
              {log.map((l, i) => (
                <Text key={i} style={[s.logLine, l.error && { color: '#D97706' }]}>
                  <Text style={{ color: colors.ink2 }}>{l.source}</Text> · {l.query} → {l.error ? 'failed' : `${l.found} found`}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  label: { fontFamily: mono, fontSize: 11, letterSpacing: 0.8, color: colors.ink3, marginBottom: 6 },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, maxWidth: '55%' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  faint: { fontSize: 10.5, color: colors.ink3 },
  fact: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  factHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  factText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
  none: { fontSize: 11.5, color: colors.ink3, marginTop: 6 },
  line: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 6 },
  lineHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sourceName: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
  when: { fontFamily: mono, fontSize: 10.5, color: colors.ink3 },
  summary: { fontSize: 12, color: colors.ink2, marginTop: 2, lineHeight: 17 },
  reason: { fontSize: 11, color: colors.ink3, marginTop: 2, lineHeight: 15 },
  open: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  logHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  logLine: { fontFamily: mono, fontSize: 11, color: colors.ink3 },
})
