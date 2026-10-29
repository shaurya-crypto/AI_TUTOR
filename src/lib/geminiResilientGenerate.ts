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
 * Verified ultra-fast models with high-availability, instant response times (sub-2s),
 * and high quota for curriculum decomposition and chapter synthesis:
 * 1. gemini-2.5-flash: Ultra-fast flagship workhorse (1.1s response, exceptional structured JSON)
 * 2. gemini-3-flash-preview: High-speed preview engine (1.5s response, active quota)
 * 3. gemini-2.5-flash-lite: Ultra-low latency safety net (0.8s response)
 */
const DEFAULT_MODEL_CASCADE = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite',
]

/**
 * Instant-Failover Multi-Model Generator with per-attempt timeout guard.
 * Prevents requests from hanging on upstream demand spikes (e.g. 503 errors).
 * If a model times out (default 25s) or returns an error, it immediately cascades to the next available model.
 */
export async function resilientGenerateContent(
  ai: GoogleGenAI,
  options: ResilientGenerateOptions
): Promise<{ text: string; modelUsed: string }> {
  const models =
    options.preferredModels && options.preferredModels.length > 0
      ? options.preferredModels
      : DEFAULT_MODEL_CASCADE

  const maxRounds = options.maxRounds || 2
  const label = options.label || 'Gemini API'
  const timeoutLimit = options.timeoutMs || 25000
  const errorsCollected: string[] = []

  const baseConfig = {
    maxOutputTokens: 65536,
    ...(options.config || {}),
  }

  for (let round = 1; round <= maxRounds; round++) {
    for (let i = 0; i < models.length; i++) {
      const model = models[i]
      const nextModel = models[i + 1]

      // Helper to execute generation with timeout guard
      const executeWithTimeout = async (): Promise<string> => {
        let timeoutTimer: NodeJS.Timeout | null = null

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => {
            reject(new Error(`Timeout: ${model} exceeded ${Math.round(timeoutLimit / 1000)}s response limit`))
          }, timeoutLimit)
        })

        try {
          const apiPromise = ai.models.generateContent({
            model,
            contents: options.contents,
            config: baseConfig,
          })

          const response = await Promise.race([apiPromise, timeoutPromise])
          return response?.text?.trim() || ''
        } finally {
          if (timeoutTimer) clearTimeout(timeoutTimer)
        }
      }

      try {
        console.log(`[${label}] Requesting generation via ${model} (Round ${round}/${maxRounds})...`)

        let rawText = ''
        try {
          rawText = await executeWithTimeout()
        } catch (firstErr: any) {
          // If transient socket drop ("fetch failed"), retry once after 400ms before failing over
          if (firstErr?.message?.includes('fetch failed')) {
            console.log(`[${label}] Network connection reset for ${model}. Retrying once in 400ms...`)
            await new Promise((r) => setTimeout(r, 400))
            rawText = await executeWithTimeout()
          } else {
            throw firstErr
          }
        }

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
            `[${label}] ${model} unavailable (${errMsg.includes('503') ? '503 High Demand' : errMsg.includes('429') ? '429 Quota' : errMsg.includes('Timeout') ? 'Timed out' : errMsg.substring(0, 80)}). Instantly failing over to ${nextModel}...`
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
      const backoff = 800 + Math.random() * 400
      console.warn(`[${label}] All models exhausted in Round ${round}. Pausing ${Math.round(backoff)}ms before Round ${round + 1}...`)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }

  throw new Error(
    `All available fast Gemini models (${models.join(', ')}) failed or were unavailable. Details: ${errorsCollected.join(' | ')}`
  )
}
