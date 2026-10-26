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
        // Botanical & Classical Intelligence Colors
        canvas: "#F8F6F0",
        "canvas-ivory": "var(--canvas-ivory, #F8F6F0)",
        "surface-white": "var(--surface-white, #FFFFFF)",
        "surface-soft": "var(--surface-soft, #FCFBF8)",
        "border-subtle": "var(--border-subtle, #E5E3DB)",
        "border-strong": "var(--border-strong, #D5D2C8)",
        "ink-primary": "var(--ink-primary, #171817)",
        "ink-secondary": "var(--ink-secondary, #555852)",
        "ink-muted": "var(--ink-muted, #7A7C75)",
        "coral-primary": "var(--coral-primary, #C85A43)",
        "coral-hover": "var(--coral-hover, #A94734)",
        "coral-soft": "var(--coral-soft, #FFF8F6)",
        "coral-border": "var(--coral-border, #F5D5CE)",
        "botanical-primary": "var(--botanical-primary, #52715D)",
        "botanical-dark": "var(--botanical-dark, #3E5D4B)",
        "botanical-soft": "var(--botanical-soft, #F0F7F1)",
        "botanical-border": "var(--botanical-border, #C8E0CE)",
        "accent-hover": "#A94734",
        "primary-fixed": "#ffdad3",
        "primary-fixed-dim": "#ffb4a4",
        "primary-container": "#bf533d",
        "secondary-container": "#c8ebd2",
        "secondary-fixed": "#c8ebd2",
        "on-primary": "#ffffff",
        "on-secondary": "#ffffff",
        "on-primary-container": "#fffbff",
        "on-secondary-container": "#4c6b57",
        surface: "#FFFFFF",
        "surface-dim": "#dbdad8",
        "surface-bright": "#fbf9f7",
        "surface-variant": "#e4e2e0",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f3f1",
        "surface-container": "#efeeeb",
        "surface-container-high": "#e9e8e6",
        "surface-container-highest": "#e4e2e0",
        ink: {
          primary: "var(--ink-primary, #171817)",
          secondary: "var(--ink-secondary, #555852)",
          muted: "var(--ink-muted, #7A7C75)",
        },
        coral: {
          DEFAULT: "var(--coral-primary, #C85A43)",
          hover: "var(--coral-hover, #A94734)",
          soft: "var(--coral-soft, #FFF8F6)",
          border: "var(--coral-border, #F5D5CE)",
        },
        botanical: {
          DEFAULT: "var(--botanical-primary, #52715D)",
          dark: "var(--botanical-dark, #3E5D4B)",
          soft: "var(--botanical-soft, #F0F7F1)",
          border: "var(--botanical-border, #C8E0CE)",
        }
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
