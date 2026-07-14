import type { RebarLayer } from './types'

export const BAR_DIAMETERS = [10, 13, 16, 19, 22, 25] as const

export function degreesToRadians(value: number) {
  return value * Math.PI / 180
}

export function rankineCoefficient(frictionAngle: number) {
  const phi = degreesToRadians(frictionAngle)
  return Math.tan(Math.PI / 4 - phi / 2) ** 2
}

export function atRestCoefficient(frictionAngle: number) {
  return 1 - Math.sin(degreesToRadians(frictionAngle))
}

export function mononobeOkabeCoefficient(frictionAngle: number, kh: number) {
  const phi = degreesToRadians(frictionAngle)
  const theta = Math.atan(kh)
  if (theta >= phi) return Number.NaN
  const numerator = Math.cos(phi - theta) ** 2
  const rootTerm = Math.sqrt((Math.sin(phi) * Math.sin(phi - theta)) / Math.cos(theta))
  return numerator / (Math.cos(theta) * (1 + rootTerm) ** 2)
}

export function vehicleSurcharge(
  wheelLoad: number,
  impactFactor: number,
  contactWidth: number,
  contactLength: number,
  depth: number,
  dispersionAngle: number,
) {
  const spread = 2 * depth * Math.tan(degreesToRadians(dispersionAngle))
  return wheelLoad * (1 + impactFactor) / ((contactWidth + spread) * (contactLength + spread))
}

export function trapezoidResultant(top: number, bottom: number, height: number) {
  const resultant = (top + bottom) * height / 2
  const applicationHeight = top + bottom === 0 ? 0 : height * (bottom + 2 * top) / (3 * (top + bottom))
  return { resultant, applicationHeight }
}

export function cantileverActions(top: number, bottom: number, height: number) {
  return {
    moment: height ** 2 * (bottom / 6 + top / 3),
    shear: height * (top + bottom) / 2,
  }
}

export function barArea(diameter: number) {
  return Math.PI * diameter ** 2 / 4
}

export function providedArea(layer: RebarLayer) {
  return barArea(layer.diameter) * 1000 / layer.spacing
}

export function suggestRebar(requiredArea: number) {
  const spacings = [250, 200, 175, 150, 125, 100]
  for (const diameter of BAR_DIAMETERS) {
    for (const spacing of spacings) {
      const area = barArea(diameter) * 1000 / spacing
      if (area >= requiredArea) return { diameter, spacing, area, label: `D${diameter} @ ${spacing}` }
    }
  }
  const diameter = 25
  const spacing = 100
  return { diameter, spacing, area: providedArea({ diameter, spacing }), label: 'D25 @ 100超を要検討' }
}

export function terzaghiReference(
  width: number,
  depth: number,
  gamma: number,
  cohesion: number,
  frictionAngle: number,
  safetyFactor: number,
) {
  const phi = degreesToRadians(frictionAngle)
  const nq = Math.exp(Math.PI * Math.tan(phi)) * Math.tan(Math.PI / 4 + phi / 2) ** 2
  const nc = frictionAngle < 0.01 ? 5.14 : (nq - 1) / Math.tan(phi)
  const ngamma = 2 * (nq + 1) * Math.tan(phi)
  const ultimate = 1.3 * cohesion * nc + gamma * depth * nq + 0.4 * gamma * width * ngamma
  return ultimate / safetyFactor
}
