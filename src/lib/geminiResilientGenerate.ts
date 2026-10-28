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
  timeoutMs?: number
}

/**
 * Verified high-availability models for curriculum decomposition, diagram generation, and notes synthesis.
 * Priority order:
 * 1. gemini-3.8-flash: Primary flagship with extended thinking reasoning
 * 2. gemini-3.1-pro-preview: Frontier Gemini 3.1 Pro fallback
 * 3. gemini-3.5-flash: High-capacity modern flagship intermediate fallback
 * 4. gemini-2.5-flash: Reliable NCERT-structured thinking fallback
 * 5. gemini-2.5-flash-lite: Ultra-low latency safety net
 */
const DEFAULT_MODEL_CASCADE = [
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]

/**
 * Instant-Failover Multi-Model Generator with resilient per-model timeout and thinking reasoning.
 * Automatically tries primary gemini-3.8-flash (with thinking), cascading to gemini-3.1-pro-preview,
 * gemini-3.5-flash, and gemini-2.5-flash if upstream demand spikes (503/429) occur.
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
  const perModelTimeout = options.timeoutMs || 45000

  // Ensure thinking budget is active by default for high-level reasoning across all models
  const baseConfig = {
    thinkingConfig: { thinkingBudget: 2048 },
    ...(options.config || {}),
  }

  for (let round = 1; round <= maxRounds; round++) {
    for (let i = 0; i < models.length; i++) {
      const model = models[i]
      const nextModel = models[i + 1]

      try {
        console.log(`[${label}] Requesting generation via ${model} (Round ${round}/${maxRounds})...`)

        let timer: NodeJS.Timeout | null = null
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Timeout: ${model} exceeded ${perModelTimeout / 1000}s response limit`))
          }, perModelTimeout)
        })

        const generatePromise = ai.models.generateContent({
          model,
          contents: options.contents,
          config: baseConfig,
        })

        const response: any = await Promise.race([generatePromise, timeoutPromise]).finally(() => {
          if (timer) clearTimeout(timer)
        })

        const rawText = response?.text?.trim() || ''
        if (rawText.length > 0) {
          if (round > 1 || model !== models[0]) {
            console.log(`[${label}] Successfully completed generation using failover model "${model}".`)
          } else {
            console.log(`[${label}] Successfully completed generation using primary model "${model}".`)
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
      const backoff = 1500 + Math.random() * 500
      console.warn(`[${label}] All models exhausted in Round ${round}. Pausing ${Math.round(backoff)}ms before Round ${round + 1}...`)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }

  throw new Error(
    `All available Gemini models (${models.join(', ')}) failed or were unavailable due to upstream demand spikes. Details: ${errorsCollected.join(' | ')}`
  )
}
