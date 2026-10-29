import { GoogleGenAI } from '@google/genai'

export interface ResilientGenerateOptions {
  contents: any
  config?: {
    responseMimeType?: string
    temperature?: number
    maxOutputTokens?: number
    systemInstruction?: any
    thinkingConfig?: {
      thinkingBudget?: number
    }
    [key: string]: any
  }
  preferredModels?: string[]
  maxRounds?: number
  label?: string
}

/**
 * Verified high-availability models for curriculum decomposition, diagram generation, and notes synthesis.
 * Optimized for maximum speed and intelligence:
 * 1. gemini-2.5-flash: Ultra-fast flagship workhorse (sub-second response, high throughput, exceptional structured JSON)
 * 2. gemini-3.8-flash: Extended reasoning fallback
 * 3. gemini-3.1-pro-preview: Frontier preview fallback
 * 4. gemini-2.5-flash-lite: Low-latency safety net
 */
const DEFAULT_MODEL_CASCADE = [
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash-lite',
]

/**
 * Instant-Failover Multi-Model Generator without artificial client timeouts.
 * Lets Gemini complete generation naturally with maximum throughput.
 * If a model returns an API error (503 High Demand, 429 Rate Limit, etc.),
 * it IMMEDIATELY cascades to the next available model in 0 milliseconds.
 */
export async function resilientGenerateContent(
  ai: GoogleGenAI,
  options: ResilientGenerateOptions
): Promise<{ text: string; modelUsed: string }> {
  const models = options.preferredModels && options.preferredModels.length > 0
    ? options.preferredModels
    : DEFAULT_MODEL_CASCADE

  const maxRounds = options.maxRounds || 2
  const label = options.label || 'Gemini API'
  const errorsCollected: string[] = []

  // Ensure generous output token ceiling by default (up to 65,536 tokens) without forcing artificial thinking delays
  const baseConfig = {
    maxOutputTokens: 65536,
    ...(options.config || {}),
  }

  for (let round = 1; round <= maxRounds; round++) {
    for (let i = 0; i < models.length; i++) {
      const model = models[i]
      const nextModel = models[i + 1]

      try {
        console.log(`[${label}] Requesting generation via ${model} (Round ${round}/${maxRounds})...`)

        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: baseConfig,
        })

        const rawText = response?.text?.trim() || ''
        if (rawText.length > 0) {
          if (round > 1 || model !== models[0]) {
            console.log(`[${label}] Successfully completed generation using failover model "${model}".`)
          } else {
            console.log(`[${label}] Successfully completed generation using primary fast model "${model}".`)
          }
          return { text: rawText, modelUsed: model }
        }

        console.warn(`[${label}] ${model} returned empty text. Cascading immediately...`)
        errorsCollected.push(`[${model}@R${round}] Returned empty response`)
      } catch (err: any) {
        const errMsg = err?.message || String(err)
        errorsCollected.push(`[${model}@R${round}] ${errMsg.substring(0, 140)}`)

        if (nextModel) {
          console.warn(
            `[${label}] ${model} unavailable (${errMsg.includes('503') ? '503 High Demand' : errMsg.includes('429') ? '429 Quota' : errMsg.substring(0, 80)}). Instantly failing over to ${nextModel}...`
          )
        } else {
          console.warn(`[${label}] ${model} failed: ${errMsg.substring(0, 100)}`)
        }

        // Instant failover: cascade immediately to the next model in the list
        continue
      }
    }

    // If round 1 failed across all models, pause briefly with jitter before round 2
    if (round < maxRounds) {
      const backoff = 1000 + Math.random() * 500
      console.warn(`[${label}] All models exhausted in Round ${round}. Pausing ${Math.round(backoff)}ms before Round ${round + 1}...`)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }

  throw new Error(
    `All available Gemini models (${models.join(', ')}) failed or were unavailable due to upstream demand spikes. Details: ${errorsCollected.join(' | ')}`
  )
}
