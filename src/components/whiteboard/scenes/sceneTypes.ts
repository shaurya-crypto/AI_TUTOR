// Scene Types and Parameter Definitions for Educational Visualizations

export type VisualizationSceneType =
  | 'geometry_3d'
  | 'geometry_cross_section'

export interface SceneParameterDefinition {
  name: string
  label: string
  type: 'number' | 'select' | 'boolean'
  min?: number
  max?: number
  step?: number
  defaultValue: any
  options?: { label: string; value: string }[]
  unit?: string
  description?: string
}

export interface VisualizationSceneMetadata {
  id: VisualizationSceneType
  title: string
  subject: 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology'
  description: string
  parameters: Record<string, SceneParameterDefinition>
  educationalFormula?: string
  curriculumTags: string[]
}

export interface ActiveSceneState {
  type: VisualizationSceneType
  title?: string
  parameters: Record<string, any>
  isPaused: boolean
  showLabels: boolean
  showMeasurements: boolean
}

export interface IInteractiveScene {
  init(container: HTMLDivElement): void
  updateParameters(params: Record<string, any>): void
  toggleLabels(show: boolean): void
  toggleMeasurements(show: boolean): void
  setPaused(paused: boolean): void
  resetCamera(): void
  dispose(): void
}
