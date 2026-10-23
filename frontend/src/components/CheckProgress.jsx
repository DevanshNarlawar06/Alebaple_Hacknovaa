import { Check } from 'lucide-react'

const BASE = [
  ['extract', 'Splitting it into checkable facts'],
  ['place', 'Finding the place'],
  ['search', 'Searching alerts, sensors and news'],
  ['compare', 'Comparing each fact with the evidence'],
  ['decide', 'Weighing it all up'],
]

/**
 * Live progress for a check: a timeline that fills in as the server works.
 * `job` is what checkLive() reports ({steps, elapsed}); `link` adds the "reading the link" step.
 */
export default function CheckProgress({ job, link, dark }) {
  const order = [...(link ? [['link', 'Reading the link']] : []), ...BASE]
  const live = Object.fromEntries((job?.steps || []).map((s) => [s.id, s]))
  const done = order.filter(([id]) => live[id]?.state === 'done').length
  // before the server reports anything, show the first step as started so the screen never looks idle
  const activeId = order.find(([id]) => live[id]?.state === 'active')?.[0] ?? order.find(([id]) => live[id]?.state !== 'done')?.[0]
  const pct = Math.min(96, Math.round(((done + 0.45) / order.length) * 100))
  const text = dark ? 'text-white' : 'text-ink'
  return (
    <div role="status" aria-live="polite">
      <div className="mb-4 flex items-center justify-between text-[11px] font-mono text-ink-3">
        <span>CHECKING</span>
        <span>{job?.elapsed != null ? `${Math.round(job.elapsed)} s` : ''}</span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-all duration-500 ease-out" style={{ width: `${pct}%` }}>
          <div className="bar-shimmer h-full w-full" />
        </div>
      </div>
      <ol className="space-y-3.5">
        {order.map(([id, label], i) => {
          const s = live[id]
          const state = s?.state === 'done' ? 'done' : id === activeId ? 'active' : 'pending'
          return (
            <li key={id} className={`flex gap-3 transition-opacity duration-300 ${state === 'pending' ? 'opacity-40' : 'opacity-100'}`}>
              <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {state === 'done' && <span className="animate-pop flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white"><Check size={12} strokeWidth={3} /></span>}
                {state === 'active' && <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />}
                {state === 'pending' && <span className="h-2 w-2 rounded-full bg-ink-3" />}
                {i < order.length - 1 && <span className="absolute left-1/2 top-6 h-[18px] w-px -translate-x-1/2 bg-line" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-[14px] ${state === 'pending' ? 'text-ink-2' : `font-medium ${text}`}`}>{label}</div>
                {s?.detail && <div key={s.detail} className="animate-fade-up mt-0.5 text-[12.5px] text-ink-2">{s.detail}</div>}
                {s?.subs?.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {s.subs.slice(-5).map((x, k) => <li key={x + k} className="animate-fade-up truncate font-mono text-[11px] text-ink-3">· {x}</li>)}
                  </ul>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
