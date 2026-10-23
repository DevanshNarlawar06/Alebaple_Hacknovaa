import { Platform } from 'react-native'

// Same palette as the web app (frontend/tailwind.config.js), so the two stay visually identical.
export const colors = {
  ink: '#0F172A',
  ink2: '#475569',
  ink3: '#94A3B8',
  line: '#E2E8F0',
  subtle: '#F8FAFC',
  canvas: '#F4F6F9',
  night: '#0B1B2E',
  accent: '#0D9488',
  accentHover: '#0F766E',
  accentSoft: '#CCFBF1',
  white: '#FFFFFF',
  alert: '#E11D48',
} as const

export type StatusKey = 'VERIFIED' | 'CONFLICTING' | 'OUTDATED' | 'UNVERIFIED'

export const STATUS: Record<StatusKey, { label: string; hex: string; tint: string; text: string; hint: string }> = {
  VERIFIED: { label: 'Verified', hex: '#059669', tint: '#ECFDF5', text: '#065F46', hint: 'Trusted sources confirm it' },
  CONFLICTING: { label: 'Conflicting', hex: '#D97706', tint: '#FFFBEB', text: '#92400E', hint: 'Trusted sources contradict it' },
  OUTDATED: { label: 'Outdated', hex: '#64748B', tint: '#F1F5F9', text: '#334155', hint: 'Was true, no longer current' },
  UNVERIFIED: { label: 'Unverified', hex: '#6366F1', tint: '#EEF2FF', text: '#3730A3', hint: 'Not enough evidence either way' },
}

export const statusOf = (s?: string | null) => STATUS[(s as StatusKey) ?? 'UNVERIFIED'] ?? STATUS.UNVERIFIED

export const LEVEL = {
  GREEN: { title: 'All clear near you', color: '#059669', bg: '#ECFDF5', ring: '#A7F3D0', tag: 'Status' },
  YELLOW: { title: 'Stay alert', color: '#D97706', bg: '#FFFBEB', ring: '#FDE68A', tag: 'Watch' },
  RED: { title: 'Alert for your area', color: '#E11D48', bg: '#FFF1F2', ring: '#FECDD3', tag: 'Official alert' },
} as const

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, monospace' }) as string
