# Typography System

The typography creates a noticeable hierarchy, separating the emotional/human brand moments from the functional UI.

## 1. Font Families
*   **DISPLAY / HEADLINES:** `Instrument Serif`
    *   *Usage:* Brand marks, hero headlines, massive page headings.
    *   *Vibe:* Refined, editorial, premium education.
*   **BODY / UI:** `Geist Sans` (or `Inter`)
    *   *Usage:* Section headings, body copy, form labels, buttons, metadata.
    *   *Vibe:* Clean, modern, highly readable, functional.

## 2. Typographic Hierarchy

### Display (Instrument Serif)
*   **Hero / Display:** `text-5xl` to `text-7xl` (`48px` - `72px`), `tracking-tight` (-0.02em), `leading-[1.1]`.
*   **Page Heading:** `text-4xl` (`36px`), `tracking-tight`, `leading-[1.1]`.

### UI & Content (Geist Sans)
*   **Section Heading:** `text-2xl` (`24px`), `font-medium`, `tracking-tight`, `leading-snug`.
*   **Body (Content):** `text-base` to `text-lg` (`16px` - `18px`), `font-normal`, `leading-relaxed` (1.6). *Crucial for readability in the AI transcript.*
*   **Labels / Buttons:** `text-sm` (`14px`), `font-medium`, `leading-none`.
*   **Micro-copy:** `text-xs` (`12px`), `uppercase`, `tracking-wider` (0.05em), `text-muted` (`#7A7C75`).

## 3. Optical Adjustments
*   Never center-align long paragraphs of text.
*   Constrain line-lengths (measure) to `max-w-prose` (approx 65 characters) for body text to prevent eye fatigue.
*   Headlines use tighter letter spacing; micro-copy uses looser letter spacing.
