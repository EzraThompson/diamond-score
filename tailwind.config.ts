import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        // Page / surface stack (light → white)
        surface: {
          DEFAULT: '#F2FAF2',   // page background
          50:      '#FFFFFF',   // cards, nav
          100:     '#EAF5EA',   // date strip, secondary fills
          200:     '#D0E8D0',   // badge bg, dividers
          300:     '#BBDABB',   // stronger borders
        },
        // Primary action
        accent: {
          DEFAULT: '#18A34A',
          light:   '#22C55E',
        },
        // Status
        live:      '#22C55E',
        final:     '#5F7A5F',
        scheduled: '#7B9B7B',
        delayed:   '#D97706',
        // Green-tinted gray scale — replaces the dark neutrals
        gray: {
          100: '#EAF5EA',
          200: '#D0E8D0',
          300: '#BBDABB',
          400: '#7B9B7B',
          500: '#5F7A5F',
          600: '#4A6B4A',
          700: '#3D5C3D',
          800: '#2A4A2A',
          900: '#0C1F0C',
        },
      },
      keyframes: {
        'score-pop': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.2)', color: '#18A34A' },
          '100%': { transform: 'scale(1)' },
        },
        'score-flash': {
          '0%':   { backgroundColor: 'transparent' },
          '20%':  { backgroundColor: 'rgba(34,197,94,0.18)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'ping-once': {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '75%':  { transform: 'scale(2.2)', opacity: '0' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        // ── Clutch moment ──
        'clutch-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)' },
          '50%':      { boxShadow: '0 0 12px 2px rgba(245, 158, 11, 0.25)' },
        },
        'clutch-pulse-intense': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
          '50%':      { boxShadow: '0 0 16px 4px rgba(239, 68, 68, 0.3)' },
        },
        'border-rotate': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        // ── Score animations: slide ──
        'score-slide-out': {
          '0%':   { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-100%)', opacity: '0' },
        },
        'score-slide-in': {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // ── Score animations: pop ──
        'score-shrink-out': {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.3)', opacity: '0' },
        },
        'score-pop-in': {
          '0%':   { transform: 'scale(0.3)', opacity: '0' },
          '40%':  { transform: 'scale(1.25)', opacity: '1' },
          '70%':  { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        // ── Score animations: flip ──
        'score-flip-out': {
          '0%':   { transform: 'perspective(300px) rotateX(0deg)', opacity: '1' },
          '100%': { transform: 'perspective(300px) rotateX(90deg)', opacity: '0' },
        },
        'score-flip-in': {
          '0%':   { transform: 'perspective(300px) rotateX(-90deg)', opacity: '0' },
          '100%': { transform: 'perspective(300px) rotateX(0deg)', opacity: '1' },
        },
      },
      animation: {
        'score-pop':   'score-pop 0.3s ease-out',
        'score-flash': 'score-flash 0.7s ease-out',
        'ping-once':   'ping-once 0.6s ease-out',
        // Clutch
        'clutch-pulse':         'clutch-pulse 2s ease-in-out infinite',
        'clutch-pulse-intense': 'clutch-pulse-intense 1.5s ease-in-out infinite',
        'border-rotate':        'border-rotate 3s linear infinite',
        // Score transitions
        'score-slide-out':  'score-slide-out 200ms ease-in forwards',
        'score-slide-in':   'score-slide-in 200ms ease-out forwards',
        'score-shrink-out': 'score-shrink-out 150ms ease-in forwards',
        'score-pop-in':     'score-pop-in 300ms ease-out forwards',
        'score-flip-out':   'score-flip-out 200ms ease-in forwards',
        'score-flip-in':    'score-flip-in 200ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
