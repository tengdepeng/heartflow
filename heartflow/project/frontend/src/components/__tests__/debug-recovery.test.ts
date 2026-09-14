import { describe, it, expect, vi } from 'vitest'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeMove(overrides: Record<string, any> = {}, dayOffset = 0, hour = 18) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() - dayOffset)
  return {
    id: `mv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'run',
    duration: 30,
    withWhom: '',
    location: '',
    note: '',
    isMoment: false,
    at: d.toISOString(),
    ...overrides,
  }
}

describe('debug recovery optimizer', () => {
  it('inspect values', async () => {
    vi.resetModules()
    const storageMock = createMockStorage()
    const moves = Array.from({ length: 14 }, (_, i) => makeMove({ type: 'run', duration: 30 }, i))
    storageMock.setItem('heartflow:storage', JSON.stringify({
      version: 10,
      kvStore: { 'hf:moves_v2': moves },
    }))
    ;(globalThis as any).localStorage = storageMock
    invalidateCache()

    const movementMod = await import('../../modules/movement/movement-log')
    const movement = movementMod.useMovement()
    console.log('moves length:', movement.items.value.length)

    const conv = await import('../../modules/movement/move-converter')
    const records = conv.movesToRecords(movement.items.value)
    console.log('records length:', records.length)
    console.log('first record:', JSON.stringify(records[0]))

    const optMod = await import('../../modules/movement/recovery-optimizer')
    const opt = optMod.useRecoveryOptimizer()
    const plan = opt.generatePeriodizationPlan(records)
    console.log('plan phase:', plan?.currentPhase)
    console.log('weeklySchedule len:', plan?.weeklySchedule?.length)
    const signals = opt.detectOvertraining(records)
    console.log('signals:', signals.length, JSON.stringify(signals.map(s => s.type)))
    const recs = opt.getActiveRecoveryRecommendations(records, opt.computeRecoveryScore(records), 3)
    console.log('recommended:', recs.length)
    expect(true).toBe(true)
  })
})