'use client'

import { SimliClient, LogLevel } from 'simli-client'

export type SimliStatus = 'idle' | 'connecting' | 'connected' | 'fallback' | 'error'

export interface SimliSessionCredentials {
  sessionToken: string
  iceServers?: RTCIceServer[]
  faceId: string
}

/**
 * Downsamples Int16Array PCM audio from 24kHz to 16kHz (2/3 linear interpolation)
 * and packs into a Uint8Array (PCM 16-bit little-endian) for SimliClient.sendAudioData.
 */
export function resamplePcm24kTo16k(pcm24k: Int16Array): Uint8Array {
  const inLength = pcm24k.length
  if (inLength === 0) return new Uint8Array(0)

  const outLength = Math.floor((inLength * 16) / 24)
  const outBytes = new Uint8Array(outLength * 2)
  const ratio = 24 / 16

  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio
    const indexFloor = Math.floor(srcIndex)
    const fraction = srcIndex - indexFloor
    const s0 = pcm24k[indexFloor]
    const s1 = indexFloor + 1 < inLength ? pcm24k[indexFloor + 1] : s0

    const interpolated = Math.round(s0 + fraction * (s1 - s0))
    const clamped = Math.max(-32768, Math.min(32767, interpolated))

    outBytes[i * 2] = clamped & 0xff
    outBytes[i * 2 + 1] = (clamped >> 8) & 0xff
  }

  return outBytes
}

export class SimliAvatarController {
  private client: SimliClient | null = null
  private status: SimliStatus = 'idle'
  private videoEl: HTMLVideoElement | null = null
  private audioEl: HTMLAudioElement | null = null
  private onStatusChange?: (status: SimliStatus, error?: string) => void
  private audioChunkAccumulator: Uint8Array[] = []
  private accumulatedByteLength: number = 0
  private flushTimer: any = null
  private static readonly TARGET_CHUNK_BYTES = 6000 // ~187.5ms of 16kHz 16-bit mono PCM for smooth lip-sync

  constructor(onStatusChange?: (status: SimliStatus, error?: string) => void) {
    this.onStatusChange = onStatusChange
  }

  public getStatus(): SimliStatus {
    return this.status
  }

  private setStatus(status: SimliStatus, error?: string) {
    this.status = status
    this.onStatusChange?.(status, error)
  }

  /**
   * Initializes and connects the Simli WebRTC avatar stream.
   * On failure, automatically triggers fallback to Google Avatar.
   */
  public async start(options: {
    videoElement: HTMLVideoElement
    audioElement: HTMLAudioElement
    faceId?: string
  }): Promise<boolean> {
    if (this.client) {
      await this.stop()
    }

    this.videoEl = options.videoElement
    this.audioEl = options.audioElement
    this.setStatus('connecting')

    try {
      // 1. Fetch ephemeral session token from secure server broker
      const res = await fetch('/api/avatar/simli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceId: options.faceId }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to broker Simli session`)
      }

      const data = await res.json()
      if (!data.success || !data.sessionToken) {
        throw new Error(data.error || 'Invalid session credentials received from Simli broker')
      }

      // 2. Initialize SimliClient with DOM video and audio elements
      const client = new SimliClient(
        data.sessionToken,
        options.videoElement,
        options.audioElement,
        data.iceServers || null,
        LogLevel.ERROR,
        'livekit',
        'websockets'
      )

      client.on('start', () => {
        console.log('[SimliAvatar] WebRTC stream connected successfully')
        this.setStatus('connected')
      })

      client.on('stop', () => {
        console.warn('[SimliAvatar] Stream stopped, falling back to Google Avatar')
        this.setStatus('fallback', 'Simli stream stopped')
      })

      client.on('error', (detail: string) => {
        console.error('[SimliAvatar] WebRTC connection error, falling back to Google Avatar:', detail)
        this.setStatus('fallback', detail || 'Simli connection error')
      })

      client.on('startup_error', (message: string) => {
        console.error('[SimliAvatar] Simli startup error, falling back to Google Avatar:', message)
        this.setStatus('fallback', message || 'Simli startup error')
      })

      this.client = client
      await client.start()
      return true
    } catch (err: any) {
      console.warn('[SimliAvatar] Start error, falling back to Google Avatar:', err?.message || err)
      this.setStatus('fallback', err?.message)
      return false
    }
  }

  /**
   * Flushes accumulated audio chunks to Simli WebRTC audio track.
   */
  private flushAccumulatedAudio() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (!this.client || this.accumulatedByteLength === 0) {
      this.audioChunkAccumulator = []
      this.accumulatedByteLength = 0
      return
    }

    try {
      const merged = new Uint8Array(this.accumulatedByteLength)
      let offset = 0
      for (const chunk of this.audioChunkAccumulator) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      this.audioChunkAccumulator = []
      this.accumulatedByteLength = 0
      this.client.sendAudioData(merged)
    } catch (e) {
      console.warn('[SimliAvatar] Error flushing audio data:', e)
      this.audioChunkAccumulator = []
      this.accumulatedByteLength = 0
    }
  }

  /**
   * Sends audio chunks to Simli for real-time lip synchronization.
   * Expects 24kHz Int16Array (from Gemini Live) or 16kHz Int16Array,
   * downsamples appropriately to 16kHz PCM bytes, and buffers chunks
   * to eliminate viseme jitter.
   */
  public sendAudioChunk(pcm16: Int16Array, sampleRate: number = 24000) {
    if (!this.client || this.status !== 'connected') return

    try {
      const pcm16Bytes =
        sampleRate === 24000
          ? resamplePcm24kTo16k(pcm16)
          : new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength)

      if (pcm16Bytes.length === 0) return

      this.audioChunkAccumulator.push(pcm16Bytes)
      this.accumulatedByteLength += pcm16Bytes.length

      if (this.accumulatedByteLength >= SimliAvatarController.TARGET_CHUNK_BYTES) {
        this.flushAccumulatedAudio()
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushAccumulatedAudio()
        }, 60)
      }
    } catch (e) {
      console.warn('[SimliAvatar] Error sending audio chunk:', e)
    }
  }

  /**
   * Immediately clears audio buffer on student speech barge-in or interruption.
   */
  public clearBuffer() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.audioChunkAccumulator = []
    this.accumulatedByteLength = 0

    if (!this.client) return
    try {
      this.client.ClearBuffer()
    } catch (e) {
      console.warn('[SimliAvatar] Error clearing buffer:', e)
    }
  }

  /**
   * Safely stops and disconnects Simli WebRTC connection.
   */
  public async stop() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.audioChunkAccumulator = []
    this.accumulatedByteLength = 0

    if (this.client) {
      try {
        await this.client.stop()
      } catch (e) {
        console.warn('[SimliAvatar] Error stopping client:', e)
      }
      this.client = null
    }
    if (this.videoEl) {
      try {
        this.videoEl.srcObject = null
      } catch {}
      this.videoEl = null
    }
    if (this.audioEl) {
      try {
        this.audioEl.srcObject = null
      } catch {}
      this.audioEl = null
    }
    this.setStatus('idle')
  }
}
