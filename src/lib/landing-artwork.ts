export interface ArtworkSlot {
  id: string
  src: string
  alt: string
  title: string
  caption?: string
  artistNote?: string
  width: number
  height: number
  objectPosition?: string
}

export type ArtworkSlotKey =
  | 'heroArtwork'
  | 'featureArtwork'
  | 'featureLibraryArtwork'
  | 'learningArtwork'
  | 'closingArtwork'
  | 'philosopherArtwork'
  | 'handsArtwork'
  | 'paperTexture'

export const LANDING_ARTWORK: Record<ArtworkSlotKey, ArtworkSlot> = {
  heroArtwork: {
    id: 'heroArtwork',
    src: '/landing_images/hero-final.jpg',
    alt: 'Classical oil painting of monumental clouds and atmospheric light over an open landscape',
    title: 'Monumental Skies & Atmospheric Light',
    caption: 'Archival study in oil on canvas',
    artistNote: 'Landscape and cloud study, 19th Century',
    width: 1000,
    height: 600,
    objectPosition: 'center 40%',
  },
  featureArtwork: {
    id: 'featureArtwork',
    src: '/landing_images/scholer-desk.jpg',
    alt: 'Classical scholar examining an open mathematical and astronomical manuscript by candlelight',
    title: 'The Scholar at the Desk',
    caption: 'Disciplined inquiry and mathematical rigor',
    artistNote: 'Study of natural philosophy and celestial mechanics',
    width: 1920,
    height: 1088,
    objectPosition: 'center center',
  },
  featureLibraryArtwork: {
    id: 'featureLibraryArtwork',
    src: '/landing_images/lybrary.jpg',
    alt: 'Grand classical library with arched windows and towering bookshelves',
    title: 'The Great Reading Hall',
    caption: 'First-principles inquiry and classical rigor',
    artistNote: 'Classical library interior study',
    width: 1920,
    height: 1005,
    objectPosition: 'center 35%',
  },
  learningArtwork: {
    id: 'learningArtwork',
    src: '/landing_images/ladders.jpg',
    alt: 'Classical oil painting of grand stone steps ascending into a sunlit sky',
    title: 'The Ascending Path',
    caption: 'The three-stage ascent to genuine mastery',
    artistNote: 'Architectural study of stone stairway and figures',
    width: 800,
    height: 374,
    objectPosition: 'center center',
  },
  closingArtwork: {
    id: 'closingArtwork',
    src: '/landing_images/footer_final.jpg',
    alt: 'Three monumental neoclassical stone arches framing misty mountain summits and morning skies',
    title: 'Arches to Understanding',
    caption: 'Clarity, intuition, and intellectual depth',
    artistNote: 'Neoclassical architectural perspective study',
    width: 1800,
    height: 1200,
    objectPosition: 'center 45%',
  },
  philosopherArtwork: {
    id: 'philosopherArtwork',
    src: '/landing_images/footer.jpg',
    alt: 'Classical stone statue of Socrates seated in an ancient colonnade overlooking the sea',
    title: 'The Socratic Presence',
    caption: 'The art of inquiry, reflection, and reasoned deduction',
    artistNote: 'Hellenistic classical sculpture study',
    width: 1200,
    height: 630,
    objectPosition: 'center center',
  },
  handsArtwork: {
    id: 'handsArtwork',
    src: '/landing_images/HANDs.jpg',
    alt: 'Classical oil study of hands in thoughtful gesture with ruffled cuffs',
    title: 'The Guiding Hand',
    caption: 'Step-by-step whiteboard derivations and handwritten proofs',
    artistNote: 'Figurative drapery and gesture study',
    width: 375,
    height: 368,
    objectPosition: 'center center',
  },
  paperTexture: {
    id: 'paperTexture',
    src: '/landing_images/bg.jpg',
    alt: 'Subtle archival paper texture',
    title: 'Ivory Archival Canvas',
    width: 1000,
    height: 667,
    objectPosition: 'center center',
  },
}

/**
 * Safely retrieves an artwork slot configuration.
 * Allows easy override or fallback without touching UI components.
 */
export function getArtwork(slot: ArtworkSlotKey): ArtworkSlot {
  return LANDING_ARTWORK[slot] || LANDING_ARTWORK.heroArtwork
}
