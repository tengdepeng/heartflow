// ============================================================
// 镜我独立路由视图测试（M6）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setKV, removeKV } from '../../engine/storage/kv'

// 桩掉镜我组件，避免拉起 advisor/timer/storage 重依赖
vi.mock('../../components/MirrorSelf.vue', () => ({
  default: { template: '<div class="mock-mirror-self" />' },
}))

async function createWrapper() {
  const { default: MirrorSelfView } = await import('../MirrorSelfView.vue')
  return mount(MirrorSelfView, { global: {} })
}

const SESSIONS_KEY = 'hf:mirror_sessions'

function seedSessions() {
  const now = Date.now()
  setKV(SESSIONS_KEY, [
    {
      id: 's1',
      title: '第一场对话',
      entries: [
        { id: 'e1', role: 'user', text: '最近我觉得很焦虑，为什么总是拖延？', timestamp: now - 3 * 86400000 },
        { id: 'e2', role: 'mirror', text: '拖延也许在保护你远离某些压力。', timestamp: now - 3 * 86400000 + 1000 },
        { id: 'e3', role: 'user', text: '我想改变这个习惯，反思自己的节奏。', timestamp: now - 86400000 },
        { id: 'e4', role: 'mirror', text: '看见即改变的开始。', timestamp: now - 86400000 + 1000 },
      ],
      createdAt: new Date(now - 3 * 86400000).toISOString(),
      lastActiveAt: new Date(now - 86400000).toISOString(),
      tags: [],
      primaryIntents: [],
      archived: false,
    },
  ])
}

describe('MirrorSelfView 镜我独立路由', () => {
  it('渲染镜我标题与副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('镜我')
    expect(wrapper.text()).toContain('陈列而非叙事')
  })

  it('挂载镜我载体组件', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.mock-mirror-self').exists()).toBe(true)
  })

  it('渲染「跨房间共鸣态势」小节（无他房信号时显示空态）', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.msr-climate').exists()).toBe(true)
    expect(wrapper.text()).toContain('跨房间共鸣态势')
    // 测试环境仅镜我自身发射信号，已被过滤，故显示静默空态
    expect(wrapper.find('.msr-climate-empty').exists()).toBe(true)
  })

  it('渲染「近期反思」小节（无对话时显示空态）', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.msr-reflections').exists()).toBe(true)
    expect(wrapper.text()).toContain('近期反思')
    expect(wrapper.find('.msr-reflect-empty').exists()).toBe(true)
  })

  it('进入房间时向跨房间态势注入镜我信号（不报错）', async () => {
    // 挂载即 onMounted 发射 mirror 信号；断言渲染未崩溃即可
    const wrapper = await createWrapper()
    expect(wrapper.find('.mirror-self-room').exists()).toBe(true)
  })
})

describe('集成：人格画像面板', () => {
  beforeEach(() => {
    removeKV(SESSIONS_KEY)
  })

  it('无对话时渲染待显影空态', async () => {
    const wrapper = await createWrapper()
    const pcp = wrapper.find('.pcp-panel')
    expect(pcp.exists()).toBe(true)
    expect(pcp.find('.pcp-title').text()).toContain('人格画像')
    expect(pcp.find('.pcp-badge-neutral').text()).toBe('待显影')
    expect(pcp.text()).toContain('深度画像会在一次次对话中逐渐显影')
  })

  it('有对话时渲染自我认知报告与常用词汇', async () => {
    seedSessions()
    const wrapper = await createWrapper()
    const pcp = wrapper.find('.pcp-panel')
    expect(pcp.find('.pcp-badge-neutral').exists()).toBe(false)
    expect(pcp.text()).toContain('自我认知报告')
    expect(pcp.find('.pcp-summary').exists()).toBe(true)
    expect(pcp.text()).toContain('常用词汇与句式')
    expect(pcp.text()).toContain('演化趋势')
    expect(pcp.findAll('.pcp-insight').length).toBeGreaterThan(0)
  })

  it('对话样本不足时成长轨迹显示沉淀引导', async () => {
    seedSessions()
    const wrapper = await createWrapper()
    const pcp = wrapper.find('.pcp-panel')
    expect(pcp.text()).toContain('成长轨迹')
    expect(pcp.text()).toContain('沉淀足够的时间跨度后，这里将呈现你的成长轨迹')
  })

  it('清理后恢复待显影空态（无跨用例污染）', async () => {
    // 上一个用例已清理；再次挂载应回到空态
    const wrapper = await createWrapper()
    const pcp = wrapper.find('.pcp-panel')
    expect(pcp.find('.pcp-badge-neutral').text()).toBe('待显影')
  })
})
