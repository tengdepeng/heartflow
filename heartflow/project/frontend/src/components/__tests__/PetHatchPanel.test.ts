// ============================================================
// 宠物屋面板单测（INCR-497）
// 二级深度 __tests__/ → mock 路径 ../../engine/storage + ../../utils/time
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: <T>(_k: string, def: T): T => def,
    setKV: vi.fn(),
  },
  storageVersion: { value: 0 },
}))

vi.mock('../../utils/time', () => ({
  getLocalDateKey: () => '2026-10-04',
}))

import PetHatchPanel from '../PetHatchPanel.vue'
import { usePetHatch } from '../../modules/pet-hatch'

const T0 = 1_760_000_000_000

describe('PetHatchPanel', () => {
  beforeEach(() => {
    const h = usePetHatch()
    h.reloadPetHatchState()
    h.setNow(T0)
  })

  it('渲染标题与孵化区核心文案', () => {
    const w = mount(PetHatchPanel)
    expect(w.text()).toContain('孵蛋与宠物屋')
    expect(w.text()).toContain('宠物屋')
    expect(w.text()).toContain('建材库存')
  })

  it('idle 阶段显示三种蛋可选', () => {
    const w = mount(PetHatchPanel)
    expect(w.findAll('.ph-egg-btn').length).toBe(3)
    expect(w.text()).toContain('温养')
  })

  it('idle 阶段提供开始温养入口（接线不孤儿）', async () => {
    const w = mount(PetHatchPanel)
    const startBtn = w.find('.ph-egg-start')
    expect(startBtn.exists()).toBe(true)
    await startBtn.trigger('click')
    expect(usePetHatch().state.value.stage).toBe('incubating')
    // 切到 incubating 后应出现温一温/收手
    const w2 = mount(PetHatchPanel)
    expect(w2.find('.ph-act--warm').exists()).toBe(true)
  })

  it('取蛋并开始温养后显示温一温按钮', async () => {
    const h = usePetHatch()
    h.takeEgg('ember')
    h.startIncubate()
    const w = mount(PetHatchPanel)
    expect(w.find('.ph-act--warm').exists()).toBe(true)
    await w.find('.ph-act--warm').trigger('click')
    // 温一温后仍应显示温养按钮（未满 30s）
    expect(w.find('.ph-act--warm').exists()).toBe(true)
  })

  it('材料采集按钮当日采集后变为已采集', async () => {
    const w = mount(PetHatchPanel)
    const btns = w.findAll('.ph-act')
    const gatherBtn = btns.find((b) => b.text().includes('采集建材'))
    expect(gatherBtn).toBeTruthy()
    await gatherBtn!.trigger('click')
    const w2 = mount(PetHatchPanel)
    expect(w2.text()).toContain('今日已采集')
  })

  it('建造按钮在材料不足时禁用', () => {
    const w = mount(PetHatchPanel)
    const buildBtn = w.findAll('.ph-act').find((b) => b.text().includes('建造升级'))
    expect(buildBtn?.attributes('disabled')).toBeDefined()
  })

  it('已孵化时显示领养入口', async () => {
    const h = usePetHatch()
    h.takeEgg('ember')
    for (let i = 0; i < 30; i++) h.warmOnce(1500)
    expect(h.state.value.stage).toBe('hatched')
    const w = mount(PetHatchPanel)
    expect(w.text()).toContain('孵化完成')
    expect(w.find('.ph-act--claim').exists()).toBe(true)
  })
})
