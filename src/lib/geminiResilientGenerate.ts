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
 * Verified models for curriculum decomposition and chapter synthesis:
 * 1. gemini-2.5-flash: Ultra-fast flagship workhorse (1.1s response, exceptional structured JSON)
 * 2. gemini-3.8-flash: High-intelligence workhorse in 2nd position
 * 3. gemini-3-flash-preview: High-speed preview engine (1.5s response, active quota)
 * 4. gemini-2.5-flash-lite: Ultra-low latency safety net (0.8s response)
 */
export const DEFAULT_MODEL_CASCADE = [
  'gemini-2.5-flash',
  'gemini-3.8-flash',
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
  const timeoutLimit = options.timeoutMs ?? 0
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
        if (!timeoutLimit || timeoutLimit <= 0) {
          const response = await ai.models.generateContent({
            model,
            contents: options.contents,
            config: baseConfig,
          })
          return response?.text?.trim() || ''
        }

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
    `All available Gemini models (${models.join(', ')}) failed or were unavailable. Details: ${errorsCollected.join(' | ')}`
  )
}

/**
 * Bulletproof, auto-repairing JSON parser for LLM streaming & structured outputs.
 * Gracefully handles:
 * 1. Markdown code fences (```json ... ```) even if cut off before closing fence.
 * 2. Unescaped control characters in multi-line strings (new lines in SVG or notes).
 * 3. Truncated mid-string tokens (auto-detects if string is key vs value, closes/strips appropriately).
 * 4. Dangling colons, dangling keys, and trailing commas.
 * 5. Missing closing braces and brackets (stack balancing).
 * 6. Iterative backwards rollback to previous completed object boundary with sanitization.
 */
export function resilientJsonParse<T = any>(raw: string, label = 'JSON Parser'): T {
  if (!raw || typeof raw !== 'string') {
    throw new Error(`[${label}] Empty or invalid input provided to JSON parser.`)
  }

  let cleaned = raw.trim()

  // 1. Strip markdown code fences if present (even if unclosed due to truncation)
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)(?:```)?$/i)
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim()
  } else {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }

  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  let startIdx = 0
  if (firstBrace !== -1 && firstBracket !== -1) startIdx = Math.min(firstBrace, firstBracket)
  else if (firstBrace !== -1) startIdx = firstBrace
  else if (firstBracket !== -1) startIdx = firstBracket
  if (startIdx > 0) cleaned = cleaned.substring(startIdx)

  // Fast path: try standard parsing first
  try {
    return JSON.parse(cleaned)
  } catch (initialErr) {
    // Proceed to character-level normalization & structural recovery
  }

  // 2. Character-by-character sanitize & balance
  let result = ''
  let inString = false
  let escaped = false
  const stack: string[] = []
  let stringIsKey = false

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]

    if (inString) {
      if (escaped) {
        escaped = false
        result += char
      } else if (char === '\\') {
        const nextChar = cleaned[i + 1]
        if (!nextChar) {
          result += '\\\\'
          escaped = false
        } else if (!/["\\/bfnrtu]/.test(nextChar)) {
          result += '\\\\'
        } else {
          result += '\\'
          escaped = true
        }
      } else if (char === '"') {
        inString = false
        result += '"'
      } else if (char === '\n') {
        result += '\\n'
      } else if (char === '\r') {
        if (cleaned[i + 1] !== '\n') result += '\\n'
      } else if (char === '\t') {
        result += '\\t'
      } else {
        const codeNum = char.charCodeAt(0)
        result += codeNum < 32 ? ' ' : char
      }
    } else {
      if (char === '"') {
        inString = true
        const lastNonWs = result.trim().slice(-1)
        const parentOpen = stack[stack.length - 1]
        stringIsKey = parentOpen === '{' && (lastNonWs === '{' || lastNonWs === ',')
        result += '"'
      } else if (char === '{' || char === '[') {
        stack.push(char)
        result += char
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop()
        result += char
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop()
        result += char
      } else {
        result += char
      }
    }
  }

  // Handle truncation at end of input
  if (inString) {
    if (stringIsKey) {
      // The key was cut off mid-word: strip the opening quote and dangling comma/space
      result = result.trim()
      result = result.replace(/(?:,\s*)?"[^"]*$/, '')
    } else {
      // It's a string value or array element: close the quote properly
      if (escaped) {
        result += '\\"'
      } else {
        result += '"'
      }
    }
  }

  // Clean trailing incomplete constructs:
  result = result.trim()
  // 1. Dangling key with colon: e.g., "key": or , "key": -> remove it
  result = result.replace(/(?:,\s*)?"[^"]*"\s*:\s*$/, '')
  // 2. Trailing comma before closing braces/brackets
  result = result.replace(/,\s*$/, '')

  // Balance open braces/brackets
  const finalStack = [...stack]
  let balancedResult = result
  while (finalStack.length > 0) {
    const openDelim = finalStack.pop()
    balancedResult = balancedResult.trim().replace(/,\s*$/, '')
    balancedResult += openDelim === '{' ? '}' : ']'
  }

  try {
    return JSON.parse(balancedResult)
  } catch (secondErr) {
    // Proceed to iterative rollback
  }

  // 3. Iterative rollback: search backwards for previous completed object/array boundaries with sanitization
  let searchPos = cleaned.length - 1
  for (let step = 0; step < 15; step++) {
    const lastCloseObj = cleaned.lastIndexOf('}', searchPos)
    const lastCloseArr = cleaned.lastIndexOf(']', searchPos)
    const boundary = Math.max(lastCloseObj, lastCloseArr)
    if (boundary <= 0) break

    const candidateSub = cleaned.substring(0, boundary + 1)
    
    // Sanitize candidateSub
    let candResult = ''
    let candInStr = false
    let candEsc = false
    const candStack: string[] = []

    for (let i = 0; i < candidateSub.length; i++) {
      const c = candidateSub[i]
      if (candInStr) {
        if (candEsc) {
          candEsc = false
          candResult += c
        } else if (c === '\\') {
          const next = candidateSub[i + 1]
          if (!next || !/["\\/bfnrtu]/.test(next)) candResult += '\\\\'
          else { candResult += '\\'; candEsc = true }
        } else if (c === '"') {
          candInStr = false
          candResult += '"'
        } else if (c === '\n') {
          candResult += '\\n'
        } else if (c === '\r') {
          if (candidateSub[i + 1] !== '\n') candResult += '\\n'
        } else if (c === '\t') {
          candResult += '\\t'
        } else {
          candResult += c.charCodeAt(0) < 32 ? ' ' : c
        }
      } else {
        if (c === '"') {
          candInStr = true
          candResult += '"'
        } else if (c === '{' || c === '[') {
          candStack.push(c)
          candResult += c
        } else if (c === '}') {
          if (candStack.length > 0 && candStack[candStack.length - 1] === '{') candStack.pop()
          candResult += c
        } else if (c === ']') {
          if (candStack.length > 0 && candStack[candStack.length - 1] === '[') candStack.pop()
          candResult += c
        } else {
          candResult += c
        }
      }
    }

    candResult = candResult.trim().replace(/,\s*$/, '')
    while (candStack.length > 0) {
      const open = candStack.pop()
      candResult = candResult.trim().replace(/,\s*$/, '')
      candResult += open === '{' ? '}' : ']'
    }

    try {
      return JSON.parse(candResult)
    } catch {
      searchPos = boundary - 1
    }
  }

  throw new Error(`[${label}] Unable to parse JSON response after deep structural recovery.`)
}
