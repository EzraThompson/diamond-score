import type { Config } from "tailwindcss";

const config: Config = {
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
      },
      animation: {
        'score-pop':   'score-pop 0.3s ease-out',
        'score-flash': 'score-flash 0.7s ease-out',
        'ping-once':   'ping-once 0.6s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
