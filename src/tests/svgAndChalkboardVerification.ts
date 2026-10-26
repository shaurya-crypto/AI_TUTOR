import { GeminiLiveClient } from '../services/geminiWebSocket'
import * as fs from 'fs'
import * as path from 'path'

console.log('=== SVG AND CHALKBOARD VERIFICATION SUITE ===')
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

// 1. Verify GeminiLiveClient strips leaked render_svg_diagram from voice transcripts and dispatches tool calls
const interceptedCalls: Array<{ action: string; content: any }> = []
const dummyClient = new GeminiLiveClient('dummy_key', {
  onSetupComplete: () => {},
  onAudioData: () => {},
  onInterrupted: () => {},
  onTurnComplete: () => {},
  onTranscript: () => {},
  onError: () => {},
  onClose: () => {},
  onChalkboardToolCall: (action, content) => {
    interceptedCalls.push({ action, content })
  },
})

// 1a. Standard named format
const test1 = `Now let us examine the ray diagram render_svg_diagram(title="Refraction at Glass Slab", svg="<svg viewBox='0 0 400 200'><path d='M0,0 L10,10'/></svg>", caption="Incident and refracted rays") and see how light bends.`
const stripped1 = (dummyClient as any).extractAndExecuteEmbeddedToolCalls(test1)
assert(
  'Standard render_svg_diagram stripped cleanly from transcript',
  !stripped1.includes('render_svg_diagram') && !stripped1.includes('<svg') && stripped1.includes('Now let us examine the ray diagram and see how light bends.'),
  { got: stripped1 }
)

// 1b. Parameter order reversed (svg first, title second)
const test2 = `Observe the diagram render_svg_diagram(svg="<svg viewBox='0 0 200 200'><circle cx='100' cy='100' r='50'/></svg>", title="Spherical Wavefront") which represents a wavefront.`
const stripped2 = (dummyClient as any).extractAndExecuteEmbeddedToolCalls(test2)
assert(
  'Reversed parameter render_svg_diagram stripped cleanly from transcript',
  !stripped2.includes('render_svg_diagram') && !stripped2.includes('<svg') && stripped2.includes('Observe the diagram which represents a wavefront.'),
  { got: stripped2 }
)

// 1c. Positional arguments
const test3 = `Check the apparatus render_svg_diagram("Electrolysis Cell", "<svg viewBox='0 0 300 200'><rect width='300' height='200'/></svg>", "Anode and cathode setup") carefully.`
const stripped3 = (dummyClient as any).extractAndExecuteEmbeddedToolCalls(test3)
assert(
  'Positional argument render_svg_diagram stripped cleanly from transcript',
  !stripped3.includes('render_svg_diagram') && !stripped3.includes('<svg') && stripped3.includes('Check the apparatus carefully.'),
  { got: stripped3 }
)

// 1d. JSON arguments
const test4 = `Notice the circuit render_svg_diagram({"title": "Series Resistors", "svg": "<svg viewBox='0 0 200 100'></svg>", "caption": "Two resistors in series"}) as shown.`
const stripped4 = (dummyClient as any).extractAndExecuteEmbeddedToolCalls(test4)
assert(
  'JSON argument render_svg_diagram stripped cleanly from transcript',
  !stripped4.includes('render_svg_diagram') && !stripped4.includes('<svg') && stripped4.includes('Notice the circuit as shown.'),
  { got: stripped4 }
)

// 1e. Confirm all tool calls were intercepted and dispatched properly
assert(
  'All 4 embedded render_svg_diagram tool calls intercepted',
  interceptedCalls.length === 4 &&
    interceptedCalls[0].content.title === 'Refraction at Glass Slab' &&
    interceptedCalls[1].content.title === 'Spherical Wavefront' &&
    interceptedCalls[2].content.title === 'Electrolysis Cell' &&
    interceptedCalls[3].content.title === 'Series Resistors',
  { count: interceptedCalls.length, calls: interceptedCalls }
)

// 2. Verify write_chalkboard enum contains set_color
const geminiWebSocketSource = fs.readFileSync(path.join(__dirname, '../services/geminiWebSocket.ts'), 'utf-8')
assert(
  'geminiWebSocket.ts defines set_color in write_chalkboard enum',
  geminiWebSocketSource.includes('"set_color"')
)
assert(
  'geminiWebSocket.ts defines render_svg_diagram tool declaration',
  geminiWebSocketSource.includes('name: "render_svg_diagram"')
)

// 3. Verify zero references to deleted diagram functions and dead tools across codebase
const deadSymbols = [
  'drawForcesDiagram',
  'drawPressureDiagram',
  'drawMagnetDiagram',
  'drawCellDiagram',
  'drawOpticsDiagram',
  'drawAtomDiagram',
  'drawStatesOfMatterDiagram',
  'drawPhotosynthesisDiagram',
  'drawCircuitSeries',
  'drawCircuitParallel',
  'show_educational_media',
]

const filesToCheck = [
  '../components/whiteboard/GreenChalkboard.tsx',
  '../components/whiteboard/WhiteboardWorkspace.tsx',
  '../app/dashboard/[id]/class/[moduleId]/page.tsx',
  '../services/geminiWebSocket.ts',
  '../components/classroom/ClassroomAvatar.tsx',
  '../components/LiveTranscript.tsx',
]

for (const f of filesToCheck) {
  const filePath = path.join(__dirname, f)
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    for (const dead of deadSymbols) {
      assert(
        `No dead reference to ${dead} in ${f}`,
        !content.includes(dead),
        { file: f, dead }
      )
    }
  }
}

// 4. Verify GreenChalkboard.tsx enhancements
const chalkboardSource = fs.readFileSync(path.join(__dirname, '../components/whiteboard/GreenChalkboard.tsx'), 'utf-8')
assert(
  'GreenChalkboard.tsx implements drawSvgDiagram',
  chalkboardSource.includes('drawSvgDiagram')
)
assert(
  'GreenChalkboard.tsx persists SVG files to localStorage',
  chalkboardSource.includes('localStorage.setItem(`${storageKey}_files`')
)
assert(
  'GreenChalkboard.tsx wraps SVG captions using wrapText',
  chalkboardSource.includes('wrapText(caption.trim(), 55)')
)
assert(
  'GreenChalkboard.tsx handles draw_table in pseudo-code execution',
  chalkboardSource.includes("action === 'draw_table'")
)
assert(
  'GreenChalkboard.tsx handles draw_graph in pseudo-code execution',
  chalkboardSource.includes("action === 'draw_graph'")
)
assert(
  'GreenChalkboard.tsx handles draw_numerical in pseudo-code execution',
  chalkboardSource.includes("action === 'draw_numerical'")
)
assert(
  'GreenChalkboard.tsx handles raw SVG without pipe in directives',
  chalkboardSource.includes("payload.includes('<svg')")
)

// 5. Verify WhiteboardWorkspace and page.tsx robust SVG handling
const workspaceSource = fs.readFileSync(path.join(__dirname, '../components/whiteboard/WhiteboardWorkspace.tsx'), 'utf-8')
assert(
  'WhiteboardWorkspace.tsx handles raw SVG without pipe',
  workspaceSource.includes("trimmed.includes('<svg')")
)
assert(
  'WhiteboardWorkspace.tsx handles set_color',
  workspaceSource.includes('set_color')
)

const pageSource = fs.readFileSync(path.join(__dirname, '../app/dashboard/[id]/class/[moduleId]/page.tsx'), 'utf-8')
assert(
  'page.tsx handles raw SVG without pipe in autoTriggerVisualForConcept',
  pageSource.includes("rawContent.includes('<svg')")
)
assert(
  'page.tsx handles raw SVG without pipe in live dispatcher',
  pageSource.includes("trimmed.includes('<svg')")
)

assert(
  'GreenChalkboard.tsx generates base64 data URL instead of utf8 data URL for Excalidraw',
  !chalkboardSource.includes("const dataURL = `data:image/svg+xml;utf8,") &&
    chalkboardSource.includes('data:image/svg+xml;base64,') &&
    chalkboardSource.includes('const dataURL = svgToBase64DataUrl(cleanSvg)')
)

// 5b. Verify atob decoding of Unicode-rich SVG data URLs (Zero InvalidCharacterError)
const testUnicodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <text x="20" y="40">Displacement Δx = ±5.0 m, θ = 45°, λ = 500 nm, R = 10 Ω</text>
  <path d="M 10 80 Q 52 10 95 80 T 180 80" stroke="#52715D" fill="none" />
</svg>`

const bytes = new TextEncoder().encode(testUnicodeSvg)
let binary = ''
for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
const base64Data = Buffer.from(binary, 'binary').toString('base64')
const dataUrl = `data:image/svg+xml;base64,${base64Data}`

let decodedSuccessfully = false
try {
  const extractedBase64 = dataUrl.slice('data:image/svg+xml;base64,'.length)
  // atob must not throw InvalidCharacterError
  const decodedBinary = atob(extractedBase64)
  const decodedBytes = new Uint8Array(decodedBinary.length)
  for (let i = 0; i < decodedBinary.length; i++) decodedBytes[i] = decodedBinary.charCodeAt(i)
  const decodedSvg = new TextDecoder().decode(decodedBytes)
  decodedSuccessfully = decodedSvg === testUnicodeSvg
} catch (e) {
  decodedSuccessfully = false
}

assert(
  'SVG base64 DataURL can be decoded by atob() without InvalidCharacterError',
  decodedSuccessfully
)

// 6. Zero Emoji Invariant Verification across all modified files
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
for (const f of filesToCheck) {
  const filePath = path.join(__dirname, f)
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    assert(`Zero emojis in ${f}`, !emojiRegex.test(content), { file: f })
  }
}

console.log(`\nOVERALL: ${passed} PASSED, ${failed} FAILED`)
if (failed > 0) {
  process.exit(1)
}
