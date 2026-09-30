// ============================================================
// ReadingSpeedInsightPanel 组件测试
// 验证「阅读速度·洞察」面板正确挂载孤儿 API 到 UI
// （recordSpeed / setSpeedGoal / analyzeSpeedTrend / getSpeedRecommendations
//   addKnowledgeNode / connectNodes / createReadingPlan / completePlan）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// 模拟 storage（reading-speed / reading-insights / hall 均经此读写）
const store: Record<string, unknown> = {}
const mockGetKV = vi.fn((key: string, fallback: unknown) => (key in store ? (store[key] as unknown) : fallback))
const mockSetKV = vi.fn((key: string, value: unknown) => {
  store[key] = value
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: unknown[]) => mockGetKV(...(args as [string, unknown])),
    setKV: (...args: unknown[]) => mockSetKV(...(args as [string, unknown])),
  },
}))

async function getWrapper() {
  const { default: ReadingSpeedInsightPanel } = await import('../ReadingSpeedInsightPanel.vue')
  return mount(ReadingSpeedInsightPanel)
}

describe('ReadingSpeedInsightPanel', () => {
  beforeEach(() => {
    vi.resetModules() // 重置模块缓存：useReadingHall 的 books 是模块级 ref，需按当前 store 重新初始化
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((key: string, fallback: unknown) =>
      key in store ? store[key] : fallback,
    )
  })

  it('渲染面板标题与概览', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rsi-title').text()).toContain('阅读速度')
    expect(wrapper.findAll('.rsi-stat')).toHaveLength(4)
  })

  it('无记录时显示速度空态与个性化建议', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rsi-empty-text').exists()).toBe(true)
    // 无记录也应给出通用建议
    expect(wrapper.findAll('.rsi-rec').length).toBeGreaterThan(0)
  })

  it('知识节点/计划为空时显示提示', async () => {
    const wrapper = await getWrapper()
    const empties = wrapper.findAll('.rsi-empty-text').map((e) => e.text())
    expect(empties.some((t) => t.includes('知识节点'))).toBe(true)
    expect(empties.some((t) => t.includes('阅读计划'))).toBe(true)
  })

  it('登记速度会调用 recordSpeed 并写入存储', async () => {
    // 书架书目须在挂载前置入，useReadingHall 在 setup 时读取
    store['hf:reading:books'] = JSON.stringify([
      { id: 'b1', title: '测试书', currentPage: 1, totalPages: 10, totalReadingTime: 0, status: 'reading', tags: [] },
    ])
    const wrapper = await getWrapper()
    const select = wrapper.find('select.rsi-input')
    await select.setValue('b1')
    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[0].setValue(12) // 页数（record 表单第一个 number）
    await numberInputs[1].setValue(24) // 时长
    const recordBtn = wrapper.findAll('button.rsi-btn').find((b) => b.text() === '登记')!
    await recordBtn.trigger('click')
    expect(mockSetKV).toHaveBeenCalledWith('hf:reading:speed_records', expect.anything())
  })

  it('新增知识节点会调用 addKnowledgeNode', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('input[placeholder="如：心流状态"]').setValue('心流状态')
    await wrapper.find('textarea[placeholder="摘录或笔记内容……"]').setValue('完全沉浸的阅读状态')
    const addBtn = wrapper.findAll('button.rsi-btn').find((b) => b.text() === '添加')!
    await addBtn.trigger('click')
    expect(mockSetKV).toHaveBeenCalledWith('hf:reading:knowledge_nodes', expect.anything())
  })

  it('创建阅读计划会调用 createReadingPlan', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('input[placeholder="如：本月通读三本书"]').setValue('本月三书')
    const dateInputs = wrapper.findAll('input[type="date"]')
    await dateInputs[dateInputs.length - 1].setValue('2026-12-01')
    const createBtn = wrapper.findAll('button.rsi-btn').find((b) => b.text() === '创建')!
    await createBtn.trigger('click')
    expect(mockSetKV).toHaveBeenCalledWith('hf:reading:plans', expect.anything())
  })
})
