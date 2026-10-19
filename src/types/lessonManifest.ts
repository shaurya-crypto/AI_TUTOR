import { z } from 'zod'
import { VisualizationSceneType } from '@/components/whiteboard/scenes/sceneTypes'

export type LessonContentType =
  | 'TEXT_STEP'
  | 'BOARD_STEP'
  | 'IMAGE'
  | 'VIDEO'
  | 'ANIMATION'
  | 'GRAPH'
  | 'DIAGRAM'
  | 'SCENE_3D'
  | 'QUICK_CHECK'
  | 'SUMMARY'

export type EducationalBoard = 'CBSE' | 'ICSE' | 'IB'

export interface TextStepContent {
  explanation: string
  keyTakeaway: string
  audioCue?: string
}

export interface BoardStepContent {
  title?: string
  equations: string[]
  derivationSteps?: string[]
  annotations?: string[]
  roughWork?: string
  highlightBoxes?: string[]
}

export interface ImageContent {
  url: string
  alt: string
  caption?: string
  attribution?: string
  provenance: 'textbook' | 'open_licensed' | 'ai_generated' | 'fallback'
  license?: string
  fallbackSvg?: string
}

export interface VideoContent {
  url: string
  title: string
  description?: string
  provider: 'authorized_partner' | 'local_asset' | 'fallback_animation'
  durationSeconds?: number
  captionsUrl?: string
  attribution?: string
  fallbackAnimationType?: string
}

export interface ProceduralAnimationContent {
  animationType:
    | 'projectile_motion'
    | 'wave_propagation'
    | 'circuit_flow'
    | 'pendulum'
    | 'optics_ray_trace'
    | 'procedural_canvas'
  durationSeconds: number
  parameters?: Record<string, number | string | boolean>
  progressiveLabels?: { timeMs: number; label: string }[]
}

export interface GraphVariable {
  name: string
  label: string
  min: number
  max: number
  current: number
  step?: number
  unit?: string
}

export interface GraphDataPoint {
  x: number
  y: number
  label?: string
  highlight?: boolean
}

export interface GraphProgressiveStep {
  stepIndex: number
  action: 'axes' | 'points' | 'line' | 'slope_triangle' | 'intercept' | 'highlight'
  description: string
}

export interface GraphContent {
  title: string
  graphType: 'function' | 'scatter' | 'parametric'
  expression?: string
  variables?: GraphVariable[]
  domain: [number, number] // [xMin, xMax]
  range: [number, number]  // [yMin, yMax]
  xLabel: string
  yLabel: string
  dataPoints?: GraphDataPoint[]
  progressiveSteps?: GraphProgressiveStep[]
  activeStep?: number
  slopeValue?: number
  intercept?: { x?: number; y?: number; label?: string }
}

export interface DiagramLabel {
  id: string
  text: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  revealStep?: number
  highlight?: boolean
}

export interface DiagramContent {
  diagramType:
    | 'forces_fbd'
    | 'ray_optics'
    | 'electric_circuit'
    | 'cell_organelles'
    | 'bohr_model'
    | 'states_of_matter'
    | 'photosynthesis'
    | 'waves_spectrum'
  title: string
  description?: string
  labels: DiagramLabel[]
  progressiveSteps?: {
    step: number
    title: string
    activeLabelIds: string[]
    description: string
  }[]
  activeStep?: number
}

export interface Scene3DContent {
  sceneType: VisualizationSceneType
  title: string
  initialParams?: Record<string, any>
  cameraPosition?: [number, number, number]
}

export interface QuickCheckOption {
  id: string
  text: string
}

export interface QuickCheckContent {
  question: string
  options: QuickCheckOption[]
  correctOptionId: string
  explanation: string
  hint?: string
}

export interface SummaryContent {
  recapPoints: string[]
  formulasToRemember: string[]
  examTips: string[]
}

export interface SourceCitation {
  textbookName?: string
  pageNumber?: number
  section?: string
  verifiedSource: boolean
  provenanceType: 'ncert_textbook' | 'icse_selina' | 'ib_oxford' | 'verified_curriculum' | 'ai_synthesized'
}

export interface LessonStep {
  id: string
  stepNumber: number
  title: string
  type: LessonContentType
  assetStatus?: 'ready' | 'needs_generation' | 'needs_retrieval'
  content: {
    text?: TextStepContent
    board?: BoardStepContent
    image?: ImageContent
    video?: VideoContent
    animation?: ProceduralAnimationContent
    graph?: GraphContent
    diagram?: DiagramContent
    scene3D?: Scene3DContent
    quickCheck?: QuickCheckContent
    summary?: SummaryContent
  }
  boardDirective?: {
    action:
      | 'draw_title'
      | 'draw_note'
      | 'draw_step'
      | 'draw_highlight_box'
      | 'draw_rough_work'
      | 'clear_rough'
      | 'draw_question'
      | 'draw_flowchart'
      | 'draw_graph'
      | 'draw_image'
      | 'draw_video'
      | 'draw_diagram'
    content: string
  }
  estimatedSeconds?: number
  sourceCitation?: SourceCitation
}

export interface VisualLessonManifest {
  version: '1.0.0'
  moduleId: string
  curriculumId?: string
  title: string
  subject: string
  classLevel: string
  board: EducationalBoard
  steps: LessonStep[]
  metadata: {
    totalEstimatedMinutes: number
    author: string
    provenance: string
    createdAt: string
    deviceTierCompatibility?: 'all' | 'high_performance'
  }
}

// ---------------------------------------------------------------------------
// Visual Event Actions for Synchronization with Gemini Live
// ---------------------------------------------------------------------------
export type VisualEventActionType =
  | 'SHOW_MEDIA'
  | 'SHOW_SCENE'
  | 'UPDATE_GRAPH'
  | 'REVEAL_DIAGRAM_STEP'
  | 'HIGHLIGHT_BOARD'
  | 'PLAY_ANIMATION'
  | 'PAUSE_MEDIA'
  | 'ASK_CHECK'
  | 'SAVE_LESSON_POSITION'
  | 'UPDATE_SCENE'
  | 'CLOSE_SCENE'

export interface VisualEvent {
  id: string
  action: VisualEventActionType
  timestamp: number
  stepIndex?: number
  parameters: Record<string, any>
}

export interface VisualEventResponse {
  eventId: string
  status: 'acknowledged' | 'failed'
  message?: string
}

// ---------------------------------------------------------------------------
// Zod Validation Schemas
// ---------------------------------------------------------------------------
export const SourceCitationSchema = z.object({
  textbookName: z.string().optional(),
  pageNumber: z.number().optional(),
  section: z.string().optional(),
  verifiedSource: z.boolean(),
  provenanceType: z.enum([
    'ncert_textbook',
    'icse_selina',
    'ib_oxford',
    'verified_curriculum',
    'ai_synthesized',
  ]),
})

export const LessonStepSchema = z.object({
  id: z.string().min(1),
  stepNumber: z.number().int().min(1),
  title: z.string().min(1),
  type: z.enum([
    'TEXT_STEP',
    'BOARD_STEP',
    'IMAGE',
    'VIDEO',
    'ANIMATION',
    'GRAPH',
    'DIAGRAM',
    'SCENE_3D',
    'QUICK_CHECK',
    'SUMMARY',
  ]),
  assetStatus: z.enum(['ready', 'needs_generation', 'needs_retrieval']).optional(),
  content: z.object({
    text: z.any().optional(),
    board: z.any().optional(),
    image: z.any().optional(),
    video: z.any().optional(),
    animation: z.any().optional(),
    graph: z.any().optional(),
    diagram: z.any().optional(),
    scene3D: z.any().optional(),
    quickCheck: z.any().optional(),
    summary: z.any().optional(),
  }),
  boardDirective: z
    .object({
      action: z.enum([
        'draw_title',
        'draw_note',
        'draw_step',
        'draw_highlight_box',
        'draw_rough_work',
        'clear_rough',
        'draw_question',
        'draw_graph',
        'draw_image',
        'draw_video',
        'draw_diagram',
      ]),
      content: z.string(),
    })
    .optional(),
  estimatedSeconds: z.number().optional(),
  sourceCitation: SourceCitationSchema.optional(),
})

export const VisualLessonManifestSchema = z.object({
  version: z.literal('1.0.0'),
  moduleId: z.string().min(1),
  curriculumId: z.string().optional(),
  title: z.string().min(1),
  subject: z.string().min(1),
  classLevel: z.string().min(1),
  board: z.enum(['CBSE', 'ICSE', 'IB']),
  steps: z.array(LessonStepSchema).min(1),
  metadata: z.object({
    totalEstimatedMinutes: z.number(),
    author: z.string(),
    provenance: z.string(),
    createdAt: z.string(),
    deviceTierCompatibility: z.enum(['all', 'high_performance']).optional(),
  }),
})

export function validateLessonManifest(data: unknown): VisualLessonManifest {
  return VisualLessonManifestSchema.parse(data) as VisualLessonManifest
}
