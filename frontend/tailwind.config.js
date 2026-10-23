/** SachVerify theme v2 — "night sky + teal + saffron". Change colours here only. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F172A', 2: '#475569', 3: '#94A3B8' },
        line: '#E2E8F0',
        subtle: '#F8FAFC',
        canvas: '#F4F6F9',
        night: { DEFAULT: '#0B1B2E', 2: '#13294A', 3: '#1E3A5F' },
        accent: { DEFAULT: '#0D9488', hover: '#0F766E', soft: '#CCFBF1' },
        saffron: { DEFAULT: '#F59E0B', soft: '#FEF3C7' },
        st: { verified: '#059669', conflicting: '#D97706', outdated: '#64748B', unverified: '#6366F1', alert: '#E11D48' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
    },
  },
  plugins: [],
}
