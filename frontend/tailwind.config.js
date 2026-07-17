/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",

  

  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "DM Sans",
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
          "Outfit",
          "Inter",
          "sans-serif",
        ],
      },

      colors: {
        // Brand colors mapped to CSS variables
        brand: {
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          200: "var(--color-brand-200)",
          300: "var(--color-brand-300)",
          400: "var(--color-brand-400)",
          500: "var(--color-brand)",
          600: "var(--color-brand-hover)",
          700: "var(--color-brand-700)",
          800: "var(--color-brand-800)",
          900: "var(--color-brand-900)",
          950: "var(--color-brand-950)",
        },

        // Theme variables
        app: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        muted: "var(--color-text-muted)",
      },

      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in": "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },

      boxShadow: {
        glow: "0 0 20px rgba(114,114,120,0.15)",
        "glow-sm": "0 0 10px rgba(161,161,174,0.10)",
        card: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
        "card-hover":
          "0 8px 24px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)",
        elevated:
          "0 8px 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.02)",
      },
    },
  },

  plugins: [],
};