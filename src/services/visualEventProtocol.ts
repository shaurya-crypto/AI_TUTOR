import { z } from 'zod'
import {
  VisualEvent,
  VisualEventActionType,
  VisualEventResponse,
} from '@/types/lessonManifest'

export const VisualEventSchema = z.object({
  id: z.string(),
  action: z.enum([
    'SHOW_MEDIA',
    'SHOW_SCENE',
    'UPDATE_GRAPH',
    'REVEAL_DIAGRAM_STEP',
    'HIGHLIGHT_BOARD',
    'PLAY_ANIMATION',
    'PAUSE_MEDIA',
    'ASK_CHECK',
    'SAVE_LESSON_POSITION',
    'UPDATE_SCENE',
    'CLOSE_SCENE',
  ]),
  timestamp: z.number(),
  stepIndex: z.number().optional(),
  parameters: z.record(z.any()),
})

export type VisualEventListener = (event: VisualEvent) => Promise<VisualEventResponse> | void

export class VisualEventQueue {
  private static instance: VisualEventQueue
  private listeners: Set<VisualEventListener> = new Set()
  private eventHistory: VisualEvent[] = []
  private preloadedAssets: Set<string> = new Set()

  public static getInstance(): VisualEventQueue {
    if (!VisualEventQueue.instance) {
      VisualEventQueue.instance = new VisualEventQueue()
    }
    return VisualEventQueue.instance
  }

  public subscribe(listener: VisualEventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Non-blocking visual event dispatch.
   * Dispatches asynchronously to all listeners without blocking Gemini Live audio turn.
   */
  public async dispatchEvent(
    action: VisualEventActionType,
    parameters: Record<string, any> = {},
    stepIndex?: number
  ): Promise<VisualEventResponse> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const event: VisualEvent = {
      id: eventId,
      action,
      timestamp: Date.now(),
      stepIndex,
      parameters,
    }

    try {
      VisualEventSchema.parse(event)
    } catch (valErr) {
      console.warn('[VisualEventQueue] Invalid event payload:', valErr)
      return { eventId, status: 'failed', message: 'Schema validation error' }
    }

    this.eventHistory.push(event)
    if (this.eventHistory.length > 50) {
      this.eventHistory.shift()
    }

    // Execute listeners asynchronously without awaiting in caller's critical audio path
    setTimeout(() => {
      this.listeners.forEach((listener) => {
        try {
          listener(event)
        } catch (err) {
          console.error('[VisualEventQueue] Error in event listener:', err)
        }
      })
    }, 0)

    return { eventId, status: 'acknowledged' }
  }

  /**
   * Preload media asset in background without blocking audio thread
   */
  public preloadAsset(url: string, type: 'image' | 'video'): void {
    if (!url || this.preloadedAssets.has(url)) return
    this.preloadedAssets.add(url)

    if (typeof window === 'undefined') return

    if (type === 'image') {
      const img = new Image()
      img.src = url
    }
  }

  public getRecentHistory(): VisualEvent[] {
    return [...this.eventHistory]
  }

  public clear(): void {
    this.eventHistory = []
    this.listeners.clear()
  }
}

/**
 * Parses inline bracket directives from Gemini Live spoken transcript
 * into structured visual events as a parallel channel.
 */
export function parseVisualEventFromDirective(
  directive: string,
  transcriptId?: string
): VisualEvent | null {
  if (!directive) return null

  // 1. Pattern: [VISUAL_ACTION: ACTION_NAME | param1=val1, param2=val2]
  const match = directive.match(
    /\[(?:VISUAL_ACTION|MEDIA|STAGE_ACTION):\s*([A-Z_]+)(?:\s*\|\s*([^\]]+))?\]/i
  )
  if (match) {
    const actionRaw = match[1].toUpperCase() as VisualEventActionType
    const rawParams = match[2] || ''

    const params: Record<string, any> = {}
    if (rawParams) {
      rawParams.split(',').forEach((pair) => {
        const [k, v] = pair.split('=').map((s) => s.trim())
        if (k && v !== undefined) {
          const num = parseFloat(v)
          params[k] = isNaN(num) ? (v === 'true' ? true : v === 'false' ? false : v) : num
        }
      })
    }

    return {
      id: `${transcriptId || 'dir'}_${Date.now()}`,
      action: actionRaw,
      timestamp: Date.now(),
      parameters: params,
    }
  }

  // 2. Pattern: [LESSON_STEP: 3] -> SHOW_MEDIA at stepIndex: 2
  const stepMatch = directive.match(/\[LESSON_STEP:\s*(\d+)\]/i)
  if (stepMatch) {
    const stepNum = parseInt(stepMatch[1], 10)
    return {
      id: `${transcriptId || 'step'}_${Date.now()}`,
      action: 'SHOW_MEDIA',
      timestamp: Date.now(),
      stepIndex: Math.max(0, stepNum - 1),
      parameters: { stepIndex: Math.max(0, stepNum - 1) },
    }
  }

  // 3. Pattern: Direct visual action tags: [SHOW_SCENE: ...], [SCENE: ...], [UPDATE_SCENE: ...], [CLOSE_SCENE], [UPDATE_GRAPH: ...], etc.
  const directMatch = directive.match(
    /\[(SHOW_MEDIA|SHOW_SCENE|SCENE|UPDATE_SCENE|CLOSE_SCENE|UPDATE_GRAPH|REVEAL_DIAGRAM_STEP|HIGHLIGHT_BOARD|PLAY_ANIMATION|PAUSE_MEDIA|ASK_CHECK|SAVE_LESSON_POSITION)(?::\s*([^\]]*))?\]/i
  )
  if (directMatch) {
    let action = directMatch[1].toUpperCase() as VisualEventActionType
    if ((action as any) === 'SCENE') action = 'SHOW_SCENE'
    const rawVal = (directMatch[2] || '').trim()
    const params: Record<string, any> = {}

    if (rawVal) {
      if (rawVal.includes('=')) {
        rawVal.split(',').forEach((pair) => {
          const [k, v] = pair.split('=').map((s) => s.trim())
          if (k && v !== undefined) {
            const num = parseFloat(v)
            params[k] = isNaN(num) ? (v === 'true' ? true : v === 'false' ? false : v) : num
          }
        })
      } else {
        // Direct value like [SHOW_SCENE: circuits] or [REVEAL_DIAGRAM_STEP: 2]
        const num = parseFloat(rawVal)
        if (!isNaN(num)) {
          params.step = num
          params.stepIndex = num
        } else {
          params.value = rawVal
          params.sceneType = rawVal
        }
      }
    }

    return {
      id: `${transcriptId || 'direct'}_${Date.now()}`,
      action,
      timestamp: Date.now(),
      parameters: params,
    }
  }

  return null
}
