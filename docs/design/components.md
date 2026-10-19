# Component Language

This defines the reusable visual language for the AI Tutor. (It does not dictate business logic or specific fields).

## Buttons

### Primary Button
*   **Color:** Primary Coral (`bg-[#C85A43]`) with white text.
*   **Radius:** `rounded-xl`
*   **Padding:** `px-6 py-3`
*   **Typography:** `font-medium`, `text-sm`
*   **Hover State:** Smooth transition to Coral Dark (`hover:bg-[#A94734]`), slight scale down (`active:scale-[0.98]`).
*   **No Shadow:** Rely on the strong color contrast rather than drop shadows.

### Secondary / OAuth Button
*   **Color:** White surface (`bg-white`) with Primary Ink text (`text-[#171817]`).
*   **Border:** `border border-[#E5E3DB]`
*   **Hover State:** `hover:bg-[#F8F6F0]`

## Form Inputs
*   **Surface:** Clean white (`bg-white`).
*   **Border:** Subtle warm neutral (`border-[#E5E3DB]`).
*   **Text:** Primary Ink (`text-[#171817]`).
*   **Typography:** `text-base` (prevents iOS zoom on focus).
*   **Focus State:** Replace default blue ring with a refined Coral or Ink ring (`focus:ring-2 focus:ring-[#171817]/20 focus:border-[#171817]`).
*   **Padding:** Comfortable vertical spacing (`py-3 px-4`).

## Form Labels
*   **Color:** Secondary Ink (`text-[#555852]`).
*   **Typography:** `text-sm font-medium`.
*   **Spacing:** `mb-1.5` below the label.

## Authentication Panel (The Card)
*   **Surface:** Pure white (`bg-white`).
*   **Radius:** `rounded-3xl` (24px) for a soft, premium feel.
*   **Padding:** Generous (`p-8 md:p-12`).
*   **Shadow:** Very soft, diffused elevation (`box-shadow: 0 20px 40px -15px rgba(23, 24, 23, 0.05)`).
*   **Border:** Optional 1px border (`border-[#E5E3DB]`) if it needs separation from the background.

## Icons (Lucide)
*   **Style:** Minimal, thin line icons.
*   **Stroke Width:** `1.5px` (not the default 2px, to match the elegant typography).
*   **Color:** Matches the text color they sit next to (e.g., Secondary Ink for input adornments).

## Dividers
*   **Color:** `#E5E3DB`
*   **Style:** 1px solid. Used for "Or continue with" sections, flanked by uppercase micro-copy.
