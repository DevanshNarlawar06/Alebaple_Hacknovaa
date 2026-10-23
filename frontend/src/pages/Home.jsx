import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileSearch, MapPin, Layers, Scale, BadgeCheck, Smartphone, LayoutDashboard, MessageSquareText, Radio, Satellite, Newspaper, Users, Landmark } from 'lucide-react'
import NavBar from '../components/NavBar'
import { STATUS, StatusPill } from '../components/ui'
import { api } from '../lib/api'

const STEPS = [
  [FileSearch, 'Split into facts', 'Gemini breaks each post into atomic facts and drops feelings, prayers and anything not in the text.'],
  [MapPin, 'Find place & event', 'Geocodes the place without ever guessing coordinates and ties the claim to one real event.'],
  [Layers, 'Gather evidence', 'Official alerts, sensors, local and national news, other posts: five independent layers.'],
  [Scale, 'Judge every fact', 'Numbers, physics, validity windows and a multilingual NLI model decide support or contradiction.'],
  [BadgeCheck, 'Verdict + proof', 'One of four statuses, with every source, timestamp, location and the uncertainty left.'],
]
const SOURCES = [
  [Landmark, 'NDMA SACHET', 'Official Indian alerts with areas and expiry'],
  [Radio, 'GDACS', 'Global disaster alerts'],
  [Satellite, 'USGS · Open-Meteo', 'Earthquakes, rainfall, temperature'],
  [Newspaper, 'Local + national news', 'Google News & regional channels, copies counted once'],
  [Users, 'CrisisMMD + tipline', 'Real disaster tweets and forwarded messages'],
]

export default function Home() {
  const [h, setH] = useState(null)
  const [claims, setClaims] = useState([])
  const [alerts, setAlerts] = useState([])
  useEffect(() => {
    api.health().then(setH).catch(() => {})
    api.claims('CURRENT', 200).then(setClaims).catch(() => {})
    api.alerts().then(setAlerts).catch(() => {})
  }, [])
  const count = (s) => claims.filter((c) => c.status === s).length
  return (
    <div className="min-h-screen bg-canvas">
      <NavBar />
      <section className="relative overflow-hidden bg-night text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-[360px] w-[360px] rounded-full bg-saffron/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-saffron" /> HACKNOVA'26 · PS-2 Disaster Information Verification Agent
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Verify disaster information <span className="text-saffron">before it spreads.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300">
              SachVerify checks every claim against official alerts, sensors, news, place and time, and tells responders
              exactly what is confirmed, what is contradicted, what is out of date and what nobody knows yet.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/console" className="btn bg-accent px-4 py-2.5 text-sm text-white hover:bg-accent-hover"><LayoutDashboard size={16} /> Open responder console <ArrowRight size={15} /></Link>
              <Link to="/beacon" className="btn border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"><Smartphone size={16} /> Try the Beacon app</Link>
              <Link to="/console?check=1" className="btn border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"><MessageSquareText size={16} /> Check a message</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            {[
              [h?.counts?.evidence ?? '—', 'evidence items', 'from live + archived sources'],
              [alerts.length || '—', 'active official alerts', 'NDMA · GDACS right now'],
              [claims.length || '—', 'claims verified', 'in this deployment'],
              [h?.llm ? 'Gemini + NLI' : '—', 'AI stack', 'multilingual, runs with local models'],
            ].map(([v, k, s]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="font-mono text-2xl font-medium text-white">{v}</div>
                <div className="mt-1 text-[13px] text-slate-200">{k}</div>
                <div className="text-[11px] text-slate-400">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-xl font-semibold">How a claim gets checked</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          {STEPS.map(([I, t, d], i) => (
            <div key={t} className="card relative p-4">
              <span className="absolute right-3 top-3 font-mono text-[11px] text-ink-3">0{i + 1}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-hover"><I size={18} /></span>
              <div className="mt-3 text-sm font-semibold">{t}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <h2 className="text-xl font-semibold">Four honest answers</h2>
        <p className="mt-1 text-sm text-ink-2">Absence of evidence is never treated as proof something is false.</p>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          {['VERIFIED', 'CONFLICTING', 'OUTDATED', 'UNVERIFIED'].map((s) => (
            <Link to="/console" key={s} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-sm" style={{ borderTop: `4px solid ${STATUS[s].hex}` }}>
              <div className="flex items-center justify-between"><StatusPill status={s} /><span className="font-mono text-2xl" style={{ color: STATUS[s].text }}>{count(s)}</span></div>
              <p className="mt-3 text-sm font-medium">{STATUS[s].hint}</p>
              <p className="mt-1 text-[12.5px] text-ink-2">{{
                VERIFIED: 'e.g. Hindi post about Sinhagad Road flooding matched to the official alert and rain gauge.',
                CONFLICTING: 'e.g. "Khadakwasla dam burst": the dam authority says controlled release, no breach.',
                OUTDATED: 'e.g. a 2017 dam evacuation order that was correct then and has since expired.',
                UNVERIFIED: 'e.g. "gangs looting in Warje": flooding confirmed, looting not confirmed by anyone.',
              }[s]}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-xl font-semibold">Evidence sources</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          {SOURCES.map(([I, t, d]) => (
            <div key={t} className="card flex items-start gap-3 p-4">
              <I size={18} className="mt-0.5 shrink-0 text-accent" />
              <div><div className="text-sm font-medium">{t}</div><div className="text-[12px] text-ink-2">{d}</div></div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[12px] text-ink-3">Demo scenarios (Pune flood, Delhi quake rumour) use clearly labelled synthetic data; live alerts are real.</p>
      </section>
    </div>
  )
}
