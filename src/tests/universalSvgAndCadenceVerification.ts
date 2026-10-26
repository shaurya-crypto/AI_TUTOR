/**
 * Universal Scientific Vector SVG, Whiteboard Deduplication & Socratic Cadence Verification Suite
 */

import { createUniversalScientificSvg } from '../services/universalScientificSvg'
import * as fs from 'fs'
import * as path from 'path'

function assert(description: string, condition: boolean) {
  if (!condition) {
    console.error(`[FAIL] ${description}`)
    process.exit(1)
  }
  console.log(`[PASS] ${description}`)
}

console.log('=== UNIVERSAL SCIENTIFIC SVG & MULTI-TURN CADENCE VERIFICATION ===')

// 1. Verify Clean Generative Vector Frame (Zero Hardcoded Static Topics)
const testSvg = createUniversalScientificSvg('Structure of Plant Cell')
assert('Generated SVG has non-empty markup', testSvg.svg.length > 200)
assert('Generated SVG contains concept title', testSvg.svg.includes('STRUCTURE OF PLANT CELL'))
assert('Generated SVG contains vector definitions', testSvg.svg.includes('<defs>') && testSvg.svg.includes('<svg'))
assert('Generated SVG does NOT have canned static flowcharts', !testSvg.svg.includes('Key Concept -> Fundamental Principle'))


// 6. Verify WhiteboardWorkspace.tsx no longer contains fixed fallback flowchart
const wsSource = fs.readFileSync(path.join(__dirname, '../components/whiteboard/WhiteboardWorkspace.tsx'), 'utf-8')
assert(
  'WhiteboardWorkspace.tsx does NOT contain fixed fallback flowchart',
  !wsSource.includes('Key Concept -> Fundamental Principle -> Board Application')
)

// 7. Verify GreenChalkboard.tsx no longer contains fixed fallback flowchart
const gbSource = fs.readFileSync(path.join(__dirname, '../components/whiteboard/GreenChalkboard.tsx'), 'utf-8')
assert(
  'GreenChalkboard.tsx does NOT contain fixed fallback flowchart',
  !gbSource.includes('Key Concept -> Core Mechanism -> Exam Application')
)
assert(
  'GreenChalkboard.tsx contains shouldSkipDuplicate for deduplicating whiteboard writes',
  gbSource.includes('shouldSkipDuplicate')
)

// 8. Verify page.tsx no longer contains fixed fallback flowchart
const pageSource = fs.readFileSync(path.join(__dirname, '../app/dashboard/[id]/class/[moduleId]/page.tsx'), 'utf-8')
assert(
  'page.tsx does NOT contain fixed fallback flowchart',
  !pageSource.includes('Key Concept -> Fundamental Principle -> Board Application')
)

// 9. Verify Socratic Cadence in page.tsx: Intuition & visual, tutor-solved question, understanding check
assert(
  'page.tsx enforces intuition & generative visual in Phase 1',
  pageSource.includes('PHASE 1 - INTUITION & GENERATIVE VISUAL')
)
assert(
  'page.tsx enforces tutor-solved model question read aloud and explained step-by-step',
  pageSource.includes('TUTOR-SOLVED MODEL QUESTION (READ ALOUD & EXPLAIN STEP-BY-STEP)')
)
assert(
  'page.tsx bars saying unable to generate images',
  pageSource.includes('NEVER tell the student "I am unable to generate images"')
)

// 10. Verify geminiWebSocket.ts
const wsServiceSource = fs.readFileSync(path.join(__dirname, '../services/geminiWebSocket.ts'), 'utf-8')
assert(
  'geminiWebSocket.ts contains lastExecutedToolCalls for tool deduplication',
  wsServiceSource.includes('lastExecutedToolCalls')
)
assert(
  'geminiWebSocket.ts declares render_svg_diagram tool',
  wsServiceSource.includes('render_svg_diagram')
)

// 11. Zero emoji invariant check across modified files
const filesToCheck = [
  '../services/universalScientificSvg.ts',
  '../components/whiteboard/GreenChalkboard.tsx',
  '../components/whiteboard/WhiteboardWorkspace.tsx',
  '../services/visualLessonPlanGenerator.ts',
  '../services/geminiWebSocket.ts',
  '../app/dashboard/[id]/class/[moduleId]/page.tsx',
]

const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u

for (const relPath of filesToCheck) {
  const content = fs.readFileSync(path.join(__dirname, relPath), 'utf-8')
  assert(`Zero emojis in ${relPath}`, !emojiRegex.test(content))
}

console.log('\n======================================================')
console.log('ALL UNIVERSAL SVG, DEDUPLICATION & CADENCE CHECKS PASSED')
console.log('======================================================')
