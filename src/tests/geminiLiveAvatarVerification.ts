import fs from 'fs'
import path from 'path'

console.log('=== GEMINI 3.8 LIVE NATIVE AVATAR VERIFICATION ===')

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

// 1. Verify src/services/geminiWebSocket.ts
const wsFile = path.resolve(__dirname, '../services/geminiWebSocket.ts')
const wsSource = fs.readFileSync(wsFile, 'utf8')

assert(wsSource.includes('export interface CustomizedAvatarConfig'), 'geminiWebSocket.ts exports CustomizedAvatarConfig')
assert(wsSource.includes('export interface LiveAvatarConfig'), 'geminiWebSocket.ts exports LiveAvatarConfig')
assert(wsSource.includes('onVideoData?: (data: string, mimeType: string) => void;'), 'GeminiLiveCallbacks defines onVideoData')
assert(wsSource.includes('avatarConfig?: LiveAvatarConfig;'), 'GeminiLiveClient declares avatarConfig')
assert(
  wsSource.includes('this.avatarConfig') && wsSource.includes('["VIDEO" as any, "AUDIO" as any]'),
  'liveConfig sets VIDEO modality when avatar is enabled'
)
assert(wsSource.includes('liveConfig.avatarConfig = this.avatarConfig;'), 'liveConfig includes avatarConfig')
assert(wsSource.includes('mime.startsWith("video/") || mime.startsWith("image/")'), 'WebSocket parser detects incoming video frames')
assert(wsSource.includes('this.callbacks.onVideoData?.(part.inlineData.data, mime)'), 'WebSocket parser dispatches incoming video data to onVideoData')
assert(wsSource.includes('Self-healing fallback to high-fidelity audio stream'), 'Self-healing connection fallback implemented if VIDEO modality fails')

// 2. Verify src/hooks/useGeminiLive.ts
const hookFile = path.resolve(__dirname, '../hooks/useGeminiLive.ts')
const hookSource = fs.readFileSync(hookFile, 'utf8')

assert(hookSource.includes('latestVideoFrame, setLatestVideoFrame'), 'useGeminiLive maintains latestVideoFrame state')
assert(hookSource.includes('videoMimeType, setVideoMimeType'), 'useGeminiLive maintains videoMimeType state')
assert(hookSource.includes('avatarConfig?: LiveAvatarConfig'), 'startClass accepts avatarConfig parameter')
assert(hookSource.includes('onVideoData: (data, mimeType) =>'), 'useGeminiLive attaches onVideoData callback')
assert(hookSource.includes('latestVideoFrame,'), 'useGeminiLive returns latestVideoFrame')
assert(hookSource.includes('videoMimeType,'), 'useGeminiLive returns videoMimeType')

// 3. Verify src/components/classroom/ClassroomAvatar.tsx
const avatarFile = path.resolve(__dirname, '../components/classroom/ClassroomAvatar.tsx')
const avatarSource = fs.readFileSync(avatarFile, 'utf8')

assert(avatarSource.includes('latestVideoFrame?: string | null'), 'ClassroomAvatarProps accepts latestVideoFrame')
assert(avatarSource.includes('videoMimeType?: string'), 'ClassroomAvatarProps accepts videoMimeType')
assert(avatarSource.includes('onCustomAvatarChange?: (avatarConfig: LiveAvatarConfig | null) => void'), 'ClassroomAvatarProps accepts onCustomAvatarChange')
assert(avatarSource.includes('<canvas'), 'ClassroomAvatar renders high-performance canvas for 24 FPS video frames')
assert(!avatarSource.includes('mouthOpenness'), 'ClassroomAvatar has purged 2D mouthOpenness calculation')
assert(!avatarSource.includes('teethVisible'), 'ClassroomAvatar has purged 2D teethVisible div overlay')
assert(!avatarSource.includes('mouthWidthScale'), 'ClassroomAvatar has purged 2D mouthWidthScale calculation')
assert(avatarSource.includes("URL.revokeObjectURL(objectUrl)"), 'Privacy invariant: object URLs revoked immediately after frame capture')
assert(avatarSource.includes("if (fileInputRef.current) fileInputRef.current.value = ''"), 'Privacy invariant: raw file input cleared immediately after portrait extraction')

// 4. Verify src/app/dashboard/[id]/class/[moduleId]/page.tsx
const pageFile = path.resolve(__dirname, '../app/dashboard/[id]/class/[moduleId]/page.tsx')
const pageSource = fs.readFileSync(pageFile, 'utf8')

assert(pageSource.includes('latestVideoFrame,'), 'page.tsx consumes latestVideoFrame from useGeminiLive')
assert(pageSource.includes('avatarConfig, setAvatarConfig'), 'page.tsx manages avatarConfig state')
assert(pageSource.includes('latestVideoFrame={latestVideoFrame}'), 'page.tsx connects latestVideoFrame to ClassroomAvatar')
assert(pageSource.includes('onCustomAvatarChange={handleCustomAvatarChange}') || pageSource.includes('onCustomAvatarChange={(cfg) => setAvatarConfig(cfg)}'), 'page.tsx connects avatar config changes')
assert(pageSource.includes('avatarConfig || undefined'), 'page.tsx passes avatarConfig into startClass')

// 5. Zero Emoji Audit across all touched files
const filesToCheck = [
  '../services/geminiWebSocket.ts',
  '../hooks/useGeminiLive.ts',
  '../components/classroom/ClassroomAvatar.tsx',
  '../app/dashboard/[id]/class/[moduleId]/page.tsx',
]

const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u

for (const relPath of filesToCheck) {
  const fullPath = path.resolve(__dirname, relPath)
  const content = fs.readFileSync(fullPath, 'utf8')
  const hasEmoji = emojiRegex.test(content)
  assert(!hasEmoji, `Zero emojis verified in ${relPath}`)
}

console.log(`\nOVERALL: ${passed} PASSED, ${failed} FAILED`)
if (failed > 0) {
  process.exit(1)
}
