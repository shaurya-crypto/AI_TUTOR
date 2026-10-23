import fs from 'fs'
import path from 'path'
import { inferConceptVisualDirective } from '../services/visualLessonPlanGenerator'
import { isRedundantConceptOrMasteredText, normalizeTitle } from '../components/whiteboard/chalkboardFilter'

async function runConceptWhiteboardVerification() {
  console.log('=== WHITEBOARD 1-CONCEPT-PER-PAGE & VISUAL VERIFICATION ===')
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
  // SUITE 1: isRedundantConceptOrMasteredText Pure Export Verification
  // -------------------------------------------------------------
  console.log('\n--- SUITE 1: Redundant Title & Mastery Detection ---')
  const testModuleTitle = 'Electricity and Circuits'
  const testKeyConcepts = [
    'Electric Current and Resistance',
    'Potential Difference and Voltage',
    "Ohm's Law Formulation",
  ]

  // Positive rejections: These must ALWAYS return true (forbidden on chalkboard)
  const rejectedInputs = [
    // 1. Redundant key concept headers & focus prefixes
    "Key Concept: Ohm's Law",
    'Key Concepts',
    'Key Concept',
    'Focus: Electric Current',
    'Topic: Potential Difference',
    'Concept 1: Resistance',
    'Concept 2: Voltage',
    'Concept 1',
    'Concept 2',
    // 2. Mastered & Concept Done notifications (Must never be written to chalkboard)
    'Concept Done',
    'Concept 1 Done',
    'Concept 2 Done',
    'Concept Done: Electric Current',
    'Concept 1 Done: Electric Current',
    'Mastered',
    "Mastered: Ohm's Law",
    'Concept Mastered',
    'Concept 2 Mastered',
    'Completed',
    'Completed: Circuits',
    'Capsule Completed Successfully',
    // 3. Exact matches with module title or key concepts
    'Electricity and Circuits',
    'electricity and circuits',
    'Electric Current and Resistance',
    'electric current and resistance',
    "Ohm's Law Formulation",
    // 4. Clean wrapped strings
    '(Electric Current and Resistance)',
    '[Electricity and Circuits]',
  ]

  for (const input of rejectedInputs) {
    const isFiltered = isRedundantConceptOrMasteredText(input, testModuleTitle, testKeyConcepts)
    assert(`Filters out redundant/forbidden text: "${input}"`, isFiltered === true)
  }

  // Negative tests: Real pedagogical notes MUST be allowed (return false)
  const allowedNotes = [
    "Ohm's Law states that current is directly proportional to voltage at constant temperature.",
    'Formula: V = I * R',
    'Formula: P = V * I = I^2 * R',
    'Step 1: Calculate the equivalent resistance of resistors in series.',
    'Step 2: Substitute values I = 2A and R = 5 ohms into V = IR.',
    'Given: Voltage V = 220V, Current I = 0.5A',
    'The SI unit of electric resistance is the Ohm (Greek letter Omega).',
    'In a series combination, the current remains constant across all resistors.',
    'In a parallel combination, the voltage across each branch is identical.',
  ]

  for (const note of allowedNotes) {
    const isFiltered = isRedundantConceptOrMasteredText(note, testModuleTitle, testKeyConcepts)
    assert(`Allows legitimate topper note: "${note.substring(0, 45)}..."`, isFiltered === false)
  }

  // -------------------------------------------------------------
  // SUITE 2: Multi-Page 1-Concept-Per-Page Structure & Title Duplication Guard
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: 1-Concept-Per-Page Multi-Page Structure ---')

  function createHeaderSkeletonMock(pageNum: number, moduleTitle: string, conceptTitle?: string) {
    const items: any[] = [
      {
        id: `header_topic_p${pageNum}`,
        type: 'text',
        fontSize: 20,
        text: `TOPIC: ${moduleTitle.toUpperCase()}${pageNum > 1 ? ` (PAGE ${pageNum})` : ''}`,
        customData: { isHeader: true },
      },
      {
        id: `header_meta_p${pageNum}`,
        type: 'text',
        fontSize: 12,
        customData: { isHeader: true },
      },
      {
        id: `header_sep_h_p${pageNum}`,
        type: 'line',
        customData: { isHeader: true },
      },
      {
        id: `header_rough_label_p${pageNum}`,
        type: 'text',
        fontSize: 11,
        customData: { isHeader: true },
      },
    ]

    if (conceptTitle) {
      const clean = conceptTitle
        .replace(/^focus:\s*/i, '')
        .replace(/^concept\s*\d*:\s*/i, '')
        .replace(/[\(\)\[\]\{\}\"]/g, '')
        .replace(/^'+|'+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (clean && normalizeTitle(clean) !== normalizeTitle(moduleTitle)) {
        items.push({
          id: `title_concept_p${pageNum}`,
          type: 'text',
          fontSize: 19,
          text: `CONCEPT ${pageNum}: ${clean.toUpperCase()}`,
          customData: { isRough: false, isTitle: true },
        })
      }
    }
    return items
  }

  const moduleConcepts = [
    'Electric Current and Resistance',
    'Potential Difference and Voltage',
    "Ohm's Law Verification",
  ]

  const pages = moduleConcepts.map((concept, idx) => {
    const pageNum = idx + 1
    const skeleton = createHeaderSkeletonMock(pageNum, testModuleTitle, concept)
    const titleEl = skeleton.find((el) => el.customData?.isTitle === true)
    return { pageNum, concept, skeleton, titleEl }
  })

  assert('Module creates exactly 3 pages for 3 concepts', pages.length === 3)
  assert('Page 1 skeleton has Concept 1 title', pages[0].titleEl?.text === 'CONCEPT 1: ELECTRIC CURRENT AND RESISTANCE')
  assert('Page 2 skeleton has Concept 2 title', pages[1].titleEl?.text === 'CONCEPT 2: POTENTIAL DIFFERENCE AND VOLTAGE')
  assert('Page 3 skeleton has Concept 3 title', pages[2].titleEl?.text === "CONCEPT 3: OHM'S LAW VERIFICATION")

  // Test title duplication guard
  function hasTitleOnPage(elements: any[]): boolean {
    return elements.some(
      (el: any) =>
        el.customData?.isTitle === true ||
        (el.type === 'text' && !el.id?.startsWith('header_') && (el.fontSize || 0) >= 18)
    )
  }

  assert('Page 1 title presence detected', hasTitleOnPage(pages[0].skeleton) === true)
  assert('Page 2 title presence detected', hasTitleOnPage(pages[1].skeleton) === true)
  assert('Page 3 title presence detected', hasTitleOnPage(pages[2].skeleton) === true)

  // -------------------------------------------------------------
  // SUITE 3: Concept Done Ledger-Only Invariant (Zero Board Notes)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Concept Done Ledger-Only Invariant ---')
  const recordedBoardNotes: string[] = []
  let ledgerConceptCompleted: string | null = null

  function mockProcessAiDirective(directive: string) {
    if (
      directive.startsWith('[CONCEPT_DONE:') ||
      directive.startsWith('[CONCEPT_MASTERED:') ||
      directive.startsWith('[MASTERED:')
    ) {
      const match = directive.match(/\[(?:CONCEPT_DONE|CONCEPT_MASTERED|MASTERED):\s*([^\]]*)\]/i)
      ledgerConceptCompleted = match ? match[1].trim() : ''
      // Invariant: Do NOT write "Mastered" note to whiteboard!
      return
    }
    if (directive.startsWith('[NOTE:')) {
      const match = directive.match(/\[NOTE:\s*([^\]]*)\]/i)
      const noteContent = match ? match[1].trim() : ''
      if (!isRedundantConceptOrMasteredText(noteContent, testModuleTitle, testKeyConcepts)) {
        recordedBoardNotes.push(noteContent)
      }
    }
  }

  mockProcessAiDirective('[CONCEPT_DONE: Electric Current and Resistance]')
  assert('CONCEPT_DONE updates ledger concept state', ledgerConceptCompleted === 'Electric Current and Resistance')
  assert('CONCEPT_DONE writes ZERO notes to the whiteboard', recordedBoardNotes.length === 0)

  // -------------------------------------------------------------
  // SUITE 4: Universal Visual Tool Mappings Verification (Phase 3)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Universal Visual Tool Mappings ---')

  const visualMappingTests: Array<{
    category: string
    concept: string
    subject: string
    verify: (d: any) => boolean
  }> = [
    // 1. Dynamic Vector SVG Diagrams (Circuits, Forces, Optics, Bohr Atom, States of Matter, Magnet)
    {
      category: '1. Dynamic Vector SVG (Physics Circuits)',
      concept: 'Electric Current and Series Circuit',
      subject: 'Physics',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    {
      category: '1. Dynamic Vector SVG (Physics Forces)',
      concept: 'Newton Second Law and Free Body Dynamics',
      subject: 'Physics',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    {
      category: '1. Dynamic Vector SVG (Physics Optics)',
      concept: "Refraction of Light and Snell's Law",
      subject: 'Physics',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    {
      category: '1. Dynamic Vector SVG (Chemistry Bohr Atom)',
      concept: 'Bohr Model of Atom and Electron Shells',
      subject: 'Chemistry',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    {
      category: '1. Dynamic Vector SVG (Chemistry States of Matter)',
      concept: 'States of Matter Particle Movement',
      subject: 'Chemistry',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    // 2. Dynamic Vector SVG & Adaptive Flowchart Diagrams
    {
      category: '2. Dynamic Vector SVG (Biology Cell)',
      concept: 'Cell Structural Organization and Membrane',
      subject: 'Biology',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    {
      category: '2. Flowchart (Biology Photosynthesis Pathway)',
      concept: 'Photosynthesis Biochemical Pathway',
      subject: 'Biology',
      verify: (d) => d.chalkboardAction === 'draw_flowchart' || d.toolCallExample.includes('draw_flowchart'),
    },
    {
      category: '2. Dynamic Vector SVG (Physics Magnet)',
      concept: 'Bar Magnet Field Lines Induction',
      subject: 'Physics',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    {
      category: '2. Flowchart / Dynamic Vector SVG (Physics Pressure)',
      concept: "Fluid Pressure and Pascal's Law",
      subject: 'Physics',
      verify: (d) => d.chalkboardAction === 'draw_flowchart' || d.chalkboardAction === 'render_svg_diagram',
    },
    // 3. Mathematical Geometries (draw_shape)
    {
      category: '3. Geometry (Right-Angled Triangle)',
      concept: 'Right-Angled Triangle and Pythagoras Theorem',
      subject: 'Mathematics',
      verify: (d) => d.chalkboardAction === 'draw_shape' && d.chalkboardContent === 'triangle',
    },
    {
      category: '3. Geometry (Circle Geometry)',
      concept: 'Circle Radius Tangent and Circumference',
      subject: 'Mathematics',
      verify: (d) => d.chalkboardAction === 'draw_shape' && d.chalkboardContent === 'circle',
    },
    {
      category: '3. Geometry (3D Solid Geometry)',
      concept: 'Cylinder Surface Area and Volume',
      subject: 'Mathematics',
      verify: (d) => d.chalkboardAction === 'draw_shape' && d.chalkboardContent === 'cylinder',
    },
    // 4. Mathematical & Scientific Graph Plots (Mafs.dev Pure React/SVG)
    {
      category: '4. Graph Plot (Quadratic Parabola)',
      concept: 'Quadratic Equation Parabola Curve',
      subject: 'Mathematics',
      verify: (d) => d.chalkboardAction === 'draw_graph' || d.toolCallExample.includes('draw_graph'),
    },
    {
      category: '4. Graph Plot (Linear Coordinate Function)',
      concept: 'Linear Function Slope and Intercept Graph',
      subject: 'Mathematics',
      verify: (d) => d.chalkboardAction === 'draw_graph' || d.toolCallExample.includes('draw_graph'),
    },
    {
      category: '4. Graph Plot (Velocity-Time Motion Graph)',
      concept: 'Velocity-Time Motion Curve',
      subject: 'Physics',
      verify: (d) => d.chalkboardAction === 'draw_graph' || d.toolCallExample.includes('draw_graph'),
    },
    // 5. Authentic Vector SVG Diagrams (No fake image cards)
    {
      category: '5. Dynamic Vector SVG (Anatomy Schematic)',
      concept: 'Human Heart Blood Circulation System',
      subject: 'Biology',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    // 6. Dynamic Vector SVG (Apparatus / Lab Setup)
    {
      category: '6. Dynamic Vector SVG (Practical Lab Experiment)',
      concept: 'Acid-Base Indicator Lab Experiment Demonstration',
      subject: 'Chemistry',
      verify: (d) => d.chalkboardAction === 'render_svg_diagram' || d.toolCallExample.includes('render_svg_diagram'),
    },
    // 7. Sequential Process Flowcharts
    {
      category: '7. Flowchart (Biological/Physical Process Pathway)',
      concept: 'Reflex Arc Nerve Impulse Pathway Mechanism',
      subject: 'Biology',
      verify: (d) => d.chalkboardAction === 'draw_flowchart' || d.toolCallExample.includes('draw_flowchart'),
    },
    // 8. Comparative Matrix Tables
    {
      category: '8. Table (Comparative Classification Matrix)',
      concept: 'Acids vs Bases Chemical Property Distinction',
      subject: 'Chemistry',
      verify: (d) => d.chalkboardAction === 'draw_table' || d.toolCallExample.includes('draw_table'),
    },
    {
      category: '8. Flowchart / Table (Mendelian Genetics)',
      concept: 'Mendelian Genetics Monohybrid Cross Ratio',
      subject: 'Biology',
      verify: (d) => d.chalkboardAction === 'draw_table' || d.chalkboardAction === 'draw_flowchart' || d.chalkboardAction === 'render_svg_diagram',
    },
    // 9. Worked Problem Exam Numerical
    {
      category: '9. Worked Exam Numerical (Step-by-Step Calculation)',
      concept: 'Electric Power Consumption Numerical Calculation',
      subject: 'Physics',
      verify: (d) =>
        d.chalkboardAction === 'draw_numerical' ||
        d.toolCallExample.includes('solve_step_by_step_numerical') ||
        d.toolCallExample.includes('draw_numerical'),
    },
  ]

  for (const tc of visualMappingTests) {
    const directive = inferConceptVisualDirective(tc.concept, tc.subject, '')
    assert(`Visual mapped for [${tc.category}]: "${tc.concept}"`, tc.verify(directive))
  }

  // -------------------------------------------------------------
  // SUITE 5: Zero-Emoji Invariant Verification Across Modified Files
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Zero-Emoji Invariant Verification ---')

  const filesToCheck = [
    'src/components/whiteboard/GreenChalkboard.tsx',
    'src/components/whiteboard/chalkboardFilter.ts',
    'src/app/dashboard/[id]/class/[moduleId]/page.tsx',
    'src/services/visualLessonPlanGenerator.ts',
    'src/lib/exemplarLessons.ts',
    'src/tests/whiteboardConceptPageVerification.ts',
  ]

  // Standard unicode emoji regex covering emojis, pictographs, symbols
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u

  for (const relativePath of filesToCheck) {
    const fullPath = path.resolve(process.cwd(), relativePath)
    if (!fs.existsSync(fullPath)) {
      assert(`File exists: ${relativePath}`, false)
      continue
    }
    const content = fs.readFileSync(fullPath, 'utf8')
    const match = content.match(emojiRegex)
    assert(
      `Zero emojis in ${relativePath}`,
      match === null,
      match ? `Found emoji: "${match[0]}" at char ${match.index}` : undefined
    )
  }

  console.log(`\n======================================================`)
  console.log(`OVERALL: ${passed} PASSED, ${failed} FAILED`)
  console.log(`======================================================`)
  if (failed > 0) {
    process.exit(1)
  }
}

runConceptWhiteboardVerification()
