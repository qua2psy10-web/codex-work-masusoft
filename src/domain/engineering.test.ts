import { describe, expect, it } from 'vitest'
import {
  atRestCoefficient,
  cantileverActions,
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
})
