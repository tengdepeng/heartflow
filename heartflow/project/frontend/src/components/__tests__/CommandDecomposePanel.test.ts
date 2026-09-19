// ============================================================
// CommandDecomposePanel 组件测试（INCR-372：幕僚阁·跨域任务拆解面板）
// 覆盖：空态 / 单域不拆 / 跨域拆解 / 单域收集真实统计 / 全部收集 / 汇总结论
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const db = vi.hoisted(() => ({
  sessions: [] as any[],
  notes: [] as any[],
  emotions: [] as any[],
  ledger: [] as any[],
  anchors: [] as any[],
  goals: [] as any[],
  relations: [] as any[],
  crystals: [] as any[],
}))

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: () => db.sessions,
    getNotes: () => db.notes,
    getEmotions: () => db.emotions,
    getLedger: () => db.ledger,
    getAnchors: () => db.anchors,
    getGoals: () => db.goals,
    getRelations: () => db.relations,
    getCrystals: () => db.crystals,
  },
}))

function reset() {
  db.sessions = []
  db.notes = []
  db.emotions = []
  db.ledger = []
  db.anchors = []
  db.goals = []
  db.relations = []
  db.crystals = []
}

async function mountPanel() {
  const mod = await import('../CommandDecomposePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

async function setQuery(wrapper: any, text: string) {
  await wrapper.find('[data-test="cdp-query"]').setValue(text)
  await wrapper.vm.$nextTick()
}

describe('CommandDecomposePanel 跨域任务拆解（INCR-372）', () => {
  beforeEach(() => {
    reset()
  })

  it('初始渲染空态与拆解标题', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="command-decompose"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('跨域任务拆解')
    expect(wrapper.find('[data-test="cdp-empty"]').exists()).toBe(true)
  })

  it('单域调令：识别到领域但标记不可拆，拆解结果不出现', async () => {
    const wrapper = await mountPanel()
    await setQuery(wrapper, '帮我看看这个月的开销')
    expect(wrapper.find('[data-test="cdp-chip-ledger"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cdp-cross"]').text()).toContain('单领域')
    await wrapper.find('[data-test="cdp-run"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cdp-results"]').exists()).toBe(false)
  })

  it('跨域调令：拆出多领域子任务，逐个收集真实统计后出现汇总', async () => {
    const wrapper = await mountPanel()
    db.sessions = [
      { id: 's1', completedAt: '2026-09-01T10:00:00Z', elapsed: 25 * 60000 },
      { id: 's2', completedAt: '2026-09-02T10:00:00Z', elapsed: 35 * 60000 },
    ]
    db.notes = [{ id: 'n1', title: '晨间日记', content: '…' }]
    db.emotions = [{ id: 'e1', type: 'calm', note: '平静' }]
    db.ledger = [
      { id: 'l1', type: 'income', amount: 100 },
      { id: 'l2', type: 'expense', amount: 20 },
    ]
    await setQuery(wrapper, '把最近的专注、情绪、笔记和开销一起复盘一下')
    expect(wrapper.find('[data-test="cdp-cross"]').text()).toContain('可拆解')
    await wrapper.find('[data-test="cdp-run"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="cdp-results"]').exists()).toBe(true)
    // 四个领域子任务都出现
    for (const d of ['session', 'emotion', 'note', 'ledger']) {
      expect(wrapper.find(`[data-test="cdp-sub-${d}"]`).exists()).toBe(true)
    }
    // 汇总尚未出现（未收集完）
    expect(wrapper.find('[data-test="cdp-summary"]').exists()).toBe(false)

    // 收集专注领域 → 真实统计
    await wrapper.find('[data-test="cdp-collect-session"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cdp-sub-result"]').text()).toContain('专注 2 次，累计 60 分钟')
  })

  it('全部收集后显示汇总结论', async () => {
    const wrapper = await mountPanel()
    db.emotions = [{ id: 'e1', type: 'calm', note: '平静' }]
    db.ledger = [{ id: 'l1', type: 'income', amount: 100 }]
    await setQuery(wrapper, '把情绪和开销一起复盘一下')
    await wrapper.find('[data-test="cdp-run"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="cdp-collect-all"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="cdp-summary"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('已分头查过')
    expect(wrapper.find('[data-test="cdp-summary"]').text()).toContain('情绪记录 1 条')
    expect(wrapper.find('[data-test="cdp-summary"]').text()).toContain('账目 1 笔')
  })

  it('示例按钮填入跨域示例文本并识别', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-test="cdp-sample"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect((wrapper.find('[data-test="cdp-query"]').element as HTMLInputElement).value.length).toBeGreaterThan(0)
    expect(wrapper.find('[data-test="cdp-preview"]').exists()).toBe(true)
  })

  it('动作型调令不拆解（记一笔/打开类交回原路）', async () => {
    const wrapper = await mountPanel()
    await setQuery(wrapper, '记一笔 20 车费，顺便看看情绪')
    await wrapper.find('[data-test="cdp-run"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cdp-results"]').exists()).toBe(false)
  })
})