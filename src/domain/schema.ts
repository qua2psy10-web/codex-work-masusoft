import { z } from 'zod'
import type { ProjectV1 } from './types'

const positive = z.number().finite().positive()
const nonnegative = z.number().finite().nonnegative()
const nullableCoefficient = z.number().finite().positive().nullable()

const opening = z.object({
  enabled: z.boolean(),
  face: z.enum(['front', 'back', 'left', 'right']),
  shape: z.enum(['circle', 'rectangle']),
  width: positive,
  height: positive,
  diameter: positive,
  centerX: nonnegative,
  centerY: nonnegative,
})

const layer = z.object({ diameter: z.number().min(10).max(25), spacing: z.number().min(50).max(500) })

export const projectV1Schema: z.ZodType<ProjectV1> = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  updatedAt: z.string().datetime(),
  basic: z.object({
    projectTitle: z.string().min(1).max(120),
    wallModel: z.enum(['plate', 'cantilever']),
    runStability: z.boolean(),
    runMembers: z.boolean(),
    concreteUnitWeight: positive,
    upliftSafetyFactor: positive,
  }),
  geometry: z.object({
    innerWidth: positive.max(10),
    innerDepth: positive.max(10),
    innerHeight: positive.max(5),
    wallThickness: positive.max(1),
    baseThickness: positive.max(1),
  }),
  openings: z.object({ front: opening, back: opening, left: opening, right: opening }),
  soilWater: z.object({
    unitWeight: positive,
    saturatedUnitWeight: positive,
    frictionAngle: z.number().gt(0).lt(60),
    cohesion: nonnegative,
    externalWaterLevel: nonnegative,
    internalWaterLevel: nonnegative,
    waterUnitWeight: positive,
    pressureMethod: z.enum(['rankine', 'at-rest']),
    manualStaticCoefficient: nullableCoefficient,
    manualSeismicCoefficient: nullableCoefficient,
    allowableBearing: positive,
    useTerzaghiReference: z.boolean(),
    foundationWidth: positive,
    foundationDepth: nonnegative,
    bearingSafetyFactor: positive,
  }),
  loads: z.object({
    uniformSurcharge: nonnegative,
    coverDeadLoad: nonnegative,
    wheelLoad: nonnegative,
    contactWidth: positive,
    contactLength: positive,
    impactFactor: nonnegative,
    dispersionAngle: z.number().gt(0).lt(90),
    vehicleEnabled: z.boolean(),
  }),
  seismic: z.object({ horizontalCoefficient: z.number().min(0).max(0.5) }),
  rebar: z.object({
    wallVerticalInner: layer,
    wallVerticalOuter: layer,
    wallHorizontalInner: layer,
    wallHorizontalOuter: layer,
    baseTopX: layer,
    baseTopY: layer,
    baseBottomX: layer,
    baseBottomY: layer,
    cover: z.number().min(20).max(200),
    concreteElasticModulus: positive,
    steelElasticModulus: positive,
    allowableConcreteCompression: positive,
    allowableSteelTension: positive,
    allowableConcreteShear: positive,
    allowableBond: positive,
    minimumRebarRatio: z.number().gt(0).lt(0.05),
  }),
  display: z.object({
    activeStep: z.number().int().min(1).max(8),
    previewMode: z.enum(['section', 'plan', '3d']),
    resultTab: z.enum(['stability', 'wall', 'base', 'opening', 'trace']),
  }),
})

export function validateProject(input: unknown): ProjectV1 {
  return projectV1Schema.parse(input)
}
