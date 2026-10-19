import {
  VisualLessonManifest,
  LessonStep,
  LessonContentType,
  validateLessonManifest,
  EducationalBoard,
} from '@/types/lessonManifest'
import { VisualizationSceneType } from '@/components/whiteboard/scenes/sceneTypes'

export interface CapsuleInput {
  id?: string
  moduleId?: string
  order_index: number
  title: string
  description?: string
  subtopics?: string[]
  key_concepts?: string[]
  success_criteria?: string
  chapter_notes?: string
  worked_examples?: Array<{
    problem: string
    given: string
    formula: string
    substitution: string
    calculation: string
    finalAnswer: string
    unit: string
  }>
  common_misconceptions?: string[]
  board?: string
  class_level?: string
  category?: string
}

/**
 * Maps academic capsule content to optimal visual representations:
 * - Geometric/algebraic relationships -> GRAPH or SCENE_3D (linear_graphs, geometry_3d)
 * - Forces, kinematics, motion -> DIAGRAM (forces_fbd) or SCENE_3D (physics_forces) or ANIMATION (projectile_motion)
 * - Optics, lenses, refraction -> DIAGRAM (ray_optics) or SCENE_3D (optics_refraction)
 * - Electricity, Ohm's law, circuits -> DIAGRAM (electric_circuit) or SCENE_3D (circuits_interactive) or ANIMATION (circuit_flow)
 * - Chemistry, atomic structure, states -> SCENE_3D (bohr_atom, states_of_matter)
 * - Waves, sound -> SCENE_3D (wave_harmonics) or ANIMATION (wave_propagation)
 */
export interface ConceptVisualDirective {
  concept: string
  toolCallAction: 'write_chalkboard' | 'execute_visual_action'
  chalkboardAction?: string
  chalkboardContent?: string
  sceneType?: string
  sceneParams?: Record<string, any>
  readableSummary: string
  toolCallExample: string
}

export function inferConceptVisualDirective(
  conceptTitle: string,
  subject = 'Science',
  chapterTitle = ''
): ConceptVisualDirective {
  const cLower = (conceptTitle || '').toLowerCase()
  const chLower = (chapterTitle || '').toLowerCase()
  const sLower = (subject || '').toLowerCase()
  const combined = `${cLower} ${chLower} ${sLower}`

  // 0a. BOARD NUMERICALS & STEP-BY-STEP PROBLEM SOLVING (Higher priority than general topic match)
  if (
    cLower.includes('numerical') ||
    cLower.includes('calculation') ||
    cLower.includes('problem solving') ||
    cLower.includes('worked problem') ||
    cLower.includes('worked example') ||
    combined.includes('numerical')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_numerical',
      chalkboardContent: `Problem: Board exam numerical for ${conceptTitle} | Given: Standard values with SI units | Formula: Governing equation | Substitution: Value substitution | Calculation: Step-by-step arithmetic in scratchpad | Answer: Evaluated result with correct SI units`,
      readableSummary: `Step-by-Step Board Exam Numerical Solution for ${conceptTitle}`,
      toolCallExample: `solve_step_by_step_numerical(problem="Calculate values for ${conceptTitle}", given="Standard values", formula="Governing equation", substitution="Value substitution", calculation="Arithmetic steps", answer="Calculated result", unit="SI unit")`,
    }
  }

  // 0b. VIDEOS, EXPERIMENTS & PRACTICAL DEMONSTRATIONS
  if (
    cLower.includes('experiment') ||
    cLower.includes('demonstrat') ||
    cLower.includes('practical') ||
    cLower.includes('lab') ||
    cLower.includes('video') ||
    cLower.includes('activit') ||
    cLower.includes('investigat') ||
    cLower.includes('observation')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_video',
      chalkboardContent: `${conceptTitle} Demonstration | Practical laboratory experiment and procedural video demonstration`,
      readableSummary: `Practical Lab Experiment Video Demonstration for ${conceptTitle}`,
      toolCallExample: `write_chalkboard(action="draw_video", content="${conceptTitle} Demonstration | Practical laboratory experiment and procedural video demonstration")`,
    }
  }

  // 1. SPECIFIC BIOLOGY CONCEPTS (Inspected on conceptTitle first so each concept gets a unique visual)
  if (cLower.includes('cellulose') || cLower.includes('cell wall') || cLower.includes('cell-wall') || cLower.includes('peptidoglycan')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_table',
      chalkboardContent: 'Feature | Plant Cell Wall | Plasma Membrane || Primary Composition | Complex Carbohydrate Cellulose | Phospholipid Bilayer & Proteins || Structural Permeability | Freely permeable to water & solutes | Selectively semi-permeable || Mechanical Function | Rigid protection & turgor pressure resistance | Regulated material exchange & homeostasis',
      readableSummary: 'Cell Wall Architecture & Comparative Permeability Matrix',
      toolCallExample: `write_chalkboard(action="draw_table", content="Feature | Cell Wall | Cell Membrane || Composition | Cellulose | Phospholipid Bilayer || Permeability | Freely permeable | Selectively permeable") and write_chalkboard(action="draw_image", content="Cell Wall Structure | Cellulose Microfibrils | NCERT Standard")`,
    }
  }

  if (cLower.includes('prokaryot') || cLower.includes('eukaryot') || cLower.includes('bacteria') || cLower.includes('basic cell types')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_table',
      chalkboardContent: 'Feature | Prokaryotic Cells (e.g. Bacteria) | Eukaryotic Cells (e.g. Plant/Animal) || Nuclear Envelope | Absent (undefined nucleoid region) | Present (well-defined double nuclear membrane) || Membrane Organelles | Completely absent (no mitochondria/plastids) | Abundant (mitochondria, ER, Golgi, vacuoles) || Ribosomes | Smaller 70S type | Larger 80S type (cytoplasm) & 70S (organelles)',
      readableSummary: 'Prokaryotic vs Eukaryotic Cellular Organization Matrix',
      toolCallExample: `write_chalkboard(action="draw_table", content="Feature | Prokaryotes | Eukaryotes || Nucleus | Undefined nucleoid | Double nuclear membrane || Organelles | Absent | Present")`,
    }
  }

  if (
    cLower.includes('plasma membrane') ||
    cLower.includes('cell membrane') ||
    cLower.includes('bilayer') ||
    cLower.includes('phospholipid') ||
    cLower.includes('mosaic') ||
    cLower.includes('osmosis') ||
    cLower.includes('diffusion') ||
    cLower.includes('transport') ||
    cLower.includes('permeab')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_flowchart',
      chalkboardContent: 'Passive Transport (High -> Low Conc., Zero ATP Required) -> Simple Diffusion / Facilitated / Osmosis || Active Transport (Against Conc. Gradient) -> Requires ATP Energy (e.g. Na+/K+ Pump)',
      readableSummary: 'Membrane Transport Pathway Flowchart & Fluid Mosaic Model',
      toolCallExample: `write_chalkboard(action="draw_flowchart", content="Passive Transport (Zero ATP) -> Simple Diffusion / Osmosis || Active Transport (Against Gradient) -> Requires ATP") and write_chalkboard(action="draw_image", content="Plasma Membrane Fluid Mosaic Model | Phospholipid Bilayer & Transport Proteins | NCERT Standard")`,
    }
  }

  if (
    cLower.includes('mendel') ||
    cLower.includes('genetics') ||
    cLower.includes('heredity') ||
    cLower.includes('monohybrid') ||
    cLower.includes('dihybrid') ||
    cLower.includes('punnett') ||
    cLower.includes('cross ratio')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_table',
      chalkboardContent: 'Allele Pair | Genotype | Phenotypic Ratio || TT (Homozygous) | Tall | 25% || Tt (Heterozygous) | Tall | 50% || tt (Recessive) | Dwarf | 25%',
      readableSummary: 'Mendelian Genetic Cross & Inheritance Table',
      toolCallExample: `write_chalkboard(action="draw_table", content="Allele Pair | Genotype | Phenotype || TT | Tall | 25% || Tt | Tall | 50% || tt | Dwarf | 25%")`,
    }
  }

  if (cLower.includes('nucleus') || cLower.includes('dna') || cLower.includes('chromat') || cLower.includes('nucleolus')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_image',
      chalkboardContent: 'Nucleus & Chromatin Ultrastructure | Double Nuclear Envelope with Pores, Nucleolus for Ribosome Synthesis & Entangled Chromatin DNA | NCERT Standard',
      readableSummary: 'Nuclear Envelope & Genetic Architecture Schematic Card',
      toolCallExample: `write_chalkboard(action="draw_image", content="Nucleus Ultrastructure | Nuclear Envelope, Nucleolus & Chromatin DNA | NCERT Standard")`,
    }
  }

  if (cLower.includes('mitochond') || cLower.includes('atp') || cLower.includes('respirat') || cLower.includes('powerhouse')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_image',
      chalkboardContent: 'Mitochondrion (Cellular Powerhouse) | Smooth Outer Membrane, Deeply Folded Inner Cristae for Surface Area & F1-ATP Synthase Particles | NCERT Standard',
      readableSummary: 'Mitochondrial Cristae & ATP Synthesis Architecture',
      toolCallExample: `write_chalkboard(action="draw_image", content="Mitochondria Ultrastructure | Folded Inner Cristae & ATP Synthase Particles | NCERT Standard")`,
    }
  }

  if (cLower.includes('vacuole') || cLower.includes('turgid') || cLower.includes('tonoplast') || cLower.includes('flaccid')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_table',
      chalkboardContent: 'Organelle / Property | Plant Cells | Animal Cells || Central Vacuole | Single massive sap vacuole (50-90% volume, tonoplast membrane) | Small, temporary vesicles or absent || Cell Wall | Rigid outer cellulose wall provides turgidity | Completely absent (flexible outer membrane only) || Plastids & Chloroplasts | Present for photosynthesis & storage | Absent',
      readableSummary: 'Vacuolar Turgidity & Plant vs Animal Comparative Matrix',
      toolCallExample: `write_chalkboard(action="draw_table", content="Feature | Plant Cell | Animal Cell || Vacuole | Massive central sap vacuole | Small, temporary || Cell Wall | Present (Cellulose) | Absent")`,
    }
  }

  if (cLower.includes('endoplasmic') || cLower.includes('golgi') || cLower.includes('lysosom') || cLower.includes('ribosom')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_flowchart',
      chalkboardContent: 'Nucleus (mRNA Transcription) -> Rough ER (Ribosome Protein Synthesis) -> Smooth ER (Lipid Synthesis) -> Golgi Apparatus (Cisterna Packaging & Sorting) -> Secretory Vesicles / Lysosomes (Hydrolytic Enzymes)',
      readableSummary: 'Endomembrane Protein Synthesis & Packaging Pathway',
      toolCallExample: `write_chalkboard(action="draw_flowchart", content="Nucleus -> Rough ER (Protein Synthesis) -> Smooth ER -> Golgi Apparatus -> Secretory Vesicles / Lysosomes")`,
    }
  }

  if (
    cLower.includes('discovery') ||
    cLower.includes('overview') ||
    cLower.includes('structural organization') ||
    cLower.includes('structure of cell') ||
    (cLower.includes('cell') && !cLower.includes('electric') && !cLower.includes('battery'))
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'cell',
      readableSummary: 'Cell Structural Organization Diagram + Textbook Organelle Card',
      toolCallExample: `write_chalkboard(action="draw_diagram", content="cell") and write_chalkboard(action="draw_image", content="Cell Structure | Plant & Animal Cell Organelles | NCERT Standard")`,
    }
  }

  if (
    combined.includes('photosynthesis') ||
    combined.includes('chlorophyll') ||
    combined.includes('stomata') ||
    combined.includes('autotroph')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'photosynthesis',
      readableSummary: 'Photosynthesis Chemical Pathway Diagram & Reaction Equation',
      toolCallExample: `write_chalkboard(action="draw_diagram", content="photosynthesis")`,
    }
  }

  if (
    combined.includes('tissue') ||
    combined.includes('digest') ||
    combined.includes('respirat') ||
    combined.includes('circulat') ||
    combined.includes('heart') ||
    combined.includes('blood') ||
    combined.includes('kidney') ||
    combined.includes('nephron') ||
    combined.includes('excret')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_image',
      chalkboardContent: `${conceptTitle} | Authentic NCERT Anatomical & Physiological Schematic | Board Standard`,
      readableSummary: `${conceptTitle} Anatomical Schematic Card`,
      toolCallExample: `write_chalkboard(action="draw_image", content="${conceptTitle} | Authentic NCERT Anatomical & Physiological Schematic | Board Standard")`,
    }
  }

  if (combined.includes('genetics') || combined.includes('heredity') || combined.includes('dna') || combined.includes('mendel') || combined.includes('chromosome')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_table',
      chalkboardContent: 'Allele Pair | Genotype | Phenotypic Ratio || TT (Homozygous) | Tall | 25% || Tt (Heterozygous) | Tall | 50% || tt (Recessive) | Dwarf | 25%',
      readableSummary: 'Mendelian Genetic Cross & Inheritance Table',
      toolCallExample: `write_chalkboard(action="draw_table", content="Allele Pair | Genotype | Phenotype || TT | Tall | 25% || Tt | Tall | 50% || tt | Dwarf | 25%")`,
    }
  }

  // 2. MATHEMATICS & GEOMETRY
  if (
    combined.includes('geometry') ||
    combined.includes('cylinder') ||
    combined.includes('cone') ||
    combined.includes('sphere') ||
    combined.includes('cube') ||
    combined.includes('cuboid') ||
    combined.includes('surface area') ||
    (combined.includes('solid') && !combined.includes('liquid') && !combined.includes('gas') && !combined.includes('matter')) ||
    combined.includes('solid geometry') ||
    combined.includes('solid shape') ||
    combined.includes('mensuration')
  ) {
    const shape = combined.includes('cylinder')
      ? 'cylinder'
      : combined.includes('cone')
      ? 'cone'
      : combined.includes('sphere')
      ? 'sphere'
      : combined.includes('cube')
      ? 'cube'
      : 'cylinder'
    return {
      concept: conceptTitle,
      toolCallAction: 'execute_visual_action',
      sceneType: 'geometry',
      sceneParams: { shape, dimension1: 3, dimension2: 4 },
      chalkboardAction: 'draw_geometry',
      chalkboardContent: shape,
      readableSummary: `3D Solid Geometry Simulation (${shape}) + Chalkboard Dimensions`,
      toolCallExample: `execute_visual_action(action="SHOW_SCENE", parameters={ sceneType: "geometry", shape: "${shape}" }) and write_chalkboard(action="draw_geometry", content="${shape}")`,
    }
  }

  if (combined.includes('cross_section') || combined.includes('slice') || combined.includes('cutting plane')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'execute_visual_action',
      sceneType: 'geometry_cross_section',
      readableSummary: '3D Cross Section Cutting Plane Simulation',
      toolCallExample: `execute_visual_action(action="SHOW_SCENE", parameters={ sceneType: "geometry_cross_section" })`,
    }
  }

  if (
    combined.includes('triangle') ||
    combined.includes('pythagoras') ||
    combined.includes('hypotenuse') ||
    combined.includes('right angle')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_geometry',
      chalkboardContent: 'triangle right',
      readableSummary: 'Right-Angled Triangle with Pythagoras Theorem (a^2 + b^2 = c^2)',
      toolCallExample: `write_chalkboard(action="draw_geometry", content="triangle right")`,
    }
  }

  if (combined.includes('circle') || combined.includes('tangent') || combined.includes('radius') || combined.includes('chord')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_geometry',
      chalkboardContent: 'circle',
      readableSummary: 'Circle with Center O, Radius r, Area & Circumference',
      toolCallExample: `write_chalkboard(action="draw_geometry", content="circle")`,
    }
  }

  if (combined.includes('quadratic') || combined.includes('parabola') || combined.includes('root') || combined.includes('polynomial')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_graph',
      chalkboardContent: 'formula=x^2 - 4 | domain=[-4,4] | range=[-5,15] | title=Quadratic Parabola: y = x^2 - 4 | callout=Roots at x = -2, 2',
      readableSummary: 'Quadratic Parabola Function Plot with Real Roots',
      toolCallExample: `write_chalkboard(action="draw_graph", content="formula=x^2 - 4 | domain=[-4,4] | range=[-5,15] | title=Quadratic Parabola | callout=Roots at x = -2, 2")`,
    }
  }

  if (
    combined.includes('linear') ||
    combined.includes('slope') ||
    combined.includes('intercept') ||
    combined.includes('coordinate') ||
    combined.includes('cartesian') ||
    combined.includes('y = mx')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_graph',
      chalkboardContent: 'formula=2x + 1 | domain=[-5,5] | range=[-10,10] | title=Linear Function: y = 2x + 1 | xlabel=x | ylabel=y | callout=Slope m=2, c=1',
      readableSummary: 'Cartesian Coordinate Graph (Slope & Intercept)',
      toolCallExample: `write_chalkboard(action="draw_graph", content="formula=2x + 1 | domain=[-5,5] | range=[-10,10] | title=Linear Graph | callout=Slope m=2")`,
    }
  }

  // 3. PHYSICS
  if (
    combined.includes('circuit') ||
    combined.includes('ohm') ||
    combined.includes('resistan') ||
    combined.includes('current') ||
    combined.includes('voltage') ||
    combined.includes('electric')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'execute_visual_action',
      sceneType: 'circuits',
      sceneParams: { voltage: 12, circuitType: 'series' },
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'series',
      readableSummary: 'Interactive Electric Circuit 3D Simulation + Chalkboard Circuit Diagram',
      toolCallExample: `execute_visual_action(action="SHOW_SCENE", parameters={ sceneType: "circuits" }) and write_chalkboard(action="draw_diagram", content="series")`,
    }
  }

  if (
    combined.includes('force') ||
    combined.includes('newton') ||
    combined.includes('friction') ||
    combined.includes('gravity') ||
    combined.includes('fbd') ||
    combined.includes('inertia')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'execute_visual_action',
      sceneType: 'forces',
      sceneParams: { mass: 5, appliedForce: 25 },
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'forces',
      readableSummary: 'Newtonian Dynamics 3D Simulation + Free Body Diagram',
      toolCallExample: `execute_visual_action(action="SHOW_SCENE", parameters={ sceneType: "forces" }) and write_chalkboard(action="draw_diagram", content="forces")`,
    }
  }

  if (
    combined.includes('optic') ||
    combined.includes('refract') ||
    combined.includes('reflect') ||
    combined.includes('snell') ||
    combined.includes('light') ||
    combined.includes('lens') ||
    combined.includes('mirror')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'execute_visual_action',
      sceneType: 'optics',
      sceneParams: { incidentAngle: 45, refractiveIndex: 1.5 },
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'optics',
      readableSummary: '3D Ray Optics & Refraction Lab + Snell\'s Law Diagram',
      toolCallExample: `execute_visual_action(action="SHOW_SCENE", parameters={ sceneType: "optics" }) and write_chalkboard(action="draw_diagram", content="optics")`,
    }
  }

  if (combined.includes('wave') || combined.includes('sound') || combined.includes('frequency') || combined.includes('harmonic') || combined.includes('amplitude')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'execute_visual_action',
      sceneType: 'waves',
      sceneParams: { frequency: 2, amplitude: 1.5 },
      chalkboardAction: 'draw_graph',
      chalkboardContent: 'wave',
      readableSummary: '3D Wave Harmonics Simulation + Waveform Graph',
      toolCallExample: `execute_visual_action(action="SHOW_SCENE", parameters={ sceneType: "waves" }) and write_chalkboard(action="draw_graph", content="wave")`,
    }
  }

  if (combined.includes('magnet') || combined.includes('magnetic') || combined.includes('solenoid') || combined.includes('induction')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'magnet',
      readableSummary: 'Bar Magnet Continuous Magnetic Field Lines Diagram',
      toolCallExample: `write_chalkboard(action="draw_diagram", content="magnet")`,
    }
  }

  if (combined.includes('pressure') || combined.includes('pascal') || combined.includes('thrust') || combined.includes('hydraulic') || combined.includes('buoyan')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'pressure',
      readableSummary: 'Pascal\'s Fluid Pressure & Depth Variation Diagram',
      toolCallExample: `write_chalkboard(action="draw_diagram", content="pressure")`,
    }
  }

  if (combined.includes('velocity') || combined.includes('speed') || combined.includes('acceleration') || combined.includes('v-t') || combined.includes('motion')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_graph',
      chalkboardContent: 'velocity-time',
      readableSummary: 'Velocity-Time Graph (v-t) Plotted with Slope = Acceleration',
      toolCallExample: `write_chalkboard(action="draw_graph", content="velocity-time")`,
    }
  }

  // 4. CHEMISTRY
  if (combined.includes('atom') || combined.includes('bohr') || combined.includes('electron') || combined.includes('nucleus') || combined.includes('shell')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'execute_visual_action',
      sceneType: 'bohr_atom',
      sceneParams: { atomicNumber: 6, elementSymbol: 'C' },
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'atom',
      readableSummary: '3D Bohr Atomic Orbit Simulation + Chalkboard Shell Diagram',
      toolCallExample: `execute_visual_action(action="SHOW_SCENE", parameters={ sceneType: "bohr_atom" }) and write_chalkboard(action="draw_diagram", content="atom")`,
    }
  }

  if (combined.includes('matter') || combined.includes('solid') || combined.includes('liquid') || combined.includes('gas') || combined.includes('particle')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'execute_visual_action',
      sceneType: 'matter',
      sceneParams: { temperature: 300, state: 'liquid' },
      chalkboardAction: 'draw_diagram',
      chalkboardContent: 'matter',
      readableSummary: '3D States of Matter Particle Simulation + 3-Phase Model Diagram',
      toolCallExample: `execute_visual_action(action="SHOW_SCENE", parameters={ sceneType: "matter" }) and write_chalkboard(action="draw_diagram", content="matter")`,
    }
  }

  if (combined.includes('reaction') || combined.includes('acid') || combined.includes('base') || combined.includes('periodic') || combined.includes('chemical')) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_table',
      chalkboardContent: 'Property / Test | Acidic Medium | Neutral Medium | Alkaline Medium || Litmus Paper | Blue turns Red | No change | Red turns Blue || pH Range | pH < 7 | pH = 7 | pH > 7',
      readableSummary: 'Chemical Classification and Reaction Matrix Table',
      toolCallExample: `write_chalkboard(action="draw_table", content="Test | Acid | Neutral | Base || Litmus | Red | None | Blue || pH | < 7 | 7 | > 7")`,
    }
  }



  // 7. FLOWCHARTS, CYCLES & SEQUENTIAL PATHWAYS
  if (
    combined.includes('process') ||
    combined.includes('step') ||
    combined.includes('cycle') ||
    combined.includes('path') ||
    combined.includes('flow') ||
    combined.includes('mechanism') ||
    combined.includes('sequence') ||
    combined.includes('reflex') ||
    combined.includes('chain') ||
    combined.includes('pathway')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_flowchart',
      chalkboardContent: 'Initial State -> Governing Mechanism -> Intermediate Step -> Final Outcome',
      readableSummary: `Sequential Process Flowchart for ${conceptTitle}`,
      toolCallExample: `write_chalkboard(action="draw_flowchart", content="Step 1 -> Step 2 -> Step 3")`,
    }
  }

  // 8. TABLES, MATRICES & COMPARATIVE CLASSIFICATIONS
  if (
    combined.includes('differ') ||
    combined.includes('compare') ||
    combined.includes('vs') ||
    combined.includes('propert') ||
    combined.includes('table') ||
    combined.includes('classif') ||
    combined.includes('matrix') ||
    combined.includes('distinction')
  ) {
    return {
      concept: conceptTitle,
      toolCallAction: 'write_chalkboard',
      chalkboardAction: 'draw_table',
      chalkboardContent: `${conceptTitle} - Classification || Property | Parameter A | Parameter B || 1. Definition | Primary Standard | Alternative || 2. SI Unit / Criteria | Standard SI | Derived`,
      readableSummary: `Comparison Matrix Table for ${conceptTitle}`,
      toolCallExample: `write_chalkboard(action="draw_table", content="Property | Parameter A | Parameter B || Definition | Primary | Secondary")`,
    }
  }

  // Universal Default: Authentic textbook illustration card with high fidelity
  return {
    concept: conceptTitle,
    toolCallAction: 'write_chalkboard',
    chalkboardAction: 'draw_image',
    chalkboardContent: `${conceptTitle} | Authentic textbook illustration and conceptual schematic | NCERT / Board Standard`,
    readableSummary: `Board Book Schematic Illustration Card for ${conceptTitle}`,
    toolCallExample: `write_chalkboard(action="draw_image", content="${conceptTitle} | Authentic textbook illustration | NCERT / Board Standard")`,
  }
}

export function inferOptimalVisualType(
  title: string,
  keyConcepts: string[] = [],
  subject = 'Science'
): {
  mediaType: LessonContentType
  sceneType?: VisualizationSceneType
  diagramType?: string
  animationType?: string
  graphConfig?: { xLabel: string; yLabel: string; expression: string }
} {
  const directive = inferConceptVisualDirective(title, subject, keyConcepts.join(' '))

  if (directive.toolCallAction === 'execute_visual_action' && directive.sceneType) {
    return {
      mediaType: 'SCENE_3D',
      sceneType: directive.sceneType as VisualizationSceneType,
      diagramType: directive.chalkboardContent,
    }
  }

  if (directive.chalkboardAction === 'draw_graph') {
    return {
      mediaType: 'GRAPH',
      graphConfig: {
        xLabel: 'x',
        yLabel: 'y',
        expression: directive.chalkboardContent || 'y = 2x + 1',
      },
    }
  }

  if (directive.chalkboardAction === 'draw_video') {
    return {
      mediaType: 'VIDEO',
    }
  }

  if (directive.chalkboardAction === 'draw_image') {
    return {
      mediaType: 'IMAGE',
    }
  }

  if (directive.chalkboardAction === 'draw_table') {
    return {
      mediaType: 'BOARD_STEP',
    }
  }

  if (directive.chalkboardAction === 'draw_flowchart') {
    return {
      mediaType: 'BOARD_STEP',
    }
  }

  if (directive.chalkboardAction === 'draw_diagram') {
    return {
      mediaType: 'DIAGRAM',
      diagramType: directive.chalkboardContent || 'concept_schematic',
    }
  }

  // Default to authentic image illustration
  return {
    mediaType: 'IMAGE',
    diagramType: directive.chalkboardContent || 'concept_schematic',
  }
}

/**
 * Generate a complete, versioned Visual Lesson Manifest for a syllabus capsule
 */
export function generateVisualLessonPlanForCapsule(
  capsule: CapsuleInput,
  textbookProvenance?: { textbookName?: string; pageNumber?: number; section?: string }
): VisualLessonManifest {
  const moduleId = capsule.moduleId || capsule.id || `mod_${Date.now()}`
  const board = ((capsule.board as EducationalBoard) || 'CBSE')
  const classLevel = capsule.class_level || 'Class 10'
  const title = capsule.title
  const subtopics = capsule.subtopics || []
  const keyConcepts = capsule.key_concepts || []
  const workedEx = capsule.worked_examples || []

  const visualMapping = inferOptimalVisualType(title, keyConcepts, capsule.category || 'Science')
  const steps: LessonStep[] = []

  // 1. TEXT_STEP: Real-World Intuitive Hook & Concept Formulation
  steps.push({
    id: `step_${moduleId}_1`,
    stepNumber: 1,
    title: 'Intuition & Concept Formulation',
    type: 'TEXT_STEP',
    assetStatus: 'ready',
    content: {
      text: {
        explanation: `${title}: ${capsule.description || 'Mastering fundamental principles with clear intuition and mathematical rigor.'}`,
        keyTakeaway: keyConcepts[0] || 'Understand governing laws and relationships with SI units.',
      },
    },
    boardDirective: {
      action: 'draw_note',
      content: keyConcepts[0] ? `Core Principle: ${keyConcepts[0]}` : `Introduction: ${title}`,
    },
    estimatedSeconds: 90,
    sourceCitation: {
      textbookName: textbookProvenance?.textbookName || `${board} Standard Textbook`,
      pageNumber: textbookProvenance?.pageNumber || 1,
      section: textbookProvenance?.section || '1.1',
      verifiedSource: true,
      provenanceType: board === 'CBSE' ? 'ncert_textbook' : board === 'ICSE' ? 'icse_selina' : 'ib_oxford',
    },
  })

  // 2. BOARD_STEP: Step-by-Step Derivation / Mathematical Governing Laws
  steps.push({
    id: `step_${moduleId}_2`,
    stepNumber: 2,
    title: 'Governing Equations & Board Notes',
    type: 'BOARD_STEP',
    assetStatus: 'ready',
    content: {
      board: {
        title: `${title} - Fundamental Equations`,
        equations: keyConcepts.length > 0 ? keyConcepts.slice(0, 3) : ['Core Law: Definition with SI units'],
        derivationSteps: [
          'State fundamental scientific definition and boundary conditions.',
          'Formulate algebraic relationship with SI units.',
          'Verify dimensional consistency.',
        ],
      },
    },
    boardDirective: {
      action: 'draw_step',
      content: keyConcepts[0] || `${title} Principle`,
    },
    estimatedSeconds: 120,
    sourceCitation: {
      textbookName: textbookProvenance?.textbookName || `${board} Standard Textbook`,
      verifiedSource: true,
      provenanceType: 'ncert_textbook',
    },
  })

  // 3. IMAGE / DIAGRAM: Visual Schematic Representation
  if (visualMapping.mediaType === 'GRAPH' && visualMapping.graphConfig) {
    steps.push({
      id: `step_${moduleId}_3`,
      stepNumber: 3,
      title: `${title} Mathematical Graph`,
      type: 'GRAPH',
      assetStatus: 'ready',
      content: {
        graph: {
          title: `${title} Coordinate Graph`,
          graphType: 'function',
          expression: visualMapping.graphConfig.expression,
          domain: [-5, 10],
          range: [-5, 20],
          xLabel: visualMapping.graphConfig.xLabel,
          yLabel: visualMapping.graphConfig.yLabel,
          variables: [
            { name: 'm', label: 'Slope (m)', min: -5, max: 10, current: 2, step: 0.5 },
            { name: 'c', label: 'y-intercept (c)', min: -5, max: 10, current: 1, step: 0.5 },
          ],
          progressiveSteps: [
            { stepIndex: 0, action: 'axes', description: 'Display coordinate axes and reference grid' },
            { stepIndex: 1, action: 'points', description: 'Plot discrete coordinates' },
            { stepIndex: 2, action: 'line', description: 'Trace continuous function curve' },
            { stepIndex: 3, action: 'intercept', description: 'Highlight y-intercept' },
            { stepIndex: 4, action: 'slope_triangle', description: 'Form slope triangle Delta y / Delta x' },
          ],
        },
      },
      boardDirective: {
        action: 'draw_graph',
        content: visualMapping.graphConfig.expression || `${title} Graph`,
      },
      estimatedSeconds: 150,
      sourceCitation: {
        textbookName: textbookProvenance?.textbookName || `${board} Standard Textbook`,
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    })
  } else if (visualMapping.mediaType === 'IMAGE') {
    steps.push({
      id: `step_${moduleId}_3`,
      stepNumber: 3,
      title: `${title} Textbook Schematic`,
      type: 'IMAGE',
      assetStatus: 'ready',
      content: {
        image: {
          url: '',
          alt: `${title} textbook illustration`,
          caption: `Authentic textbook illustration and conceptual schematic for ${title}.`,
          attribution: `${board} Standard Textbook`,
          provenance: 'textbook',
        },
      },
      boardDirective: {
        action: 'draw_image',
        content: `${title} | Authentic textbook illustration | ${board} Standard`,
      },
      estimatedSeconds: 120,
      sourceCitation: {
        textbookName: textbookProvenance?.textbookName || `${board} Standard Textbook`,
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    })
  } else if (visualMapping.mediaType === 'VIDEO') {
    steps.push({
      id: `step_${moduleId}_3`,
      stepNumber: 3,
      title: `${title} Practical Demonstration`,
      type: 'VIDEO',
      assetStatus: 'ready',
      content: {
        video: {
          url: '',
          title: `${title} Practical Demonstration`,
          description: `Laboratory demonstration and practical experiment for ${title}.`,
          provider: 'authorized_partner',
          durationSeconds: 90,
        },
      },
      boardDirective: {
        action: 'draw_video',
        content: `${title} Demonstration | Laboratory demonstration and practical experiment`,
      },
      estimatedSeconds: 120,
      sourceCitation: {
        textbookName: textbookProvenance?.textbookName || `${board} Standard Textbook`,
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    })
  } else {
    // Structured Diagram Step
    steps.push({
      id: `step_${moduleId}_3`,
      stepNumber: 3,
      title: `${title} Visual Schematic`,
      type: 'DIAGRAM',
      assetStatus: 'ready',
      content: {
        diagram: {
          diagramType: (visualMapping.diagramType as any) || 'forces_fbd',
          title: `${title} Schematic Diagram`,
          labels: [
            { id: 'l1', text: keyConcepts[0] || 'Primary Parameter', x: 25, y: 30, revealStep: 0 },
            { id: 'l2', text: keyConcepts[1] || 'Secondary Parameter', x: 75, y: 70, revealStep: 1 },
          ],
          progressiveSteps: [
            { step: 0, title: 'Physical Apparatus', activeLabelIds: ['l1'], description: 'Initial setup and reference boundary' },
            { step: 1, title: 'Field / Vector Distribution', activeLabelIds: ['l2'], description: 'Dynamic directional interactions' },
          ],
        },
      },
      boardDirective: {
        action: 'draw_diagram',
        content: visualMapping.diagramType || title,
      },
      estimatedSeconds: 120,
      sourceCitation: {
        textbookName: textbookProvenance?.textbookName || `${board} Standard Textbook`,
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    })
  }

  // 4. SCENE_3D / ANIMATION: Interactive Simulation Step
  if (visualMapping.sceneType) {
    steps.push({
      id: `step_${moduleId}_4`,
      stepNumber: 4,
      title: `${title} 3D Interactive Simulation`,
      type: 'SCENE_3D',
      assetStatus: 'ready',
      content: {
        scene3D: {
          sceneType: visualMapping.sceneType,
          title: `${title} 3D Laboratory`,
          initialParams: {},
        },
      },
      boardDirective: {
        action: 'draw_step',
        content: `3D Simulation: ${visualMapping.sceneType.replace('_', ' ')}`,
      },
      estimatedSeconds: 180,
      sourceCitation: {
        textbookName: textbookProvenance?.textbookName || `${board} Standard Textbook`,
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    })
  } else if (visualMapping.animationType) {
    steps.push({
      id: `step_${moduleId}_4`,
      stepNumber: 4,
      title: `${title} Timed Procedural Animation`,
      type: 'ANIMATION',
      assetStatus: 'ready',
      content: {
        animation: {
          animationType: (visualMapping.animationType as any) || 'projectile_motion',
          durationSeconds: 8,
        },
      },
      estimatedSeconds: 120,
      sourceCitation: {
        textbookName: textbookProvenance?.textbookName || `${board} Standard Textbook`,
        verifiedSource: true,
        provenanceType: 'ncert_textbook',
      },
    })
  }

  // 5. QUICK_CHECK: Micro-Assessment Checkpoint
  const firstExample = workedEx[0]
  steps.push({
    id: `step_${moduleId}_5`,
    stepNumber: 5,
    title: 'Checkpoint: Test Your Understanding',
    type: 'QUICK_CHECK',
    assetStatus: 'ready',
    content: {
      quickCheck: {
        question: firstExample
          ? `If ${firstExample.given.substring(0, 80)}, what is the value?`
          : `Which of the following correctly describes ${title}?`,
        options: [
          { id: 'opt_a', text: keyConcepts[0] || 'Proportional with constant rate of change' },
          { id: 'opt_b', text: 'Inversely proportional with zero baseline' },
          { id: 'opt_c', text: 'Random and independent of external variables' },
          { id: 'opt_d', text: 'Constant zero value regardless of input' },
        ],
        correctOptionId: 'opt_a',
        explanation: `By fundamental principle, ${keyConcepts[0] || title} is strictly governed by verified laws with consistent SI units.`,
      },
    },
    boardDirective: {
      action: 'draw_note',
      content: 'Checkpoint: Quick Check Understanding',
    },
    estimatedSeconds: 90,
  })

  // 6. SUMMARY: Exam-Topper Recap
  steps.push({
    id: `step_${moduleId}_6`,
    stepNumber: 6,
    title: 'Capsule Synthesis Summary',
    type: 'SUMMARY',
    assetStatus: 'ready',
    content: {
      summary: {
        recapPoints: subtopics.length > 0 ? subtopics : [`Mastery of ${title}`, 'Exact mathematical definitions with units'],
        formulasToRemember: keyConcepts.slice(0, 3),
        examTips: [
          'Always box your final numerical solution with correct SI units.',
          'Never skip intermediate algebraic steps in board examinations.',
        ],
      },
    },
    boardDirective: {
      action: 'draw_title',
      content: `${title} - Synthesis Summary`,
    },
    estimatedSeconds: 60,
  })

  const manifest: VisualLessonManifest = {
    version: '1.0.0',
    moduleId,
    title,
    subject: capsule.category || 'Science',
    classLevel,
    board,
    steps,
    metadata: {
      totalEstimatedMinutes: Math.round(steps.reduce((acc, s) => acc + (s.estimatedSeconds || 90), 0) / 60),
      author: 'AI Tutor Curriculum Pipeline',
      provenance: textbookProvenance?.textbookName || 'Official Curriculum Standards (CBSE/ICSE/IB)',
      createdAt: new Date().toISOString(),
      deviceTierCompatibility: 'all',
    },
  }

  return validateLessonManifest(manifest)
}
