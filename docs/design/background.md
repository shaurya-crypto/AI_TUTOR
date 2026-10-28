# Aristotle Background & Canvas System

The background across all authentication, onboarding, and platform pages must never be a flat, cold digital white or a generic AI gradient. Instead, it reflects an authentic scholar's workspace: warm alabaster paper, subtle geometric grid lines, and classical architectural perspectives.

---

## 1. Selected Concept: Classical Alabaster Paper Canvas

The environment is composed of two harmonious layers:
1. A warm paper base: `#FAF9F5` (or `#FAF8F5`).
2. An elegant Cartesian fine paper grid overlay providing subtle structure without visual clutter.

### The Fine Paper Grid
The mathematical paper grid evokes notebooks, graph paper, and classical geometry:
```css
/* Aristotle Fine Paper Grid Canvas */
.canvas-grid {
  background-color: #FAF9F5;
  background-image: 
    linear-gradient(to right, #E7E5E0 1px, transparent 1px),
    linear-gradient(to bottom, #E7E5E0 1px, transparent 1px);
  background-size: 24px 24px;
}
```
*   **Grid Color:** `#E7E5E0` (subtle warm stone).
*   **Grid Size:** `24px x 24px` squares.
*   **Opacity:** Overlaid at `40%` opacity (`opacity-40 pointer-events-none`).
*   **Result:** A tactile, academic texture that looks refined on both Retina mobile screens and large desktop displays.

---

## 2. Editorial Artwork & Architectural Perspective

On desktop split-screen views (such as the `/login` portal):
*   **Visual Asset:** Classical stone arches overlooking sunlit Italian landscape (`/landing_images/classical-arch.jpg`) or golden renaissance clouds (`/landing_images/hero-clouds.jpg`).
*   **Vignette Edge:** A soft gradient overlay (`from-[#FAF9F5]/20 via-transparent to-transparent`) softens the interior vertical seam between the editorial form and the artwork panel.
*   **Image Container:** Encased in stone neutral background `#EFECE6` with hairline border `border-neutral-200/60`.

---

## 3. Anti-Patterns (Strictly Prohibited)
*   **No Generic AI Mesh Gradients:** No purple-to-blue glowing gradients, vaporwave hues, or floating orbs.
*   **No Cyberpunk Dark Modes:** The core platform atmosphere is warm daytime scholarly light.
*   **No Cluttered Particle Fields:** No floating mathematical symbols or drifting sparkles.
*   **No Sterile Absolute White:** Avoid unstyled `#FFFFFF` full-viewport bodies.
