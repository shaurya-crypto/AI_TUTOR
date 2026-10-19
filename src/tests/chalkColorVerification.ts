import { resolveChalkColor } from '../components/whiteboard/chalkboardColor'

console.log('=== CHALK COLOR RESOLUTION VERIFICATION ===')

const tests = [
  { input: 'botanical', expected: '#52715D' },
  { input: 'green', expected: '#52715D' },
  { input: 'sage', expected: '#52715D' },
  { input: 'coral', expected: '#C85A43' },
  { input: 'red', expected: '#C85A43' },
  { input: 'orange', expected: '#C85A43' },
  { input: 'blue', expected: '#0284C7' },
  { input: 'sky', expected: '#0284C7' },
  { input: 'cyan', expected: '#0891B2' },
  { input: 'amber', expected: '#D97706' },
  { input: 'yellow', expected: '#D97706' },
  { input: 'gold', expected: '#D97706' },
  { input: 'purple', expected: '#7C3AED' },
  { input: 'violet', expected: '#7C3AED' },
  { input: 'lavender', expected: '#7C3AED' },
  { input: 'rose', expected: '#E11D48' },
  { input: 'emerald', expected: '#059669' },
  { input: 'charcoal', fallback: '#171817', expected: '#171817' },
  { input: 'white', expected: '#171817' },
  { input: 'primary', expected: '#171817' },
  { input: '#123456', expected: '#123456' },
]

let passed = 0
for (const t of tests) {
  const actual = resolveChalkColor(t.input, t.fallback)
  if (actual === t.expected) {
    console.log(`[PASS] resolveChalkColor('${t.input}') === '${t.expected}'`)
    passed++
  } else {
    console.error(`[FAIL] resolveChalkColor('${t.input}') expected '${t.expected}', got '${actual}'`)
    process.exit(1)
  }
}

console.log(`\nALL ${passed} COLOR TESTS PASSED`)
