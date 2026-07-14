import type { OpeningInput, ProjectV1, RebarLayer, WallFace } from './types'

const layer = (diameter = 13, spacing = 200): RebarLayer => ({ diameter, spacing })

const faces: WallFace[] = ['front', 'back', 'left', 'right']

const openings = Object.fromEntries(
  faces.map((face) => [face, {
    enabled: face === 'front',
    face,
    shape: 'circle' as const,
    width: 0.5,
    height: 0.5,
    diameter: 0.5,
    centerX: 0.6,
    centerY: 0.8,
  }]),
) as OpeningInput

export function createDefaultProject(): ProjectV1 {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    basic: {
      projectTitle: 'サンプル案件',
      wallModel: 'plate',
      runStability: true,
      runMembers: true,
      concreteUnitWeight: 24,
      upliftSafetyFactor: 1.2,
    },
    geometry: {
      innerWidth: 1.2,
      innerDepth: 1.5,
      innerHeight: 2.15,
      wallThickness: 0.3,
      baseThickness: 0.35,
    },
    openings,
    soilWater: {
      unitWeight: 18,
      saturatedUnitWeight: 20,
      frictionAngle: 30,
      cohesion: 0,
      externalWaterLevel: 1.4,
      internalWaterLevel: 1.8,
      waterUnitWeight: 9.80665,
      pressureMethod: 'rankine',
      manualStaticCoefficient: null,
      manualSeismicCoefficient: null,
      allowableBearing: 150,
      useTerzaghiReference: false,
      foundationWidth: 2,
      foundationDepth: 0.5,
      bearingSafetyFactor: 3,
    },
    loads: {
      uniformSurcharge: 10,
      coverDeadLoad: 18,
      wheelLoad: 100,
      contactWidth: 0.2,
      contactLength: 0.5,
      impactFactor: 0.3,
      dispersionAngle: 45,
      vehicleEnabled: true,
    },
    seismic: { horizontalCoefficient: 0.15 },
    rebar: {
      wallVerticalInner: layer(),
      wallVerticalOuter: layer(),
      wallHorizontalInner: layer(),
      wallHorizontalOuter: layer(),
      baseTopX: layer(16, 200),
      baseTopY: layer(16, 200),
      baseBottomX: layer(16, 200),
      baseBottomY: layer(16, 200),
      cover: 50,
      concreteElasticModulus: 28000,
      steelElasticModulus: 200000,
      allowableConcreteCompression: 8,
      allowableSteelTension: 160,
      allowableConcreteShear: 0.7,
      allowableBond: 1.6,
      minimumRebarRatio: 0.0015,
    },
    display: { activeStep: 2, previewMode: 'section', resultTab: 'wall' },
  }
}
