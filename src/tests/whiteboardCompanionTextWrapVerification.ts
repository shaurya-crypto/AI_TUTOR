import fs from 'fs'
import path from 'path'
import { wrapText } from '../components/whiteboard/textWrapper'

async function runVerification() {
  console.log('=== WHITEBOARD COMPANION, TEXT WRAP & BARRIER VERIFICATION ===')
  let passed = 0
  let failed = 0

  function assert(name: string, condition: boolean, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${name}`)
      passed++
    } else {
      console.error(`[FAIL] ${name}`, detail || '')
      failed++
    }
  }

  // -------------------------------------------------------------
  // SUITE 1: Text Wrapping & Hyphenation
  // -------------------------------------------------------------
  console.log('\n--- SUITE 1: Text Wrapping & Hyphenation ---')

  // Empty / null inputs
  assert('wrapText("") returns []', JSON.stringify(wrapText('')) === JSON.stringify([]))
  assert('wrapText("   ") returns []', JSON.stringify(wrapText('   ')) === JSON.stringify([]))
  assert('wrapText of undefined returns []', wrapText(undefined as any).length === 0)

  // Short single line within limit
  const shortText = 'Calculate the acceleration of the body.'
  const shortWrapped = wrapText(shortText, 68)
  assert('Short text stays on 1 line', shortWrapped.length === 1 && shortWrapped[0] === shortText)

  // Long multiline text wrapping
  const longSentence = 'A constant force acts on an object of mass 5 kg for a duration of 2 seconds. It increases the object velocity from 3 m/s to 7 m/s. Find the magnitude of the applied force.'
  const longWrapped = wrapText(longSentence, 60)
  assert('Long text wraps across multiple lines', longWrapped.length >= 3)
  for (const line of longWrapped) {
    assert(`Line length <= 60 chars: "${line.slice(0, 30)}..." (${line.length})`, line.length <= 60)
  }

  // Oversized token hyphenation
  const oversizedToken = 'DeoxyribonucleicAcidStructureDeterminationAndPolynucleotideChainFormation'
  const oversizedWrapped = wrapText(oversizedToken, 30)
  assert('Oversized token splits into hyphenated chunks', oversizedWrapped.length >= 3)
  assert('First chunk ends with hyphen', oversizedWrapped[0].endsWith('-'))
  for (const chunk of oversizedWrapped) {
    assert(`Chunk length <= 30 chars: "${chunk}" (${chunk.length})`, chunk.length <= 30)
  }

  // Preserving paragraph breaks
  const paragraphText = 'First paragraph notes.\n\nSecond paragraph notes.'
  const paraWrapped = wrapText(paragraphText, 68)
  assert('Paragraph break has empty string delimiter', paraWrapped.includes(''))
  assert('First paragraph contained', paraWrapped[0] === 'First paragraph notes.')

  // -------------------------------------------------------------
  // SUITE 2: Checkpoint Question Page Flip Barrier Simulation
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Checkpoint Question Page Barrier State Machine ---')

  class PageBarrierState {
    isAwaitingStudentAnswer = false
    completedConcepts: string[] = []
    currentPageIndex = 0

    onQuestionReceived() {
      this.isAwaitingStudentAnswer = true
    }

    onConceptDone(concept: string): boolean {
      if (this.isAwaitingStudentAnswer) {
        return false // Blocked
      }
      if (!this.completedConcepts.includes(concept)) {
        this.completedConcepts.push(concept)
      }
      return true
    }

    onConceptFocus(targetIdx: number): boolean {
      if (this.isAwaitingStudentAnswer) {
        return false // Blocked
      }
      this.currentPageIndex = targetIdx
      return true
    }

    onVerdictReceived() {
      this.isAwaitingStudentAnswer = false
    }
  }

  const barrier = new PageBarrierState()
  assert('Initial page index is 0', barrier.currentPageIndex === 0)
  assert('Initially not awaiting answer', barrier.isAwaitingStudentAnswer === false)

  // Question asked by tutor
  barrier.onQuestionReceived()
  assert('Awaiting answer is true after question', barrier.isAwaitingStudentAnswer === true)

  // Tutor attempts premature concept_done while awaiting answer -> must be blocked
  const doneResult = barrier.onConceptDone('Ohm\'s Law')
  assert('Premature concept_done blocked: returned false', doneResult === false)
  assert('Completed concepts is still empty', barrier.completedConcepts.length === 0)

  // Tutor attempts premature concept_focus -> must be blocked
  const focusResult = barrier.onConceptFocus(1)
  assert('Premature concept_focus blocked: returned false', focusResult === false)
  assert('Page flip blocked: page index is still 0', barrier.currentPageIndex === 0)

  // Student answers and tutor delivers verdict
  barrier.onVerdictReceived()
  assert('Awaiting answer is false after verdict', barrier.isAwaitingStudentAnswer === false)

  // Now legitimate concept_done succeeds
  const postVerdictDone = barrier.onConceptDone('Ohm\'s Law')
  assert('Post-verdict concept_done succeeded', postVerdictDone === true)
  assert('Completed concepts contains "Ohm\'s Law"', barrier.completedConcepts.includes('Ohm\'s Law'))

  // Now legitimate concept_focus advances page to 1
  const postVerdictFocus = barrier.onConceptFocus(1)
  assert('Post-verdict concept_focus succeeded', postVerdictFocus === true)
  assert('Page index advanced to 1', barrier.currentPageIndex === 1)

  // -------------------------------------------------------------
  // SUITE 3: Student Answer Deduplication Logic Simulation
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Student Answer Deduplication Verification ---')

  function shouldDrawStudentAnswer(
    newAnswer: string,
    lastDrawn: { text: string; time: number } | null
  ): boolean {
    if (!newAnswer?.trim()) return false
    const clean = newAnswer.trim()
    const cleanLower = clean.toLowerCase().replace(/^(?:student(?:'s)?\s*answer:?\s*)+/i, '').trim()
    if (lastDrawn) {
      const prevLower = lastDrawn.text.toLowerCase().replace(/^(?:student(?:'s)?\s*answer:?\s*)+/i, '').trim()
      const isRecent = Date.now() - lastDrawn.time < 30000
      if (isRecent && (cleanLower === prevLower || cleanLower.includes(prevLower) || prevLower.includes(cleanLower))) {
        return false // Skip duplicate
      }
    }
    return true
  }

  const initialDraw = shouldDrawStudentAnswer('V = I * R', null)
  assert('Initial student answer is drawn', initialDraw === true)

  const recentRecord = { text: 'V = I * R', time: Date.now() }
  const duplicateExact = shouldDrawStudentAnswer('V = I * R', recentRecord)
  assert('Exact duplicate within 30s is skipped', duplicateExact === false)

  const duplicatePrefixed = shouldDrawStudentAnswer("Student's Answer: V = I * R", recentRecord)
  assert('Prefixed duplicate from tutor is skipped', duplicatePrefixed === false)

  const distinctAnswer = shouldDrawStudentAnswer('P = V * I', recentRecord)
  assert('Distinct answer is drawn', distinctAnswer === true)

  const expiredRecord = { text: 'V = I * R', time: Date.now() - 35000 }
  const afterTimeout = shouldDrawStudentAnswer('V = I * R', expiredRecord)
  assert('Same answer after 30s timeout is allowed', afterTimeout === true)

  // -------------------------------------------------------------
  // SUITE 4: Zero-Emoji Invariant Verification
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Zero-Emoji Invariant Across All Modified Files ---')

  const filesToCheck = [
    'src/components/whiteboard/GreenChalkboard.tsx',
    'src/components/whiteboard/WhiteboardWorkspace.tsx',
    'src/components/whiteboard/SobiCompanion.tsx',
    'src/components/whiteboard/textWrapper.ts',
    'src/components/mascot/Mascot.tsx',
    'src/app/dashboard/[id]/class/[moduleId]/page.tsx',
    'src/services/geminiWebSocket.ts',
    'src/hooks/useGeminiLive.ts',
  ]

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u

  for (const relPath of filesToCheck) {
    const fullPath = path.resolve(process.cwd(), relPath)
    if (!fs.existsSync(fullPath)) {
      assert(`File exists: ${relPath}`, false)
      continue
    }
    const content = fs.readFileSync(fullPath, 'utf8')
    const match = content.match(emojiRegex)
    assert(
      `Zero emojis in ${relPath}`,
      match === null,
      match ? `Found emoji "${match[0]}" at index ${match.index}` : undefined
    )
  }

  console.log('\n======================================================')
  console.log(`OVERALL: ${passed} PASSED, ${failed} FAILED`)
  console.log('======================================================')
  if (failed > 0) process.exit(1)
}

runVerification()
