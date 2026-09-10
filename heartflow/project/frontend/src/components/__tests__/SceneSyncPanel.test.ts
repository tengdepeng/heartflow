// ============================================================
// 场景同步面板测试（INCR-78 · SceneSyncPanel.vue）
// 空态 · 单分支引导 · 差异分析 · 同步执行 · 冲突协调
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

function branch(id: string, name: string) {
  return {
    id, name, description: '', color: '#8a9a7a',
    createdAt: '2026-01-01T00:00:00.000Z', isActive: id === 'a', checkpointCount: 2,
  }
}

function cp(id: string, branchId: string, over: Record<string, unknown> = {}) {
  return {
    id, branchId, label: id, description: '',
    snapshot: {}, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'], ...over,
  }
}

async function mountPanel(over: Record<string, unknown> = {}) {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
  // 捕获 checkpoints 数组引用，宿主回调直接增改同一数组（薄委托化契约）
  const cps = (over.checkpoints as any[]) ?? []
  const { default: SceneSyncPanel } = await import('../SceneSyncPanel.vue')
  const wrapper = mount(SceneSyncPanel, {
    props: {
      branches: [],
      checkpoints: cps,
      createCheckpoint: (branchId: string, label: string, description = '', snapshot: Record<string, unknown> = {}, tags: string[] = []) => {
        const created = {
          id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          branchId, label, description, snapshot, tags,
          createdAt: new Date().toISOString(),
        }
        cps.push(created)
        return created
      },
      updateCheckpoint: (checkpointId: string, updates: Record<string, unknown>) => {
        const found = cps.find(c => c.id === checkpointId)
        if (!found) return undefined
        Object.assign(found, updates)
        return found
      },
      ...over,
    },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('SceneSyncPanel 场景同步', () => {
  beforeEach(() => { vi.clearAllMocks(); Object.keys(mockStore).forEach(k => delete mockStore[k]) })

  it('空态：标题 + 徽标 + 无分支引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.ssy').exists()).toBe(true)
    expect(wrapper.text()).toContain('场景同步')
    expect(wrapper.find('.ssy-badge').text()).toContain('0 次同步 · 0 冲突')
    expect(wrapper.text()).toContain('至少需要两个时间分支才能同步')
  })

  it('单分支引导', async () => {
    const wrapper = await mountPanel({ branches: [branch('a', '主世界')] })
    expect(wrapper.text()).toContain('至少需要两个时间分支才能同步')
  })

  it('双分支：差异分析出分歧率与分支独有', async () => {
    const cps = [
      cp('s1', 'a', { label: '共同点', snapshot: { v: 1 } }),
      cp('s1', 'b', { label: '共同点', snapshot: { v: 2 } }),
      cp('a1', 'a', { label: 'A独有', tags: ['work'] }),
      cp('b1', 'b', { label: 'B独有', tags: ['travel'] }),
    ]
    const wrapper = await mountPanel({ branches: [branch('a', '主世界'), branch('b', '平行世界')], checkpoints: cps })
    expect(wrapper.text()).toContain('分歧率 100%')
    expect(wrapper.text()).toContain('主世界 独有')
    expect(wrapper.text()).toContain('平行世界 独有')
  })

  it('双分支：执行推送新增检查点，徽标更新为 1 次同步', async () => {
    const cps = [
      cp('s1', 'a', { label: '共同点' }),
      cp('s1', 'b', { label: '共同点' }),
      cp('a1', 'a', { label: 'A独有', tags: ['work'] }),
    ]
    const wrapper = await mountPanel({ branches: [branch('a', '主世界'), branch('b', '平行世界')], checkpoints: cps })
    await wrapper.find('.ssy-run').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ssy-badge').text()).toContain('1 次同步')
    expect(wrapper.text()).toContain('同步预览')
    expect(wrapper.text()).toContain('最近同步')
    expect(wrapper.text()).toContain('完成')
  })

  it('同步遇快照冲突：预览显示冲突并可协调完成', async () => {
    const cps = [
      cp('s1', 'a', { label: '分歧点', snapshot: { v: 1 } }),
      cp('s1', 'b', { label: '分歧点', snapshot: { v: 2 } }),
      cp('a1', 'a', { label: 'A独有', tags: ['work'] }),
    ]
    const wrapper = await mountPanel({ branches: [branch('a', '主世界'), branch('b', '平行世界')], checkpoints: cps })
    await wrapper.find('.ssy-run').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.ssy-conflict').length).toBe(1)
    expect(wrapper.text()).toContain('快照数据冲突')
    // 合并策略自动协调，同步完成
    expect(wrapper.find('.ssy-badge').text()).toContain('1 次同步')
  })

  it('统计面板显示同步总数与事件足迹', async () => {
    const cps = [
      cp('s1', 'a', { label: '共同点' }),
      cp('s1', 'b', { label: '共同点' }),
    ]
    const wrapper = await mountPanel({ branches: [branch('a', '主世界'), branch('b', '平行世界')], checkpoints: cps })
    await wrapper.find('.ssy-run').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ssy-badge').text()).toContain('1 次同步')
    expect(wrapper.find('.ssy-event').exists()).toBe(true)
    expect(wrapper.find('.ssy-event').text()).toContain('主世界')
    expect(wrapper.find('.ssy-event').text()).toContain('平行世界')
  })
})