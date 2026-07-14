/**
 * Single-term Rayleigh-Ritz thin-plate solver.
 * The shape functions satisfy the essential clamped-edge conditions and the
 * coefficients are obtained by numerical integration, not copied tables.
 */
export interface PlateActions {
  momentX: number
  momentY: number
  shear: number
  coefficientX: number
  coefficientY: number
  integrationGrid: number
}

interface Point {
  x: number
  y: number
}

type Shape = (point: Point) => number

function derivative(shape: Shape, point: Point, hx: number, hy: number) {
  const { x, y } = point
  const center = shape(point)
  const fxx = (shape({ x: x + hx, y }) - 2 * center + shape({ x: x - hx, y })) / hx ** 2
  const fyy = (shape({ x, y: y + hy }) - 2 * center + shape({ x, y: y - hy })) / hy ** 2
  const fxy = (
    shape({ x: x + hx, y: y + hy }) - shape({ x: x + hx, y: y - hy })
    - shape({ x: x - hx, y: y + hy }) + shape({ x: x - hx, y: y - hy })
  ) / (4 * hx * hy)
  return { fxx, fyy, fxy }
}

function integratePlate(
  width: number,
  height: number,
  topPressure: number,
  bottomPressure: number,
  thickness: number,
  elasticModulus: number,
  poisson: number,
  shape: Shape,
  grid = 41,
): PlateActions {
  const dx = width / grid
  const dy = height / grid
  const hx = dx / 8
  const hy = dy / 8
  const rigidity = elasticModulus * 1000 * thickness ** 3 / (12 * (1 - poisson ** 2))
  let energyIntegral = 0
  let workIntegral = 0

  for (let ix = 0; ix < grid; ix += 1) {
    for (let iy = 0; iy < grid; iy += 1) {
      const point = { x: (ix + 0.5) * dx, y: (iy + 0.5) * dy }
      const { fxx, fyy, fxy } = derivative(shape, point, hx, hy)
      const pressure = bottomPressure + (topPressure - bottomPressure) * (point.y / height)
      energyIntegral += (
        fxx ** 2 + fyy ** 2 + 2 * poisson * fxx * fyy + 2 * (1 - poisson) * fxy ** 2
      ) * dx * dy
      workIntegral += pressure * shape(point) * dx * dy
    }
  }

  const amplitude = energyIntegral <= 0 ? 0 : workIntegral / (rigidity * energyIntegral)
  let maxMx = 0
  let maxMy = 0
  // Include the physical boundaries in the moment search. Clamped-edge moments
  // commonly govern and cell-center-only sampling converges unnecessarily slowly.
  for (let ix = 0; ix <= grid; ix += 1) {
    for (let iy = 0; iy <= grid; iy += 1) {
      const { fxx, fyy } = derivative(shape, { x: ix * dx, y: iy * dy }, hx, hy)
      maxMx = Math.max(maxMx, Math.abs(-rigidity * amplitude * (fxx + poisson * fyy)))
      maxMy = Math.max(maxMy, Math.abs(-rigidity * amplitude * (fyy + poisson * fxx)))
    }
  }
  const totalLoad = (topPressure + bottomPressure) * width * height / 2
  const reference = Math.max(Math.abs(topPressure), Math.abs(bottomPressure), 1e-9) * Math.min(width, height) ** 2
  return {
    momentX: maxMx,
    momentY: maxMy,
    shear: totalLoad / (2 * (width + height)),
    coefficientX: maxMx / reference,
    coefficientY: maxMy / reference,
    integrationGrid: grid,
  }
}

export function solveThreeFixedOneFreePlate(
  width: number,
  height: number,
  topPressure: number,
  bottomPressure: number,
  thickness: number,
  elasticModulus: number,
  grid = 41,
): PlateActions {
  const shape: Shape = ({ x, y }) => {
    const xPart = x ** 2 * (width - x) ** 2
    const yPart = y ** 2 * (3 * height - y)
    return xPart * yPart
  }
  return integratePlate(width, height, topPressure, bottomPressure, thickness, elasticModulus, 0.2, shape, grid)
}

export function solveFourFixedPlate(
  width: number,
  height: number,
  pressure: number,
  thickness: number,
  elasticModulus: number,
  grid = 41,
): PlateActions {
  const shape: Shape = ({ x, y }) => x ** 2 * (width - x) ** 2 * y ** 2 * (height - y) ** 2
  return integratePlate(width, height, pressure, pressure, thickness, elasticModulus, 0.2, shape, grid)
}
