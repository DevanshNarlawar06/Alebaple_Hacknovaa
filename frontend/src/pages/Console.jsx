import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { Search, Play, Smartphone, BarChart3, Waves, Activity, Wind, Flame, CloudLightning, Mountain, Sun, AlertCircle, ShieldAlert } from 'lucide-react'
import { api, ago, onStream } from '../lib/api'
import { StatusPill, ConfBar, STATUS } from '../components/ui'
import MapView from '../components/MapView'
import ClaimPanel from '../components/ClaimPanel'
import CheckModal from '../components/CheckModal'

const FILTERS = ['ALL', 'VERIFIED', 'CONFLICTING', 'OUTDATED', 'UNVERIFIED']
const HAZ = { flood: Waves, earthquake: Activity, tsunami: Waves, cyclone: Wind, storm: CloudLightning, wildfire: Flame,
  landslide: Mountain, heatwave: Sun, drought: Sun }
const HazardIcon = ({ h }) => { const I = HAZ[h] || AlertCircle; return <I size={14} className="shrink-0 text-ink-2" /> }

export default function Console() {
  const [claims, setClaims] = useState([])
  const [alerts, setAlerts] = useState([])
  const [sel, setSel] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [q, setQ] = useState('')
  const [params] = useSearchParams()
  const [check, setCheck] = useState(params.get('check') === '1')
  const [health, setHealth] = useState(null)
  const [filtered, setFiltered] = useState(0)
  const [feed, setFeed] = useState([])
  const [layers, setLayers] = useState({ alerts: true, claims: true })
  const [target, setTarget] = useState(null)
  const [replaying, setReplaying] = useState(false)

  const load = useCallback(() => {
    api.claims('CURRENT', 200).then(setClaims).catch(() => {})
    api.alerts().then(setAlerts).catch(() => {})
  }, [])
  useEffect(() => {
    load()
    const ping = () => api.health().then(setHealth).catch(() => setHealth({ ok: false }))
    ping()
    const t = setInterval(ping, 15000)
    const off = onStream({
      'claim.verdict': (d) => { load(); setFeed((f) => [{ t: Date.now(), msg: `${d.status} · ${d.claim_text}` }, ...f].slice(0, 6)) },
      'post.filtered': () => setFiltered((n) => n + 1),
      'post.received': (d) => setFeed((f) => [{ t: Date.now(), msg: `Received · ${d.text}` }, ...f].slice(0, 6)),
      'alerts.refreshed': () => api.alerts().then(setAlerts),
      'replay.cleared': () => { setSel(null); load() },
      'replay.finished': () => { setReplaying(false); load() },
    })
    return () => { off(); clearInterval(t) }
  }, [load])

  const shown = useMemo(() => claims.filter((c) =>
    (filter === 'ALL' || c.status === filter) && (!q || c.claim_text.toLowerCase().includes(q.toLowerCase()))), [claims, filter, q])

  const select = (id) => {
    setSel(id)
    const c = claims.find((x) => x.claim_id === id)
    if (c?.latitude != null) setTarget({ lat: c.latitude, lon: c.longitude, zoom: 11 })
  }
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, f === 'ALL' ? claims.length : claims.filter((c) => c.status === f).length])), [claims])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <NavBar right={<>
        <div className="relative w-[300px]">
          <Search size={14} className="absolute left-3 top-2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search claims"
            className="w-full rounded-md border border-white/10 bg-white/10 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-400 outline-none focus:border-accent" />
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className={`h-2 w-2 rounded-full ${health?.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          {health?.ok ? 'Live feeds OK' : 'API offline'}
        </span>
        <button disabled={replaying} className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-60"
          onClick={() => { setReplaying(true); setFiltered(0); api.replay(['pune_flood', 'delhi_quake']).catch(() => {}) }} title="Replay synthetic demo scenarios">
          <Play size={13} /> {replaying ? 'Replaying…' : 'Replay demo'}
        </button>
        <button className="btn bg-saffron text-night hover:brightness-95" onClick={() => setCheck(true)}>Check a post</button>
      </>} />

      <div className="flex shrink-0 items-stretch gap-3 border-b border-line bg-canvas px-4 py-2.5">
        {['VERIFIED', 'CONFLICTING', 'OUTDATED', 'UNVERIFIED'].map((k) => (
          <button key={k} onClick={() => setFilter(filter === k ? 'ALL' : k)}
            className={`flex min-w-[150px] items-center gap-3 rounded-md border bg-white px-3 py-2 text-left ${filter === k ? 'border-ink' : 'border-line'}`}
            style={{ borderLeft: `3px solid ${STATUS[k].hex}` }}>
            <span className="font-mono text-xl font-medium" style={{ color: STATUS[k].text }}>{counts[k]}</span>
            <span className="leading-tight"><span className="block text-xs font-medium">{STATUS[k].label}</span>
              <span className="block text-[10.5px] text-ink-3">{STATUS[k].hint}</span></span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2">
          <ShieldAlert size={18} className="text-ink-2" />
          <span className="leading-tight"><span className="block font-mono text-sm">{alerts.length}</span>
            <span className="block text-[10.5px] text-ink-3">active official alerts (NDMA · GDACS)</span></span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-line">
          <div className="space-y-2.5 border-b border-line p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Stories <span className="font-mono text-xs text-ink-3">({claims.length})</span></span>
              <span className="font-mono text-[11px] text-ink-3">filtered out ({filtered})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'chip-on' : ''}`}>
                  {f === 'ALL' ? 'All' : f[0] + f.slice(1).toLowerCase()} <span className="text-ink-3">{counts[f]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {shown.map((c) => (
              <button key={c.claim_id} onClick={() => select(c.claim_id)}
                style={{ borderLeft: `3px solid ${sel === c.claim_id ? '#0F766E' : (STATUS[c.status]?.hex || '#E5E5E5') + '99'}` }}
                className={`block w-full border-b border-line px-4 py-3.5 text-left hover:bg-subtle ${sel === c.claim_id ? 'bg-subtle' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-2"><HazardIcon h={c.event_type} />
                    <span className="truncate">{c.location_text || c.event_type} · {ago(c.created_at)}</span></span>
                  <StatusPill status={c.status} small />
                </div>
                <div className="mt-1.5 line-clamp-2 text-[13.5px] font-medium">{c.claim_text}</div>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-3">
                  <span>{c.channel === 'replay' ? 'synthetic demo' : c.channel} · {c.language || 'und'}</span><ConfBar value={c.confidence} />
                </div>
              </button>
            ))}
            {!shown.length && (
              <div className="p-6 text-sm text-ink-3">
                No stories yet. Use <b>Replay demo</b> to stream the synthetic Pune / Delhi scenarios, or <b>Check a post</b>.
              </div>
            )}
          </div>
          {feed.length > 0 && (
            <div className="border-t border-line p-3">
              <div className="label mb-1">Live</div>
              {feed.map((f) => <div key={f.t + f.msg} className="truncate font-mono text-[11px] text-ink-3">{f.msg}</div>)}
            </div>
          )}
        </aside>

        <main className="relative flex-1">
          <MapView alerts={alerts} claims={claims} selectedId={sel} onSelect={select} target={target} layers={layers} fit />
          <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 rounded border border-line bg-white text-xs">
            {[['alerts', 'Official alerts'], ['claims', 'Claims']].map(([k, label]) => (
              <button key={k} onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
                className={`px-3 py-1.5 ${layers[k] ? 'text-ink' : 'text-ink-3'} border-r border-line last:border-0`}>
                {layers[k] ? '✓ ' : ''}{label}
              </button>
            ))}
          </div>
          <div className="absolute bottom-4 left-4 z-[500] rounded border border-line bg-white p-3 text-xs">
            <div className="label mb-1.5">Map legend</div>
            {[['#059669', 'Verified'], ['#D97706', 'Conflicting'], ['#64748B', 'Outdated'], ['#6366F1', 'Unverified']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2 py-0.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</div>
            ))}
            <div className="flex items-center gap-2 py-0.5"><span className="h-2.5 w-3 border border-dashed border-ink-2" />Official alert area ({alerts.length})</div>
          </div>
        </main>

        <aside className="w-[440px] shrink-0 border-l border-line">
          <ClaimPanel claimId={sel} />
        </aside>
      </div>
      {check && <CheckModal onClose={() => setCheck(false)} onDone={(r) => { load(); if (r.claim_id && r.status) setSel(r.claim_id) }} />}
    </div>
  )
}
