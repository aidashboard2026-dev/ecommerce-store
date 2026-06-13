/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "DM Sans",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
        display: [
          "DM Sans",
          "Outfit",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50:  '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b2c5ff',
          400: '#85a0ff',
          500: '#5865f2', // Brand primary
          600: '#404be0',
          700: '#3037cc',
          800: '#2529a3',
          900: '#1b1d7d',
          950: '#10114f',
        },
        surface: {
          light: '#ffffff',
          dark: '#0f111a',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out-base',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(88, 101, 242, 0.25)',
        'glow-sm': '0 0 10px rgba(88, 101, 242, 0.15)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.15)',
        elevated: '0px 8px 30px rgba(0, 0, 0, 0.08), 0px 2px 8px rgba(0, 0, 0, 0.04)'
      },
    },
  },
  plugins: [],
}

