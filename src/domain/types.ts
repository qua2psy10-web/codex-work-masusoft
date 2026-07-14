export type WallFace = 'front' | 'back' | 'left' | 'right'
export type LoadCaseId = 'static-empty' | 'static-full' | 'seismic-empty' | 'seismic-full'
export type EarthPressureMethod = 'rankine' | 'at-rest'
export type WallAnalysisModel = 'plate' | 'cantilever'
export type OpeningShape = 'circle' | 'rectangle'
export type ResultStatus = 'ok' | 'warning' | 'ng' | 'out-of-range'

export interface GeometryInput {
  innerWidth: number
  innerDepth: number
  innerHeight: number
  wallThickness: number
  baseThickness: number
}

export interface OpeningDefinition {
  enabled: boolean
  face: WallFace
  shape: OpeningShape
  width: number
  height: number
  diameter: number
  centerX: number
  centerY: number
}

export type OpeningInput = Record<WallFace, OpeningDefinition>

export interface SoilWaterInput {
  unitWeight: number
  saturatedUnitWeight: number
  frictionAngle: number
  cohesion: number
  externalWaterLevel: number
  internalWaterLevel: number
  waterUnitWeight: number
  pressureMethod: EarthPressureMethod
  manualStaticCoefficient: number | null
  manualSeismicCoefficient: number | null
  allowableBearing: number
  useTerzaghiReference: boolean
  foundationWidth: number
  foundationDepth: number
  bearingSafetyFactor: number
}

export interface LoadInput {
  uniformSurcharge: number
  coverDeadLoad: number
  wheelLoad: number
  contactWidth: number
  contactLength: number
  impactFactor: number
  dispersionAngle: number
  vehicleEnabled: boolean
}

export interface SeismicInput {
  horizontalCoefficient: number
}

export interface RebarLayer {
  diameter: number
  spacing: number
}

export interface RebarInput {
  wallVerticalInner: RebarLayer
  wallVerticalOuter: RebarLayer
  wallHorizontalInner: RebarLayer
  wallHorizontalOuter: RebarLayer
  baseTopX: RebarLayer
  baseTopY: RebarLayer
  baseBottomX: RebarLayer
  baseBottomY: RebarLayer
  cover: number
  concreteElasticModulus: number
  steelElasticModulus: number
  allowableConcreteCompression: number
  allowableSteelTension: number
  allowableConcreteShear: number
  allowableBond: number
  minimumRebarRatio: number
}

export interface BasicInput {
  projectTitle: string
  wallModel: WallAnalysisModel
  runStability: boolean
  runMembers: boolean
  concreteUnitWeight: number
  upliftSafetyFactor: number
}

export interface DisplaySettings {
  activeStep: number
  previewMode: 'section' | 'plan' | '3d'
  resultTab: 'stability' | 'wall' | 'base' | 'opening' | 'trace'
}

export interface ProjectV1 {
  schemaVersion: 1
  id: string
  updatedAt: string
  basic: BasicInput
  geometry: GeometryInput
  openings: OpeningInput
  soilWater: SoilWaterInput
  loads: LoadInput
  seismic: SeismicInput
  rebar: RebarInput
  display: DisplaySettings
}

export interface CalculationTrace {
  id: string
  category: string
  label: string
  formula: string
  substitution: string
  result: number
  unit: string
  source: string
  caseId?: LoadCaseId
}

export interface PressureResult {
  staticCoefficient: number
  seismicCoefficient: number
  topPressure: number
  bottomPressure: number
  resultant: number
  applicationHeight: number
  tensionCrackDepth: number
  vehicleSurcharge: number
}

export interface StabilityResult {
  resistingWeight: number
  upliftForce: number
  upliftSafetyFactor: number
  verticalResultant: number
  overturningMoment: number
  eccentricity: number
  bearingMin: number
  bearingMax: number
  allowableBearing: number
  terzaghiReference: number
  status: ResultStatus
}

export interface MemberCheckResult {
  id: string
  member: 'wall' | 'base'
  face: WallFace | 'base'
  direction: 'vertical-inner' | 'vertical-outer' | 'horizontal-inner' | 'horizontal-outer' | 'x-top' | 'x-bottom' | 'y-top' | 'y-bottom'
  caseId: LoadCaseId
  model: WallAnalysisModel | 'four-edge-plate'
  moment: number
  shear: number
  concreteStress: number
  steelStress: number
  shearStress: number
  requiredAs: number
  providedAs: number
  suggestedBar: string
  utilization: number
  status: ResultStatus
}

export interface OpeningCheckResult {
  face: WallFace
  enabled: boolean
  geometryValid: boolean
  cutVerticalAs: number
  cutHorizontalAs: number
  requiredVerticalAsEachSide: number
  requiredHorizontalAsEachSide: number
  anchorageLength: number
  suggestedBar: string
  messages: string[]
  status: ResultStatus
}

export interface CaseResult {
  id: LoadCaseId
  label: string
  isSeismic: boolean
  isFull: boolean
  pressure: PressureResult
  stability: StabilityResult
  wallChecks: MemberCheckResult[]
  baseChecks: MemberCheckResult[]
}

export interface GoverningResult {
  uplift: LoadCaseId
  bearing: LoadCaseId
  wall: LoadCaseId
  base: LoadCaseId
}

export interface CalculationResult {
  calculatedAt: string
  cases: Record<LoadCaseId, CaseResult>
  openings: OpeningCheckResult[]
  governing: GoverningResult
  traces: CalculationTrace[]
  warnings: string[]
}
