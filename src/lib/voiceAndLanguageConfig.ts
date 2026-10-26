import { GeminiVoice } from '@/types/liveSession'

/**
 * Standard supported language locales for Indian School Board Students (CBSE, ICSE, IB).
 * Passing ["en-IN", "hi-IN"] to the Gemini Live speechConfig and transcription parameters
 * ensures natural Indian English and Hindi inflection regardless of the selected prebuilt voice.
 */
export const DEFAULT_SUPPORTED_LANGUAGES: string[] = ['en-IN', 'hi-IN']

export interface VoiceOption {
  id: GeminiVoice
  name: string
  gender: 'female' | 'male'
  label: string
  desc: string
  bestLanguages: string[]
  isRecommended?: boolean
  inflection: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'Leda',
    name: 'Leda',
    gender: 'female',
    label: 'Leda — Warm, youthful, natural Indian inflection (Recommended)',
    desc: 'Youthful, warm, and natural conversational cadence with fluid Indian English and Hindi inflection.',
    bestLanguages: ['English', 'Hinglish', 'Hindi'],
    isRecommended: true,
    inflection: 'fluid, natural Indian inflection with warm encouraging tone',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    label: 'Puck — Upbeat, lively, energetic Indian inflection (Recommended)',
    desc: 'Upbeat, energetic, and engaging cadence with crisp Indian English and Hindi pronunciation.',
    bestLanguages: ['English', 'Hinglish', 'Hindi'],
    isRecommended: true,
    inflection: 'upbeat, lively Indian inflection with high engagement',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    label: 'Aoede — Breezy, relaxed, and methodical mentor',
    desc: 'Breezy, relaxed, and methodical tone for steady conceptual derivations.',
    bestLanguages: ['English', 'French', 'Spanish'],
    inflection: 'clear, relaxed international cadence',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    label: 'Charon — Calm, deep, and patient guide',
    desc: 'Calm, deep, and authoritative delivery for analytical problem solving.',
    bestLanguages: ['English', 'German'],
    inflection: 'deliberate, measured cadence',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    label: 'Kore — Crisp, attentive, and academically clear',
    desc: 'Gentle, structured, and academically lucid explanations.',
    bestLanguages: ['English', 'German'],
    inflection: 'crisp, attentive cadence',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    label: 'Fenrir — Confident, energetic, and direct',
    desc: 'Confident, assertive, and direct tone that keeps students attentive.',
    bestLanguages: ['English', 'Spanish'],
    inflection: 'direct, confident cadence',
  },
]

export interface LanguageVoiceMapping {
  language: string
  primaryLanguageCode: string
  supportedLanguageCodes: string[]
  recommendedVoices: GeminiVoice[]
  defaultVoice: GeminiVoice
  accentPromptInstruction: string
}

export const LANGUAGE_VOICE_CONFIGS: Record<string, LanguageVoiceMapping> = {
  English: {
    language: 'English',
    primaryLanguageCode: 'en-IN',
    supportedLanguageCodes: ['en-IN', 'hi-IN'],
    recommendedVoices: ['Leda', 'Puck'],
    defaultVoice: 'Leda',
    accentPromptInstruction:
      'Speak in English with a natural, fluid Indian inflection (en-IN). Use standard Indian educational terminology (e.g. sums, steps, marks, derivations) with warm, articulate clarity and authentic pacing.',
  },
  Hinglish: {
    language: 'Hinglish',
    primaryLanguageCode: 'en-IN',
    supportedLanguageCodes: ['en-IN', 'hi-IN'],
    recommendedVoices: ['Leda', 'Puck'],
    defaultVoice: 'Leda',
    accentPromptInstruction:
      'Speak in natural, conversational Hinglish (code-switching smoothly between Indian English and conversational Hindi). Keep technical concepts, laws, formulas, and units in English while using friendly Hindi connectives (samjhe, dekho, bilkul, chalo) with authentic Indian conversational cadence.',
  },
  Hindi: {
    language: 'Hindi',
    primaryLanguageCode: 'hi-IN',
    supportedLanguageCodes: ['hi-IN', 'en-IN'],
    recommendedVoices: ['Puck', 'Leda'],
    defaultVoice: 'Puck',
    accentPromptInstruction:
      'Speak in clear, fluent Hindi (hi-IN) with natural conversational warmth and authentic Indian inflection. Enunciate scientific terms clearly in Hindi alongside standard English terms where commonly used in school boards.',
  },
  Spanish: {
    language: 'Spanish',
    primaryLanguageCode: 'es-ES',
    supportedLanguageCodes: ['es-ES', 'es-419', 'en-US'],
    recommendedVoices: ['Aoede', 'Fenrir'],
    defaultVoice: 'Aoede',
    accentPromptInstruction:
      'Speak in clear, warm Castilian or neutral Latin American Spanish with engaging pedagogical cadence.',
  },
  French: {
    language: 'French',
    primaryLanguageCode: 'fr-FR',
    supportedLanguageCodes: ['fr-FR', 'en-US'],
    recommendedVoices: ['Aoede', 'Charon'],
    defaultVoice: 'Aoede',
    accentPromptInstruction:
      'Speak in articulate, standard French with warm, encouraging scholastic cadence.',
  },
  German: {
    language: 'German',
    primaryLanguageCode: 'de-DE',
    supportedLanguageCodes: ['de-DE', 'en-US'],
    recommendedVoices: ['Kore', 'Charon'],
    defaultVoice: 'Kore',
    accentPromptInstruction:
      'Speak in clear, structured standard German (Hochdeutsch) with precise academic pronunciation.',
  },
}

/**
 * Returns the optimal language parameters and matching voice personas
 * for a student's chosen language.
 */
export function getLanguageVoiceConfig(languageName?: string | null): LanguageVoiceMapping {
  if (!languageName) {
    return LANGUAGE_VOICE_CONFIGS['English']
  }
  const normalized = languageName.trim().toLowerCase()
  if (normalized.includes('hinglish') || normalized.includes('bilingual')) {
    return LANGUAGE_VOICE_CONFIGS['Hinglish']
  }
  if (normalized.includes('hindi')) {
    return LANGUAGE_VOICE_CONFIGS['Hindi']
  }
  if (normalized.includes('spanish')) {
    return LANGUAGE_VOICE_CONFIGS['Spanish']
  }
  if (normalized.includes('french')) {
    return LANGUAGE_VOICE_CONFIGS['French']
  }
  if (normalized.includes('german')) {
    return LANGUAGE_VOICE_CONFIGS['German']
  }
  return LANGUAGE_VOICE_CONFIGS['English']
}
