// ============================================================
// 时光检索面板 UI 测试
//
// 覆盖：列表渲染、空态（共用 EmptyState）、点历史/收藏条目能回填查询、
//       删除与清空后列表与落盘同步。
//
// 关键取舍：
//   - bridge 被 mock（面板只关心 UI 编排，搜索算法本身由引擎测试覆盖）
//   - storage 走真实现 + mock localStorage：这样 UI 点一下是否真的写进
//     hf:timeline:search_history 是可以被断言的，而不是断言一个内存 ref
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'

const STORAGE_KEY = 'heartflow:storage'
const HISTORY_KEY = 'hf:timeline:search_history'
const SAVED_KEY = 'hf:timeline:saved_searches'

// vi.hoisted：mock 工厂在 import 之前求值，共享状态必须在这里建
const hoisted = vi.hoisted(() => {
  return {
    state: {
      hits: [] as any[],
      lastOptions: null as any,
      calls: 0,
    },
  }
})

vi.mock('../../modules/timeline/timeline-bridge', () => ({
  useTimelineBridge: () => ({
    refreshSource: () => {},
    advancedSearchItems: (options: any) => {
      hoisted.state.calls++
      hoisted.state.lastOptions = options
      return hoisted.state.hits
    },
  }),
}))

let mockStorage: Record<string, any>

function readKvRaw(key: string): string | null {
  const raw = mockStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const v = JSON.parse(raw)?.kvStore?.[key]
  if (v === undefined || v === null) return null
  return typeof v === 'string' ? v : JSON.stringify(v)
}

function makeHit(type: string, id: string, ts: number) {
  return {
    item: { type, id, ts, note: { title: `标题-${id}`, content: `内容-${id}` } },
    score: 80,
    matchedFields: ['title'],
    highlights: [],
  }
}

async function getWrapper() {
  const { default: Panel } = await import('../TimelineSearchPanel.vue')
  return mount(Panel, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  })
}

describe('TimelineSearchPanel 时光检索', () => {
  beforeEach(async () => {
    mockStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockStorage
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
    hoisted.state.hits = []
    hoisted.state.lastOptions = null
    hoisted.state.calls = 0
  })

  // ==========================================================
  // 渲染 + 空态
  // ==========================================================

  it('渲染面板标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时光检索')
  })

  it('三个区域初始都应是空态（共用 EmptyState）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('[data-test="tls-hits-idle"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="tls-history-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="tls-saved-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有搜索历史')
    expect(wrapper.text()).toContain('还没有保存任何搜索')
  })

  it('空态不应手写 <p>，必须复用 EmptyState 的 hf-empty 根节点', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.hf-empty').length).toBe(3)
  })

  // ==========================================================
  // 搜索 + 历史落盘
  // ==========================================================

  it('点搜索后应渲染命中列表，并把这次检索写进历史', async () => {
    hoisted.state.hits = [makeHit('note', 'n1', Date.UTC(2026, 9, 4))]
    const wrapper = await getWrapper()

    // 前置：初始无历史条目
    expect(wrapper.findAll('[data-test="tls-history-item"]').length).toBe(0)

    await wrapper.find('[data-test="tls-input"]').setValue('结晶')
    await wrapper.find('[data-test="tls-run"]').trigger('click')

    // 命中列表渲染
    const hitRows = wrapper.findAll('[data-test="tls-hit"]')
    expect(hitRows.length).toBe(1)
    expect(hitRows[0].text()).toContain('标题-n1')

    // 历史渲染 + 落盘
    expect(wrapper.findAll('[data-test="tls-history-item"]').length).toBe(1)
    const raw = readKvRaw(HISTORY_KEY)
    expect(raw, '搜索后 hf:timeline:search_history 应落盘').toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.length).toBe(1)
    expect(parsed[0].query).toBe('结晶')
    expect(parsed[0].hitCount).toBe(1)
  })

  it('空查询点搜索不应写入历史', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('   ')
    await wrapper.find('[data-test="tls-run"]').trigger('click')
    expect(hoisted.state.calls).toBe(0)
    expect(readKvRaw(HISTORY_KEY)).toBeNull()
  })

  it('无命中时应显示空态而不是空白', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('不存在的词')
    await wrapper.find('[data-test="tls-run"]').trigger('click')
    expect(wrapper.find('[data-test="tls-hits-empty"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="tls-hit"]').length).toBe(0)
  })

  // ==========================================================
  // 点历史条目能回填查询
  // ==========================================================

  it('点历史条目应把 query 回填进输入框并重新检索', async () => {
    hoisted.state.hits = [makeHit('note', 'n1', Date.UTC(2026, 9, 4))]
    const wrapper = await getWrapper()

    await wrapper.find('[data-test="tls-input"]').setValue('心锚')
    await wrapper.find('[data-test="tls-run"]').trigger('click')
    // 输入框改为别的词，验证回填确实发生（而不是"本来就是那个词"）
    await wrapper.find('[data-test="tls-input"]').setValue('别的词')
    expect((wrapper.find('[data-test="tls-input"]').element as HTMLInputElement).value).toBe('别的词')

    const item = wrapper.find('[data-test="tls-history-item"] .tls-item-main')
    expect(item.exists(), '应有历史条目可点').toBe(true)
    await item.trigger('click')

    expect((wrapper.find('[data-test="tls-input"]').element as HTMLInputElement).value).toBe('心锚')
    expect(hoisted.state.lastOptions.query).toBe('心锚')
    // 相同 query 再次检索 = 去重更新，历史仍只有 1 条
    expect(wrapper.findAll('[data-test="tls-history-item"]').length).toBe(1)
    const parsed = JSON.parse(readKvRaw(HISTORY_KEY) as string)
    expect(parsed.length).toBe(1)
  })

  it('删除历史条目后列表与落盘应同步减少', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('甲')
    await wrapper.find('[data-test="tls-run"]').trigger('click')
    await wrapper.find('[data-test="tls-input"]').setValue('乙')
    await wrapper.find('[data-test="tls-run"]').trigger('click')
    expect(wrapper.findAll('[data-test="tls-history-item"]').length).toBe(2)

    await wrapper.find('[data-test="tls-history-remove"]').trigger('click')
    expect(wrapper.findAll('[data-test="tls-history-item"]').length).toBe(1)
    expect(JSON.parse(readKvRaw(HISTORY_KEY) as string).length).toBe(1)
  })

  it('清空历史后应回到空态', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('甲')
    await wrapper.find('[data-test="tls-run"]').trigger('click')
    expect(wrapper.findAll('[data-test="tls-history-item"]').length).toBe(1)

    await wrapper.find('[data-test="tls-history-clear"]').trigger('click')
    expect(wrapper.findAll('[data-test="tls-history-item"]').length).toBe(0)
    expect(wrapper.find('[data-test="tls-history-empty"]').exists()).toBe(true)
    expect(JSON.parse(readKvRaw(HISTORY_KEY) as string).length).toBe(0)
  })

  // ==========================================================
  // 保存的搜索
  // ==========================================================

  it('保存当前搜索应写入 saved_searches 并渲染条目', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('结晶')
    await wrapper.find('[data-test="tls-save-name"]').setValue('本周结晶')
    await wrapper.find('[data-test="tls-save"]').trigger('click')

    const items = wrapper.findAll('[data-test="tls-saved-item"]')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('本周结晶')

    const raw = readKvRaw(SAVED_KEY)
    expect(raw, '保存后 hf:timeline:saved_searches 应落盘').toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.length).toBe(1)
    expect(parsed[0].name).toBe('本周结晶')
    expect(parsed[0].query).toBe('结晶')
  })

  it('未填名字时保存应以 query 作为名字', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('心锚')
    await wrapper.find('[data-test="tls-save"]').trigger('click')
    const parsed = JSON.parse(readKvRaw(SAVED_KEY) as string)
    expect(parsed.length).toBe(1)
    expect(parsed[0].name).toBe('心锚')
  })

  it('点保存的搜索应回填查询、重新检索并回写 lastHitCount', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('结晶')
    await wrapper.find('[data-test="tls-save"]').trigger('click')

    // 清空输入框，验证回填
    await wrapper.find('[data-test="tls-input"]').setValue('')
    expect((wrapper.find('[data-test="tls-input"]').element as HTMLInputElement).value).toBe('')

    // 这次检索返回 3 条，lastHitCount 应被回写成 3
    hoisted.state.hits = [
      makeHit('note', 'a', Date.UTC(2026, 9, 4)),
      makeHit('note', 'b', Date.UTC(2026, 9, 4)),
      makeHit('note', 'c', Date.UTC(2026, 9, 4)),
    ]
    await wrapper.find('[data-test="tls-saved-item"] .tls-item-main').trigger('click')

    expect((wrapper.find('[data-test="tls-input"]').element as HTMLInputElement).value).toBe('结晶')
    expect(hoisted.state.lastOptions.query).toBe('结晶')
    expect(wrapper.findAll('[data-test="tls-hit"]').length).toBe(3)

    const parsed = JSON.parse(readKvRaw(SAVED_KEY) as string)
    expect(parsed.length).toBe(1)
    expect(parsed[0].lastHitCount).toBe(3)
  })

  it('点保存的搜索也应把这次检索写进搜索历史', async () => {
    // 变异 M5 反查：applySaved 里去掉 searchHistoryManager.addEntry 时本例转红。
    // 保存的搜索被点开 = 真实发生过一次检索，理应同样进历史（与 runSearch 一致）。
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('心锚')
    await wrapper.find('[data-test="tls-save"]').trigger('click')
    // 保存本身不写历史，只有真正检索才写
    expect(readKvRaw(HISTORY_KEY), '保存动作本身不应写搜索历史').toBeNull()

    hoisted.state.hits = [makeHit('note', 'n1', Date.UTC(2026, 9, 4))]
    await wrapper.find('[data-test="tls-saved-item"] .tls-item-main').trigger('click')

    const raw = readKvRaw(HISTORY_KEY)
    expect(raw, '点保存的搜索后 hf:timeline:search_history 应落盘').toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.length).toBe(1)
    expect(parsed[0].query).toBe('心锚')
    expect(parsed[0].hitCount).toBe(1)
    // 界面上的历史列表也要同步出现这一条
    expect(wrapper.findAll('[data-test="tls-history-item"]').length).toBe(1)
  })

  it('删除保存的搜索后应回到空态', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('结晶')
    await wrapper.find('[data-test="tls-save"]').trigger('click')
    expect(wrapper.findAll('[data-test="tls-saved-item"]').length).toBe(1)

    await wrapper.find('[data-test="tls-saved-remove"]').trigger('click')
    expect(wrapper.findAll('[data-test="tls-saved-item"]').length).toBe(0)
    expect(wrapper.find('[data-test="tls-saved-empty"]').exists()).toBe(true)
    expect(JSON.parse(readKvRaw(SAVED_KEY) as string).length).toBe(0)
  })

  // ==========================================================
  // 选项
  // ==========================================================

  it('切换模糊/正则应带进传给引擎的 options', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('结晶')
    await wrapper.find('[data-test="tls-opt-fuzzy"]').trigger('click')
    await wrapper.find('[data-test="tls-opt-regex"]').trigger('click')
    await wrapper.find('[data-test="tls-run"]').trigger('click')

    expect(hoisted.state.lastOptions.fuzzy).toBe(true)
    expect(hoisted.state.lastOptions.regex).toBe(true)
  })

  it('取消一个范围字段应带进 options', async () => {
    hoisted.state.hits = []
    const wrapper = await getWrapper()
    await wrapper.find('[data-test="tls-input"]').setValue('结晶')
    await wrapper.find('[data-test="tls-field-tags"]').trigger('click')
    await wrapper.find('[data-test="tls-run"]').trigger('click')

    expect(hoisted.state.lastOptions.fields).toEqual(['title', 'content'])
  })
})
