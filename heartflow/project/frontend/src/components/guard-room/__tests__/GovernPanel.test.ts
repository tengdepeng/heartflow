// ============================================================
// GovernPanel · 数据主权 P1 接线（INCR-467）
//
// 覆盖：
//   1. 数据主权子标签下渲染「按模块筛选」下拉 gp-module-filter
//   2. 默认（全部模块）展示最近遗忘记录 recentRecords
//   3. 选择某模块后 displayedRecords 切换为该模块的 getModuleRecords 结果
//   4. 数据清单中带衰变标记的模块渲染 aging-mark（💤 Lv.N）
//
// 关键取舍：
//   - useForgetting / useGuard / useConfig / useHallExit 全部 mock：
//     P1 只关心 UI 编排（下拉筛选 + 衰变标记），遗忘引擎由
//     p24-data-sovereignty.test.ts / index.test.ts 的单元测试覆盖。
//   - 四个子组件（ForgettingRitual / HallExitTransition / CrossDevicePanel /
//     ExtraditionPanel）stub，避免挂载重型依赖。
//   - dataInventory 由真实 localStorage 驱动（MODULE_CATALOG 按 prefix 过滤），
//     故测试前置在 localStorage 写入 hf:knowledge 系列 key，让「知识节点」
//     模块进入数据清单，既是 aging-mark 的载体，也是下拉可选项。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// vi.hoisted：mock 工厂在 import 之前求值，共享状态必须在这里建
const hoisted = vi.hoisted(() => {
  const mkRecord = (id: string, moduleKey: string, moduleName: string, freedBytes = 10) => ({
    id,
    moduleKey,
    moduleName,
    method: 'forget',
    freedBytes,
    timestamp: Date.UTC(2026, 9, 4),
    recoverable: false,
    recoverableUntil: undefined,
  })
  return {
    recent: [mkRecord('r1', 'knowledge', '知识节点'), mkRecord('r2', 'mood', '情绪记录')],
    moduleRecords: { knowledge: [mkRecord('r1', 'knowledge', '知识节点')] } as Record<string, ReturnType<typeof mkRecord>[]>,
    aging: {} as Record<string, { decayLevel: number } | undefined>,
    agingProgress: {} as Record<string, number>,
    getModuleRecordsCalls: [] as string[],
  }
})

vi.mock('../../../modules/data-sovereignty/composables/useForgetting', () => ({
  useForgetting: () => ({
    recentRecords: { value: hoisted.recent },
    sealedList: { value: [] },
    hibernatedList: { value: [] },
    selectedMethod: { value: 'forget' },
    isForgetting: { value: false },
    lastForgetResult: { value: null },
    getModuleRecords: (k: string) => {
      hoisted.getModuleRecordsCalls.push(k)
      return hoisted.moduleRecords[k] ?? []
    },
    getModuleAging: (k: string) => hoisted.aging[k],
    getAgingProgress: (k: string) => hoisted.agingProgress[k] ?? 0,
    selectMethod: () => {},
    clearResult: () => {},
    formatBytes: (n: number) => `${n}B`,
    formatForgetTime: (t: number) => new Date(t).toISOString(),
    formatRecoverableUntil: (t: number) => new Date(t).toISOString(),
    recoverSealed: () => true,
    recoverHibernated: () => true,
    forget: async () => ({ success: true, affectedCount: 0, freedBytes: 0, error: '' }),
  }),
}))

vi.mock('../../../modules/guard', () => ({
  useGuard: () => ({
    dataReflux: { value: false },
    visitLogs: { value: [] },
    anonymousMode: { value: false },
    contacts: { value: [] },
    sessionActivity: { value: [] },
    addVisitLog: vi.fn(),
    clearVisitLog: vi.fn(),
  }),
}))

vi.mock('../../../resonance/bridges/config', () => ({
  useConfig: () => ({
    config: { advisorEnabled: false },
    updateAdvisorEnabled: vi.fn(),
  }),
}))

vi.mock('../../../modules/data-sovereignty/composables/useHallExit', () => ({
  useHallExit: () => ({
    exitStates: { value: [] },
    selectedExitState: { value: '' },
    exitTransitionEnabled: { value: false },
    showExitTransition: { value: false },
    currentExitStateInfo: { value: { transitionDuration: 0 } },
    selectExitState: vi.fn(),
    triggerExitTransition: vi.fn(),
  }),
}))

// FORGET_METHODS 仅被模板拿来 find(icon)，给一个最小数组即可，避免加载重型 index
vi.mock('../../../modules/data-sovereignty', () => ({
  FORGET_METHODS: [{ id: 'forget', icon: '🗑', label: '遗忘', description: '' }],
}))

async function getWrapper() {
  const { default: Panel } = await import('../GovernPanel.vue')
  return mount(Panel, {
    global: {
      stubs: {
        ForgettingRitual: true,
        HallExitTransition: true,
        CrossDevicePanel: true,
        ExtraditionPanel: true,
      },
    },
  })
}

// 切到数据主权子标签（governSubTab 初始为 data-govern，sovereignty 内容 v-if 隐藏）
async function gotoSovereignty(wrapper: ReturnType<typeof mount>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(wrapper.vm as any).governSubTab = 'sovereignty'
  await wrapper.vm.$nextTick()
}

beforeEach(() => {
  hoisted.recent = [
    { id: 'r1', moduleKey: 'knowledge', moduleName: '知识节点', method: 'forget', freedBytes: 10, timestamp: Date.UTC(2026, 9, 4), recoverable: false, recoverableUntil: undefined },
    { id: 'r2', moduleKey: 'mood', moduleName: '情绪记录', method: 'forget', freedBytes: 20, timestamp: Date.UTC(2026, 9, 4), recoverable: false, recoverableUntil: undefined },
  ]
  hoisted.moduleRecords = { knowledge: [hoisted.recent[0]] }
  hoisted.aging = {}
  hoisted.agingProgress = {}
  hoisted.getModuleRecordsCalls = []
  // 让「知识节点」(prefix hf:knowledge) 进入数据清单
  localStorage.clear()
  localStorage.setItem('hf:knowledge:seed', 'x')
})

describe('GovernPanel · 数据主权 P1 接线', () => {
  it('数据主权子标签下应渲染「按模块筛选」下拉 gp-module-filter', async () => {
    const wrapper = await getWrapper()
    await gotoSovereignty(wrapper)
    const sel = wrapper.find('[data-test="gp-module-filter"]')
    expect(sel.exists(), 'gp-module-filter 应存在').toBe(true)
    // 全部模块选项 + 数据清单各模块选项
    expect(sel.text()).toContain('全部模块')
    expect(sel.text()).toContain('知识节点')
  })

  it('默认（全部模块）展示最近遗忘记录 recentRecords', async () => {
    const wrapper = await getWrapper()
    await gotoSovereignty(wrapper)
    const rows = wrapper.findAll('.forget-record-row')
    expect(rows.length, '全部模块时应为 2 条最近记录').toBe(2)
  })

  it('选择某模块后 displayedRecords 切换为该模块的 getModuleRecords 结果', async () => {
    const wrapper = await getWrapper()
    await gotoSovereignty(wrapper)
    const sel = wrapper.find('[data-test="gp-module-filter"]')
    expect(wrapper.findAll('.forget-record-row').length).toBe(2)

    await sel.setValue('knowledge')
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('.forget-record-row')
    expect(rows.length, '选 knowledge 后应只剩该模块的 1 条记录').toBe(1)
    expect(rows[0].text()).toContain('知识节点')
    expect(hoisted.getModuleRecordsCalls).toContain('knowledge')
  })

  it('数据清单中带衰变标记的模块应渲染 aging-mark（💤 Lv.N）', async () => {
    // 知识节点：老化进度 0（不显示 aging-badge），但有衰变标记 → 渲染 aging-mark
    hoisted.agingProgress['knowledge'] = 0
    hoisted.aging['knowledge'] = { decayLevel: 3 }

    const wrapper = await getWrapper()
    await gotoSovereignty(wrapper)

    const marks = wrapper.findAll('.aging-mark')
    expect(marks.length, '知识节点应渲染 1 个 aging-mark').toBe(1)
    expect(marks[0].text()).toContain('Lv.3')
    expect(wrapper.find('.aging-badge').exists(), '老化进度为 0 时不应出现 aging-badge').toBe(false)
  })

  it('老化进度 > 0 优先显示 aging-badge 而非 aging-mark', async () => {
    hoisted.agingProgress['knowledge'] = 42
    hoisted.aging['knowledge'] = { decayLevel: 3 }

    const wrapper = await getWrapper()
    await gotoSovereignty(wrapper)

    expect(wrapper.find('.aging-badge').exists(), '进度>0 应显示 aging-badge').toBe(true)
    expect(wrapper.find('.aging-mark').exists(), '进度>0 时 aging-mark 不应出现').toBe(false)
  })
})
