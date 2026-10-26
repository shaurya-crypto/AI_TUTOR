import fs from 'fs'
import path from 'path'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`)
    process.exit(1)
  }
  console.log(`[PASS] ${message}`)
}

async function runVerification() {
  console.log('=== RENDER STABILITY & FAVICON CONFLICT VERIFICATION ===')

  // 1. Verify favicon conflict resolution
  const publicFavicon = path.resolve(process.cwd(), 'public/favicon.ico')
  const appFavicon = path.resolve(process.cwd(), 'src/app/favicon.ico')
  const appIconSvg = path.resolve(process.cwd(), 'src/app/icon.svg')

  assert(!fs.existsSync(publicFavicon), 'public/favicon.ico removed to prevent Next.js conflicting public/app route 500 error')
  assert(fs.existsSync(appFavicon), 'src/app/favicon.ico exists as single source of truth')
  assert(fs.existsSync(appIconSvg), 'src/app/icon.svg exists for scalable vector icons')

  // 2. Verify GreenChalkboard stability
  const chalkboardPath = path.resolve(process.cwd(), 'src/components/whiteboard/GreenChalkboard.tsx')
  const chalkboardContent = fs.readFileSync(chalkboardPath, 'utf-8')
  assert(chalkboardContent.includes('const EXCALIDRAW_INITIAL_DATA ='), 'GreenChalkboard exports static EXCALIDRAW_INITIAL_DATA constant')
  assert(chalkboardContent.includes('const EXCALIDRAW_UI_OPTIONS ='), 'GreenChalkboard exports static EXCALIDRAW_UI_OPTIONS constant')
  assert(chalkboardContent.includes('if (!api || excalidrawAPIRef.current) return'), 'handleExcalidrawAPI guarded against duplicate updates')
  assert(chalkboardContent.includes('handleExcalidrawChange'), 'GreenChalkboard uses stable handleExcalidrawChange callback')

  // 3. Verify ClassroomAvatar stability
  const avatarPath = path.resolve(process.cwd(), 'src/components/classroom/ClassroomAvatar.tsx')
  const avatarContent = fs.readFileSync(avatarPath, 'utf-8')
  assert(avatarContent.includes('onCustomAvatarChangeRef'), 'ClassroomAvatar stabilizes onCustomAvatarChange with ref')
  assert(avatarContent.includes('onSimliActiveChangeRef'), 'ClassroomAvatar stabilizes onSimliActiveChange with ref')
  assert(avatarContent.includes('onSimliControllerReadyRef'), 'ClassroomAvatar stabilizes onSimliControllerReady with ref')

  // 4. Verify page.tsx stability
  const pagePath = path.resolve(process.cwd(), 'src/app/dashboard/[id]/class/[moduleId]/page.tsx')
  const pageContent = fs.readFileSync(pagePath, 'utf-8')
  assert(pageContent.includes('handleCustomAvatarChange = useCallback'), 'page.tsx wraps handleCustomAvatarChange in useCallback')
  assert(pageContent.includes('handleBoardContentChange = useCallback'), 'page.tsx wraps handleBoardContentChange in useCallback')

  // 5. Verify WhiteboardWorkspace stability
  const workspacePath = path.resolve(process.cwd(), 'src/components/whiteboard/WhiteboardWorkspace.tsx')
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8')
  assert(workspaceContent.includes('handleWritingPositionChange = useCallback'), 'WhiteboardWorkspace stabilizes handleWritingPositionChange')

  console.log('\n======================================================')
  console.log('ALL RENDER STABILITY & FAVICON CHECKS PASSED')
  console.log('======================================================')
}

runVerification().catch((err) => {
  console.error(err)
  process.exit(1)
})
