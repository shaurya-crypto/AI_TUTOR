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

// 1. Verify GeminiLiveClient strips leaked render_svg_diagram from voice transcripts
const dummyClient = new GeminiLiveClient('dummy_key', {
  onSetupComplete: () => {},
  onAudioData: () => {},
  onInterrupted: () => {},
  onTurnComplete: () => {},
  onTranscript: () => {},
  onError: () => {},
  onClose: () => {},
})

const testTranscriptWithLeakedSvg = `Now let us examine the ray diagram render_svg_diagram(title="Refraction at Glass Slab", svg="<svg viewBox='0 0 400 200'><path d='M0,0 L10,10'/></svg>", caption="Incident and refracted rays") and see how light bends toward the normal.`
const strippedText = (dummyClient as any).extractAndExecuteEmbeddedToolCalls(testTranscriptWithLeakedSvg)

assert(
  'Leaked render_svg_diagram call stripped cleanly from transcript',
  !strippedText.includes('render_svg_diagram') && !strippedText.includes('<svg') && strippedText.includes('Now let us examine the ray diagram and see how light bends toward the normal.'),
  { got: strippedText }
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

// 3. Verify zero references to deleted diagram functions in codebase
const deadDiagrams = [
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
]

const filesToCheck = [
  '../components/whiteboard/GreenChalkboard.tsx',
  '../components/whiteboard/WhiteboardWorkspace.tsx',
  '../app/dashboard/[id]/class/[moduleId]/page.tsx',
  '../services/geminiWebSocket.ts',
]

for (const f of filesToCheck) {
  const filePath = path.join(__dirname, f)
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    for (const dead of deadDiagrams) {
      assert(
        `No dead reference to ${dead} in ${f}`,
        !content.includes(dead),
        { file: f, dead }
      )
    }
  }
}

// 4. Verify GreenChalkboardRef exports drawSvgDiagram and setChalkColor
const chalkboardSource = fs.readFileSync(path.join(__dirname, '../components/whiteboard/GreenChalkboard.tsx'), 'utf-8')
assert(
  'GreenChalkboard.tsx implements drawSvgDiagram',
  chalkboardSource.includes('drawSvgDiagram')
)
assert(
  'GreenChalkboard.tsx handles SVG in directives',
  chalkboardSource.includes('tagType === \'SVG\'')
)

// 5. Verify WhiteboardWorkspace dispatches render_svg_diagram and set_color
const workspaceSource = fs.readFileSync(path.join(__dirname, '../components/whiteboard/WhiteboardWorkspace.tsx'), 'utf-8')
assert(
  'WhiteboardWorkspace.tsx handles set_color',
  workspaceSource.includes('set_color')
)
assert(
  'WhiteboardWorkspace.tsx handles render_svg_diagram',
  workspaceSource.includes('render_svg_diagram')
)

console.log(`\nOVERALL: ${passed} PASSED, ${failed} FAILED`)
if (failed > 0) {
  process.exit(1)
}
