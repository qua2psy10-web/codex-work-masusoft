import { describe, expect, it } from 'vitest'
import {
  atRestCoefficient,
  cantileverActions,
  eccentricBearingPressure,
  rankineCoefficient,
  trapezoidResultant,
  vehicleSurcharge,
} from './engineering'

describe('公開力学式', () => {
  it('内部摩擦角30度のランキン主働土圧係数は1/3になる', () => {
    expect(rankineCoefficient(30)).toBeCloseTo(1 / 3, 10)
  })

  it('内部摩擦角30度の静止土圧係数は0.5になる', () => {
    expect(atRestCoefficient(30)).toBeCloseTo(0.5, 10)
  })

  it('三角形分布の合力と作用位置を算定する', () => {
    const result = trapezoidResultant(0, 30, 3)
    expect(result.resultant).toBeCloseTo(45, 10)
    expect(result.applicationHeight).toBeCloseTo(1, 10)
    const actions = cantileverActions(0, 30, 3)
    expect(actions.moment).toBeCloseTo(45, 10)
    expect(actions.shear).toBeCloseTo(45, 10)
  })

  it('矩形分散の深度0では接地面積で除した荷重となる', () => {
    expect(vehicleSurcharge(100, 0.3, 0.2, 0.5, 0, 45)).toBeCloseTo(1300, 10)
  })

  it('偏心がミドルサード内なら全面接地の台形分布となる', () => {
    const result = eccentricBearingPressure(100, 2, 3, 0.25)
    expect(result.contactState).toBe('full')
    expect(result.contactRatio).toBe(1)
    expect(result.minimum).toBeCloseTo(8.333333, 5)
    expect(result.maximum).toBeCloseTo(25, 10)
  })

  it('偏心がミドルサード外ならqminをゼロとする部分接地の三角形分布となる', () => {
    const result = eccentricBearingPressure(100, 2, 3, 0.75)
    expect(result.contactState).toBe('partial')
    expect(result.contactLength).toBeCloseTo(2.25, 10)
    expect(result.contactRatio).toBeCloseTo(0.75, 10)
    expect(result.minimum).toBe(0)
    expect(result.maximum).toBeCloseTo(44.444444, 5)
  })

  it('合力が底面外なら接地不能として無限大圧力を返す', () => {
    const result = eccentricBearingPressure(100, 2, 3, 1.5)
    expect(result.contactState).toBe('none')
    expect(result.contactRatio).toBe(0)
    expect(result.maximum).toBe(Number.POSITIVE_INFINITY)
  })
})
