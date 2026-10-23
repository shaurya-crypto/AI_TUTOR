import {
  VisualizationSceneType,
  VisualizationSceneMetadata,
  IInteractiveScene,
} from './sceneTypes'
import { Geometry3DScene } from './Geometry3DScene'
import { CrossSectionScene } from './CrossSectionScene'

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
}

export const SCENE_TYPE_ALIASES: Record<string, VisualizationSceneType> = {
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
}

export function resolveSceneType(typeOrAlias?: string | null): VisualizationSceneType {
  if (!typeOrAlias) return 'geometry_3d'
  const normalized = typeOrAlias.trim().toLowerCase().replace(/-/g, '_')
  return SCENE_TYPE_ALIASES[normalized] || 'geometry_3d'
}

export function createInteractiveScene(type: string): IInteractiveScene {
  const resolved = resolveSceneType(type)
  switch (resolved) {
    case 'geometry_3d':
      return new Geometry3DScene()
    case 'geometry_cross_section':
      return new CrossSectionScene()
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
      result[k] = true
    }
  })
  return result
}
