import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Semantic surface scale - warm near-black, not pure gray
        surface: {
          sunken: "#0B0C0F",
          DEFAULT: "#14161B",
          raised: "#1C1F26",
          overlay: "#22252D",
        },
        border: {
          DEFAULT: "#262932",
          strong: "#33363F",
        },
        ink: {
          DEFAULT: "#F5F3EE",
          muted: "#9A9CA5",
          faint: "#6B6E76",
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F0D77B',
          dark: '#B8860B',
          50: '#FDF9E7',
          100: '#FCF3CF',
          200: '#F9E79F',
          300: '#F7DC6F',
          400: '#F4D03F',
          500: '#D4AF37',
          600: '#B8960C',
          700: '#9A7B0A',
          800: '#7D6608',
          900: '#605006',
        },
        success: {
          DEFAULT: "#3FB27F",
          muted: "#1C3A2C",
        },
        danger: {
          DEFAULT: "#D9635A",
          muted: "#3A2321",
        },
        warning: {
          DEFAULT: "#C9963C",
          muted: "#3A301C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.5s ease-out both",
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212, 175, 55, 0.35)",
        panel: "0 20px 60px -20px rgba(0, 0, 0, 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
