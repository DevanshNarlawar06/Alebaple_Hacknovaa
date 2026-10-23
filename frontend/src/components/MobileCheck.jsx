import { useRef, useState } from 'react'
import {
  ChevronLeft, ClipboardPaste, Share2, RotateCcw, ChevronDown, CheckCircle2, AlertTriangle, Clock, HelpCircle,
  Check, X, Minus, ExternalLink, Link2, Sparkles,
} from 'lucide-react'
import { checkLive } from '../lib/api'
import { STATUS } from './ui'
import CheckProgress from './CheckProgress'
import EvidenceBreakdown from './Evidence'

const HEADLINE = {
  VERIFIED: 'Confirmed by trusted sources', CONFLICTING: 'Not true: trusted sources say otherwise',
  OUTDATED: 'Old information, no longer current', UNVERIFIED: 'Not confirmed yet',
}
const ADVICE = {
  VERIFIED: 'Looks reliable. For safety decisions, still follow official instructions.',
  CONFLICTING: "Don't share this. Trusted sources contradict it.",
  OUTDATED: "Don't share it as breaking news.",
  UNVERIFIED: 'Hold off sharing until it is confirmed.',
}
const WHY = {
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
const ICON = { VERIFIED: CheckCircle2, CONFLICTING: AlertTriangle, OUTDATED: Clock, UNVERIFIED: HelpCircle }
const FACT = {
  SUPPORTED: [Check, 'text-st-verified', 'Confirmed'], CONTRADICTED: [X, 'text-st-conflicting', 'Contradicted'],
  DISPUTED: [X, 'text-st-conflicting', 'Disputed'], SUPERSEDED: [Clock, 'text-ink-3', 'Outdated'],
  UNVERIFIED: [HelpCircle, 'text-st-unverified', 'Not confirmed'],
}
const EXAMPLES = [
  'Strong 7.2 earthquake just hit Mumbai, buildings collapsing in Andheri',
  'Heavy rain and waterlogging in Chennai right now',
]
const clean = (s = '') => s.replace(/\[SYNTHETIC\]\s*/i, '')

export default function MobileCheck({ onBack }) {
  const [phase, setPhase] = useState('input') // input | running | result | error
  const [text, setText] = useState('')
  const [job, setJob] = useState(null)
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const box = useRef(null)
  const isLink = /https?:\/\//i.test(text)

  const run = async () => {
    if (!text.trim()) return
    setPhase('running'); setJob(null); setRes(null); setOpen(false)
    try {
      setRes(await checkLive({ text }, setJob))
      setPhase('result')
    } catch (e) {
      setErr(String(e.message || e)); setPhase('error')
    }
  }
  const paste = async () => {
    try { setText((await navigator.clipboard.readText()) || ''); box.current?.focus() } catch { flash('Allow clipboard access, or paste into the box') }
  }
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2200) }
  const share = async () => {
    const msg = `${HEADLINE[res.status] || 'Checked'}: "${(res.claim_text || text).slice(0, 110)}". Checked with SachVerify.`
    try {
      if (navigator.share) await navigator.share({ text: msg })
      else { await navigator.clipboard.writeText(msg); flash('Copied to clipboard') }
    } catch { /* user cancelled */ }
  }
  const again = () => { setPhase('input'); setText(''); setRes(null) }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="rounded-full p-1 hover:bg-slate-100" aria-label="Back"><ChevronLeft size={20} /></button>
        <h2 className="text-lg font-semibold">Check a message</h2>
      </div>

      {phase === 'input' && (
        <div className="animate-fade-up space-y-3">
          <p className="text-[14px] leading-relaxed text-ink-2">Paste a forwarded message, a news link or a YouTube video. We check it against official alerts, sensors and news.</p>
          <div className="rounded-2xl border border-line bg-subtle p-3 focus-within:border-accent focus-within:bg-white">
            <textarea ref={box} rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a message or link"
              className="w-full resize-none bg-transparent text-[16px] leading-snug outline-none" />
            <div className="mt-1 flex items-center justify-between">
              <button onClick={paste} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 active:scale-95"><ClipboardPaste size={14} /> Paste</button>
              {isLink && <span className="inline-flex items-center gap-1 text-xs text-accent"><Link2 size={13} /> Link detected</span>}
              {!isLink && text && <button onClick={() => setText('')} className="text-xs text-ink-3">Clear</button>}
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-3"><Sparkles size={11} /> Try one</div>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((x) => <button key={x} onClick={() => setText(x)} className="rounded-xl border border-line px-3 py-2 text-left text-[13px] text-ink-2 active:bg-subtle">{x}</button>)}
            </div>
          </div>
          <button disabled={!text.trim()} onClick={run} className="btn-primary h-12 w-full rounded-xl text-[15px] active:scale-[0.99]">Check it</button>
        </div>
      )}

      {phase === 'running' && (
        <div className="animate-fade-up space-y-4">
          <div className="rounded-xl bg-subtle px-3.5 py-3 text-[13px] leading-snug text-ink-2 line-clamp-3">{text}</div>
          <div className="rounded-2xl border border-line p-4"><CheckProgress job={job} link={isLink} /></div>
          <p className="text-center text-xs text-ink-3">Usually 15 to 40 seconds. We look at real sources, so it takes a moment.</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="animate-fade-up space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-[15px] font-medium text-rose-900">That check didn't finish</p>
          <p className="text-sm text-rose-800">{err}</p>
          <button onClick={() => setPhase('input')} className="btn-primary h-11 w-full rounded-xl text-sm">Try again</button>
        </div>
      )}

      {phase === 'result' && res && (res.checkworthy === false ? (
        <div className="animate-fade-up space-y-3 rounded-2xl border border-line bg-subtle p-4">
          <p className="text-[16px] font-semibold">Nothing to check here</p>
          <p className="text-sm text-ink-2">{res.triage_reason || "It doesn't state a checkable fact about a disaster."}</p>
          <button onClick={again} className="btn-primary h-11 w-full rounded-xl text-sm">Check something else</button>
        </div>
      ) : (() => {
        const st = STATUS[res.status] || STATUS.UNVERIFIED
        const Icon = ICON[res.status] || HelpCircle
        const facts = (res.atomic_propositions || []).filter((p) => p.factuality === 'FACTUAL')
        const board = res.source_scoreboard || []
        return (
          <div className="space-y-4">
            <div className="animate-fade-up rounded-2xl border p-5" style={{ background: st.tint, borderColor: st.hex + '55' }}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: st.text }}>
                <span className="animate-pop"><Icon size={18} style={{ color: st.hex }} /></span>{st.label}
              </div>
              <h3 className="mt-2 text-[22px] font-semibold leading-tight" style={{ color: st.text }}>{HEADLINE[res.status]}</h3>
              <p className="mt-1.5 text-[14px] text-ink-2">{WHY[res.verification_subtype] || ''}</p>
              <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-[13px] font-medium text-ink">{ADVICE[res.status]}</p>
            </div>

            {res.source_article && (
              <a href={res.source_article.url} target="_blank" rel="noreferrer" className="animate-fade-up flex items-center justify-between gap-2 rounded-xl border border-line px-3.5 py-2.5 text-[13px]">
                <span className="min-w-0"><span className="block text-[11px] text-ink-3">{res.source_article.method === 'youtube' ? 'From YouTube video' : 'From article'}</span>
                  <span className="block truncate font-medium">{res.source_article.publisher}</span></span>
                <ExternalLink size={14} className="shrink-0 text-accent" />
              </a>
            )}

            {res.age_note && (
              <p className={`animate-fade-up rounded-xl border px-3.5 py-2.5 text-[13px] ${res.status === 'OUTDATED' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-line bg-subtle text-ink-2'}`}>{res.age_note}</p>
            )}

            <div className="animate-fade-up">
              <h4 className="mb-2 text-sm font-semibold">What we checked</h4>
              <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {facts.map((p) => {
                  const [I, cls, word] = FACT[p.state] || [Minus, 'text-ink-3', p.state]
                  return (
                    <div key={p.id} className="flex items-start gap-3 px-3.5 py-3">
                      <I size={16} className={`mt-0.5 shrink-0 ${cls}`} />
                      <div className="min-w-0"><div className="text-[14px] leading-snug">{p.text}</div><div className={`mt-0.5 text-[12px] ${cls}`}>{word}</div></div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="animate-fade-up">
              <h4 className="mb-2 text-sm font-semibold">Who says so</h4>
              {board.filter((b) => b.supports.length || b.contradicts.length || b.stale.length).length === 0 ? (
                <p className="rounded-xl border border-line px-3.5 py-3 text-[13px] text-ink-2">No source confirmed or contradicted it. We searched alerts, sensors and news.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {board.filter((b) => b.supports.length || b.contradicts.length || b.stale.length).map((b) => {
                    const bad = b.contradicts.length > 0
                    const stale = !bad && !b.supports.length
                    const I = bad ? X : stale ? Clock : Check
                    const cls = bad ? 'border-amber-200 bg-amber-50 text-amber-900' : stale ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    return <span key={b.source} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] ${cls}`}><I size={12} />{clean(b.source)}</span>
                  })}
                </div>
              )}
            </div>

            <div className="animate-fade-up rounded-xl border border-line">
              <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3.5 py-3 text-sm font-medium">
                See all the evidence <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && <div className="border-t border-line px-3.5 pb-3.5"><EvidenceBreakdown r={res} /></div>}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pb-2">
              <button onClick={share} className="btn-ghost h-11 rounded-xl text-sm"><Share2 size={15} /> Share result</button>
              <button onClick={again} className="btn-primary h-11 rounded-xl text-sm"><RotateCcw size={15} /> Check another</button>
            </div>
          </div>
        )
      })())}

      {toast && <div className="animate-fade-up fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-night px-4 py-2 text-xs text-white shadow-lg">{toast}</div>}
    </section>
  )
}
