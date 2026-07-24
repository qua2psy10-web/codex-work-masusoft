import { describe, expect, it } from 'vitest'
import { calculateProject } from './calculate'
import { createDefaultProject } from './defaults'

describe('案件計算', () => {
  it('標準4ケースと支配ケースを生成する', () => {
    const result = calculateProject(createDefaultProject())
    expect(Object.keys(result.cases)).toEqual(['static-empty', 'static-full', 'seismic-empty', 'seismic-full'])
    expect(result.cases['static-empty'].wallChecks).toHaveLength(8)
    expect(result.cases['static-empty'].baseChecks).toHaveLength(4)
    expect(result.traces.length).toBeGreaterThanOrEqual(16)
    expect(result.governing.wall).toBeTruthy()
  })

  it('満水ケースでは内水重量により抵抗重量が増える', () => {
    const result = calculateProject(createDefaultProject())
    expect(result.cases['static-full'].stability.resistingWeight).toBeGreaterThan(result.cases['static-empty'].stability.resistingWeight)
  })

  it('壁端との離隔不足を入力範囲外として返す', () => {
    const project = createDefaultProject()
    project.openings.front.centerX = 0.1
    const result = calculateProject(project)
    const front = result.openings.find((item) => item.face === 'front')
    expect(front?.geometryValid).toBe(false)
    expect(front?.status).toBe('out-of-range')
  })

  it('地下水位ゼロでは浮力が底版厚分のみとなり有限値を返す', () => {
    const project = createDefaultProject()
    project.soilWater.externalWaterLevel = 0
    const result = calculateProject(project)
    expect(result.cases['static-empty'].stability.upliftForce).toBeGreaterThan(0)
    expect(Number.isFinite(result.cases['static-empty'].stability.upliftSafetyFactor)).toBe(true)
  })

  it('部分接地では負のqminをNG原因にせず三角形分布でqmaxを再計算する', () => {
    const result = calculateProject(createDefaultProject())
    const stability = result.cases['static-full'].stability
    expect(stability.contactState).toBe('partial')
    expect(stability.contactRatio).toBeGreaterThan(0)
    expect(stability.contactRatio).toBeLessThan(1)
    expect(stability.bearingMin).toBe(0)
    expect(stability.bearingMax).toBeLessThan(stability.allowableBearing)
    expect(stability.bearingStatus).toBe('warning')
  })
})
