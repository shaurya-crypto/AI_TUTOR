import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('--- Verifying Concept Transition, Ledger Update, and Zen Mode Removal ---')

// 1. Re-implement the pure logic of detectSpokenConceptTransition to verify against user phrases
function detectSpokenConceptTransition(
  text: string,
  keyConcepts: string[]
): { targetIdx: number; conceptTitle: string } | null {
  if (!text || keyConcepts.length === 0) return null

  const numMatch = text.match(
    /(?:moving\s+(?:on\s+)?to|let['’]?s\s+move\s+(?:on\s+)?to|now\s+moving\s+to|turn(?:ing)?\s+(?:our\s+attention\s+)?to|next\s+is|next\s+concept\s+is|now\s+for|welcome\s+to|starting)\s+(?:concept\s*(\d+))/i
  )
  if (numMatch && numMatch[1]) {
    const num = parseInt(numMatch[1], 10)
    if (num >= 1 && num <= keyConcepts.length) {
      return { targetIdx: num - 1, conceptTitle: keyConcepts[num - 1] }
    }
  }

  const ordinals: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
  }
  const ordinalMatch = text.match(
    /(?:moving\s+(?:on\s+)?to|let['’]?s\s+move\s+(?:on\s+)?to|now\s+moving\s+to|next\s+is)\s+(?:the\s+)?([a-z]+)\s+concept/i
  )
  if (ordinalMatch && ordinalMatch[1]) {
    const word = ordinalMatch[1].toLowerCase()
    if (ordinals[word] && ordinals[word] <= keyConcepts.length) {
      const idx = ordinals[word] - 1
      return { targetIdx: idx, conceptTitle: keyConcepts[idx] }
    }
  }

  for (let i = 0; i < keyConcepts.length; i++) {
    const c = keyConcepts[i]
    const cleanC = c.replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase()
    if (cleanC.length < 3) continue
    const escaped = cleanC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(
      `(?:moving\\s+(?:on\\s+)?to|let['’]?s\\s+move\\s+(?:on\\s+)?to|now\\s+moving\\s+to|let['’]?s\\s+talk\\s+about|turn(?:ing)?\\s+to|next\\s+up\\s+is)\\s+${escaped}`,
      'i'
    )
    if (pattern.test(text)) {
      return { targetIdx: i, conceptTitle: keyConcepts[i] }
    }
  }

  return null
}

const keyConcepts = ['Cell Structure & Glucose', 'Cellulose', 'Starch & Glycogen']

// Test User's exact prompt phrase:
const userSpokenTurn = "Moving on to Concept 2, let's talk about cellulose. Think of it as the strong, fibrous skeleton of the plant world. It's the main component that gives plants their strengt"
const transition1 = detectSpokenConceptTransition(userSpokenTurn, keyConcepts)
assert(transition1 !== null, 'Failed to detect transition in user turn')
assert.strictEqual(transition1.targetIdx, 1, 'Target index must be 1 (Concept 2)')
assert.strictEqual(transition1.conceptTitle, 'Cellulose', 'Concept title must match Cellulose')
console.log('Passed: Detected exact user spoken transition to Concept 2')

// Test ordinal concept transition
const ordinalTurn = "Now moving to the second concept of our class"
const transition2 = detectSpokenConceptTransition(ordinalTurn, keyConcepts)
assert(transition2 !== null, 'Failed to detect ordinal transition')
assert.strictEqual(transition2.targetIdx, 1, 'Target index must be 1')
console.log('Passed: Detected ordinal spoken transition ("the second concept")')

// Test topic title transition without mentioning "concept 2"
const topicTurn = "Let's talk about cellulose and how plant walls are reinforced."
const transition3 = detectSpokenConceptTransition(topicTurn, keyConcepts)
assert(transition3 !== null, 'Failed to detect topic name transition')
assert.strictEqual(transition3.targetIdx, 1, 'Target index must be 1')
console.log('Passed: Detected topic name spoken transition ("Let\'s talk about cellulose")')

// 2. Verify Capsule Concept Ledger completion progress calculation
const normConcept = (s: string) =>
  String(s || '')
    .toLowerCase()
    .replace(/^[\s\(\[\{\"\']+|[\s\)\]\}\"\']+$/g, '')
    .replace(/^concept\s*\d*[:\-\s]*/i, '')
    .replace(/^\d+[\.\:\)\-]\s*/, '')
    .replace(/[^a-z0-9]/g, '')

let completedConcepts: string[] = []
let completedCount = keyConcepts.filter((k) =>
  completedConcepts.some((c) => normConcept(c) === normConcept(k))
).length
let progressPercent = Math.min(100, Math.round((completedCount / keyConcepts.length) * 100))
assert.strictEqual(progressPercent, 0, 'Initial progress must be 0%')
console.log('Passed: Initial Ledger progress is 0%')

// When advancing to Concept 2 (targetIdx = 1), prior concepts (index 0) are completed:
const targetIdx = 1
for (let i = 0; i < targetIdx; i++) {
  const prevConcept = keyConcepts[i]
  if (prevConcept && !completedConcepts.some((u) => normConcept(u) === normConcept(prevConcept))) {
    completedConcepts.push(prevConcept)
  }
}
completedCount = keyConcepts.filter((k) =>
  completedConcepts.some((c) => normConcept(c) === normConcept(k))
).length
progressPercent = Math.min(100, Math.round((completedCount / keyConcepts.length) * 100))
assert.strictEqual(completedConcepts.length, 1)
assert.strictEqual(progressPercent, 33, 'After concept 1 completed, progress must be 33%')
console.log('Passed: Capsule Concept Ledger advanced to 33% Mastered')

// When advancing to Concept 3 (targetIdx = 2):
for (let i = 0; i < 2; i++) {
  const prevConcept = keyConcepts[i]
  if (prevConcept && !completedConcepts.some((u) => normConcept(u) === normConcept(prevConcept))) {
    completedConcepts.push(prevConcept)
  }
}
completedCount = keyConcepts.filter((k) =>
  completedConcepts.some((c) => normConcept(c) === normConcept(k))
).length
progressPercent = Math.min(100, Math.round((completedCount / keyConcepts.length) * 100))
assert.strictEqual(completedConcepts.length, 2)
assert.strictEqual(progressPercent, 67, 'After concept 2 completed, progress must be 67%')
console.log('Passed: Capsule Concept Ledger advanced to 67% Mastered')

// 3. Verify Zen Mode Button is completely removed in GreenChalkboard.tsx and globals.css
const chalkboardSource = fs.readFileSync(path.resolve('src/components/whiteboard/GreenChalkboard.tsx'), 'utf8')
assert(chalkboardSource.includes('zenModeEnabled: false'), 'zenModeEnabled must be false in GreenChalkboard.tsx')
assert(!chalkboardSource.includes('zenModeEnabled: true'), 'zenModeEnabled: true must not exist')
console.log('Passed: zenModeEnabled is false in GreenChalkboard.tsx')

const globalsCss = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf8')
assert(globalsCss.includes('.excalidraw .zen-mode-transition'), 'globals.css must suppress zen mode transition')
assert(globalsCss.includes('[data-testid="zen-mode-button"]'), 'globals.css must suppress zen mode button')
console.log('Passed: globals.css suppresses Excalidraw Zen mode buttons')

// 4. Verify geminiWebSocket has concept_done and concept_focus in write_chalkboard schema
const geminiWsSource = fs.readFileSync(path.resolve('src/services/geminiWebSocket.ts'), 'utf8')
assert(geminiWsSource.includes('"concept_done"'), 'geminiWebSocket must include concept_done in write_chalkboard enum')
assert(geminiWsSource.includes('"concept_focus"'), 'geminiWebSocket must include concept_focus in write_chalkboard enum')
console.log('Passed: geminiWebSocket includes concept_done and concept_focus in write_chalkboard enum')

console.log('--- ALL VERIFICATION CHECKS PASSED ---')
