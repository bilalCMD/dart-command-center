import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dart: {
          orange: '#ED671C',
          orangeDark: '#D55915',
          purple: '#B71CED',
          purpleDark: '#9F14CE',
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          surface2: '#F1F5F9',
          surface3: '#E2E8F0',
          border: '#E2E8F0',
          borderStrong: '#CBD5E1',
          text: '#0F172A',
          textSoft: '#334155',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        success: '#10B981',
        successSoft: '#D1FAE5',
        danger: '#EF4444',
        dangerSoft: '#FEE2E2',
        warning: '#F59E0B',
        warningSoft: '#FEF3C7',
        info: '#3B82F6',
        infoSoft: '#DBEAFE',
      },
      fontFamily: {
        sans: ['Satoshi', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Satoshi', 'Montserrat', 'system-ui', 'sans-serif'],
        body: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'dart-gradient': 'linear-gradient(135deg, #ED671C 0%, #B71CED 100%)',
        'dart-gradient-soft': 'linear-gradient(135deg, rgba(237,103,28,0.08) 0%, rgba(183,28,237,0.08) 100%)',
        'dart-gradient-hover': 'linear-gradient(135deg, #D55915 0%, #9F14CE 100%)',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        'card': '0 1px 3px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.03)',
        'card-hover': '0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)',
        'elevated': '0 4px 16px rgba(15,23,42,0.06), 0 2px 6px rgba(15,23,42,0.04)',
        'glow-orange': '0 0 20px rgba(237,103,28,0.25)',
      },
      borderRadius: {
        'lg': '8px',
        'xl': '10px',
        '2xl': '12px',
        '3xl': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

export default config;