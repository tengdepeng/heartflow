// ============================================================
// 结晶阁视图测试
// 冒烟：标题/副题 + 三面板（画廊/基因谱系/相性图鉴）空态与有结晶渲染
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function crystal(overrides: Record<string, any> = {}) {
  return {
    id: `crystal_${Math.random().toString(36).slice(2, 8)}`,
    sessionId: 's1',
    color: '#a07c8c',
    intensity: 0.9,
    createdAt: '2026-08-25T08:00:00.000Z',
    shape: 'sphere',
    tags: ['阅读'],
    insight: '心流时刻',
    ...overrides,
  }
}

async function mountView(crystals: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals,
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../Crystal.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('Crystal 结晶阁视图', () => {
  it('空态：标题/副题/三面板空态文案', async () => {
    const wrapper = await mountView([])
    expect(wrapper.text()).toContain('结晶阁')
    expect(wrapper.text()).toContain('时间结晶 · 心流的凝固与珍藏')
    // 面板一 结晶画廊空态
    expect(wrapper.text()).toContain('结晶画廊')
    expect(wrapper.text()).toContain('尚无结晶')
    // 面板二 基因谱系空态
    expect(wrapper.text()).toContain('基因谱系')
    expect(wrapper.text()).toContain('尚无带基因的结晶')
    // 面板三 结晶相性图鉴空态
    expect(wrapper.text()).toContain('结晶相性图鉴')
    expect(wrapper.text()).toContain('暂无结晶数据')
  })

  it('有结晶：完美之晶/残晶/标签/感悟/标签相性/均强度渲染', async () => {
    const wrapper = await mountView([
      crystal({ shape: 'sphere', intensity: 0.95, tags: ['阅读'], insight: '沉浸的一小时' }),
      crystal({ shape: 'irregular', intensity: 0.2, tags: ['写作'] }),
    ])
    // 画廊：完美之晶 + 均强度 + 残晶
    expect(wrapper.text()).toContain('完美之晶')
    expect(wrapper.text()).toContain('均强度')
    expect(wrapper.text()).toContain('残晶')
    // 标签与感悟
    expect(wrapper.text()).toContain('阅读')
    expect(wrapper.text()).toContain('写作')
    expect(wrapper.text()).toContain('沉浸的一小时')
    // 相性图鉴：标签相性
    expect(wrapper.text()).toContain('标签相性')
  })
})

// ============================================================
// 集成：星盘档案（INCR-271：薄委托化挂载 CanvasGravityArchivePanel 至结晶阁）
// 引擎 useCanvasGravityEngine 有状态：constellations/landings 经
// storage.getKV/setKV('hf:canvas:constellations'/'hf:canvas:landings') 持久化（JSON 字符串）；
// discover() 读 storage.getCrystals() 作为「从结晶自动生成星座」的输入
// ============================================================
describe('集成：星盘档案', () => {
  const CONST = 'hf:canvas:constellations'
  const LAND = 'hf:canvas:landings'

  async function mountCga(crystals: any[] = [], kv: Record<string, any> = {}) {
    vi.resetModules()
    const storageMock = createMockStorage()
    storageMock.setItem('heartflow:storage', JSON.stringify({
      version: 10,
      kvStore: kv,
      sessions: [],
      crystals,
    }))
    ;(globalThis as any).localStorage = storageMock
    invalidateCache()
    const mod = await import('../Crystal.vue')
    const wrapper = mount(mod.default)
    await wrapper.vm.$nextTick()
    return { wrapper, storageMock }
  }

  function cga(wrapper: any) {
    const el = wrapper.find('.cga-panel')
    expect(el.exists()).toBe(true)
    return el
  }

  function readKv(storageMock: any): Record<string, any> {
    return JSON.parse(storageMock.getItem('heartflow:storage')).kvStore
  }

  it('空态：标题/副题/星座空态/落点空态/零指标', async () => {
    const { wrapper } = await mountCga()
    const el = cga(wrapper)
    expect(el.text()).toContain('✦ 星盘档案')
    expect(el.text()).toContain('星座 · 落点 · 引力')
    expect(el.text()).toContain('暂无星座 · 点击上方按键，让聚集的结晶自动形成星图')
    expect(el.text()).toContain('暂无结晶落点记录 · 专注完成、结晶落定引力场时会留下足迹')
    const cells = el.findAll('.cga-cell')
    expect(cells.length).toBe(3)
    expect(cells[0].text()).toContain('0')
    expect(el.text()).not.toContain('已激活')
  })

  it('从结晶自动生成星座：预置三颗结晶点击按键生成星座并落持久化', async () => {
    const { wrapper, storageMock } = await mountCga([crystal(), crystal(), crystal()])
    const el = cga(wrapper)
    await el.find('.cga-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(el.findAll('.cga-row').length).toBe(1)
    expect(el.text()).toContain('专注之星 #1')
    expect(el.text()).toContain('3 颗星')
    expect(el.text()).toContain('已激活')
    const saved = JSON.parse(readKv(storageMock)[CONST] as string)
    expect(saved.length).toBe(1)
    expect(saved[0].starIds.length).toBe(3)
  })

  it('展示已存星座列表与统计（星座/星点/激活）', async () => {
    const { wrapper } = await mountCga([], {
      [CONST]: JSON.stringify([
        { id: 'c1', name: '专注之星 #1', starIds: ['a', 'b', 'c'], lineColor: '#6b9fc4', lineWidth: 2, active: true, description: '自动发现', createdAt: '2026-08-25T08:00:00.000Z' },
        { id: 'c2', name: '记忆环 #2', starIds: ['d'], lineColor: '#d98c7a', lineWidth: 1.5, active: false, description: '', createdAt: '2026-08-26T08:00:00.000Z' },
      ]),
    })
    const el = cga(wrapper)
    const cells = el.findAll('.cga-cell')
    expect(cells.length).toBe(3)
    expect(cells[0].text()).toContain('2')
    expect(cells[1].text()).toContain('4')
    expect(cells[2].text()).toContain('1')
    expect(el.findAll('.cga-row').length).toBe(2)
    expect(el.find('.cga-badge.on').text()).toContain('已激活')
    expect(el.find('.cga-badge.off').text()).toContain('已停用')
    expect(el.text()).toContain('3 颗星')
  })

  it('切换星座激活状态并落持久化', async () => {
    const { wrapper, storageMock } = await mountCga([], {
      [CONST]: JSON.stringify([
        { id: 'c1', name: '专注之星 #1', starIds: ['a', 'b', 'c'], lineColor: '#6b9fc4', lineWidth: 2, active: true, description: '', createdAt: '2026-08-25T08:00:00.000Z' },
      ]),
    })
    const el = cga(wrapper)
    expect(el.find('.cga-badge').classes()).toContain('on')
    await el.find('.cga-text-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(el.find('.cga-badge').classes()).toContain('off')
    expect(el.find('.cga-badge').text()).toContain('已停用')
    const saved = JSON.parse(readKv(storageMock)[CONST] as string)
    expect(saved[0].active).toBe(false)
  })

  it('删除星座减少列表并落持久化', async () => {
    const { wrapper, storageMock } = await mountCga([], {
      [CONST]: JSON.stringify([
        { id: 'c1', name: '专注之星 #1', starIds: ['a', 'b', 'c'], lineColor: '#6b9fc4', lineWidth: 2, active: true, description: '', createdAt: '2026-08-25T08:00:00.000Z' },
        { id: 'c2', name: '记忆环 #2', starIds: ['d'], lineColor: '#d98c7a', lineWidth: 1.5, active: false, description: '', createdAt: '2026-08-26T08:00:00.000Z' },
      ]),
    })
    const el = cga(wrapper)
    expect(el.findAll('.cga-row').length).toBe(2)
    await el.find('.cga-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(el.findAll('.cga-row').length).toBe(1)
    const saved = JSON.parse(readKv(storageMock)[CONST] as string)
    expect(saved.length).toBe(1)
    expect(el.text()).not.toContain('专注之星 #1')
  })

  it('渲染落点足迹（种子数据）', async () => {
    const { wrapper } = await mountCga([], {
      [LAND]: JSON.stringify([
        { id: 'l1', crystalId: 'c_a', x: 100, y: 100, radius: 0, rippleIntensity: 0.8, color: '#6b9fc4', landedAt: '2026-08-25T08:00:00.000Z', showRipple: true },
        { id: 'l2', crystalId: 'c_b', x: 200, y: 200, radius: 0, rippleIntensity: 0.6, color: '#f59e6c', landedAt: '2026-08-26T08:00:00.000Z', showRipple: true },
      ]),
    })
    const el = cga(wrapper)
    const rows = el.findAll('.cga-row')
    expect(rows.length).toBe(2)
    expect(el.text()).toContain('结晶落点')
    expect(el.text()).toContain('c_a')
    expect(el.text()).toContain('c_b')
  })
})
