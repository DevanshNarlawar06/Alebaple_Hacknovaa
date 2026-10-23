import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ShieldCheck, Eye, AlertTriangle, ChevronLeft, Settings, Home, Map as MapIcon, MessageSquare, Bell, BellOff,
  ArrowUpFromLine, Ban, BatteryCharging, Info, CheckCircle2, MapPin,
} from 'lucide-react'
import { api, ago, onStream } from '../lib/api'
import { StatusPill, STATUS } from '../components/ui'

const PLACES = {
  'Kothrud, Pune': [18.5074, 73.8077], 'Sinhagad Road, Pune': [18.4745, 73.818], 'Laxmi Nagar, Delhi': [28.6304, 77.2777],
  'Mumbai': [19.076, 72.8777], 'Anantapur, AP': [14.6819, 77.6006],
}
const ACTIONS = {
  flood: [[ArrowUpFromLine, 'Move to higher floors'], [Ban, 'Avoid low-lying roads and riverbanks'], [BatteryCharging, 'Keep your phone charged']],
  storm: [[ShieldCheck, 'Stay indoors, away from windows'], [Ban, 'Avoid trees, poles and open fields'], [BatteryCharging, 'Keep your phone charged']],
  earthquake: [[ShieldCheck, 'Drop, cover and hold on'], [Ban, 'Stay away from damaged buildings'], [BatteryCharging, 'Keep your phone charged']],
  default: [[Info, 'Follow official instructions'], [Ban, 'Avoid the affected area'], [BatteryCharging, 'Keep your phone charged']],
}
const PLAIN = {
  VERIFIED: 'Confirmed by trusted sources', CONFLICTING: 'Not true — trusted sources say otherwise',
  OUTDATED: 'Old information — no longer current', UNVERIFIED: 'Not confirmed yet — be careful sharing',
}
const shortSource = (s = '') => (/ndma|sachet|ddma|sdma/i.test(s) ? 'NDMA' : /gdacs/i.test(s) ? 'GDACS' : s.replace(/\[SYNTHETIC\]\s*/i, '').split('(')[0].trim())
const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')

function useAlarm() {
  const ctx = useRef(null)
  const unlock = () => { ctx.current = ctx.current || new (window.AudioContext || window.webkitAudioContext)(); ctx.current.resume() }
  const play = () => {
    if (!ctx.current) return
    const a = ctx.current
    ;[0, 0.35, 0.7].forEach((t, i) => {
      const o = a.createOscillator(); const g = a.createGain()
      o.frequency.value = 660 + i * 110; g.gain.setValueAtTime(0.0001, a.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.3)
      o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.32)
    })
    navigator.vibrate?.([200, 100, 200])
  }
  return { unlock, play }
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} className={`h-6 w-11 rounded-full p-0.5 transition ${on ? 'bg-accent' : 'bg-slate-300'}`}>
      <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export default function Beacon() {
  const [place, setPlace] = useState('Kothrud, Pune')
  const [radius, setRadius] = useState(10)
  const [st, setSt] = useState(null)
  const [view, setView] = useState('home')
  const [sound, setSound] = useState(false)
  const [safe, setSafe] = useState(false)
  const [msg, setMsg] = useState('')
  const [checkRes, setCheckRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const last = useRef(null)
  const alarm = useAlarm()
  const [lat, lon] = PLACES[place]

  const refresh = () => api.beacon(lat, lon, radius).then((s) => {
    setSt(s)
    if (s.level === 'RED' && last.current && last.current !== 'RED') {
      setSafe(false)
      if (sound) alarm.play()
      if (sound && window.Notification?.permission === 'granted') new Notification('Beacon: ' + s.reason)
    }
    last.current = s.level
  }).catch(() => {})
  useEffect(() => {
    last.current = null; refresh()
    const off = onStream({ 'claim.verdict': refresh, 'alerts.refreshed': refresh })
    const t = setInterval(refresh, 30000)
    return () => { off(); clearInterval(t) }
  }, [place, radius, sound]) // eslint-disable-line

  const enableSound = () => { alarm.unlock(); setSound(true); window.Notification?.requestPermission?.() }
  const level = st?.level || 'GREEN'
  const alert = st?.alerts_covering?.[0] || st?.alerts_nearby?.[0]
  const hazard = alert?.event_type || 'default'
  const nearby = (st?.nearby_claims || []).filter((c) => c.status !== 'CONFLICTING' && c.status !== 'OUTDATED')
  const theme = {
    GREEN: { Icon: ShieldCheck, title: 'All clear near you', color: '#059669', bg: 'bg-emerald-50', ring: 'border-emerald-200' },
    YELLOW: { Icon: Eye, title: 'Stay alert', color: '#D97706', bg: 'bg-amber-50', ring: 'border-amber-200' },
    RED: { Icon: AlertTriangle, title: `${hazard === 'default' ? 'Alert' : hazard[0].toUpperCase() + hazard.slice(1) + ' alert'} for your area`, color: '#E11D48', bg: 'bg-rose-50', ring: 'border-rose-200' },
  }[level]
  const verifiedBy = [alert && shortSource(alert.source_name) + ' alert', ...nearby.filter((c) => c.status === 'VERIFIED').slice(0, 1).map(() => 'verified local reports')].filter(Boolean).join(' + ')

  const doCheck = async () => {
    setBusy(true); setCheckRes(null)
    try { setCheckRes(await api.check({ text: msg, lat, lon })) } finally { setBusy(false) }
  }
  const back = (title) => (
    <div className="flex items-center gap-2">
      <button onClick={() => setView('home')} className="rounded-full p-1 hover:bg-slate-100"><ChevronLeft size={20} /></button>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  )

  return (
    <div className="flex min-h-screen justify-center bg-canvas">
      <div className="relative flex min-h-screen w-full max-w-[420px] flex-col bg-white sm:border-x sm:border-line">
        <header className="flex items-center justify-between bg-night px-4 py-3 text-white">
          <span className="flex items-center gap-2 font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent"><ShieldCheck size={15} /></span>Beacon</span>
          <button onClick={() => setView('settings')} className="flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs">
            <MapPin size={12} />{place}
          </button>
          <button onClick={() => setView('settings')} className="rounded-full p-1 hover:bg-white/10" aria-label="Settings"><Settings size={18} /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-32">
          {view === 'home' && (
            <>
              <div className={`rounded-2xl border p-5 ${theme.ring} ${theme.bg}`}>
                <div className="flex items-center justify-between text-xs text-ink-2">
                  <span className="flex items-center gap-1.5 font-medium" style={{ color: theme.color }}><theme.Icon size={15} />
                    {level === 'RED' ? 'Official alert' : level === 'YELLOW' ? 'Watch' : 'Status'}</span>
                  <span>Updated {ago(st?.updated_at)}</span>
                </div>
                <h1 className="mt-2 text-[26px] font-semibold leading-tight">{theme.title}</h1>
                {alert && level !== 'GREEN' ? (
                  <p className="mt-1 text-sm text-ink-2">{shortSource(alert.source_name)}{alert.valid_until ? ` · until ${hhmm(alert.valid_until)}` : ''}
                    {alert.is_synthetic ? <span className="ml-2 rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-ink-3">demo data</span> : null}</p>
                ) : (
                  <p className="mt-1 text-sm text-ink-2">{level === 'GREEN' ? `No verified threats within ${radius} km` : st?.reason}</p>
                )}

                {level === 'RED' && (
                  <ul className="mt-4 divide-y divide-black/5 rounded-xl bg-white/70">
                    {(ACTIONS[hazard] || ACTIONS.default).map(([I, t]) => (
                      <li key={t} className="flex items-center gap-3 px-3 py-2.5 text-[15px]"><I size={18} className="text-ink-2" />{t}</li>
                    ))}
                  </ul>
                )}

                {level !== 'GREEN' && (
                  <div className="mt-4 space-y-2">
                    {level === 'RED' && (safe
                      ? <div className="flex items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-medium text-emerald-700"><CheckCircle2 size={17} /> Marked safe · alert muted</div>
                      : <button onClick={() => setSafe(true)} className="btn-primary w-full rounded-lg py-3 text-sm">I'm safe</button>)}
                    <button className="btn-ghost w-full rounded-lg py-3 text-sm" onClick={() => setView('why')}>Why this {level === 'RED' ? 'alert' : 'status'}?</button>
                  </div>
                )}
                {verifiedBy && level === 'RED' && <p className="mt-3 text-xs text-ink-2">Verified by {verifiedBy}</p>}
              </div>

              {!sound && (
                <button onClick={enableSound} className="flex w-full items-center gap-3 rounded-xl border border-line bg-subtle px-4 py-3 text-left">
                  <BellOff size={18} className="text-ink-2" />
                  <span className="flex-1 text-sm">Turn on alert sound<span className="block text-xs text-ink-3">Only for official or verified threats</span></span>
                  <Toggle on={false} onClick={enableSound} />
                </button>
              )}

              <section>
                <div className="mb-2 flex items-baseline justify-between"><h3 className="text-sm font-semibold">Nearby updates</h3><span className="text-xs text-ink-3">{nearby.length}</span></div>
                <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {nearby.slice(0, 5).map((c) => (
                    <div key={c.claim_id} className="p-4">
                      <div className="flex items-center justify-between"><StatusPill status={c.status} small /><span className="text-xs text-ink-3">{c.distance_km} km · {ago(c.created_at)}</span></div>
                      <p className="mt-2 text-[15px] leading-snug">{c.claim_text}</p>
                    </div>
                  ))}
                  {!nearby.length && <p className="p-4 text-sm text-ink-3">No reports near you.</p>}
                </div>
              </section>

              {st?.rumour_checks?.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Rumour check</h3>
                  <div className="space-y-2">
                    {st.rumour_checks.map((c) => (
                      <div key={c.claim_id} className="rounded-xl border border-line p-4" style={{ borderLeft: `4px solid ${STATUS[c.status].hex}` }}>
                        <p className="text-[15px] font-medium">{c.status === 'OUTDATED' ? 'Old news, not current' : 'Not true'}</p>
                        <p className="mt-1 text-sm text-ink-2">“{c.claim_text}”</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {view === 'why' && (
            <section className="space-y-4">
              {back(`Why this ${level === 'RED' ? 'alert' : 'status'}?`)}
              <p className="text-[15px] leading-relaxed text-ink-2">
                Beacon only sounds an alarm when an <b className="text-ink">official alert</b> covers your area or a report is
                <b className="text-ink"> verified</b> by trusted sources. Social media posts alone can raise “Stay alert”, never an alarm.
              </p>
              {(st?.alerts_covering || []).concat(st?.alerts_nearby || []).slice(0, 4).map((a) => (
                <div key={a.evidence_id} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between text-xs text-ink-3">
                    <span className="font-medium text-ink">{shortSource(a.source_name)} · official</span>
                    <span>{a.distance_km != null ? `${a.distance_km} km` : 'covers your area'}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{a.raw_evidence_text}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-ink-3">
                    <span>valid until {hhmm(a.valid_until) || '—'}{a.is_synthetic ? ' · demo data' : ''}</span>
                    {a.source_url && <a className="text-accent" href={a.source_url} target="_blank" rel="noreferrer">Source ↗</a>}
                  </div>
                </div>
              ))}
              {!st?.alerts_covering?.length && !st?.alerts_nearby?.length && <p className="text-sm text-ink-3">No official alerts near you right now.</p>}
            </section>
          )}

          {view === 'map' && (
            <section className="space-y-3">
              {back('Map')}
              <div className="h-[420px] overflow-hidden rounded-xl border border-line">
                <MapContainer center={[lat, lon]} zoom={11} className="h-full w-full" zoomControl={false}>
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" className="map-tiles-mono" />
                  <Circle center={[lat, lon]} radius={radius * 1000} pathOptions={{ color: '#0D9488', weight: 1, fillOpacity: 0.05 }} />
                  <CircleMarker center={[lat, lon]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#0D9488', fillOpacity: 1 }} />
                  {(st?.nearby_claims || []).map((c) => (
                    <CircleMarker key={c.claim_id} center={[c.latitude, c.longitude]} radius={6}
                      pathOptions={{ color: '#fff', weight: 2, fillColor: STATUS[c.status]?.hex || '#94A3B8', fillOpacity: 1 }} />
                  ))}
                </MapContainer>
              </div>
              <p className="text-xs text-ink-3">Teal circle: your area ({radius} km). Dots: reports, coloured by verdict.</p>
            </section>
          )}

          {view === 'check' && (
            <section className="space-y-3">
              {back('Check a message')}
              <textarea rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Paste a forwarded message or link"
                className="w-full rounded-xl border border-line bg-subtle p-3 text-[15px] outline-none focus:border-accent focus:bg-white" />
              <button className="btn-primary w-full rounded-lg py-3 text-sm" disabled={!msg.trim() || busy} onClick={doCheck}>{busy ? 'Checking…' : 'Check'}</button>
              {busy && <div className="h-1 w-full overflow-hidden rounded bg-line"><div className="h-1 w-1/3 animate-pulse rounded bg-accent" /></div>}
              {checkRes && (
                <div className="rounded-xl border border-line p-4" style={{ borderLeft: `4px solid ${STATUS[checkRes.status]?.hex || '#94A3B8'}` }}>
                  {checkRes.checkworthy === false ? <p className="text-sm">Nothing to check here — it isn't a factual claim.</p> : (
                    <>
                      <StatusPill status={checkRes.status} />
                      <p className="mt-2 text-lg font-semibold leading-snug">{PLAIN[checkRes.status]}</p>
                      <ul className="mt-2 space-y-1 text-sm text-ink-2">
                        {checkRes.atomic_propositions.filter((p) => p.factuality === 'FACTUAL').map((p) => (
                          <li key={p.id}>• {p.text} — <span className="text-ink-3">{p.state.toLowerCase()}</span></li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {view === 'settings' && (
            <section className="space-y-4">
              {back('Settings')}
              <label className="block">
                <span className="text-sm font-medium">My area</span>
                <select value={place} onChange={(e) => { setPlace(e.target.value); setSafe(false) }} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm">
                  {Object.keys(PLACES).map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Alert radius: {radius} km</span>
                <input type="range" min={2} max={50} value={radius} onChange={(e) => setRadius(+e.target.value)} className="mt-2 w-full accent-[#0D9488]" />
              </label>
              <div className="flex items-center justify-between rounded-xl border border-line p-4">
                <span className="flex items-center gap-2 text-sm">{sound ? <Bell size={17} /> : <BellOff size={17} />} Alert sound & notifications</span>
                <Toggle on={sound} onClick={sound ? () => setSound(false) : enableSound} />
              </div>
              {sound && <button className="btn-ghost w-full rounded-lg py-2.5" onClick={alarm.play}>Test alert sound</button>}
              <p className="text-xs leading-relaxed text-ink-3">Your exact location stays on this device; the server only sees a rounded area. Demo areas use synthetic scenario data where marked.</p>
            </section>
          )}
        </div>

        {view === 'home' && (
          <button onClick={() => setView('check')} className="btn-primary absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full px-5 py-3 text-sm shadow-lg">
            <MessageSquare size={16} /> Check a message
          </button>
        )}
        <nav className="absolute bottom-0 flex w-full justify-around border-t border-line bg-white py-2 text-[11px]">
          {[['home', Home, 'Home'], ['map', MapIcon, 'Map'], ['check', MessageSquare, 'Check'], ['settings', Settings, 'Settings']].map(([k, I, l]) => (
            <button key={k} onClick={() => setView(k)} className={`flex flex-col items-center gap-0.5 px-3 ${view === k ? 'text-accent' : 'text-ink-2'}`}><I size={19} />{l}</button>
          ))}
        </nav>
      </div>
    </div>
  )
}
