import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "on-primary": "#FFFFFF",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Anaxly Scholastic Design System Tokens (Single Source of Truth)
        canvas: "var(--canvas-base, #FAF8F4)",
        "canvas-base": "var(--canvas-base, #FAF8F4)",
        "canvas-surface": "var(--canvas-surface, #FFFFFF)",
        "canvas-soft": "var(--canvas-soft, #F4F1EA)",
        "border-subtle": "var(--border-subtle, #E6E3DB)",
        "border-strong": "var(--border-strong, #D6D2C6)",

        "ink-primary": "var(--ink-primary, #0F172A)",
        "ink-secondary": "var(--ink-secondary, #334155)",
        "ink-muted": "var(--ink-muted, #64748B)",
        "ink-hairline": "var(--ink-hairline, #A2A7A3)",

        "accent-primary": "var(--accent-primary, #1F3852)",
        "accent-primary-hover": "var(--accent-primary-hover, #172C42)",
        "accent-primary-soft": "var(--accent-primary-soft, #EDF3F8)",
        "accent-primary-border": "var(--accent-primary-border, #C6D8E7)",

        "accent-warm": "var(--accent-warm, #255D88)",
        "accent-warm-hover": "var(--accent-warm-hover, #1C486B)",
        "accent-warm-soft": "var(--accent-warm-soft, #EEF5FA)",
        "accent-warm-border": "var(--accent-warm-border, #C8DEEE)",

        "accent-ochre": "var(--accent-ochre, #3B7CAE)",
        "accent-ochre-hover": "var(--accent-ochre-hover, #2E648F)",
        "accent-ochre-soft": "var(--accent-ochre-soft, #F0F6FA)",
        "accent-ochre-border": "var(--accent-ochre-border, #D2E4F2)",

        "accent-sage": "var(--accent-sage, #3B654C)",
        "accent-sage-hover": "var(--accent-sage-hover, #2E503C)",
        "accent-sage-soft": "var(--accent-sage-soft, #EDF5F0)",
        "accent-sage-border": "var(--accent-sage-border, #C2DEC9)",

        "chalkboard-felt": "var(--chalkboard-felt, #13211B)",
        "chalkboard-border": "var(--chalkboard-border, #233930)",
        "chalkboard-header": "var(--chalkboard-header, #0F1A15)",
        "chalkboard-rough": "var(--chalkboard-rough, #172720)",

        // Backward Compatibility Aliases for Seamless Component Integration
        "canvas-ivory": "var(--canvas-base, #FAF8F4)",
        "surface-white": "var(--canvas-surface, #FFFFFF)",
        "surface-soft": "var(--canvas-soft, #F4F1EA)",
        "coral-primary": "var(--accent-warm, #255D88)",
        "coral-hover": "var(--accent-warm-hover, #1C486B)",
        "coral-soft": "var(--accent-warm-soft, #EEF5FA)",
        "coral-border": "var(--accent-warm-border, #C8DEEE)",
        "botanical-primary": "var(--accent-sage, #3B654C)",
        "botanical-dark": "var(--accent-sage-hover, #2E503C)",
        "botanical-soft": "var(--accent-sage-soft, #EDF5F0)",
        "botanical-border": "var(--accent-sage-border, #C2DEC9)",
        "accent-hover": "var(--accent-warm-hover, #1C486B)",

        ink: {
          primary: "var(--ink-primary, #181A18)",
          secondary: "var(--ink-secondary, #4E534F)",
          muted: "var(--ink-muted, #757B76)",
          hairline: "var(--ink-hairline, #A2A7A3)",
        },
        coral: {
          DEFAULT: "var(--accent-warm, #255D88)",
          hover: "var(--accent-warm-hover, #1C486B)",
          soft: "var(--accent-warm-soft, #EEF5FA)",
          border: "var(--accent-warm-border, #C8DEEE)",
        },
        botanical: {
          DEFAULT: "var(--accent-sage, #3B654C)",
          dark: "var(--accent-sage-hover, #2E503C)",
          soft: "var(--accent-sage-soft, #EDF5F0)",
          border: "var(--accent-sage-border, #C2DEC9)",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(23, 24, 23, 0.05)",
        soft: "0 4px 20px -4px rgba(23, 24, 23, 0.05)",
        card: "0 10px 30px -10px rgba(23, 24, 23, 0.06)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      fontFamily: {
        sans: ["Inter", "Geist", "var(--font-geist-sans)", "sans-serif"],
        serif: ["Instrument Serif", "Newsreader", "var(--font-instrument-serif)", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
        cursive: ["Caveat", "cursive", "handwriting"],
        editorial: ["Instrument Serif", "Newsreader", "Georgia", "serif"],
        "headline-lg": ["Instrument Serif", "Newsreader", "serif"],
        "headline-md": ["Instrument Serif", "Newsreader", "serif"],
        "headline-sm": ["Inter", "Geist", "sans-serif"],
        "body-lg": ["Inter", "Geist", "sans-serif"],
        "body-md": ["Inter", "Geist", "sans-serif"],
        "label-md": ["Inter", "Geist", "sans-serif"],
        "label-micro": ["JetBrains Mono", "monospace"],
        "display-hero": ["Instrument Serif", "Newsreader", "serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        ripple: {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ripple": "ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
