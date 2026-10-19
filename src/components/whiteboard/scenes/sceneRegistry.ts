import {
  VisualizationSceneType,
  VisualizationSceneMetadata,
  IInteractiveScene,
} from './sceneTypes'
import { Geometry3DScene } from './Geometry3DScene'
import { CrossSectionScene } from './CrossSectionScene'
import { LinearGraphScene } from './LinearGraphScene'
import { PhysicsForcesScene } from './PhysicsForcesScene'
import { OpticsRefractionScene } from './OpticsRefractionScene'
import { CircuitsInteractiveScene } from './CircuitsInteractiveScene'
import { BohrAtomScene } from './BohrAtomScene'
import { StatesOfMatterScene } from './StatesOfMatterScene'
import { WaveHarmonicsScene } from './WaveHarmonicsScene'
import { CoordinateGeometryScene } from './CoordinateGeometryScene'

export const SCENE_METADATA_REGISTRY: Record<VisualizationSceneType, VisualizationSceneMetadata> = {
  geometry_3d: {
    id: 'geometry_3d',
    title: '3D Solid Geometry & Surface Area',
    subject: 'Mathematics',
    description: 'Inspect 3D solids (cube, cuboid, sphere, cylinder, cone, prism, pyramid) with live rotation, wireframes, and dimensions.',
    educationalFormula: 'Volume & Surface Area formulas depend on selected solid shape.',
    curriculumTags: ['Class 9 Mensuration', 'Class 10 Surface Areas & Volumes', 'CBSE / ICSE / IB'],
    parameters: {
      shape: {
        name: 'shape',
        label: 'Solid Shape',
        type: 'select',
        defaultValue: 'cube',
        options: [
          { label: 'Cube', value: 'cube' },
          { label: 'Cuboid', value: 'cuboid' },
          { label: 'Cylinder', value: 'cylinder' },
          { label: 'Cone', value: 'cone' },
          { label: 'Sphere', value: 'sphere' },
          { label: 'Pyramid', value: 'pyramid' },
          { label: 'Prism', value: 'prism' },
        ],
      },
      dimension1: {
        name: 'dimension1',
        label: 'Length / Radius',
        type: 'number',
        min: 1,
        max: 6,
        step: 0.5,
        defaultValue: 3,
        unit: 'cm',
      },
      dimension2: {
        name: 'dimension2',
        label: 'Height / Width',
        type: 'number',
        min: 1,
        max: 6,
        step: 0.5,
        defaultValue: 3,
        unit: 'cm',
      },
      wireframe: {
        name: 'wireframe',
        label: 'Wireframe Mode',
        type: 'boolean',
        defaultValue: false,
      },
    },
  },

  geometry_cross_section: {
    id: 'geometry_cross_section',
    title: 'Cross-Sections of 3D Solids',
    subject: 'Mathematics',
    description: 'Pass cutting planes across 3D solids at adjustable heights and angles to examine resultant 2D cross sections.',
    educationalFormula: 'Slicing cylinder parallel to base = Circle; angled = Ellipse; perpendicular = Rectangle.',
    curriculumTags: ['Class 7-9 Geometry', 'Conic Sections'],
    parameters: {
      shape: {
        name: 'shape',
        label: 'Solid',
        type: 'select',
        defaultValue: 'cylinder',
        options: [
          { label: 'Cylinder', value: 'cylinder' },
          { label: 'Cone', value: 'cone' },
          { label: 'Sphere', value: 'sphere' },
          { label: 'Cube', value: 'cube' },
        ],
      },
      slicePosition: {
        name: 'slicePosition',
        label: 'Plane Height (y)',
        type: 'number',
        min: -1.8,
        max: 1.8,
        step: 0.1,
        defaultValue: 0,
      },
      sliceAngle: {
        name: 'sliceAngle',
        label: 'Plane Tilt',
        type: 'number',
        min: 0,
        max: 75,
        step: 5,
        defaultValue: 0,
        unit: '°',
      },
    },
  },

  linear_graphs: {
    id: 'linear_graphs',
    title: 'Linear Graphs: y = mx + c',
    subject: 'Mathematics',
    description: 'Explore the slope-intercept form of linear equations with real-time gradient and intercept manipulation.',
    educationalFormula: 'y = m*x + c, Gradient m = (y2 - y1) / (x2 - x1)',
    curriculumTags: ['Class 9 Coordinate Geometry', 'Class 10 Linear Equations'],
    parameters: {
      slope: {
        name: 'slope',
        label: 'Slope (m)',
        type: 'number',
        min: -4,
        max: 4,
        step: 0.25,
        defaultValue: 1.5,
      },
      intercept: {
        name: 'intercept',
        label: 'Y-Intercept (c)',
        type: 'number',
        min: -5,
        max: 5,
        step: 0.5,
        defaultValue: 1,
      },
      showSlopeTriangle: {
        name: 'showSlopeTriangle',
        label: 'Rise / Run Triangle',
        type: 'boolean',
        defaultValue: true,
      },
    },
  },

  coordinate_geometry: {
    id: 'coordinate_geometry',
    title: '3D Coordinate Points & Vectors',
    subject: 'Mathematics',
    description: 'Plot 3D coordinates, calculate Euclidean distance between two points, and visualize midpoint coordinates.',
    educationalFormula: 'd = √[(x2 - x1)² + (y2 - y1)² + (z2 - z1)²]',
    curriculumTags: ['Class 10-11 Coordinate Geometry', 'Vector Algebra'],
    parameters: {
      x1: { name: 'x1', label: 'Point A (x)', type: 'number', min: -5, max: 5, step: 0.5, defaultValue: 2 },
      y1: { name: 'y1', label: 'Point A (y)', type: 'number', min: -5, max: 5, step: 0.5, defaultValue: 3 },
      x2: { name: 'x2', label: 'Point B (x)', type: 'number', min: -5, max: 5, step: 0.5, defaultValue: -2 },
      y2: { name: 'y2', label: 'Point B (y)', type: 'number', min: -5, max: 5, step: 0.5, defaultValue: -1 },
    },
  },

  physics_forces: {
    id: 'physics_forces',
    title: 'Forces & Inclined Plane Dynamics',
    subject: 'Physics',
    description: 'Analyze free-body diagrams with gravity, normal force, applied force, and friction on flat or inclined surfaces.',
    educationalFormula: 'F_net = F_applied - f_friction - mg*sin(θ) = m*a',
    curriculumTags: ['Class 9 Force & Laws of Motion', 'Class 11 Classical Mechanics'],
    parameters: {
      mass: {
        name: 'mass',
        label: 'Mass (m)',
        type: 'number',
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 5,
        unit: 'kg',
      },
      appliedForce: {
        name: 'appliedForce',
        label: 'Applied Force',
        type: 'number',
        min: 0,
        max: 80,
        step: 2,
        defaultValue: 30,
        unit: 'N',
      },
      frictionCoeff: {
        name: 'frictionCoeff',
        label: 'Friction (μ)',
        type: 'number',
        min: 0,
        max: 0.8,
        step: 0.05,
        defaultValue: 0.3,
      },
      inclineAngle: {
        name: 'inclineAngle',
        label: 'Incline Angle (θ)',
        type: 'number',
        min: 0,
        max: 45,
        step: 5,
        defaultValue: 0,
        unit: '°',
      },
    },
  },

  optics_refraction: {
    id: 'optics_refraction',
    title: 'Optics: Refraction & Snell\'s Law',
    subject: 'Physics',
    description: 'Trace incident, reflected, and refracted light rays across an optical interface with variable refractive index.',
    educationalFormula: 'n1 * sin(θ1) = n2 * sin(θ2), Critical Angle θc = arcsin(n2 / n1)',
    curriculumTags: ['Class 10 Light Reflection & Refraction', 'Class 12 Wave & Ray Optics'],
    parameters: {
      incidentAngle: {
        name: 'incidentAngle',
        label: 'Incident Angle (θ1)',
        type: 'number',
        min: 0,
        max: 85,
        step: 5,
        defaultValue: 45,
        unit: '°',
      },
      n1: {
        name: 'n1',
        label: 'Medium 1 Index (n1)',
        type: 'number',
        min: 1.0,
        max: 2.0,
        step: 0.1,
        defaultValue: 1.0,
      },
      n2: {
        name: 'n2',
        label: 'Medium 2 Index (n2)',
        type: 'number',
        min: 1.0,
        max: 2.4,
        step: 0.1,
        defaultValue: 1.5,
      },
    },
  },

  circuits_interactive: {
    id: 'circuits_interactive',
    title: 'Electric Circuits: Ohm\'s Law',
    subject: 'Physics',
    description: 'Simulate series and parallel circuits with live current animation, adjustable voltage, and resistance values.',
    educationalFormula: 'V = I * R, Series: R_eq = R1 + R2, Parallel: 1/R_eq = 1/R1 + 1/R2',
    curriculumTags: ['Class 10 Electricity', 'Class 12 Current Electricity'],
    parameters: {
      circuitType: {
        name: 'circuitType',
        label: 'Topology',
        type: 'select',
        defaultValue: 'series',
        options: [
          { label: 'Series Circuit', value: 'series' },
          { label: 'Parallel Circuit', value: 'parallel' },
        ],
      },
      voltage: {
        name: 'voltage',
        label: 'Voltage (V)',
        type: 'number',
        min: 2,
        max: 24,
        step: 1,
        defaultValue: 12,
        unit: 'V',
      },
      r1: {
        name: 'r1',
        label: 'Resistor R1',
        type: 'number',
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 4,
        unit: 'Ω',
      },
      r2: {
        name: 'r2',
        label: 'Resistor R2',
        type: 'number',
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 6,
        unit: 'Ω',
      },
    },
  },

  bohr_atom: {
    id: 'bohr_atom',
    title: 'Bohr Atomic Model & Orbitals',
    subject: 'Chemistry',
    description: 'Examine central protons and neutrons surrounded by orbiting electrons distributed across K, L, M electron shells.',
    educationalFormula: '2n² rule: Shell 1 (K)=2, Shell 2 (L)=8, Shell 3 (M)=18',
    curriculumTags: ['Class 9 Structure of the Atom', 'Class 11 Atomic Structure'],
    parameters: {
      element: {
        name: 'element',
        label: 'Element',
        type: 'select',
        defaultValue: 'carbon',
        options: [
          { label: 'Hydrogen (Z=1)', value: 'hydrogen' },
          { label: 'Helium (Z=2)', value: 'helium' },
          { label: 'Carbon (Z=6)', value: 'carbon' },
          { label: 'Oxygen (Z=8)', value: 'oxygen' },
          { label: 'Sodium (Z=11)', value: 'sodium' },
        ],
      },
    },
  },

  states_of_matter: {
    id: 'states_of_matter',
    title: 'Kinetic Particle Theory: States of Matter',
    subject: 'Chemistry',
    description: 'Observe molecular kinetics in solids, liquids, and gases driven by thermodynamic temperature.',
    educationalFormula: 'Average Kinetic Energy: KE_avg = (3/2) * k_B * T',
    curriculumTags: ['Class 9 Matter in Our Surroundings', 'Class 11 States of Matter'],
    parameters: {
      state: {
        name: 'state',
        label: 'State',
        type: 'select',
        defaultValue: 'liquid',
        options: [
          { label: 'Solid (Lattice)', value: 'solid' },
          { label: 'Liquid (Fluid)', value: 'liquid' },
          { label: 'Gas (Diffusing)', value: 'gas' },
        ],
      },
      temperature: {
        name: 'temperature',
        label: 'Temperature (T)',
        type: 'number',
        min: 150,
        max: 550,
        step: 10,
        defaultValue: 300,
        unit: 'K',
      },
    },
  },

  wave_harmonics: {
    id: 'wave_harmonics',
    title: 'Wave Motion: Transverse & Longitudinal',
    subject: 'Physics',
    description: 'Simulate transverse and longitudinal waves with real-time frequency, amplitude, and wavelength sliders.',
    educationalFormula: 'Wave Speed: v = f * λ, Wave Equation: y(x,t) = A*sin(kx - ωt)',
    curriculumTags: ['Class 9 Sound', 'Class 11 Waves'],
    parameters: {
      waveType: {
        name: 'waveType',
        label: 'Wave Form',
        type: 'select',
        defaultValue: 'transverse',
        options: [
          { label: 'Transverse (Perpendicular)', value: 'transverse' },
          { label: 'Longitudinal (Compression)', value: 'longitudinal' },
        ],
      },
      amplitude: {
        name: 'amplitude',
        label: 'Amplitude (A)',
        type: 'number',
        min: 0.5,
        max: 2.5,
        step: 0.2,
        defaultValue: 1.8,
        unit: 'cm',
      },
      frequency: {
        name: 'frequency',
        label: 'Frequency (f)',
        type: 'number',
        min: 0.2,
        max: 2.5,
        step: 0.1,
        defaultValue: 1.0,
        unit: 'Hz',
      },
      wavelength: {
        name: 'wavelength',
        label: 'Wavelength (λ)',
        type: 'number',
        min: 2.0,
        max: 8.0,
        step: 0.5,
        defaultValue: 4.0,
        unit: 'cm',
      },
    },
  },
}

export const SCENE_TYPE_ALIASES: Record<string, VisualizationSceneType> = {
  // Circuits
  circuits: 'circuits_interactive',
  circuit: 'circuits_interactive',
  circuits_interactive: 'circuits_interactive',
  electricity: 'circuits_interactive',
  resistors: 'circuits_interactive',
  // Forces / Mechanics
  forces: 'physics_forces',
  force: 'physics_forces',
  physics_forces: 'physics_forces',
  fbd: 'physics_forces',
  mechanics: 'physics_forces',
  newton: 'physics_forces',
  // Optics / Refraction
  optics: 'optics_refraction',
  optic: 'optics_refraction',
  refraction: 'optics_refraction',
  snell: 'optics_refraction',
  optics_refraction: 'optics_refraction',
  light: 'optics_refraction',
  lens: 'optics_refraction',
  // Waves / Harmonics
  waves: 'wave_harmonics',
  wave: 'wave_harmonics',
  wave_harmonics: 'wave_harmonics',
  sound: 'wave_harmonics',
  harmonic: 'wave_harmonics',
  // States of Matter
  matter: 'states_of_matter',
  states_of_matter: 'states_of_matter',
  particles: 'states_of_matter',
  kinetic_theory: 'states_of_matter',
  // Linear Graphs
  linear_graph: 'linear_graphs',
  linear_graphs: 'linear_graphs',
  graph: 'linear_graphs',
  slope: 'linear_graphs',
  // Coordinate Geometry / 3D Vectors
  '3d_vectors': 'coordinate_geometry',
  vectors: 'coordinate_geometry',
  coordinate_geometry: 'coordinate_geometry',
  vector_3d: 'coordinate_geometry',
  coordinates: 'coordinate_geometry',
  // Geometry 3D
  geometry: 'geometry_3d',
  geometry_3d: 'geometry_3d',
  mensuration: 'geometry_3d',
  solids: 'geometry_3d',
  solid: 'geometry_3d',
  shapes: 'geometry_3d',
  // Cross Sections
  cross_section: 'geometry_cross_section',
  cross_sections: 'geometry_cross_section',
  geometry_cross_section: 'geometry_cross_section',
  conic_sections: 'geometry_cross_section',
  slice: 'geometry_cross_section',
  // Bohr Atom
  bohr_atom: 'bohr_atom',
  atom: 'bohr_atom',
  atomic_structure: 'bohr_atom',
  rutherford: 'bohr_atom',
}

export function resolveSceneType(typeOrAlias?: string | null): VisualizationSceneType {
  if (!typeOrAlias) return 'geometry_3d'
  const normalized = typeOrAlias.trim().toLowerCase().replace(/-/g, '_')
  return SCENE_TYPE_ALIASES[normalized] || (normalized as VisualizationSceneType)
}

export function createInteractiveScene(type: string): IInteractiveScene {
  const resolved = resolveSceneType(type)
  switch (resolved) {
    case 'geometry_3d':
      return new Geometry3DScene()
    case 'geometry_cross_section':
      return new CrossSectionScene()
    case 'linear_graphs':
      return new LinearGraphScene()
    case 'coordinate_geometry':
      return new CoordinateGeometryScene()
    case 'physics_forces':
      return new PhysicsForcesScene()
    case 'optics_refraction':
      return new OpticsRefractionScene()
    case 'circuits_interactive':
      return new CircuitsInteractiveScene()
    case 'bohr_atom':
      return new BohrAtomScene()
    case 'states_of_matter':
      return new StatesOfMatterScene()
    case 'wave_harmonics':
      return new WaveHarmonicsScene()
    default:
      return new Geometry3DScene()
  }
}

/**
 * Universal parser for 3D scene parameters supporting JSON, key-value comma/pipe, and standalone boolean flags.
 */
export function parseSceneParams(rawParams?: string | null): Record<string, any> {
  if (!rawParams || !rawParams.trim()) return {}
  const trimmed = rawParams.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // Fallback to key-value parsing
    }
  }
  const result: Record<string, any> = {}
  const delimiter = trimmed.includes('|') ? '|' : ','
  trimmed.split(delimiter).forEach((pair) => {
    const [k, ...vParts] = pair.split('=').map((s) => s.trim())
    const v = vParts.join('=').trim()
    if (k && v !== undefined && v !== '') {
      const cleanV = v.replace(/^["']|["']$/g, '')
      const num = Number(cleanV)
      result[k] = !isNaN(num) && cleanV !== '' ? num : cleanV === 'true' ? true : cleanV === 'false' ? false : cleanV
    } else if (k && vParts.length === 0) {
      // Standalone boolean flags like "wireframe" or "grid"
      result[k] = true
    }
  })
  return result
}
