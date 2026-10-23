/** "9 h ago", "just now", "3 d ago": same wording as the web app. */
export function ago(iso?: string | null): string {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (Number.isNaN(s)) return ''
  if (s < 0) return 'upcoming'
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  const d = Math.round(s / 86400)
  return d < 400 ? `${d} d ago` : `${(d / 365).toFixed(1)} y ago`
}

export function hhmm(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function day(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "[SYNTHETIC] NDMA-style alert" -> "NDMA-style alert" (demo data is labelled separately). */
export const cleanSource = (s = '') => s.replace(/\[SYNTHETIC\]\s*/i, '')

export function shortSource(s = ''): string {
  if (/ndma|sachet|ddma|sdma/i.test(s)) return 'NDMA'
  if (/gdacs/i.test(s)) return 'GDACS'
  return cleanSource(s).split('(')[0].trim()
}
