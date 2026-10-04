// ============================================================
// 陪伴精灵面板单测（INCR-488）
// 二级深度 __tests__/ → mock 路径 ../../engine/storage + ../../stores/advisor
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { mockWitnessAll } = vi.hoisted(() => ({ mockWitnessAll: vi.fn() }))

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: <T>(_k: string, def: T): T => def,
    setKV: vi.fn(),
  },
  storageVersion: { value: 0 },
}))

vi.mock('../../stores/advisor', () => ({
  useAdvisorStore: () => ({ witnessAll: mockWitnessAll }),
}))

import DesktopCompanionPanel from '../DesktopCompanionPanel.vue'

describe('DesktopCompanionPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockWitnessAll.mockClear()
  })

  it('未领养时显示领养流程与三种形态', () => {
    const w = mount(DesktopCompanionPanel)
    expect(w.text()).toContain('陪伴精灵')
    expect(w.text()).toContain('领养')
    expect(w.findAll('.dcp-form').length).toBe(3)
  })

  it('空名字时领养按钮禁用', () => {
    const w = mount(DesktopCompanionPanel)
    const btn = w.find('.dcp-adopt-btn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('领养后展示养成界面，喂食联动幕僚见证', async () => {
    const w = mount(DesktopCompanionPanel)
    await w.find('.dcp-name-input').setValue('小灯')
    await w.find('.dcp-adopt-btn').trigger('click')
    expect(w.text()).toContain('小灯')
    expect(w.findAll('.dcp-act').length).toBeGreaterThanOrEqual(3)

    const feedBtn = w.findAll('.dcp-act').find((b) => b.text().includes('喂食'))!
    await feedBtn.trigger('click')
    expect(mockWitnessAll).toHaveBeenCalledWith('companion_interact')
  })
})
