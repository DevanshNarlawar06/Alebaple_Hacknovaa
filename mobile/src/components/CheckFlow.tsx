import { Feather } from '@expo/vector-icons'
import { useRef, useState, type ComponentRef } from 'react'
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, KeyboardAvoidingView } from 'react-native'
import { buzz } from '@/lib/alerts'
import { checkLive, type CheckResult, type JobUpdate } from '@/lib/api'
import { cleanSource } from '@/lib/format'
import { loadNative } from '@/lib/native'
import { colors, statusOf } from '@/theme'
import CheckProgress from './CheckProgress'
import EvidenceBreakdown from './Evidence'
import { Button, FadeUp, Pop, text, type IconName } from './ui'

const HEADLINE: Record<string, string> = {
  VERIFIED: 'Confirmed by trusted sources',
  CONFLICTING: 'Not true: trusted sources say otherwise',
  OUTDATED: 'Old information, no longer current',
  UNVERIFIED: 'Not confirmed yet',
}
const ADVICE: Record<string, string> = {
  VERIFIED: 'Looks reliable. For safety decisions, still follow official instructions.',
  CONFLICTING: "Don't share this. Trusted sources contradict it.",
  OUTDATED: "Don't share it as breaking news.",
  UNVERIFIED: 'Hold off sharing until it is confirmed.',
}
const WHY: Record<string, string> = {
  MULTI_SOURCE_CONFIRMATION: 'Several independent sources report the same thing.',
  FACTUAL_CONFIRMATION: 'A trusted source confirms it.',
  HISTORICAL_SNAPSHOT: 'It was true at the time it was posted.',
  POSITIVE_CONTRADICTION: 'Trusted sources report the opposite.',
  NUMERIC_CONFLICT: "The numbers don't match official data.",
  SOURCE_DISAGREEMENT: 'Reliable sources disagree with each other.',
  OLD_NEWS: 'A real event, but it is over. This is old news.',
  SUPERSEDED_STATISTIC: 'The figures have since been updated.',
  SUPERSEDED_DIRECTIVE: 'That instruction is no longer in force.',
  SUPERSEDED_SITUATION: 'The situation has changed since.',
  INSUFFICIENT_EVIDENCE: "We couldn't find reliable sources either way.",
  PARTIALLY_SUPPORTED: "Part of it is confirmed, the rest isn't.",
  LOCATION_UNRESOLVED: "We couldn't work out where this is.",
  NO_SOURCE_COVERAGE: 'No sources cover this area yet.',
}
const ICON: Record<string, IconName> = { VERIFIED: 'check-circle', CONFLICTING: 'alert-triangle', OUTDATED: 'clock', UNVERIFIED: 'help-circle' }
const FACT: Record<string, { icon: IconName; color: string; word: string }> = {
  SUPPORTED: { icon: 'check', color: '#059669', word: 'Confirmed' },
  CONTRADICTED: { icon: 'x', color: '#D97706', word: 'Contradicted' },
  DISPUTED: { icon: 'x', color: '#D97706', word: 'Disputed' },
  SUPERSEDED: { icon: 'clock', color: colors.ink3, word: 'Outdated' },
  UNVERIFIED: { icon: 'help-circle', color: '#6366F1', word: 'Not confirmed' },
}
const EXAMPLES = [
  'Strong 7.2 earthquake just hit Mumbai, buildings collapsing in Andheri',
  'Heavy rain and waterlogging in Chennai right now',
]
const LINK = /https?:\/\//i

type Phase = 'input' | 'running' | 'result' | 'error'

export default function CheckFlow() {
  const [phase, setPhase] = useState<Phase>('input')
  const [input, setInput] = useState('')
  const [job, setJob] = useState<JobUpdate | null>(null)
  const [res, setRes] = useState<CheckResult | null>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null)
  const isLink = LINK.test(input)

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 2200)
  }

  const run = async () => {
    const t = input.trim()
    if (!t) return
    setPhase('running'); setJob(null); setRes(null); setOpen(false)
    scroller.current?.scrollTo({ y: 0, animated: false })
    try {
      const r = await checkLive({ text: t }, setJob)
      setRes(r)
      setPhase('result')
      buzz(r.status === 'CONFLICTING' ? 'warning' : 'success')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  const paste = async () => {
    try {
      const Clipboard = await loadNative(() => import('expo-clipboard'))
      if (!Clipboard) return flash('Paste is not available here. Type or paste into the box.')
      const v = await Clipboard.getStringAsync()
      if (v) setInput(v)
      else flash('Nothing to paste')
    } catch {
      flash('Could not read the clipboard')
    }
  }

  const share = async () => {
    if (!res) return
    const msg = `${HEADLINE[res.status ?? ''] ?? 'Checked'}: "${(res.claim_text || input).slice(0, 110)}". Checked with SachVerify.`
    try {
      if (Platform.OS === 'web') {
        const Clipboard = await loadNative(() => import('expo-clipboard'))
        await Clipboard?.setStringAsync(msg)
        flash('Copied to clipboard')
      } else await Share.share({ message: msg })
    } catch {
      /* cancelled */
    }
  }

  const again = () => { setPhase('input'); setInput(''); setRes(null) }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView ref={scroller} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={text.h2}>Check a message</Text>

        {phase === 'input' && (
          <FadeUp style={{ gap: 12 }}>
            <Text style={s.lead}>Paste a forwarded message, a news link or a YouTube video. We check it against official alerts, sensors and news.</Text>
            <View style={s.inputBox}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Paste a message or link"
                placeholderTextColor={colors.ink3}
                multiline
                style={s.input}
                autoCorrect={false}
                accessibilityLabel="Message or link to check"
              />
              <View style={s.inputFoot}>
                <Pressable onPress={paste} style={({ pressed }) => [s.chipBtn, pressed && { opacity: 0.6 }]}>
                  <Feather name="clipboard" size={14} color={colors.ink2} />
                  <Text style={s.chipBtnText}>Paste</Text>
                </Pressable>
                {isLink ? (
                  <View style={s.linkTag}><Feather name="link" size={13} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 12 }}>Link detected</Text></View>
                ) : !!input && (
                  <Pressable onPress={() => setInput('')}><Text style={text.faint}>Clear</Text></Pressable>
                )}
              </View>
            </View>
            <View>
              <View style={s.tryHead}><Feather name="zap" size={11} color={colors.ink3} /><Text style={s.tryText}>TRY ONE</Text></View>
              {EXAMPLES.map((x) => (
                <Pressable key={x} onPress={() => setInput(x)} style={({ pressed }) => [s.example, pressed && { backgroundColor: colors.subtle }]}>
                  <Text style={{ fontSize: 13, color: colors.ink2 }}>{x}</Text>
                </Pressable>
              ))}
            </View>
            <Button title="Check it" onPress={run} disabled={!input.trim()} />
          </FadeUp>
        )}

        {phase === 'running' && (
          <FadeUp style={{ gap: 16 }}>
            <Text numberOfLines={3} style={s.echo}>{input}</Text>
            <View style={s.progressCard}><CheckProgress job={job} link={isLink} /></View>
            <Text style={s.hint}>Usually 15 to 40 seconds. We look at real sources, so it takes a moment.</Text>
          </FadeUp>
        )}

        {phase === 'error' && (
          <FadeUp style={s.errorCard}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#881337' }}>That check didn&apos;t finish</Text>
            <Text style={{ fontSize: 13, color: '#9F1239' }}>{err}</Text>
            <Text style={{ fontSize: 12, color: '#9F1239' }}>Is the phone on the same Wi-Fi as the computer running the SachVerify server? You can set the server address in Settings.</Text>
            <Button title="Try again" onPress={() => setPhase('input')} />
          </FadeUp>
        )}

        {phase === 'result' && res && (res.checkworthy === false || !res.status ? (
          <FadeUp style={s.nothing}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>Nothing to check here</Text>
            <Text style={text.muted}>{res.triage_reason || "It doesn't state a checkable fact about a disaster."}</Text>
            <Button title="Check something else" onPress={again} />
          </FadeUp>
        ) : (
          <Result res={res} open={open} onToggle={() => setOpen(!open)} onShare={share} onAgain={again} />
        ))}
      </ScrollView>
      {!!toast && <FadeUp style={s.toast}><Text style={{ color: '#fff', fontSize: 12 }}>{toast}</Text></FadeUp>}
    </KeyboardAvoidingView>
  )
}

function Result({ res, open, onToggle, onShare, onAgain }: { res: CheckResult; open: boolean; onToggle: () => void; onShare: () => void; onAgain: () => void }) {
  const st = statusOf(res.status)
  const facts = (res.atomic_propositions ?? []).filter((p) => p.factuality === 'FACTUAL')
  const involved = (res.source_scoreboard ?? []).filter((b) => b.supports.length || b.contradicts.length || b.stale.length)
  const key = res.status ?? 'UNVERIFIED'
  const article = res.source_article
  return (
    <View style={{ gap: 16 }}>
      <FadeUp style={[s.hero, { backgroundColor: st.tint, borderColor: st.hex + '55' }]}>
        <View style={s.heroTag}>
          <Pop><Feather name={ICON[key]} size={18} color={st.hex} /></Pop>
          <Text style={{ color: st.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>{st.label.toUpperCase()}</Text>
        </View>
        <Text style={[s.heroTitle, { color: st.text }]}>{HEADLINE[key]}</Text>
        <Text style={s.heroWhy}>{WHY[res.verification_subtype ?? ''] ?? ''}</Text>
        <View style={s.advice}><Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{ADVICE[key]}</Text></View>
      </FadeUp>

      {!!article && (
        <FadeUp>
          <Pressable onPress={() => Linking.openURL(article.url)} style={s.source}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.ink3 }}>{article.method === 'youtube' ? 'From YouTube video' : 'From article'}</Text>
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{article.publisher}</Text>
            </View>
            <Feather name="external-link" size={14} color={colors.accent} />
          </Pressable>
        </FadeUp>
      )}

      {!!res.age_note && (
        <FadeUp>
          <View style={[s.note, key === 'OUTDATED' ? { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' } : { borderColor: colors.line, backgroundColor: colors.subtle }]}>
            <Text style={{ fontSize: 13, color: key === 'OUTDATED' ? '#78350F' : colors.ink2 }}>{res.age_note}</Text>
          </View>
        </FadeUp>
      )}

      <FadeUp>
        <Text style={s.sectionTitle}>What we checked</Text>
        <View style={s.list}>
          {facts.map((p, i) => {
            const f = FACT[p.state ?? ''] ?? { icon: 'minus' as IconName, color: colors.ink3, word: p.state ?? '' }
            return (
              <View key={p.id} style={[s.factRow, i > 0 && s.rowDivider]}>
                <Feather name={f.icon} size={16} color={f.color} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, lineHeight: 19, color: colors.ink }}>{p.text}</Text>
                  <Text style={{ fontSize: 12, color: f.color, marginTop: 2 }}>{f.word}</Text>
                </View>
              </View>
            )
          })}
        </View>
      </FadeUp>

      <FadeUp>
        <Text style={s.sectionTitle}>Who says so</Text>
        {involved.length === 0 ? (
          <Text style={s.nobody}>No source confirmed or contradicted it. We searched alerts, sensors and news.</Text>
        ) : (
          <View style={s.chips}>
            {involved.map((b) => {
              const bad = b.contradicts.length > 0
              const stale = !bad && !b.supports.length
              const c = bad ? { bg: '#FFFBEB', bd: '#FDE68A', fg: '#92400E' } : stale ? { bg: '#F8FAFC', bd: '#E2E8F0', fg: '#334155' } : { bg: '#ECFDF5', bd: '#A7F3D0', fg: '#065F46' }
              return (
                <View key={b.source} style={[s.chip, { backgroundColor: c.bg, borderColor: c.bd }]}>
                  <Feather name={bad ? 'x' : stale ? 'clock' : 'check'} size={12} color={c.fg} />
                  <Text style={{ fontSize: 12, color: c.fg }}>{cleanSource(b.source)}</Text>
                </View>
              )
            })}
          </View>
        )}
      </FadeUp>

      <FadeUp style={s.accordion}>
        <Pressable onPress={onToggle} style={s.accHead}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>See all the evidence</Text>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.ink2} />
        </Pressable>
        {open && <View style={s.accBody}><EvidenceBreakdown r={res} /></View>}
      </FadeUp>

      <View style={s.actions}>
        <Button kind="ghost" title="Share result" icon="share-2" onPress={onShare} style={{ flex: 1 }} />
        <Button title="Check another" icon="rotate-ccw" onPress={onAgain} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 16, paddingBottom: 40 },
  lead: { fontSize: 14, lineHeight: 21, color: colors.ink2 },
  inputBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.subtle, padding: 12 },
  input: { minHeight: 110, fontSize: 16, color: colors.ink, textAlignVertical: 'top', padding: 0 },
  inputFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  chipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipBtnText: { fontSize: 12, fontWeight: '600', color: colors.ink2 },
  linkTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tryHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  tryText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: colors.ink3 },
  example: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  echo: { backgroundColor: colors.subtle, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, lineHeight: 19, color: colors.ink2 },
  progressCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16 },
  hint: { textAlign: 'center', fontSize: 12, color: colors.ink3 },
  errorCard: { gap: 10, borderWidth: 1, borderColor: '#FECDD3', backgroundColor: '#FFF1F2', borderRadius: 16, padding: 16 },
  nothing: { gap: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.subtle, borderRadius: 16, padding: 16 },
  hero: { borderWidth: 1, borderRadius: 16, padding: 20 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '600', lineHeight: 27, marginTop: 8 },
  heroWhy: { fontSize: 14, color: colors.ink2, marginTop: 6, lineHeight: 20 },
  advice: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  note: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 8 },
  list: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' },
  factRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  nobody: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  accordion: { borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  accHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  accBody: { borderTopWidth: 1, borderTopColor: colors.line, padding: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  toast: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: colors.night, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
})
