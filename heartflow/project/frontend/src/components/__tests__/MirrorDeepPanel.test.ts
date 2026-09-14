// ============================================================
// MirrorDeepPanel 组件测试
// 镜我深度面板：年度对话 / 幕僚调度 / 任务拆解
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const { mockKV } = vi.hoisted(() => ({ mockKV: new Map<string, unknown>() }))

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: <T,>(k: string, def: T): T => (mockKV.has(k) ? (mockKV.get(k) as T) : def),
    setKV: (k: string, v: unknown): void => void mockKV.set(k, v),
    getEmotions: () => [],
    getSessions: () => [],
    getAnchors: () => [],
  },
}))

async function getWrapper() {
  const { default: MirrorDeepPanel } = await import('../MirrorDeepPanel.vue')
  return mount(MirrorDeepPanel)
}

beforeEach(() => mockKV.clear())

describe('MirrorDeepPanel 年度对话', () => {
  it('渲染三个能力标签', async () => {
    const w = await getWrapper()
    const tabs = w.findAll('.mdp-tab').map((b) => b.text().trim())
    expect(tabs).toContain('年度对话')
    expect(tabs).toContain('幕僚调度')
    expect(tabs).toContain('任务拆解')
    w.unmount()
  })

  it('无留痕年份展开为静默陈列', async () => {
    const w = await getWrapper()
    await w.find('.mdp-btn').trigger('click') // 展开这一年
    expect(w.text()).toContain('静默')
    w.unmount()
  })
})

describe('MirrorDeepPanel 幕僚调度', () => {
  it('下达调令后可看到记录状态', async () => {
    const w = await getWrapper()
    await w.findAll('.mdp-tab')[1].trigger('click')
    await w.find('.mdp-dispatch-form input').setValue('先拟大纲，再成文')
    const chips = w.findAll('.mdp-chip')
    await chips[1].trigger('click')
    await chips[2].trigger('click')
    await w.find('.mdp-dispatch-form .mdp-btn').trigger('submit')
    expect(w.text()).toContain('待命')
    // 策略由调令文本推断为串行，并持久化到本地记录
    const stored = JSON.parse(mockKV.get('mirror.dispatch.records') as string)
    expect(stored[0].strategy).toBe('serial')
    expect(stored[0].steps).toHaveLength(2)
    w.unmount()
  })
})

describe('MirrorDeepPanel 任务拆解', () => {
  it('输入任务一键拆解为步骤', async () => {
    const w = await getWrapper()
    await w.findAll('.mdp-tab')[2].trigger('click')
    await w.find('.mdp-decompose-form input').setValue('学习非线性代数')
    await w.find('.mdp-decompose-form .mdp-btn').trigger('submit')
    expect(w.text()).toContain('非线性代数')
    expect(w.findAll('.mdp-plan-step').length).toBeGreaterThanOrEqual(1)
    w.unmount()
  })
})