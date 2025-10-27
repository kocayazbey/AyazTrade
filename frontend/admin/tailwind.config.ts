import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          indigo: '#5856D6',
          orange: '#FF9500',
          pink: '#FF2D55',
          purple: '#AF52DE',
          red: '#FF3B30',
          teal: '#5AC8FA',
          yellow: '#FFCC00',
          gray: {
            50: '#F9FAFB',
            100: '#F2F2F7',
            200: '#E5E5EA',
            300: '#D1D1D6',
            400: '#C7C7CC',
            500: '#AEAEB2',
            600: '#8E8E93',
            700: '#636366',
            800: '#48484A',
            900: '#3A3A3C',
          },
        },
        ayaz: {
          blue: '#1D4ED8',
          green: '#16A34A',
          indigo: '#4338CA',
          orange: '#EA580C',
          pink: '#DB2777',
          purple: '#7C3AED',
          red: '#DC2626',
          teal: '#0EA5E9',
          yellow: '#F59E0B',
          gray: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
          },
        },
      },
      borderRadius: {
        'ios': '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
        'ayaz': '10px',
        'ayaz-lg': '14px',
        'ayaz-xl': '18px',
      },
      boxShadow: {
        'ios': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'ios-md': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'ios-lg': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'ayaz': '0 1px 6px rgba(0, 0, 0, 0.06)',
        'ayaz-md': '0 3px 14px rgba(0, 0, 0, 0.10)',
        'ayaz-lg': '0 6px 28px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config

