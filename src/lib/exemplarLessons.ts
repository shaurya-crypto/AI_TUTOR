import { VisualLessonManifest } from '@/types/lessonManifest'

export const OHMS_LAW_COMPLETE_LESSON: VisualLessonManifest = {
  version: '1.0.0',
  moduleId: 'mod_ohms_law_exemplar',
  curriculumId: 'curr_cbse_10_electricity',
  title: "Ohm's Law & Electrical Resistance",
  subject: 'Physics',
  classLevel: 'Class 10',
  board: 'CBSE',
  steps: [
    // 1. TEXT_STEP: Concise teaching explanation & physical intuition
    {
      id: 'step_ohms_1',
      stepNumber: 1,
      title: 'Physical Intuition: Water Pipe Analogy',
      type: 'TEXT_STEP',
      assetStatus: 'ready',
      content: {
        text: {
          explanation:
            'Think of electric current as water flowing through a pipe. Voltage is the water pressure pushing the flow, current is the rate of water passing by per second, and resistance is a narrow constriction in the pipe opposing that flow.',
          keyTakeaway:
            'Current (I) is directly proportional to potential difference (V) and inversely proportional to resistance (R).',
        },
      },
      boardDirective: {
        action: 'draw_title',
        content: "Ohm's Law: Physical Intuition & Governing Laws",
      },
      estimatedSeconds: 60,
      sourceCitation: {
        textbookName: 'NCERT Class 10 Science, Chapter 12',
        pageNumber: 200,
        section: '12.4',
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    },

    // 2. BOARD_STEP: AI-written equations, derivations, and board notes
    {
      id: 'step_ohms_2',
      stepNumber: 2,
      title: 'Mathematical Formulation & SI Units',
      type: 'BOARD_STEP',
      assetStatus: 'ready',
      content: {
        board: {
          title: "Ohm's Law: V = I * R",
          equations: [
            'V directly proportional to I (at constant temperature)',
            'V / I = R (Constant of proportionality: Resistance)',
            'V = I * R  [SI Unit of R: Ohm, symbol Omega]',
            '1 Ohm = 1 Volt / 1 Ampere',
          ],
          derivationSteps: [
            '1. German physicist Georg Simon Ohm determined that current through a conductor between two points is directly proportional to voltage across the two points.',
            '2. Provided temperature and other physical conditions remain strictly invariant.',
            '3. Slope of V versus I characteristic represents the internal resistance R.',
          ],
          highlightBoxes: ['V = I * R'],
          roughWork: 'Example: V = 12 V, I = 3 A -> R = 12 / 3 = 4 Ohm',
        },
      },
      boardDirective: {
        action: 'draw_step',
        content: 'V = I * R (SI Unit: Ohm = Volt / Ampere)',
      },
      estimatedSeconds: 90,
      sourceCitation: {
        textbookName: 'NCERT Class 10 Science',
        pageNumber: 202,
        section: '12.4.1',
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    },

    // 3. IMAGE: Relevant educational textbook schematic with verified provenance
    {
      id: 'step_ohms_3',
      stepNumber: 3,
      title: 'Textbook Circuit Schematic Diagram',
      type: 'IMAGE',
      assetStatus: 'ready',
      content: {
        image: {
          url: '', // Empty primary URL to demonstrate verified graceful fallback
          alt: "Standard Circuit Diagram for Ohm's Law Verification",
          caption: "Figure 12.2: Circuit diagram for studying Ohm's law with ammeter in series and voltmeter in parallel",
          attribution: 'NCERT Class 10 Textbook - Chapter 12 Electricity - Official Pedagogical Figure',
          provenance: 'textbook',
        },
      },
      boardDirective: {
        action: 'draw_note',
        content: 'Circuit Rule: Ammeter in series; Voltmeter in parallel across resistor',
      },
      estimatedSeconds: 75,
      sourceCitation: {
        textbookName: 'NCERT Class 10 Science',
        pageNumber: 201,
        section: 'Figure 12.2',
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    },

    // 4. GRAPH: Real graph generated from mathematical data with progressive revelation
    {
      id: 'step_ohms_4',
      stepNumber: 4,
      title: 'V-I Characteristic Graph & Slope',
      type: 'GRAPH',
      assetStatus: 'ready',
      content: {
        graph: {
          title: 'V-I Characteristic (Slope = Resistance R)',
          graphType: 'function',
          expression: 'V = R * I (y = m * x)',
          domain: [0, 8],
          range: [0, 24],
          xLabel: 'Current I (Amperes)',
          yLabel: 'Potential Difference V (Volts)',
          variables: [
            { name: 'm', label: 'Resistance R', min: 1, max: 6, current: 3, step: 0.5, unit: 'Ohm' },
            { name: 'c', label: 'Baseline V0', min: 0, max: 2, current: 0, step: 0.5, unit: 'V' },
          ],
          dataPoints: [
            { x: 0, y: 0, label: '(0A, 0V)' },
            { x: 2, y: 6, label: '(2A, 6V)' },
            { x: 4, y: 12, label: '(4A, 12V)' },
            { x: 6, y: 18, label: '(6A, 18V)' },
          ],
          progressiveSteps: [
            { stepIndex: 0, action: 'axes', description: 'Plot coordinate axes: Current I on horizontal, Voltage V on vertical' },
            { stepIndex: 1, action: 'points', description: 'Mark experimental data points recorded from ammeter and voltmeter' },
            { stepIndex: 2, action: 'line', description: 'Draw the best-fit linear characteristic passing through origin (0,0)' },
            { stepIndex: 3, action: 'intercept', description: 'Verify zero intercept confirming purely ohmic behavior' },
            { stepIndex: 4, action: 'slope_triangle', description: 'Calculate slope: Delta V / Delta I = 6V / 2A = 3 Ohm' },
          ],
        },
      },
      boardDirective: {
        action: 'draw_highlight_box',
        content: 'Slope of V-I graph = Delta V / Delta I = Resistance R',
      },
      estimatedSeconds: 120,
      sourceCitation: {
        textbookName: 'NCERT Class 10 Science',
        pageNumber: 203,
        section: 'Graph 12.3',
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    },

    // 5. DIAGRAM: Reusable, labeled 2D diagram with progressive revelation
    {
      id: 'step_ohms_5',
      stepNumber: 5,
      title: 'Laboratory Circuit Layout with Meters',
      type: 'DIAGRAM',
      assetStatus: 'ready',
      content: {
        diagram: {
          diagramType: 'electric_circuit',
          title: "Ohm's Law Laboratory Setup",
          labels: [
            { id: 'lbl_bat', text: 'DC Battery Source (12V)', x: 50, y: 15, revealStep: 0 },
            { id: 'lbl_r1', text: 'Resistor R1 (4 Ohm)', x: 30, y: 85, revealStep: 1 },
            { id: 'lbl_r2', text: 'Resistor R2 (2 Ohm)', x: 70, y: 85, revealStep: 2 },
            { id: 'lbl_amm', text: 'Ammeter (Series, I = 2A)', x: 15, y: 50, revealStep: 0 },
          ],
          progressiveSteps: [
            { step: 0, title: 'Power Source & Ammeter', activeLabelIds: ['lbl_bat', 'lbl_amm'], description: 'Battery supplies potential difference; ammeter measures total circuit current in series' },
            { step: 1, title: 'Primary Resistor R1', activeLabelIds: ['lbl_r1'], description: 'Potential drop across R1 = I * R1 = 2A * 4 Ohm = 8V' },
            { step: 2, title: 'Secondary Resistor R2', activeLabelIds: ['lbl_r2'], description: 'Potential drop across R2 = I * R2 = 2A * 2 Ohm = 4V (Total = 12V)' },
          ],
        },
      },
      boardDirective: {
        action: 'draw_note',
        content: 'In Series: Total R_eq = R1 + R2 = 4 + 2 = 6 Ohm; I = V / R_eq = 12 / 6 = 2A',
      },
      estimatedSeconds: 100,
    },

    // 6. SCENE_3D: Interactive Three.js WebGL simulation
    {
      id: 'step_ohms_6',
      stepNumber: 6,
      title: 'Interactive 3D Circuit Simulation',
      type: 'SCENE_3D',
      assetStatus: 'ready',
      content: {
        scene3D: {
          sceneType: 'geometry_3d',
          title: '3D Conductor Geometry: R = rho * (L / A)',
          initialParams: {
            shape: 'cylinder',
            dimension1: 5,
            dimension2: 2,
          },
        },
      },
      boardDirective: {
        action: 'draw_step',
        content: 'Resistance depends on geometry: R = rho * (L / A). Double length -> double resistance.',
      },
      estimatedSeconds: 150,
    },

    // 7. VIDEO: Licensed educational video or verified local procedural animation fallback
    {
      id: 'step_ohms_7',
      stepNumber: 7,
      title: 'Laboratory Verification Video Demonstration',
      type: 'VIDEO',
      assetStatus: 'ready',
      content: {
        video: {
          url: 'https://authorized-educational-cdn.org/videos/ohms_law_experiment.mp4',
          title: "Laboratory Verification of Ohm's Law",
          provider: 'fallback_animation',
          durationSeconds: 10,
          fallbackAnimationType: 'circuit_flow',
          attribution: 'Educational Video Demonstrations - Certified Open Learning Resource',
        },
      },
      boardDirective: {
        action: 'draw_note',
        content: 'Experimental Circuit: Rheostat varies current while voltmeter records potential drop',
      },
      estimatedSeconds: 90,
      sourceCitation: {
        textbookName: 'NCERT Class 10 Science',
        pageNumber: 204,
        section: 'Activity 12.1',
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    },

    // 8. ANIMATION: Timed 2D procedural educational animation
    {
      id: 'step_ohms_8',
      stepNumber: 8,
      title: 'Procedural Electron Drift Animation',
      type: 'ANIMATION',
      assetStatus: 'ready',
      content: {
        animation: {
          animationType: 'circuit_flow',
          durationSeconds: 8,
          parameters: {
            currentAmps: 2,
            resistorOhms: 6,
          },
        },
      },
      boardDirective: {
        action: 'draw_note',
        content: 'Charge Drift: Electrons drift against the electric field at drift speed v_d',
      },
      estimatedSeconds: 80,
    },

    // 9. QUICK_CHECK: Question to verify understanding with immediate feedback
    {
      id: 'step_ohms_9',
      stepNumber: 9,
      title: 'Checkpoint: Board Numerical Question',
      type: 'QUICK_CHECK',
      assetStatus: 'ready',
      content: {
        quickCheck: {
          question:
            'A potential difference of 24 V is applied across a conductor, causing a current of 4 A to flow through it. What is the electrical resistance of the conductor, and what happens to the current if the voltage is doubled?',
          options: [
            { id: 'opt_1', text: 'Resistance is 6 Ohm; current doubles to 8 A' },
            { id: 'opt_2', text: 'Resistance is 96 Ohm; current drops to 2 A' },
            { id: 'opt_3', text: 'Resistance is 6 Ohm; current remains 4 A' },
            { id: 'opt_4', text: 'Resistance is 0.16 Ohm; current becomes zero' },
          ],
          correctOptionId: 'opt_1',
          explanation:
            'R = V / I = 24 V / 4 A = 6 Ohm. Because resistance R is constant at uniform temperature, doubling the potential difference V from 24 V to 48 V causes current I = 48 / 6 = 8 A.',
          hint: "Use R = V / I, then remember Ohm's law states current is directly proportional to voltage.",
        },
      },
      boardDirective: {
        action: 'draw_question',
        content: 'Board Question: V = 24 V, I = 4 A -> Find R and new I when V is doubled',
      },
      estimatedSeconds: 90,
    },

    // 10. SUMMARY: Short recap and key learning points
    {
      id: 'step_ohms_10',
      stepNumber: 10,
      title: 'Exam-Topper Capsule Summary',
      type: 'SUMMARY',
      assetStatus: 'ready',
      content: {
        summary: {
          recapPoints: [
            "Ohm's Law states that current is directly proportional to potential difference across a conductor at constant temperature.",
            'Governing equation: V = I * R, where R is electrical resistance in Ohms (Volt / Ampere).',
            'The slope of a V versus I graph yields resistance: Slope = Delta V / Delta I = R.',
            'In a series combination, equivalent resistance R_eq = R1 + R2 + ...',
          ],
          formulasToRemember: [
            'V = I * R',
            'R = V / I',
            'I = V / R',
            'Slope(V-I Graph) = R',
          ],
          examTips: [
            'Always state "provided temperature and physical conditions remain constant" when defining Ohm\'s law in board exams to get full marks.',
            'Never forget to include the unit symbol Omega after calculating resistance.',
            'In numerical problems, ensure potential is in Volts and current is in Amperes before solving for Ohms.',
          ],
        },
      },
      boardDirective: {
        action: 'draw_title',
        content: "Ohm's Law Synthesis Summary: Exam Checkpoints",
      },
      estimatedSeconds: 60,
    },
  ],
  metadata: {
    totalEstimatedMinutes: 16,
    author: 'AI Tutor Academic Curriculum Engine',
    provenance: 'NCERT Class 10 Science, Chapter 12: Electricity',
    createdAt: new Date().toISOString(),
    deviceTierCompatibility: 'all',
  },
}
