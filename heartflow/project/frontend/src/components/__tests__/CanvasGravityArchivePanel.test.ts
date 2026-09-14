// ============================================================
// CanvasGravityArchivePanel 组件测试 · 星盘档案
// 覆盖：空态 / 星座档案渲染 / 激活停用 / 删除 / 落点足迹 /
//       从结晶自动生成星座（useCanvasGravityEngine 真引擎集成）
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { StarConstellation, CrystalLanding } from '../../modules/canvas'
import type { TimeCrystal } from '../../types'

const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let kvStore: Record<string, any> = {}
  return {
    getKvStore: () => kvStore,
    resetKvStore: () => { kvStore = {} },
  }
})

const getCrystalsMock = vi.fn<() => TimeCrystal[]>(() => [])

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: <T,>(key: string, def: T): T => {
      const store = getKvStore()
      return store[key] !== undefined ? store[key] as T : def
    },
    setKV: (key: string, val: any) => {
      const store = getKvStore()
      store[key] = val
    },
    getCrystals: () => getCrystalsMock(),
  },
}))

async function getWrapper() {
  const { default: panel } = await import('../CanvasGravityArchivePanel.vue')
  return mount(panel)
}

const CONST_KEY = 'hf:canvas:constellations'
const LAND_KEY = 'hf:canvas:landings'

function makeConstellation(data: Partial<StarConstellation>): StarConstellation {
  return {
    id: 'const_1',
    name: '专注之星',
    starIds: ['a', 'b', 'c'],
    lineColor: '#6b9fc4',
    lineWidth: 2,
    active: true,
    description: '由高专注度的结晶自然形成',
    createdAt: '2026-09-01T10:00:00.000Z',
    ...data,
  }
}

function makeCrystal(id: string, intensity = 0.6): TimeCrystal {
  return {
    id,
    sessionId: 's' + id,
    color: '#6b9fc4',
    intensity,
    createdAt: '2026-09-01T09:00:00.000Z',
    shape: 'octahedron',
    tags: ['focus'],
    insight: null,
  }
}

describe('CanvasGravityArchivePanel 星盘档案', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetKvStore()
    getCrystalsMock.mockReturnValue([])
  })

  it('空态渲染标题、副题、两区块与空提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('✦ 星盘档案')
    expect(wrapper.text()).toContain('星座 · 落点 · 引力')
    expect(wrapper.text()).toContain('星座档案')
    expect(wrapper.text()).toContain('落点足迹')
    expect(wrapper.text()).toContain('暂无星座')
    expect(wrapper.text()).toContain('暂无结晶落点记录')
    expect(wrapper.text()).toContain('从结晶自动生成星座')
  })

  it('空态归档统计展示 0 星座 0 星点 0 激活', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('星座')
    expect(wrapper.text()).toContain('星点')
    expect(wrapper.text()).toContain('激活')
  })

  it('渲染星座档案列表：名称、星点数、激活徽标、描述与日期', async () => {
    getKvStore()[CONST_KEY] = JSON.stringify([
      makeConstellation({ id: 'c1', name: '专注之星', starIds: ['a', 'b', 'c'] }),
      makeConstellation({ id: 'c2', name: '记忆环', starIds: ['d', 'e'], active: false, lineColor: '#d98c7a' }),
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('专注之星')
    expect(wrapper.text()).toContain('记忆环')
    expect(wrapper.text()).toContain('已激活')
    expect(wrapper.text()).toContain('已停用')
    expect(wrapper.text()).toContain('3 颗星')
    expect(wrapper.text()).toContain('2 颗星')
    expect(wrapper.text()).toContain('由高专注度的结晶自然形成')
    expect(wrapper.text()).toContain('2026-09-01')
  })

  it('点停用切换星座为已停用并落盘', async () => {
    getKvStore()[CONST_KEY] = JSON.stringify([
      makeConstellation({ id: 'c1', name: '专注之星' }),
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已激活')
    await wrapper.findAll('.cga-text-btn')[0].trigger('click')
    await wrapper.vm.$nextTick()
    const stored = JSON.parse(getKvStore()[CONST_KEY]) as StarConstellation[]
    expect(stored[0].active).toBe(false)
    expect(wrapper.text()).toContain('已停用')
  })

  it('点删除移除星座并落盘', async () => {
    getKvStore()[CONST_KEY] = JSON.stringify([
      makeConstellation({ id: 'c1', name: '专注之星' }),
      makeConstellation({ id: 'c2', name: '记忆环' }),
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记忆环')
    await wrapper.findAll('.cga-text-btn.cga-del')[1].trigger('click')
    await wrapper.vm.$nextTick()
    const stored = JSON.parse(getKvStore()[CONST_KEY]) as StarConstellation[]
    expect(stored.length).toBe(1)
    expect(stored[0].id).toBe('c1')
    expect(wrapper.text()).not.toContain('记忆环')
  })

  it('从结晶自动生成星座：点按键后按存储结晶生成并可渲染', async () => {
    getCrystalsMock.mockReturnValue([
      makeCrystal('cr1', 0.9),
      makeCrystal('cr2', 0.8),
      makeCrystal('cr3', 0.7),
      makeCrystal('cr4', 0.9),
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无星座')
    await wrapper.find('.cga-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('暂无星座')
    const stored = JSON.parse(getKvStore()[CONST_KEY]) as StarConstellation[]
    expect(stored.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.findAll('.cga-row').length).toBeGreaterThanOrEqual(1)
  })

  it('渲染落点足迹：结晶落点 + 关联ID + 时间', async () => {
    getKvStore()[LAND_KEY] = JSON.stringify([
      { id: 'l1', crystalId: 'cr9', x: 40, y: 30, radius: 0, rippleIntensity: 0.8, color: '#d4a574', landedAt: '2026-09-02T11:22:00.000Z', showRipple: true },
      { id: 'l2', crystalId: 'cr8', x: 55, y: 44, radius: 0, rippleIntensity: 0.8, color: '#6b9fc4', landedAt: '2026-09-03T08:15:00.000Z', showRipple: true },
    ] as CrystalLanding[])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('结晶落点')
    expect(wrapper.text()).toContain('cr9')
    expect(wrapper.text()).toContain('cr8')
    expect(wrapper.text()).not.toContain('暂无结晶落点记录')
  })
})