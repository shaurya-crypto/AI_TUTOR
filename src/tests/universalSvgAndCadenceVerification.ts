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

// 1. Verify Cellulose SVG Generation (Hexagon chair rings, β-1,4-glycosidic bond, O bridges, H-bonds)
const celluloseSvg = createUniversalScientificSvg('Structure of Cellulose')
assert('Cellulose SVG has non-empty markup', celluloseSvg.svg.length > 500)
assert('Cellulose SVG contains beta-1,4-glycosidic bond label', celluloseSvg.svg.includes('β-1,4-Glycosidic Bond') || celluloseSvg.svg.includes('β-1,4 Bond'))
assert('Cellulose SVG contains chair/hexagon rings', celluloseSvg.svg.includes('<polygon') && celluloseSvg.svg.includes('points='))
assert('Cellulose SVG contains oxygen bridge circles', celluloseSvg.svg.includes('>O<') || celluloseSvg.svg.includes('>O</text>'))
assert('Cellulose SVG contains CH2OH groups', celluloseSvg.svg.includes('CH₂OH'))
assert('Cellulose SVG contains hydrogen bond annotation', celluloseSvg.svg.includes('Hydrogen Bonds') || celluloseSvg.svg.includes('Microfibrils'))
assert('Cellulose SVG does NOT have flat colored boxes', !celluloseSvg.svg.includes('Glucose -> Glucose'))

// 2. Verify Optics SVG Generation
const opticsSvg = createUniversalScientificSvg('Refraction of Light')
assert('Optics SVG contains Snell law formulation', opticsSvg.svg.includes('sin(i)') || opticsSvg.svg.includes('sin(r)'))
assert('Optics SVG contains incident and refracted rays', opticsSvg.svg.includes('Incident Ray') && opticsSvg.svg.includes('Refracted Ray'))
assert('Optics SVG contains Normal line', opticsSvg.svg.includes('Normal'))

// 3. Verify Circuits SVG Generation
const circuitSvg = createUniversalScientificSvg('Electric Circuit and Resistance')
assert('Circuits SVG contains Ohm law formula', circuitSvg.svg.includes('V = I · R') || circuitSvg.svg.includes('Ohm'))
assert('Circuits SVG contains Resistor symbol', circuitSvg.svg.includes('Resistor'))
assert('Circuits SVG contains Ammeter', circuitSvg.svg.includes('Ammeter'))

// 4. Verify Free Body Diagram SVG Generation
const forceSvg = createUniversalScientificSvg('Newton Second Law and Forces')
assert('Forces SVG contains free body vectors', forceSvg.svg.includes('Normal Force') && forceSvg.svg.includes('Weight'))
assert('Forces SVG contains net acceleration', forceSvg.svg.includes('a (Net Accel)') || forceSvg.svg.includes('ΣF = m · a'))

// 5. Verify Bohr Model SVG Generation
const bohrSvg = createUniversalScientificSvg('Bohr Model of Atom')
assert('Bohr SVG contains K, L, M shells', bohrSvg.svg.includes('K-Shell') && bohrSvg.svg.includes('L-Shell'))
assert('Bohr SVG contains nucleus (+Ze)', bohrSvg.svg.includes('+Ze'))

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

// 9. Verify Socratic Cadence in page.tsx: Turn 1 (No questions), Turn 2 (Solve question first), Turn 3 (Verdict)
assert(
  'page.tsx enforces TURN 1 intuition & visual without questions',
  pageSource.includes('DO NOT write any exam question') && pageSource.includes('DO NOT write any checkpoint question')
)
assert(
  'page.tsx enforces TURN 2 solving a question first on the whiteboard',
  pageSource.includes('SOLVE A QUESTION FIRST ON THE WHITEBOARD')
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
  'geminiWebSocket.ts bars refusing image generation',
  wsServiceSource.includes('NEVER refuse or say you cannot generate images')
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
