import { describe, expect, it } from 'vitest'
import { solveFourFixedPlate, solveThreeFixedOneFreePlate } from './plate'

describe('薄板エネルギー法', () => {
  it('正の荷重に対して有限な断面力を返す', () => {
    const result = solveThreeFixedOneFreePlate(1.2, 2.15, 0, 25, 0.3, 28000)
    expect(result.momentX).toBeGreaterThan(0)
    expect(result.momentY).toBeGreaterThan(0)
    expect(result.shear).toBeGreaterThan(0)
    expect(Number.isFinite(result.coefficientX)).toBe(true)
  })

  it('数値積分格子31と41で結果が収束する', () => {
    const coarse = solveFourFixedPlate(1.2, 1.5, 30, 0.35, 28000, 31)
    const fine = solveFourFixedPlate(1.2, 1.5, 30, 0.35, 28000, 41)
    expect(Math.abs(coarse.momentX - fine.momentX) / fine.momentX).toBeLessThan(0.01)
    expect(Math.abs(coarse.momentY - fine.momentY) / fine.momentY).toBeLessThan(0.01)
  })
})
