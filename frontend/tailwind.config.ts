import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        llr: {
          void: '#05070c',
          ink: '#0a1018',
          panel: '#111a26',
          panel2: '#162030',
          saffron: '#e19a0f',
          'saffron-glow': '#f0b429',
          brick: '#c13b2e',
          'brick-deep': '#7f241c',
          pitch: '#1f5c45',
          'pitch-bright': '#2d8f6c',
          cream: '#ebe3d5',
          muted: '#7d8fa3',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'score-bump': 'scoreBump 0.4s ease-out',
        'llr-glow': 'llrGlow 4s ease-in-out infinite',
        'slam-in': 'slamIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scoreBump: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        llrGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.85' },
        },
        slamIn: {
          '0%': { opacity: '0', transform: 'scale(3) rotate(-5deg)' },
          '60%': { opacity: '1', transform: 'scale(0.95) rotate(1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
