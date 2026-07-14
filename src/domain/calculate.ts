import {
  atRestCoefficient,
  barArea,
  cantileverActions,
  mononobeOkabeCoefficient,
  providedArea,
  rankineCoefficient,
  suggestRebar,
  terzaghiReference,
  trapezoidResultant,
  vehicleSurcharge,
} from './engineering'
import { solveFourFixedPlate, solveThreeFixedOneFreePlate } from './plate'
import type {
  CalculationResult,
  CalculationTrace,
  CaseResult,
  LoadCaseId,
  MemberCheckResult,
  OpeningCheckResult,
  ProjectV1,
  RebarLayer,
  ResultStatus,
  WallFace,
} from './types'

const CASES: Array<{ id: LoadCaseId; label: string; seismic: boolean; full: boolean }> = [
  { id: 'static-empty', label: '常時・空虚', seismic: false, full: false },
  { id: 'static-full', label: '常時・満水', seismic: false, full: true },
  { id: 'seismic-empty', label: '地震時・空虚', seismic: true, full: false },
  { id: 'seismic-full', label: '地震時・満水', seismic: true, full: true },
]

const faces: WallFace[] = ['front', 'back', 'left', 'right']

function trace(
  traces: CalculationTrace[],
  value: Omit<CalculationTrace, 'id'>,
) {
  traces.push({ ...value, id: `${value.category}-${traces.length + 1}` })
}

function statusFromUtilization(value: number): ResultStatus {
  if (!Number.isFinite(value)) return 'out-of-range'
  if (value > 1) return 'ng'
  if (value >= 0.8) return 'warning'
  return 'ok'
}

function sectionCheck(
  id: string,
  project: ProjectV1,
  caseId: LoadCaseId,
  member: 'wall' | 'base',
  face: WallFace | 'base',
  direction: MemberCheckResult['direction'],
  model: MemberCheckResult['model'],
  moment: number,
  shear: number,
  thickness: number,
  layer: RebarLayer,
): MemberCheckResult {
  const { rebar } = project
  const b = 1000
  const totalDepth = thickness * 1000
  const d = totalDepth - rebar.cover - layer.diameter / 2
  const as = providedArea(layer)
  const n = rebar.steelElasticModulus / rebar.concreteElasticModulus
  const neutral = (-n * as + Math.sqrt((n * as) ** 2 + 2 * b * n * as * d)) / b
  const inertia = b * neutral ** 3 / 3 + n * as * (d - neutral) ** 2
  const mNmm = Math.abs(moment) * 1_000_000
  const concreteStress = inertia > 0 ? mNmm * neutral / inertia : Number.POSITIVE_INFINITY
  const steelStress = inertia > 0 ? n * mNmm * (d - neutral) / inertia : Number.POSITIVE_INFINITY
  const shearStress = d > 0 ? Math.abs(shear) * 1000 / (b * 0.9 * d) : Number.POSITIVE_INFINITY
  const flexuralRequired = d > 0
    ? mNmm / (rebar.allowableSteelTension * 0.9 * d)
    : Number.POSITIVE_INFINITY
  const minimumRequired = rebar.minimumRebarRatio * b * totalDepth
  const requiredAs = Math.max(flexuralRequired, minimumRequired)
  const suggested = suggestRebar(requiredAs)
  const utilization = Math.max(
    concreteStress / rebar.allowableConcreteCompression,
    steelStress / rebar.allowableSteelTension,
    shearStress / rebar.allowableConcreteShear,
    requiredAs / as,
  )
  return {
    id,
    member,
    face,
    direction,
    caseId,
    model,
    moment,
    shear,
    concreteStress,
    steelStress,
    shearStress,
    requiredAs,
    providedAs: as,
    suggestedBar: suggested.label,
    utilization,
    status: statusFromUtilization(utilization),
  }
}

function openingChecks(project: ProjectV1): OpeningCheckResult[] {
  const { geometry, openings, rebar } = project
  return faces.map((face) => {
    const item = openings[face]
    if (!item.enabled) {
      return {
        face,
        enabled: false,
        geometryValid: true,
        cutVerticalAs: 0,
        cutHorizontalAs: 0,
        requiredVerticalAsEachSide: 0,
        requiredHorizontalAsEachSide: 0,
        anchorageLength: 0,
        suggestedBar: '—',
        messages: [],
        status: 'ok',
      }
    }
    const wallWidth = face === 'front' || face === 'back' ? geometry.innerWidth : geometry.innerDepth
    const openingWidth = item.shape === 'circle' ? item.diameter : item.width
    const openingHeight = item.shape === 'circle' ? item.diameter : item.height
    const horizontalClearance = Math.min(item.centerX - openingWidth / 2, wallWidth - item.centerX - openingWidth / 2)
    const verticalClearance = Math.min(item.centerY - openingHeight / 2, geometry.innerHeight - item.centerY - openingHeight / 2)
    const geometryValid = horizontalClearance >= 0.1 && verticalClearance >= 0.1
    const verticalLayer = rebar.wallVerticalInner
    const horizontalLayer = rebar.wallHorizontalInner
    const cutVerticalBars = Math.floor(openingWidth * 1000 / verticalLayer.spacing) + 1
    const cutHorizontalBars = Math.floor(openingHeight * 1000 / horizontalLayer.spacing) + 1
    const cutVerticalAs = cutVerticalBars * barArea(verticalLayer.diameter)
    const cutHorizontalAs = cutHorizontalBars * barArea(horizontalLayer.diameter)
    const required = Math.max(cutVerticalAs, cutHorizontalAs) / 2
    const suggestion = suggestRebar(required * 1000 / Math.max(openingHeight * 1000, 1))
    const anchorageLength = rebar.allowableSteelTension * suggestion.diameter / (4 * rebar.allowableBond)
    const messages = geometryValid ? [] : ['開口端から壁端まで100 mm以上の離隔が必要です。']
    return {
      face,
      enabled: true,
      geometryValid,
      cutVerticalAs,
      cutHorizontalAs,
      requiredVerticalAsEachSide: cutVerticalAs / 2,
      requiredHorizontalAsEachSide: cutHorizontalAs / 2,
      anchorageLength,
      suggestedBar: suggestion.label,
      messages,
      status: geometryValid ? 'ok' : 'out-of-range',
    }
  })
}

function buildCase(
  project: ProjectV1,
  caseDefinition: (typeof CASES)[number],
  traces: CalculationTrace[],
  warnings: string[],
): CaseResult {
  const { geometry: g, soilWater: soil, loads, rebar, basic } = project
  const kh = caseDefinition.seismic ? project.seismic.horizontalCoefficient : 0
  const calculatedStatic = soil.pressureMethod === 'rankine'
    ? rankineCoefficient(soil.frictionAngle)
    : atRestCoefficient(soil.frictionAngle)
  const calculatedSeismic = mononobeOkabeCoefficient(soil.frictionAngle, kh)
  const staticCoefficient = soil.manualStaticCoefficient ?? calculatedStatic
  const seismicCoefficient = caseDefinition.seismic
    ? (soil.manualSeismicCoefficient ?? calculatedSeismic)
    : staticCoefficient
  const coefficient = seismicCoefficient

  if (!Number.isFinite(coefficient)) {
    warnings.push(`${caseDefinition.label}: 物部・岡部式の成立範囲外です。手動係数を入力してください。`)
  }

  const midDepth = g.innerHeight / 2
  const vehicle = loads.vehicleEnabled
    ? vehicleSurcharge(
      loads.wheelLoad,
      loads.impactFactor,
      loads.contactWidth,
      loads.contactLength,
      midDepth,
      loads.dispersionAngle,
    )
    : 0
  const surcharge = loads.uniformSurcharge + vehicle
  const rootK = Math.sqrt(Math.max(coefficient, 0))
  const soilTop = Math.max(0, coefficient * surcharge - 2 * soil.cohesion * rootK)
  const soilBottom = Math.max(0, coefficient * (soil.unitWeight * g.innerHeight + surcharge) - 2 * soil.cohesion * rootK)
  const tensionCrackDepth = soil.cohesion > 0
    ? Math.min(g.innerHeight, 2 * soil.cohesion / (Math.max(soil.unitWeight, 1e-9) * Math.max(rootK, 1e-9)))
    : 0
  const externalHead = Math.min(soil.externalWaterLevel, g.innerHeight)
  const internalLevel = caseDefinition.full ? Math.min(soil.internalWaterLevel, g.innerHeight) : 0
  const externalBottomWater = soil.waterUnitWeight * externalHead
  const internalBottomWater = soil.waterUnitWeight * internalLevel
  const topPressure = soilTop
  const bottomPressure = soilBottom + externalBottomWater - internalBottomWater
  const resultantData = trapezoidResultant(topPressure, bottomPressure, g.innerHeight)

  trace(traces, {
    category: '土圧',
    label: `${caseDefinition.label} 土圧係数`,
    formula: caseDefinition.seismic ? 'K = Kae' : soil.pressureMethod === 'rankine' ? 'Ka = tan²(45° − φ/2)' : 'K0 = 1 − sinφ',
    substitution: `φ=${soil.frictionAngle.toFixed(3)}°, kh=${kh.toFixed(3)}`,
    result: coefficient,
    unit: '—',
    source: '公開力学式（ランキン／Jaky／物部・岡部）',
    caseId: caseDefinition.id,
  })
  trace(traces, {
    category: '荷重',
    label: `${caseDefinition.label} 自動車等価上載`,
    formula: 'qv = P(1+i) / {(a+2z tanα)(b+2z tanα)}',
    substitution: `P=${loads.wheelLoad}, i=${loads.impactFactor}, z=${midDepth.toFixed(3)}`,
    result: vehicle,
    unit: 'kN/m²',
    source: '矩形分散モデル',
    caseId: caseDefinition.id,
  })

  const outerWidth = g.innerWidth + 2 * g.wallThickness
  const outerDepth = g.innerDepth + 2 * g.wallThickness
  const outerArea = outerWidth * outerDepth
  const baseVolume = outerArea * g.baseThickness
  const wallVolume = (outerArea - g.innerWidth * g.innerDepth) * g.innerHeight
  const concreteWeight = (baseVolume + wallVolume) * basic.concreteUnitWeight
  const internalWaterWeight = caseDefinition.full
    ? g.innerWidth * g.innerDepth * internalLevel * soil.waterUnitWeight
    : 0
  const coverWeight = loads.coverDeadLoad
  const resistingWeight = concreteWeight + internalWaterWeight + coverWeight
  const upliftHead = Math.max(0, soil.externalWaterLevel + g.baseThickness)
  const upliftForce = outerArea * upliftHead * soil.waterUnitWeight
  const upliftSafetyFactor = upliftForce > 0 ? resistingWeight / upliftForce : Number.POSITIVE_INFINITY
  const horizontalInertia = kh * resistingWeight
  const overturningMoment = Math.abs(resultantData.resultant * resultantData.applicationHeight * outerWidth)
    + horizontalInertia * (g.baseThickness + g.innerHeight / 2)
  const verticalResultant = resistingWeight - upliftForce
  const eccentricity = verticalResultant > 0 ? overturningMoment / verticalResultant : Number.POSITIVE_INFINITY
  const bearingAverage = verticalResultant / outerArea
  const bearingMin = bearingAverage * (1 - 6 * eccentricity / outerDepth)
  const bearingMax = bearingAverage * (1 + 6 * eccentricity / outerDepth)
  const terzaghi = terzaghiReference(
    soil.foundationWidth,
    soil.foundationDepth,
    soil.unitWeight,
    soil.cohesion,
    soil.frictionAngle,
    soil.bearingSafetyFactor,
  )
  const allowableBearing = soil.useTerzaghiReference ? terzaghi : soil.allowableBearing
  const stabilityUtilization = Math.max(
    basic.upliftSafetyFactor / Math.max(upliftSafetyFactor, 1e-9),
    bearingMax / allowableBearing,
    bearingMin < 0 ? 1.01 : 0,
  )

  trace(traces, {
    category: '安定',
    label: `${caseDefinition.label} 浮上がり安全率`,
    formula: 'Fs = ΣW / U',
    substitution: `ΣW=${resistingWeight.toFixed(3)}, U=${upliftForce.toFixed(3)}`,
    result: upliftSafetyFactor,
    unit: '—',
    source: '鉛直力の釣合い',
    caseId: caseDefinition.id,
  })

  const plateByFace = {
    front: solveThreeFixedOneFreePlate(g.innerWidth, g.innerHeight, topPressure, bottomPressure, g.wallThickness, rebar.concreteElasticModulus),
    back: solveThreeFixedOneFreePlate(g.innerWidth, g.innerHeight, topPressure, bottomPressure, g.wallThickness, rebar.concreteElasticModulus),
    left: solveThreeFixedOneFreePlate(g.innerDepth, g.innerHeight, topPressure, bottomPressure, g.wallThickness, rebar.concreteElasticModulus),
    right: solveThreeFixedOneFreePlate(g.innerDepth, g.innerHeight, topPressure, bottomPressure, g.wallThickness, rebar.concreteElasticModulus),
  }
  const cantilever = cantileverActions(topPressure, bottomPressure, g.innerHeight)
  const wallChecks: MemberCheckResult[] = []
  for (const face of faces) {
    const plate = plateByFace[face]
    const selectedVerticalMoment = basic.wallModel === 'plate' ? plate.momentY : Math.abs(cantilever.moment)
    const selectedHorizontalMoment = basic.wallModel === 'plate' ? plate.momentX : 0
    const selectedShear = basic.wallModel === 'plate' ? plate.shear : Math.abs(cantilever.shear)
    wallChecks.push(
      sectionCheck(`${caseDefinition.id}-${face}-vi`, project, caseDefinition.id, 'wall', face, 'vertical-inner', basic.wallModel, selectedVerticalMoment, selectedShear, g.wallThickness, rebar.wallVerticalInner),
      sectionCheck(`${caseDefinition.id}-${face}-ho`, project, caseDefinition.id, 'wall', face, 'horizontal-outer', basic.wallModel, selectedHorizontalMoment, selectedShear, g.wallThickness, rebar.wallHorizontalOuter),
    )
  }

  const netBasePressure = Math.max(Math.abs(bearingAverage), Math.abs(upliftForce / outerArea - resistingWeight / outerArea))
  const basePlate = solveFourFixedPlate(g.innerWidth, g.innerDepth, netBasePressure, g.baseThickness, rebar.concreteElasticModulus)
  const baseChecks = [
    sectionCheck(`${caseDefinition.id}-base-xt`, project, caseDefinition.id, 'base', 'base', 'x-top', 'four-edge-plate', basePlate.momentX, basePlate.shear, g.baseThickness, rebar.baseTopX),
    sectionCheck(`${caseDefinition.id}-base-xb`, project, caseDefinition.id, 'base', 'base', 'x-bottom', 'four-edge-plate', basePlate.momentX, basePlate.shear, g.baseThickness, rebar.baseBottomX),
    sectionCheck(`${caseDefinition.id}-base-yt`, project, caseDefinition.id, 'base', 'base', 'y-top', 'four-edge-plate', basePlate.momentY, basePlate.shear, g.baseThickness, rebar.baseTopY),
    sectionCheck(`${caseDefinition.id}-base-yb`, project, caseDefinition.id, 'base', 'base', 'y-bottom', 'four-edge-plate', basePlate.momentY, basePlate.shear, g.baseThickness, rebar.baseBottomY),
  ]

  trace(traces, {
    category: '部材',
    label: `${caseDefinition.label} 側壁板係数（縦）`,
    formula: 'Rayleigh–Ritz: δ(U−W)=0',
    substitution: `${plateByFace.front.integrationGrid}×${plateByFace.front.integrationGrid} 数値積分`,
    result: plateByFace.front.coefficientY,
    unit: '—',
    source: 'Kirchhoff–Love薄板理論・単項エネルギー法近似',
    caseId: caseDefinition.id,
  })

  return {
    id: caseDefinition.id,
    label: caseDefinition.label,
    isSeismic: caseDefinition.seismic,
    isFull: caseDefinition.full,
    pressure: {
      staticCoefficient,
      seismicCoefficient,
      topPressure,
      bottomPressure,
      resultant: resultantData.resultant,
      applicationHeight: resultantData.applicationHeight,
      tensionCrackDepth,
      vehicleSurcharge: vehicle,
    },
    stability: {
      resistingWeight,
      upliftForce,
      upliftSafetyFactor,
      verticalResultant,
      overturningMoment,
      eccentricity,
      bearingMin,
      bearingMax,
      allowableBearing,
      terzaghiReference: terzaghi,
      status: statusFromUtilization(stabilityUtilization),
    },
    wallChecks,
    baseChecks,
  }
}

function maxUtilization(checks: MemberCheckResult[]) {
  let max = -Infinity
  for (const check of checks) max = Math.max(max, check.utilization)
  return max
}

function minUpliftFactor(caseResult: CaseResult) {
  return caseResult.stability.upliftSafetyFactor
}

export function calculateProject(project: ProjectV1): CalculationResult {
  const traces: CalculationTrace[] = []
  const warnings: string[] = []
  const caseEntries = CASES.map((definition) => [definition.id, buildCase(project, definition, traces, warnings)] as const)
  const cases = Object.fromEntries(caseEntries) as Record<LoadCaseId, CaseResult>
  const openingResults = openingChecks(project)

  const minBy = (selector: (value: CaseResult) => number) => {
    let selected = CASES[0].id
    let current = selector(cases[selected])
    for (const definition of CASES.slice(1)) {
      const value = selector(cases[definition.id])
      if (value < current) {
        selected = definition.id
        current = value
      }
    }
    return selected
  }
  const maxBy = (selector: (value: CaseResult) => number) => {
    let selected = CASES[0].id
    let current = selector(cases[selected])
    for (const definition of CASES.slice(1)) {
      const value = selector(cases[definition.id])
      if (value > current) {
        selected = definition.id
        current = value
      }
    }
    return selected
  }

  return {
    calculatedAt: new Date().toISOString(),
    cases,
    openings: openingResults,
    governing: {
      uplift: minBy(minUpliftFactor),
      bearing: maxBy((item) => item.stability.bearingMax / item.stability.allowableBearing),
      wall: maxBy((item) => maxUtilization(item.wallChecks)),
      base: maxBy((item) => maxUtilization(item.baseChecks)),
    },
    traces,
    warnings,
  }
}
