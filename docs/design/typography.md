# Aristotle Typography System

The typography creates a dignified hierarchy, pairing timeless classical serif titles with modern, crisp UI typography for effortless legibility across mathematical formulas and dialogue.

---

## 1. Font Families

### 1. Classical Display / Serif (`font-serif`)
*   **Families:** Georgia, Garamond, Instrument Serif, Times New Roman, serif.
*   **Usage:** Platform wordmark ("AI Tutor", "Aristotle"), welcome headings ("Come on in.", "Check your inbox."), modal titles, and chapter headlines.
*   **Aesthetic:** Scholarly, authoritative, calm, and human.

### 2. Modern UI / Body (`font-sans`)
*   **Families:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif.
*   **Usage:** Subtitles, explanations, option cards, form labels, buttons, and student prompts.
*   **Aesthetic:** Clean, neutral, high legibility.

### 3. Tabular / Monospace (`font-mono`)
*   **Families:** 'SF Mono', Monaco, Menlo, Consolas, 'Courier New', monospace.
*   **Usage:** Discrete 6-digit OTP entry cells, mathematical formulas, timer countdowns, and numerical inputs.
*   **Aesthetic:** Precision, geometric rhythm, zero ambiguity between numerals (e.g. 0 vs O, 1 vs l).

---

## 2. Typographic Scale & Hierarchy

| Role | Font Family | Size & Weight | Letter Spacing | Color |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | Serif | `text-4xl` to `text-5xl` (36–48px), normal (400) | `tracking-tight` (-0.02em) | `#1F1C18` |
| **Section Heading** | Serif | `text-3xl` (30px), normal (400) | `tracking-tight` (-0.015em) | `#1F1C18` |
| **Question Title** | Sans | `text-[17px]` to `text-xl` (17–20px), medium (500) | `tracking-tight` | `#2A231C` |
| **Card / Option Title**| Sans | `text-sm` to `text-base` (14–16px), medium (500) | normal | `#1F1C18` |
| **Body & Subtitle** | Sans | `text-sm` (14px), normal (400) | normal | `#555852` |
| **OTP Digit** | Mono | `text-2xl` (24px), bold (700) | normal (centered) | `#1F1C18` |
| **Micro-copy & Badges**| Sans | `text-xs` (11–12px), medium (500) | `tracking-wide` (0.05em) | `#7A7C75` |
| **Brand Monogram** | Serif | `text-xs` (11–13px), semi-bold (600) | `tracking-[0.2em]` (uppercase) | `#52715D` |

---

## 3. Optical Rules
*   **Line Lengths:** Constrain paragraph measures to `max-w-[420px]` in forms and `max-w-prose` in reading panes to avoid eye fatigue.
*   **Leading:** Headings use tight line height (`leading-[1.15]`); body text uses comfortable breathing room (`leading-relaxed` or `line-height: 22px`).
*   **No Emojis:** Replace all informal emoji icons with Lucide SVG glyphs or typographical bullets (`&bull;`).
