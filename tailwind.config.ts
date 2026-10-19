import type { Config } from "tailwindcss";

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
        // Botanical Intelligence Colors
        canvas: "#F8F6F0",
        "border-subtle": "#E5E3DB",
        "ink-primary": "#171817",
        "ink-secondary": "#555852",
        "ink-muted": "#7A7C75",
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
          primary: "#171817",
          secondary: "#555852",
          muted: "#7A7C75",
        },
        coral: {
          DEFAULT: "#C85A43",
          dark: "#A94734",
          soft: "#F6E5DF",
        },
        botanical: {
          DEFAULT: "#52715D",
          dark: "#3E5D4B",
          soft: "#E8F0EA",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(23, 24, 23, 0.05)",
      },
      fontFamily: {
        sans: ["Geist", "var(--font-geist-sans)", "Inter", "sans-serif"],
        serif: ["Newsreader", "var(--font-instrument-serif)", "Georgia", "serif"],
        "headline-lg": ["Newsreader", "serif"],
        "headline-md": ["Newsreader", "serif"],
        "headline-sm": ["Geist", "sans-serif"],
        "body-lg": ["Geist", "sans-serif"],
        "body-md": ["Geist", "sans-serif"],
        "label-md": ["Geist", "sans-serif"],
        "label-micro": ["Geist", "sans-serif"],
        "display-hero": ["Newsreader", "serif"],
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
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
