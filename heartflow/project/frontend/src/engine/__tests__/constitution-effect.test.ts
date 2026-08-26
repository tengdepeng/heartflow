// ============================================================
// constitution-effect · 视觉/通知软效果运行时接线（宪法之实）
// 锁定：宪法条款启用的视觉/通知软效果，经 getEffectMultiplier /
// isTargetActive 计算，并通过 applyConstitutionVisualEffects 真正写入
// 全局 --hf-* CSS 变量（供 CanvasParticles / HomeSpace 等零侵入消费），
// 通知频率系数可被推送引擎每日上限消费。
// 此前这些 EffectTarget 仅被 useConstitutionEffect 当作展示数据，未生效。
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRules } = vi.hoisted(() => ({ mockRules: [] as any[] }))

vi.mock('@/stores/constitution', async () => ({
  ...(await vi.importActual<typeof import('@/stores/constitution')>('@/stores/constitution')),
  useConstitutionStore: () => ({ mutableRules: mockRules }),
}))
vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({ config: {} }),
}))

import {
  getEffectMultiplier,
  isTargetActive,
  applyConstitutionVisualEffects,
  refreshConstitutionEffect,
} from '../constitution-effect'

describe('constitution-effect · 视觉/通知软效果接线（宪法之实）', () => {
  beforeEach(() => {
    mockRules.length = 0
    mockRules.push(
      { id: 'elastic-breath', enabled: true, title: '呼吸' },
      { id: 'elastic-rhythm', enabled: true, title: '节律' },
      { id: 'elastic-silence', enabled: true, title: '静默' },
      { id: 'elastic-inner-peace', enabled: true, title: '内心安宁' },
      { id: 'elastic-slack', enabled: true, title: '松弛' },
    )
    refreshConstitutionEffect()
  })

  it('呼吸速度 set 0.8 → 乘数 0.8', () => {
    expect(getEffectMultiplier('ui:breathing-speed')).toBe(0.8)
  })

  it('动画速度 reduce 0.9（elastic-rhythm）→ 乘数 0.9', () => {
    expect(getEffectMultiplier('ui:animate-speed')).toBe(0.9)
  })

  it('粒子密度 reduce 0.4（elastic-inner-peace）→ 乘数 0.4', () => {
    expect(getEffectMultiplier('ui:particle-density')).toBe(0.4)
  })

  it('静默/空白 enable → 目标活跃', () => {
    expect(isTargetActive('ui:silence')).toBe(true)
    expect(isTargetActive('ui:empty-space')).toBe(true)
  })

  it('applyConstitutionVisualEffects 真正写入 --hf-* 变量', () => {
    applyConstitutionVisualEffects()
    const s = document.documentElement.style
    expect(s.getPropertyValue('--hf-breathing-speed')).toBe('0.8')
    expect(s.getPropertyValue('--hf-animate-speed')).toBe('0.9')
    expect(s.getPropertyValue('--hf-particle-density')).toBe('0.4')
    expect(s.getPropertyValue('--hf-silence')).toBe('1')
    expect(s.getPropertyValue('--hf-empty-space')).toBe('1')
  })

  it('通知频率 reduce 0.15（elastic-inner-peace）→ 乘数 0.15（推送引擎每日上限将乘此）', () => {
    mockRules.length = 0
    mockRules.push({ id: 'elastic-inner-peace', enabled: true, title: '内心安宁' })
    refreshConstitutionEffect()
    expect(getEffectMultiplier('ui:notification')).toBe(0.15)
  })
})
