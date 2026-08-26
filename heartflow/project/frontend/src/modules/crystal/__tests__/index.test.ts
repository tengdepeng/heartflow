// ============================================================
// 结晶模块 · 测试
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import type { FocusSession } from '../../../types'

const mockSession: FocusSession = {
  id: 'session-test-1',
  elapsed: 1500000,
  plannedDuration: 1500000,
  pausedDuration: 0,
  pausedAt: null,
  startedAt: '2026-01-01T00:00:00Z',
  completedAt: '2026-01-01T01:00:00Z',
  mode: 'focus',
  status: 'completed',
  tags: ['学习', 'TypeScript'],
  note: '完成了测试',
  carrierId: null,
}

describe('crystal 模块', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  async function fresh() {
    return await import('../index')
  }

  it('crystallizeSession 根据会话生成结晶', async () => {
    const mod = await fresh()
    const crystal = mod.crystallizeSession(mockSession)
    expect(crystal.id).toBeTruthy()
    expect(crystal.sessionId).toBe('session-test-1')
    expect(crystal.shape).toBe('sphere')
    expect(crystal.intensity).toBe(1)
    expect(crystal.tags).toEqual(['学习', 'TypeScript'])
    expect(crystal.insight).toBe('完成了测试')
    expect(crystal.color).toBeTruthy()
  })

  it('crystallizeSession 低完成度生成残晶', async () => {
    const mod = await fresh()
    const session = { ...mockSession, elapsed: 100000, plannedDuration: 1500000 }
    const crystal = mod.crystallizeSession(session)
    expect(crystal.intensity).toBeLessThan(0.1)
    expect(crystal.shape).toBe('irregular')
  })

  it('completeWithCrystal 生成并持久化结晶', async () => {
    const mod = await fresh()
    const crystal = mod.completeWithCrystal(mockSession)
    expect(crystal.id).toBeTruthy()
    // 验证已持久化
    const { storage } = await import('../../../engine/storage')
    const all = storage.getCrystals()
    expect(all.some((c: any) => c.id === crystal.id)).toBe(true)
  })

  it('update 更新结晶属性', async () => {
    const mod = await fresh()
    const crystal = mod.completeWithCrystal(mockSession)
    const result = mod.update(crystal.id, { color: '#ff0000' })
    expect(result).toBe(true)
    const { storage } = await import('../../../engine/storage')
    const updated = storage.getCrystals().find((c: any) => c.id === crystal.id)
    expect(updated?.color).toBe('#ff0000')
  })

  it('update 不存在的结晶返回 false', async () => {
    const mod = await fresh()
    const result = mod.update('nonexistent', { color: '#ff0000' })
    expect(result).toBe(false)
  })

  it('remove 删除结晶', async () => {
    const mod = await fresh()
    const crystal = mod.completeWithCrystal(mockSession)
    const result = mod.remove(crystal.id)
    expect(result).toBe(true)
    const { storage } = await import('../../../engine/storage')
    const all = storage.getCrystals()
    expect(all.some((c: any) => c.id === crystal.id)).toBe(false)
  })

  it('remove 不存在的结晶返回 false', async () => {
    const mod = await fresh()
    const result = mod.remove('nonexistent')
    expect(result).toBe(false)
  })

  it('getCompletedSessionCount 返回已完成次数', async () => {
    const mod = await fresh()
    const count = mod.getCompletedSessionCount()
    expect(count).toBe(0)
  })

  it('getCrystalVisuals 返回视觉配置', async () => {
    const mod = await fresh()
    const crystal = mod.crystallizeSession(mockSession)
    const visuals = mod.getCrystalVisuals(crystal)
    expect(visuals.color).toBeTruthy()
    expect(visuals.shape).toBe('cloud')
    expect(visuals.glowIntensity).toBeTruthy()
    expect(visuals.complexity).toBeTruthy()
  })
})