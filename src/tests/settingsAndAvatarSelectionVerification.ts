/**
 * Settings Page, Avatar Selection, Child Tabs, and Invariant Verification Suite.
 */

import fs from 'fs'
import path from 'path'

console.log('=== SETTINGS & AVATAR SELECTION VERIFICATION ===')

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
  // 1. Verify Settings Page Route
  const pagePath = path.resolve(__dirname, '../app/dashboard/[id]/settings/page.tsx')
  assert(fs.existsSync(pagePath), 'src/app/dashboard/[id]/settings/page.tsx exists')
  const pageSource = fs.readFileSync(pagePath, 'utf8')
  assert(pageSource.includes('SettingsView'), 'Settings page imports and renders SettingsView')
  assert(pageSource.includes('createClient'), 'Settings page authenticates user with Supabase server client')
  assert(pageSource.includes('redirect(\'/login\')'), 'Settings page protects route with login redirect')

  // 2. Verify SettingsView Component & Child Tabs
  const viewPath = path.resolve(__dirname, '../components/settings/SettingsView.tsx')
  assert(fs.existsSync(viewPath), 'src/components/settings/SettingsView.tsx exists')
  const viewSource = fs.readFileSync(viewPath, 'utf8')

  assert(viewSource.includes("activeTab === 'avatars'"), 'SettingsView implements Avatars & Personas tab')
  assert(viewSource.includes("activeTab === 'account'"), 'SettingsView implements Account & Identity tab')
  assert(viewSource.includes("activeTab === 'general'"), 'SettingsView implements General & Audio tab')
  assert(viewSource.includes("activeTab === 'teaching'"), 'SettingsView implements Teaching Style tab')

  // 3. Verify Prebuilt Avatar ID: 80459b57-2d66-4ca7-8682-59e1c649bc53 as Primary Default
  assert(
    viewSource.includes('80459b57-2d66-4ca7-8682-59e1c649bc53'),
    'SettingsView configures user prebuilt avatar ID 80459b57-2d66-4ca7-8682-59e1c649bc53'
  )
  assert(
    viewSource.includes("badge: 'Primary Default'"),
    'Avatar 80459b57-2d66-4ca7-8682-59e1c649bc53 marked as Primary Default'
  )
  assert(
    viewSource.includes('/avatars/80459b57-2d66-4ca7-8682-59e1c649bc53.jpg'),
    'SettingsView links directly to real Face ID avatar image asset'
  )

  // 4. Verify Server Actions in actions.ts
  const actionsPath = path.resolve(__dirname, '../app/dashboard/actions.ts')
  const actionsSource = fs.readFileSync(actionsPath, 'utf8')
  assert(actionsSource.includes('updateAccountAction'), 'actions.ts exports updateAccountAction')
  assert(actionsSource.includes('updateTeachingStyleAction'), 'actions.ts exports updateTeachingStyleAction')
  assert(actionsSource.includes('updateGeneralSettingsAction'), 'actions.ts exports updateGeneralSettingsAction')
  assert(actionsSource.includes('updatePasswordAction'), 'actions.ts exports updatePasswordAction')
  assert(actionsSource.includes('updateAvatarPreferenceAction'), 'actions.ts exports updateAvatarPreferenceAction')

  // 5. Verify Pedagogical Scope (Classes 6-12 Only, CBSE/ICSE/IB)
  assert(viewSource.includes('class_6') && viewSource.includes('class_12'), 'Settings supports Classes 6 to 12')
  assert(!viewSource.includes('class_5') && !viewSource.includes('class_13'), 'Settings excludes non-school classes')
  assert(viewSource.includes('CBSE') && viewSource.includes('ICSE') && viewSource.includes('IB'), 'Settings supports CBSE, ICSE, and IB boards')

  // 6. Verify Upload Removed & Pure Face ID Selection Enforced
  assert(!viewSource.includes('handlePhotoUpload'), 'SettingsView has purged dead photo upload handlers')
  assert(!viewSource.includes('fileInputRef'), 'SettingsView has purged dead file input ref')
  assert(!viewSource.includes('isProcessingPhoto'), 'SettingsView has purged dead photo processing state')

  // 7. Verify Dashboard & Classroom Navigation Links
  const dashboardPath = path.resolve(__dirname, '../components/dashboard/StitchDashboardView.tsx')
  const dashboardSource = fs.readFileSync(dashboardPath, 'utf8')
  assert(dashboardSource.includes('/dashboard/${user.id}/settings'), 'StitchDashboardView links to settings page')

  const classroomPath = path.resolve(__dirname, '../components/classroom/ClassroomAvatar.tsx')
  const classroomSource = fs.readFileSync(classroomPath, 'utf8')
  assert(classroomSource.includes('/dashboard/${studentId}/settings?tab=avatars'), 'ClassroomAvatar links directly to avatar settings tab')

  // 8. Zero Emoji Invariant
  const filesToCheck = [
    '../app/dashboard/[id]/settings/page.tsx',
    '../components/settings/SettingsView.tsx',
    '../app/dashboard/actions.ts',
    'settingsAndAvatarSelectionVerification.ts',
  ]

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
  for (const file of filesToCheck) {
    const fullPath = path.resolve(__dirname, file)
    const content = fs.readFileSync(fullPath, 'utf8')
    assert(!emojiRegex.test(content), `Zero emojis verified in ${file}`)
  }

  console.log(`\nOVERALL: ${passed} PASSED, ${failed} FAILED`)
  if (failed > 0) process.exit(1)
}

runTests().catch((err) => {
  console.error('Test suite failed:', err)
  process.exit(1)
})
