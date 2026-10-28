# Aristotle Component Language

This specification defines the interactive component patterns used across the Aristotle AI Tutor, matching the classical paper-and-ink aesthetic of the `/login` portal and `/onboarding` companion.

---

## 1. Buttons

### Primary Walnut Button (Default Action)
*   **Color:** Deep Walnut Ink (`bg-[#2C241E]`) with white text (`text-white`).
*   **Radius:** `rounded-2xl` (16px).
*   **Padding:** `py-3.5 px-4`.
*   **Hover State:** `hover:bg-[#1E1712]`, subtle micro-scale `active:scale-[0.99]`.
*   **Disabled State:** `disabled:opacity-50 cursor-not-allowed`.
*   **Spinner:** Subtle inline `Loader2` animation in white.

### Terracotta Action Button (High-Priority CTA)
*   **Color:** Terracotta Coral (`bg-[#C85A43]`) with white text.
*   **Radius:** `rounded-xl` or `rounded-2xl`.
*   **Hover State:** `hover:bg-[#A94734]`.

### Secondary & OAuth Pill Button (e.g. Google Sign-In)
*   **Color:** Pure white surface (`bg-white`) with dark neutral text (`text-neutral-800`).
*   **Border:** Subtle warm neutral (`border border-neutral-200/90` or `border-[#E5E3DB]`).
*   **Radius:** `rounded-2xl` (16px).
*   **Shadow:** Soft tactile elevation `shadow-[0_2px_8px_rgba(0,0,0,0.03)]`.
*   **Hover State:** `hover:bg-neutral-50`, `active:scale-[0.99]`.

---

## 2. Six-Digit Discrete OTP Input Group

The cornerstone of Aristotle's secure, passwordless authentication:
*   **Structure:** 6 individual discrete square input cells (`w-11 h-14 sm:w-12 sm:h-14`) in a horizontal flex row with `gap-2 sm:gap-2.5`.
*   **Resting State:** `bg-white`, `border border-[#E5E3DB]`, `rounded-xl`, `font-mono text-2xl font-bold text-[#1F1C18]`.
*   **Active / Filled State:** `border-[#52715D]` (botanical green) or `border-[#1F1C18]`, `ring-2 ring-[#52715D]/20`.
*   **Error State:** `border-rose-300 bg-rose-50/20 text-rose-900`.
*   **Interactivity:**
    *   Entering a digit advances focus to cell $i+1$.
    *   Backspace on an empty cell deletes and shifts focus back to cell $i-1$.
    *   Pasting a 6-digit code auto-populates all 6 cells and auto-submits.
    *   Cell 0 includes `autoComplete="one-time-code"` for mobile OS autofill.

---

## 3. Form Inputs & Text Fields
*   **Background:** Pure white (`bg-white`).
*   **Border:** `border border-neutral-200/90` (subtle paper border).
*   **Radius:** `rounded-2xl` (16px).
*   **Text:** `text-sm text-neutral-900 placeholder:text-neutral-400`.
*   **Focus Ring:** `focus:border-neutral-900 focus:outline-none`.
*   **Shadow:** `shadow-[0_2px_8px_rgba(0,0,0,0.02)]`.

---

## 4. Sobi Companion & Speech Bubbles
*   **Vector Avatar:** Scalable Sobi bot with real-time responsive head rotation (`lookAt="input" | "cursor" | "center"`), procedural eye blinks, and dynamic emotional states (`attentive-left`, `joyful-wide`, `downward-gaze`).
*   **Speech Bubble:**
    *   White parchment pill container: `bg-white border border-neutral-200/80 rounded-2xl px-5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]`.
    *   Triangle tail connecting bubble to avatar head.
    *   Integrated manual audio pronunciation button (`Volume2`) pulsing in emerald during playback.

---

## 5. Security & Validity Badges
*   **Pill Container:** `bg-[#F0F7F1] border border-[#C8E0CE] rounded-full px-3 py-1`.
*   **Typography:** `text-xs font-medium text-[#3E5D4B]`.
*   **Iconography:** `ShieldCheck` (14px) in botanical green (`text-[#52715D]`).
*   **Copy:** "Valid for 10 minutes &bull; Single-use only".

---

## 6. Dividers
*   **Style:** 1px hairline rule `border-t border-neutral-200/90`.
*   **Centered Pill:** Absolute centered span on `#FAF9F5` canvas with `text-xs text-neutral-400` ("or").
