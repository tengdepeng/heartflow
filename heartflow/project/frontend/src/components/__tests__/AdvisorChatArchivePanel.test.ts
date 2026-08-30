// ============================================================
// AdvisorChatArchivePanel 测试 - 对话分身档案（INCR-08）
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { mockHolder } = vi.hoisted(() => ({ mockHolder: { profile: null as any } }))

vi.mock('../../resonance/bridges/advisor', () => ({
  useAdvisor: () => ({
    getAdvisorById: (_id: string) => mockHolder.profile,
  }),
}))

/** 距当前时刻 n 天的 ISO 串（多减 60s 保证 floor 稳定） */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000 - 60000).toISOString()
}

function profile(overrides: Record<string, any> = {}) {
  return {
    id: 'a1',
    name: '玉珠',
    role: 'guardian',
    personality: 'caring',
    state: 'awake',
    affinity: 65,
    level: 3,
    totalInteractions: 80,
    createdAt: daysAgo(20),
    lastActiveAt: daysAgo(1),
    unlocked: true,
    retired: false,
    conversationContext: { lastAdvisorMessage: 'hi', lastUserReply: 'hey', turnCount: 12 },
    witnessLog: [
      { at: '2026-08-01T08:00:00Z', eventType: 'focus_complete' },
      { at: '2026-08-02T08:00:00Z', eventType: 'emotion_logged' },
    ],
    ...overrides,
  }
}

async function mountPanel(overrides: Record<string, any> = {}) {
  vi.resetModules()
  mockHolder.profile = profile(overrides)
  const mod = await import('../AdvisorChatArchivePanel.vue')
  const wrapper = mount(mod.default, { props: { advisorId: 'a1' } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('dialogue-archive-analytics · 对话分身档案引擎', () => {
  const NOW = new Date('2026-08-27T12:00:00')

  it('概览统计轮次/互动/见证/在位天数与档位', async () => {
    const { dialogueArchiveOverview } = await import('../../modules/advisor/dialogue-archive-analytics')
    const ov = dialogueArchiveOverview(profile({ createdAt: '2026-08-07T12:00:00', lastActiveAt: '2026-08-26T12:00:00' }), NOW)
    expect(ov.turnCount).toBe(12)
    expect(ov.totalInteractions).toBe(80)
    expect(ov.witnessCount).toBe(2)
    expect(ov.tenureDays).toBe(20)
    expect(ov.affinity).toBe(65)
    expect(ov.tier).toBe('信赖')
    expect(ov.lastActiveDays).toBe(1)
    expect(ov.isRetired).toBe(false)
  })

  it('活跃档案生成温和洞察', async () => {
    const { dialogueArchiveOverview } = await import('../../modules/advisor/dialogue-archive-analytics')
    const ov = dialogueArchiveOverview(profile({ createdAt: '2026-08-07T12:00:00', lastActiveAt: '2026-08-26T12:00:00' }), NOW)
    expect(ov.insights.some(s => s.includes('已与 玉珠 对话 12 轮'))).toBe(true)
    expect(ov.insights.some(s => s.includes('相伴 20 天'))).toBe(true)
    expect(ov.insights.some(s => s.includes('见证了你的 2 次成长'))).toBe(true)
    expect(ov.insights.some(s => s.includes('1 天前'))).toBe(true)
  })

  it('退休档案出荣休洞察', async () => {
    const { dialogueArchiveOverview } = await import('../../modules/advisor/dialogue-archive-analytics')
    const ov = dialogueArchiveOverview(profile({ retired: true }), NOW)
    expect(ov.isRetired).toBe(true)
    expect(ov.insights.some(s => s.includes('荣休'))).toBe(true)
  })

  it('空档案归零并给出守候洞察', async () => {
    const { dialogueArchiveOverview } = await import('../../modules/advisor/dialogue-archive-analytics')
    const ov = dialogueArchiveOverview(
      { name: '玉珠', affinity: 0, level: 1, totalInteractions: 0, createdAt: undefined, lastActiveAt: null, retired: false, conversationContext: undefined, witnessLog: undefined } as any,
      NOW,
    )
    expect(ov.turnCount).toBe(0)
    expect(ov.tenureDays).toBe(0)
    expect(ov.lastActiveDays).toBe(null)
    expect(ov.tier).toBe('陌路')
  })
})

describe('AdvisorChatArchivePanel 对话分身档案面板', () => {
  it('渲染标题与统计速览', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('对话分身档案')
    expect(wrapper.text()).toContain('对话轮次')
    expect(wrapper.text()).toContain('总互动')
    expect(wrapper.text()).toContain('见证次数')
    expect(wrapper.text()).toContain('在位天数')
    expect(wrapper.text()).toContain('12')
  })

  it('展示好感度进度与档位', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('65 / 100')
    expect(wrapper.text()).toContain('信赖')
  })

  it('展示温和洞察文案', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('已与 玉珠 对话 12 轮')
    expect(wrapper.text()).toContain('见证了你的 2 次成长')
  })

  it('幕僚不存在时不渲染面板', async () => {
    vi.resetModules()
    mockHolder.profile = undefined
    const mod = await import('../AdvisorChatArchivePanel.vue')
    const wrapper = mount(mod.default, { props: { advisorId: 'ghost' } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dap-panel').exists()).toBe(false)
  })
})
