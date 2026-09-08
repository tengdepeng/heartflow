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
