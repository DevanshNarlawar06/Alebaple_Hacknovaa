import { Check, X, RotateCcw, CircleDashed, ExternalLink, Search } from 'lucide-react'
import { ago } from '../lib/api'
import { Tag } from './ui'

const LAYER = { official: 'Official', sensor: 'Sensor / data', local_news: 'Local news', national_global: 'National news', social: 'Post', humanitarian: 'Humanitarian', research: 'Research' }
const STANCE = {
  supports: { Icon: Check, cls: 'text-st-verified', label: 'Supports', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  contradicts: { Icon: X, cls: 'text-st-conflicting', label: 'Contradicts', pill: 'bg-amber-50 text-amber-900 border-amber-200' },
  stale: { Icon: RotateCcw, cls: 'text-ink-3', label: 'No longer current', pill: 'bg-slate-100 text-slate-700 border-slate-200' },
  neutral: { Icon: CircleDashed, cls: 'text-ink-3', label: "Didn't help", pill: 'bg-white text-ink-3 border-line' },
}
const day = (iso) => (iso ? new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const summary = (e) => (e.kind === 'alert' ? e.excerpt : e.interpretation || e.excerpt) || ''

function SourceLine({ e }) {
  const S = STANCE[e.stance] || STANCE.neutral
  return (
    <div className="flex items-start gap-2 py-1.5">
      <S.Icon size={14} className={`mt-0.5 shrink-0 ${S.cls}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px]">
          <span className="font-medium text-ink">{e.source}</span>
          <Tag>{LAYER[e.layer] || e.layer || 'Source'}</Tag>
          {e.is_synthetic && <Tag>demo data</Tag>}
          <span className="font-mono text-[10.5px] text-ink-3">{[day(e.published_at), ago(e.published_at)].filter(Boolean).join(' · ')}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-2">{summary(e)}</p>
        <p className="mt-0.5 text-[11px] text-ink-3">{S.label}: {e.plain_reason}{e.geo_basis ? ` · ${e.geo_basis}` : ''}</p>
      </div>
      {e.url && (
        <a href={e.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px] text-accent hover:underline">
          Open <ExternalLink size={10} />
        </a>
      )}
    </div>
  )
}

function Badge({ kind, n }) {
  const S = STANCE[kind]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px] ${S.pill}`}>
      <S.Icon size={10} />{S.label}{n > 1 ? ` ×${n}` : ''}
    </span>
  )
}

/** Which sources were used, what each one said about each fact, and what was searched. */
export default function EvidenceBreakdown({ r }) {
  const all = [...(r.supporting_evidence || []), ...(r.contradicting_evidence || []), ...(r.superseded_or_stale_evidence || []), ...(r.neutral_evidence || [])]
  const facts = (r.atomic_propositions || []).filter((p) => p.factuality === 'FACTUAL')
  const board = r.source_scoreboard || []
  const log = r.search_log || []
  return (
    <div className="mt-3 space-y-4">
      {board.length > 0 && (
        <section>
          <div className="label mb-1.5">Sources used ({board.length})</div>
          <div className="divide-y divide-line rounded-md border border-line">
            {board.map((b) => (
              <div key={b.source} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-ink">{b.source}</div>
                  <div className="text-[10.5px] text-ink-3">{LAYER[b.layer] || b.layer}{b.credibility_tier ? ` · tier ${b.credibility_tier}` : ''}{b.is_synthetic ? ' · demo data' : ''}</div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {b.supports.length > 0 && <Badge kind="supports" n={b.supports.length} />}
                  {b.contradicts.length > 0 && <Badge kind="contradicts" n={b.contradicts.length} />}
                  {b.stale.length > 0 && <Badge kind="stale" n={b.stale.length} />}
                  {!b.supports.length && !b.contradicts.length && !b.stale.length && <Badge kind="neutral" n={b.neutral.length} />}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="label mb-1.5">Fact by fact</div>
        <div className="space-y-2">
          {facts.map((p) => {
            const order = { supports: 0, contradicts: 1, stale: 2, neutral: 3 }
            const mine = all.filter((e) => e.proposition_id === p.id).sort((a, b) => order[a.stance] - order[b.stance] || (b.weight || 0) - (a.weight || 0))
            // one line per source and stance (the strongest), and no "didn't help" for a source that already helped
            const seen = new Set()
            const decided = new Set(mine.filter((e) => e.stance !== 'neutral').map((e) => e.source))
            const cards = mine.filter((e) => {
              const k = e.source + '|' + e.stance
              if (seen.has(k) || (e.stance === 'neutral' && decided.has(e.source))) return false
              seen.add(k)
              return true
            })
            return (
              <div key={p.id} className="rounded-md border border-line px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink">{p.text}</span>
                  <Tag>{(p.state || '').toLowerCase()}</Tag>
                </div>
                {cards.length ? (
                  <div className="mt-1 divide-y divide-line">{cards.map((e, i) => <SourceLine key={e.evidence_id + e.stance + i} e={e} />)}</div>
                ) : (
                  <p className="mt-1 text-[11.5px] text-ink-3">No source confirmed or contradicted this. It was searched for, and absence of evidence is not treated as false.</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {log.length > 0 && (
        <details className="rounded-md border border-line px-3 py-2 text-[12px]">
          <summary className="flex cursor-pointer items-center gap-1.5 text-ink-2"><Search size={12} /> What was searched ({log.length} lookups)</summary>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-ink-3">
            {log.map((l, i) => (
              <li key={i} className={l.error ? 'text-st-conflicting' : ''}>
                <span className="text-ink-2">{l.source}</span> · {l.query} → {l.error ? 'failed' : `${l.found} found`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

/** Compact version for the phone app. */
export function SourceSummary({ r }) {
  const board = r.source_scoreboard || []
  if (!board.length) return <p className="mt-3 text-xs text-ink-3">No sources found either way. Be careful sharing this.</p>
  const rows = [['supports', 'Backed by'], ['contradicts', 'Contradicted by'], ['stale', 'No longer current per']]
  return (
    <div className="mt-3 space-y-1.5 text-[13px]">
      {rows.map(([k, label]) => {
        const names = board.filter((b) => b[k].length).map((b) => b.source.replace(/\[SYNTHETIC\]\s*/i, ''))
        return names.length ? <p key={k}><span className="font-medium">{label}:</span> <span className="text-ink-2">{names.slice(0, 4).join(', ')}{names.length > 4 ? ` +${names.length - 4} more` : ''}</span></p> : null
      })}
    </div>
  )
}
