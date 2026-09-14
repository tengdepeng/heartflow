// ============================================================
// 梦乡小筑 · 意象之镜面板测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockDreams = ref<any[]>([])

const mockStore = {
  get dreams() { return mockDreams.value },
  moodLabel: vi.fn((mood: string) => {
    const map: Record<string, string> = { happy: '😊', fear: '😨', sad: '😢', curious: '🤔', confused: '🌀', neutral: '☁️' }
    return map[mood] || '☁️'
  }),
}

vi.mock('../../stores/dreamNook', () => ({
  useDreamNookStore: () => mockStore,
}))

async function getWrapper() {
  const { default: DreamOmenPanel } = await import('../DreamOmenPanel.vue')
  return mount(DreamOmenPanel)
}

describe('DreamOmenPanel 意象之镜', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDreams.value = []
  })

  it('空态显示「梦镜未启」引导', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('意象之镜')
    expect(wrapper.text()).toContain('梦镜未启')
    expect(wrapper.text()).toContain('梦乡还空着')
  })

  it('填充态显示标题与意象徽章', async () => {
    mockDreams.value = [
      { id: 'd1', title: '海', content: '梦见大海', mood: 'neutral', tags: [], at: '2026-01-01T00:00:00Z' },
      { id: 'd2', title: '飞', content: '在云端飞翔', mood: 'happy', tags: [], at: '2026-01-02T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('意象之镜')
    expect(wrapper.text()).toContain('2 意象')
  })

  it('高频意象按次数排序并显示计数', async () => {
    mockDreams.value = [
      { id: 'd1', title: '海', content: '梦见大海', mood: 'neutral', tags: [], at: '2026-01-01T00:00:00Z' },
      { id: 'd2', title: '雨', content: '梦见下雨', mood: 'neutral', tags: [], at: '2026-01-02T00:00:00Z' },
      { id: 'd3', title: '飞', content: '在云端飞翔', mood: 'happy', tags: [], at: '2026-01-03T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    const chips = wrapper.findAll('.dmo-omen-chip')
    expect(chips.length).toBeGreaterThan(0)
    expect(chips[0].text()).toContain('水')
    expect(chips[0].text()).toContain('2')
  })

  it('意象回响按时间倒序显示近期梦境与温和观照', async () => {
    mockDreams.value = [
      { id: 'd1', title: '海', content: '梦见大海', mood: 'fear', tags: [], at: '2026-01-01T00:00:00Z' },
      { id: 'd2', title: '飞', content: '在云端飞翔', mood: 'happy', tags: [], at: '2026-01-02T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    const echoes = wrapper.findAll('.dmo-echo')
    expect(echoes).toHaveLength(2)
    expect(echoes[0].text()).toContain('飞')
    expect(echoes[0].text()).toContain('轻盈')
    expect(echoes[0].text()).toContain('挣脱')
    expect(echoes[0].text()).toContain('飞向哪边')
  })

  it('温和观照列表不超过4条', async () => {
    mockDreams.value = [
      { id: 'd1', title: '海', content: '梦见大海', mood: 'neutral', tags: [], at: '2026-01-01T00:00:00Z' },
      { id: 'd2', title: '飞', content: '在云端飞翔', mood: 'happy', tags: [], at: '2026-01-02T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    const items = wrapper.findAll('.dmo-insight')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(4)
  })

  it('有梦境但无意象命中时显示温和提示且无回响', async () => {
    mockDreams.value = [
      { id: 'd1', title: '日常', content: '今天吃了面条', mood: 'neutral', tags: [], at: '2026-01-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('尚未显影出清晰的意象')
    expect(wrapper.findAll('.dmo-echo')).toHaveLength(0)
  })
})
