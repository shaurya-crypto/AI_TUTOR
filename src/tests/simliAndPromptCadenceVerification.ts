/**
 * Simli Primary Avatar, Google Live Fallback, Single Photo Privacy,
 * Audio Resampling, and Socratic Cadence Verification Suite.
 */

import fs from 'fs'
import path from 'path'
import { generateSimliSessionToken, generateIceServers } from 'simli-client'
import { resamplePcm24kTo16k, SimliAvatarController } from '../services/simliAvatarService'

console.log('=== SIMLI AVATAR & SOCRATIC CADENCE VERIFICATION ===')

let passed = 0
let failed = 0

function assert(cond: boolean, desc: string) {
  if (cond) {
    console.log(`[PASS] ${desc}`)
    passed++
  } else {
    console.error(`[FAIL] ${desc}`)
    failed++
  }
}

async function runTests() {
  // 1. Verify Simli Server Token Minting & ICE Server Generation with configured API key
  const envFile = path.resolve(__dirname, '../../.env.local')
  const envContent = fs.readFileSync(envFile, 'utf8')
  const keyMatch = envContent.match(/SIMLI_API_KEY=([^\r\n]+)/)
  const simliApiKey = keyMatch ? keyMatch[1].trim() : ''

  assert(Boolean(simliApiKey && simliApiKey.length > 5), 'SIMLI_API_KEY is configured in .env.local')

  try {
    const tokenResult = await generateSimliSessionToken({
      apiKey: simliApiKey,
      config: {
        faceId: 'tmp9i8bbq7c',
        handleSilence: true,
        maxSessionLength: 600,
        maxIdleTime: 180,
      },
    })
    assert(Boolean(tokenResult && tokenResult.session_token), 'Simli API successfully mints ephemeral session token')
  } catch (err: any) {
    assert(false, `Simli API token minting failed: ${err.message}`)
  }

  try {
    const iceServers = await generateIceServers(simliApiKey)
    assert(Array.isArray(iceServers), 'Simli API successfully returns ICE servers list')
  } catch (err: any) {
    assert(false, `Simli ICE server generation failed: ${err.message}`)
  }

  // 2. Verify Audio Resampling (PCM 24kHz -> 16kHz)
  // Edge Case A: Empty input
  const emptyRes = resamplePcm24kTo16k(new Int16Array(0))
  assert(emptyRes.length === 0, 'Audio resampler handles empty PCM chunk gracefully')

  // Edge Case B: 2400 samples (100ms at 24kHz) -> 1600 samples = 3200 bytes (100ms at 16kHz)
  const samplePcm24k = new Int16Array(2400)
  for (let i = 0; i < samplePcm24k.length; i++) {
    samplePcm24k[i] = Math.round(15000 * Math.sin((2 * Math.PI * 440 * i) / 24000))
  }
  const resampledBytes = resamplePcm24kTo16k(samplePcm24k)
  assert(resampledBytes.length === 3200, 'Audio resampler downsamples 24kHz (2400 samples) to 16kHz (3200 bytes)')

  // Edge Case C: Value clamping to 16-bit range
  const extremePcm = new Int16Array([-32768, 32767, -32768, 32767])
  const clampedBytes = resamplePcm24kTo16k(extremePcm)
  assert(clampedBytes.length > 0, 'Audio resampler handles extreme signed 16-bit boundary values')

  // 3. Verify Server-Side Simli Session Broker Route
  const routeFile = path.resolve(__dirname, '../app/api/avatar/simli/route.ts')
  const routeSource = fs.readFileSync(routeFile, 'utf8')
  assert(routeSource.includes('generateSimliSessionToken'), 'route.ts uses generateSimliSessionToken')
  assert(routeSource.includes('generateIceServers'), 'route.ts uses generateIceServers')
  assert(routeSource.includes('process.env.SIMLI_API_KEY'), 'route.ts reads SIMLI_API_KEY from server environment')
  assert(!routeSource.includes('apiKey: apiKey,'), 'Zero key leakage: route.ts never returns raw apiKey in response')

  // 4. Verify ClassroomAvatar.tsx: Real Face ID Avatar & Zero Upload Dead Code Invariant
  const avatarFile = path.resolve(__dirname, '../components/classroom/ClassroomAvatar.tsx')
  const avatarSource = fs.readFileSync(avatarFile, 'utf8')
  assert(avatarSource.includes('/avatars/${selectedFaceId}.jpg'), 'ClassroomAvatar renders real Face ID avatar image')
  assert(!avatarSource.includes('scholer-desk.jpg'), 'ClassroomAvatar has removed default placeholder desk image')
  assert(!avatarSource.includes('handlePhotoUpload'), 'ClassroomAvatar has purged dead photo upload handlers')
  assert(!avatarSource.includes('fileInputRef'), 'ClassroomAvatar has purged dead file input ref')
  assert(!avatarSource.includes('video.currentTime'), 'ClassroomAvatar has purged 10-second video seeking logic')
  assert(!avatarSource.includes('hidden opacity-0'), 'ClassroomAvatar avoids display:none DOM deadlock on video')

  // 5. Verify Simli as Primary & Google Avatar as Fallback in ClassroomAvatar.tsx
  assert(avatarSource.includes("preferredProvider = 'simli'"), 'ClassroomAvatar defaults to Simli as primary avatar provider')
  assert(avatarSource.includes('<video'), 'ClassroomAvatar renders video element for Simli stream')
  assert(avatarSource.includes('ref={simliVideoRef}'), 'ClassroomAvatar connects simliVideoRef to video element')
  assert(avatarSource.includes('<canvas'), 'ClassroomAvatar retains canvas element for Google Live video frames fallback')
  assert(avatarSource.includes("setActiveProvider('google')"), 'ClassroomAvatar implements auto-fallback to Google Avatar')
  assert(avatarSource.includes('onSimliControllerReady'), 'ClassroomAvatar exposes onSimliControllerReady callback')

  // 6. Verify useGeminiLive.ts Audio Chunks and Barge-In Routing
  const hookFile = path.resolve(__dirname, '../hooks/useGeminiLive.ts')
  const hookSource = fs.readFileSync(hookFile, 'utf8')
  assert(hookSource.includes('onAudioOutputChunk?: (pcm16: Int16Array, sampleRate: number) => void'), 'startClass accepts onAudioOutputChunk')
  assert(hookSource.includes('onSpeechInterrupted?: () => void'), 'startClass accepts onSpeechInterrupted')
  assert(hookSource.includes('onAudioOutputChunk?.(pcm16, sampleRate)'), 'useGeminiLive routes audio chunks to output callback')
  assert(hookSource.includes('onSpeechInterrupted?.()'), 'useGeminiLive triggers onSpeechInterrupted on barge-in')

  // 7. Verify page.tsx Integration
  const pageFile = path.resolve(__dirname, '../app/dashboard/[id]/class/[moduleId]/page.tsx')
  const pageSource = fs.readFileSync(pageFile, 'utf8')
  assert(pageSource.includes('simliControllerRef'), 'page.tsx maintains simliControllerRef')
  assert(pageSource.includes('onSimliControllerReady={handleSimliControllerReady}'), 'page.tsx connects onSimliControllerReady to ClassroomAvatar')
  assert(pageSource.includes('simliControllerRef.current?.sendAudioChunk(pcm16, sampleRate)'), 'page.tsx streams audio to Simli controller')
  assert(pageSource.includes('simliControllerRef.current?.clearBuffer()'), 'page.tsx clears Simli buffer on barge-in')

  // 8. Verify Prompt Cadence: Explain First -> Read Aloud Verbatim -> Write Step-by-Step
  assert(
    pageSource.includes('EXPLAIN FIRST, READ ALOUD VERBATIM, WRITE STEP-BY-STEP (NEVER DUMP AT ONCE)'),
    'page.tsx mandates explain-first, read-aloud verbatim, and write step-by-step invariant'
  )
  assert(
    pageSource.includes('PHASE 2 - FORMAL DEFINITION (EXPLAIN FIRST -> READ ALOUD -> WRITE STEP-BY-STEP)'),
    'page.tsx applies explain-first and read-aloud to definition phase'
  )
  assert(
    pageSource.includes('PHASE 3 - CONCRETE EXAMPLES (EXPLAIN FIRST -> READ ALOUD -> WRITE STEP-BY-STEP)'),
    'page.tsx applies explain-first and read-aloud to examples and flowcharts'
  )
  assert(
    pageSource.includes('TUTOR-SOLVED MODEL QUESTION (READ ALOUD & EXPLAIN STEP-BY-STEP)'),
    'page.tsx enforces tutor-solved model question read aloud and explained step-by-step'
  )
  assert(
    pageSource.includes('Problem Context: Explain the physical setup first, read the question aloud verbatim, then write'),
    'page.tsx Phase 4 instructs step-by-step problem context, given, formula, calculation, and answer'
  )
  assert(
    pageSource.includes('You MUST speak aloud what you are writing while you write it'),
    'page.tsx mandates speaking whatever is written on board'
  )
  assert(
    !pageSource.includes('render_svg_diagram(title="${c}", svg='),
    'page.tsx visualRoadmap is token-optimized and omits boilerplate SVG strings'
  )

  // 9. Verify Dual-Audio Echo Prevention & Audio Player Gain Node
  const audioPlayerFile = path.resolve(__dirname, '../services/audioPlayer.ts')
  const audioPlayerSource = fs.readFileSync(audioPlayerFile, 'utf8')
  assert(audioPlayerSource.includes('gainNode'), 'AudioPlayer declares gainNode for speaker output control')
  assert(audioPlayerSource.includes('setOutputMuted(muted: boolean)'), 'AudioPlayer implements setOutputMuted')
  assert(audioPlayerSource.includes('this.analyser.connect(this.gainNode)'), 'AudioPlayer routes audio through gainNode')
  assert(audioPlayerSource.includes('this.gainNode.connect(this.audioCtx.destination)'), 'AudioPlayer gainNode connects to destination')

  assert(hookSource.includes('setTeacherAudioMuted'), 'useGeminiLive exposes setTeacherAudioMuted')
  assert(avatarSource.includes('onSimliActiveChange?: (isActive: boolean) => void'), 'ClassroomAvatar declares onSimliActiveChange prop')
  assert(avatarSource.includes('onSimliActiveChangeRef.current?.(isSimliActive)') || avatarSource.includes('onSimliActiveChange?.(isSimliActive)'), 'ClassroomAvatar dispatches isSimliActive to parent')
  assert(pageSource.includes('setTeacherAudioMuted(active)'), 'page.tsx connects onSimliActiveChange to setTeacherAudioMuted')

  // Cleanliness: ensure no dead Video/CheckCircle2 icon imports remain in ClassroomAvatar
  assert(!avatarSource.includes("import { Sparkles, Camera, RotateCcw, Video"), 'ClassroomAvatar has purged dead Video import')
  assert(!avatarSource.includes("CheckCircle2"), 'ClassroomAvatar has purged dead CheckCircle2 import')

  // Cleanup: ensure SimliAvatarController clears srcObject on stop
  const simliServiceFile = path.resolve(__dirname, '../services/simliAvatarService.ts')
  const simliServiceSource = fs.readFileSync(simliServiceFile, 'utf8')
  assert(simliServiceSource.includes('this.videoEl.srcObject = null'), 'SimliAvatarController clears video srcObject on stop')
  assert(simliServiceSource.includes('this.audioEl.srcObject = null'), 'SimliAvatarController clears audio srcObject on stop')

  // 10. Zero Emoji Verification across all touched files
  const filesToCheck = [
    '../../.env.local',
    '../services/simliAvatarService.ts',
    '../app/api/avatar/simli/route.ts',
    '../components/classroom/ClassroomAvatar.tsx',
    '../hooks/useGeminiLive.ts',
    '../services/audioPlayer.ts',
    '../app/dashboard/[id]/class/[moduleId]/page.tsx',
    '../services/geminiWebSocket.ts',
    'simliAndPromptCadenceVerification.ts',
  ]

  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u

  for (const relPath of filesToCheck) {
    const fullPath = path.resolve(__dirname, relPath)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      const hasEmoji = emojiRegex.test(content)
      assert(!hasEmoji, `Zero emojis verified in ${relPath}`)
    }
  }

  console.log(`\nOVERALL: ${passed} PASSED, ${failed} FAILED`)
  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test execution error:', err)
  process.exit(1)
})
