import { getApiBase } from './config'

export type Status = 'VERIFIED' | 'CONFLICTING' | 'OUTDATED' | 'UNVERIFIED'
export type Level = 'GREEN' | 'YELLOW' | 'RED'

export interface BeaconAlert {
  evidence_id: string
  source_name: string
  event_type: string
  severity: string | null
  raw_evidence_text: string
  valid_until: string | null
  is_synthetic: number
  source_url: string | null
  distance_km: number | null
}

export interface NearbyClaim {
  claim_id: string
  claim_text: string
  latitude: number
  longitude: number
  status: Status
  subtype: string | null
  confidence: number | null
  created_at: string
  distance_km: number
}

export interface BeaconStatus {
  level: Level
  reason: string
  updated_at: string
  alerts_covering: BeaconAlert[]
  alerts_nearby: BeaconAlert[]
  nearby_claims: NearbyClaim[]
  rumour_checks: NearbyClaim[]
  rule: string
}

export interface EvidenceCard {
  evidence_id: string
  source: string
  layer: string | null
  credibility_tier: string | null
  kind: string | null
  stance: 'supports' | 'contradicts' | 'stale' | 'neutral'
  published_at: string | null
  url: string | null
  excerpt: string
  interpretation: string | null
  proposition_id: string
  weight: number
  plain_reason: string
  geo_basis: string | null
  is_synthetic: boolean
}

export interface Proposition {
  id: string
  text: string
  factuality: 'FACTUAL' | 'SUBJECTIVE' | 'NON_FACTUAL'
  state?: string
  materiality?: string
}

export interface ScoreRow {
  source: string
  layer: string | null
  kind: string | null
  credibility_tier: string | null
  url: string | null
  is_synthetic: boolean
  supports: string[]
  contradicts: string[]
  stale: string[]
  neutral: string[]
}

export interface CheckResult {
  claim_id: string
  claim_text: string
  checkworthy: boolean
  triage_reason?: string
  status: Status | null
  verification_subtype?: string
  confidence?: number
  age_note?: string | null
  historical_status?: string | null
  atomic_propositions: Proposition[]
  supporting_evidence: EvidenceCard[]
  contradicting_evidence: EvidenceCard[]
  superseded_or_stale_evidence: EvidenceCard[]
  neutral_evidence: EvidenceCard[]
  source_scoreboard: ScoreRow[]
  search_log: { source: string; query: string; found: number; error?: boolean }[]
  source_article?: { url: string; publisher: string; method: string; published_at?: string | null } | null
  explanation?: string
}

export interface JobStep {
  id: string
  label: string
  state: 'active' | 'done'
  detail: string | null
  subs: string[]
}
export interface JobUpdate {
  steps: JobStep[]
  done: boolean
  elapsed: number
  error: string | null
  result: CheckResult | null
}

export interface CheckBody {
  text: string
  posted_at?: string | null
  place?: string | null
  verification_context?: 'CURRENT' | 'HISTORICAL'
  include_demo?: boolean
}

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`)
  return r.json() as Promise<T>
}

const get = <T>(path: string, ms = 12000): Promise<T> => {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  return fetch(getApiBase() + path, { signal: ctl.signal }).then((r) => json<T>(r)).finally(() => clearTimeout(t))
}

export const api = {
  health: () => get<{ ok: boolean; llm_ok: boolean; llm_status: string; llm_model: string }>('/api/health', 8000),
  beacon: (lat: number, lon: number, radiusKm: number) =>
    get<BeaconStatus>(`/api/beacon/status?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`),
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Run a check and report real progress. Starts a job on the server, then polls it, so it needs nothing
 * beyond fetch. onUpdate fires about every 350 ms with the steps finished so far.
 */
export async function checkLive(body: CheckBody, onUpdate?: (u: JobUpdate) => void): Promise<CheckResult> {
  const start = await fetch(`${getApiBase()}/api/claims/check/start?persist=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => json<{ job_id: string }>(r))
  const deadline = Date.now() + 5 * 60 * 1000
  let failures = 0
  for (;;) {
    await sleep(350)
    let s: JobUpdate
    try {
      s = await get<JobUpdate>(`/api/claims/check/${start.job_id}`, 10000)
      failures = 0
    } catch (e) {
      if (++failures >= 5) throw e // a few dropped polls (weak signal) are fine; a dead connection is not
      continue
    }
    onUpdate?.(s)
    if (s.done) {
      if (s.error || !s.result) throw new Error(s.error || 'The check ended without a result')
      return s.result
    }
    if (Date.now() > deadline) throw new Error('The check took too long. Please try again.')
  }
}
