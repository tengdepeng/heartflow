// ============================================================
// 时间长廊 · 数据雷达面板 组件测试（INCR-365）
// 以固定 RiverSource 走真实 generateTimelineRadarReport 引擎，
// 验证六大可视化区块渲染与空态。路径层级按 INCR-104：本测试在
// src/components/__tests__/，访问 src/modules 需 ../../modules/xxx。
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { RiverSource } from '../../modules/timeline/river'

const mockStorageVersion = ref(1)
vi.mock('../../engine/storage', () => ({
  storageVersion: mockStorageVersion,
  storage: { getSessions: () => [], getKV: () => '[]', setKV: vi.fn() },
}))

function at(y: number, m: number, d: number, h: number, min = 0): string {
  return new Date(y, m, d, h, min).toISOString()
}
function makeSource(): RiverSource {
  return {
    sessions: [
      { id: 's1', startedAt: at(2026, 8, 14, 9, 0), elapsed: 45 * 60000, tags: ['学习'], completed: true },
      { id: 's2', startedAt: at(2026, 8, 19, 20, 0), elapsed: 30 * 60000, tags: ['阅读'], completed: false },
    ] as any,
    crystals: [{ id: 'c1', createdAt: at(2026, 8, 14, 9, 30), tags: ['学习'] }] as any,
    notes: [{ id: 'n1', createdAt: at(2026, 8, 15, 12, 0), updatedAt: at(2026, 8, 15, 12, 0), tags: ['写作'] }] as any,
    emotions: [
      { id: 'e1', type: 'happy', note: '', createdAt: at(2026, 8, 14, 10, 0), intensity: 0.8 },
      { id: 'e2', type: 'calm', note: '', createdAt: at(2026, 8, 15, 12, 0), intensity: 0.5 },
    ] as any,
    anchors: [{ id: 'a1', createdAt: at(2026, 8, 14, 8, 0), done: true, tags: ['健康'] }] as any,
    bodyLogs: [],
    habits: [],
    movementRecords: [],
    breakRecords: [],
    dialogueSessions: [],
  } as RiverSource
}

let source = makeSource()
vi.mock('../../modules/timeline/river', () => ({
  getRiverSource: () => source,
}))

describe('TimelineRadarPanel', () => {
  beforeEach(() => {
    source = makeSource()
    mockStorageVersion.value++
  })

  it('有数据时渲染全部六大区块与摘要', async () => {
    const wrapper = mount((await import('../TimelineRadarPanel.vue')).default)
    expect(wrapper.find('[data-test="radar-chart"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dayhour"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="emotion"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="tag"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="focus"]').exists()).toBe(true)
    // 综合雷达 SVG 有数值多边形（value points 多于 0）
    expect(wrapper.find('.tlr-value').exists()).toBe(true)
    // 报告摘要：专注总时长 45+30=75min → 1h 15m
    const summary = wrapper.find('[data-test="summary"]')
    expect(summary.text()).toContain('1h 15m')
    // 情绪主导 → 喜悦（happy 2 > calm 1）
    expect(wrapper.text()).toContain('喜悦')
  })

  it('无数据时显示空态不渲染可视化区块', async () => {
    source = {
      sessions: [], crystals: [], notes: [], emotions: [], anchors: [],
      bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [],
    } as RiverSource
    mockStorageVersion.value++
    const wrapper = mount((await import('../TimelineRadarPanel.vue')).default)
    expect(wrapper.find('.tlr-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('静默')
    expect(wrapper.find('[data-test="radar-chart"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dayhour"]').exists()).toBe(false)
  })
})