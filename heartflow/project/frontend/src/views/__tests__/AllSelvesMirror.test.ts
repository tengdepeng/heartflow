// ============================================================
// AllSelvesMirror 万镜之厅视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}

const mockGetSessions = vi.fn(() => mockStore['sessions'] ?? [])
const mockGetNotes = vi.fn(() => mockStore['notes'] ?? [])
const mockGetEmotions = vi.fn(() => mockStore['emotions'] ?? [])
const mockGetRelations = vi.fn(() => mockStore['relations'] ?? [])
const mockGetAnchors = vi.fn(() => mockStore['anchors'] ?? [])
const mockGetGoals = vi.fn(() => mockStore['goals'] ?? [])
const mockGetKV = vi.fn((key: string, def: any) => mockStore[key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: (...args: any[]) => (mockGetSessions as any)(...args),
    getNotes: (...args: any[]) => (mockGetNotes as any)(...args),
    getEmotions: (...args: any[]) => (mockGetEmotions as any)(...args),
    getRelations: (...args: any[]) => (mockGetRelations as any)(...args),
    getAnchors: (...args: any[]) => (mockGetAnchors as any)(...args),
    getGoals: (...args: any[]) => (mockGetGoals as any)(...args),
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getCrystals: () => [],
    getCarriers: () => [],
    getLedger: () => [],
    getPluginRegistry: () => ({}),
  },
  storageVersion: { value: 0 },
}))

// ---- 辅助函数 ----
const KNOWN_MESSAGES = ['触碰镜面', '看见不同的自己', '你在这里', '每一面都是你']

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: `s${Date.now()}`,
    status: 'completed',
    elapsed: 1800000,
    mode: 'focus',
    tags: [],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    ...overrides,
  }
}

async function createWrapper() {
  const { default: AllSelvesMirror } = await import('../AllSelvesMirror.vue')
  return mount(AllSelvesMirror, {
    global: {
      plugins: [createPinia()],
    },
  })
}

// ---- 测试 ----
describe('AllSelvesMirror 万镜之厅视图', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStore['sessions'] = []
    mockStore['notes'] = []
    mockStore['emotions'] = []
    mockStore['relations'] = []
    mockStore['anchors'] = []
    mockStore['goals'] = []
    mockStore['hf:self_talks_v2'] = []
  })

  // ------- 渲染标题 -------
  it('渲染标题"众生象"和副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('众生象')
    expect(wrapper.text()).toContain('众生皆我 · 我皆众生')
  })

  // ------- 渲染底部引用 -------
  it('渲染底部引用语', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('我看到了。我接受了。这些全都是我。')
  })

  // ------- 空数据时统计全部为 0 -------
  it('无数据时统计数字显示为 0', async () => {
    const wrapper = await createWrapper()
    const statNums = wrapper.findAll('.asm-stat-value')
    expect(statNums.length).toBe(6)
    statNums.forEach(num => {
      expect(num.text()).toBe('0')
    })
  })

  // ------- 统计数字正确计算 -------
  it('有数据时正确显示统计数字', async () => {
    mockStore['sessions'] = [
      makeSession({ id: 's1', status: 'completed' }),
      makeSession({ id: 's2', status: 'completed' }),
    ]
    mockStore['notes'] = [{ id: 'n1', text: '笔记1' }]
    mockStore['emotions'] = [{ id: 'e1', type: 'calm' }]
    mockStore['relations'] = [{ id: 'r1', name: '张三', relation: 'friend' }]
    mockStore['anchors'] = [{ id: 'a1', text: '锚点1' }]
    mockStore['goals'] = [{ id: 'g1', text: '目标1' }]

    const wrapper = await createWrapper()
    const statNums = wrapper.findAll('.asm-stat-value')
    expect(statNums[0].text()).toBe('2')  // 专注
    expect(statNums[1].text()).toBe('1')  // 笔记
    expect(statNums[2].text()).toBe('1')  // 情绪
    expect(statNums[3].text()).toBe('1')  // 羁绊
    expect(statNums[4].text()).toBe('1')  // 心锚
    expect(statNums[5].text()).toBe('1')  // 目标
  })

  // ------- 显示所有房间镜像 -------
  it('显示所有 6 个房间镜像卡片', async () => {
    const wrapper = await createWrapper()
    const roomCards = wrapper.findAll('.asm-room-card')
    expect(roomCards.length).toBe(6)
    expect(wrapper.text()).toContain('时间长廊')
    expect(wrapper.text()).toContain('情绪花房')
    expect(wrapper.text()).toContain('羁绊之厅')
    expect(wrapper.text()).toContain('蜕变回廊')
    expect(wrapper.text()).toContain('留光阁')
    expect(wrapper.text()).toContain('逐日心锚')
  })

  // ------- 点击房间镜像显示详情 -------
  it('点击房间镜像卡片显示详情区域', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.asm-insight-card').exists()).toBe(false)
    const firstCard = wrapper.find('.asm-room-card')
    await firstCard.trigger('click')
    expect(wrapper.find('.asm-insight-card').exists()).toBe(true)
  })

  // ------- 点击时间长廊显示时间详情 -------
  it('点击"时间长廊"显示详情列表', async () => {
    mockStore['sessions'] = [
      makeSession({ id: 's1', status: 'completed', elapsed: 3600000, completedAt: new Date().toISOString() }),
    ]
    const wrapper = await createWrapper()
    // 找到时间长廊卡片
    const roomCards = wrapper.findAll('.asm-room-card')
    const timeCard = roomCards.filter(c => c.text().includes('时间长廊'))
    expect(timeCard.length).toBe(1)
    await timeCard[0].trigger('click')
    // 显示详情列表
    expect(wrapper.text()).toContain('总专注次数')
    expect(wrapper.text()).toContain('总专注时长')
    expect(wrapper.text()).toContain('今日专注')
    expect(wrapper.text()).toContain('最长连续天数')
  })

  // ------- 自我对话 - 输入并保存 -------
  it('自我对话输入文本后点击记录保存到 storage', async () => {
    const wrapper = await createWrapper()
    const textarea = wrapper.find('.asm-talk-input')
    await textarea.setValue('今天的感悟')
    const saveBtn = wrapper.find('button.asm-talk-btn')
    await saveBtn.trigger('click')
    expect(mockSetKV).toHaveBeenCalledWith('hf:self_talks_v2', expect.any(Array))
    const saved = mockStore['hf:self_talks_v2']
    expect(saved.length).toBe(1)
    expect(saved[0].text).toBe('今天的感悟')
  })

  // ------- 自我对话 - 空输入时按钮禁用 -------
  it('自我对话输入为空时记录按钮禁用', async () => {
    const wrapper = await createWrapper()
    const saveBtn = wrapper.find('button.asm-talk-btn')
    expect(saveBtn.attributes('disabled')).toBeDefined()
  })

  // ------- 自我对话 - 加载已有对话 -------
  it('加载已有自我对话记录', async () => {
    const now = new Date().toISOString()
    mockStore['hf:self_talks_v2'] = [
      { id: 't1', text: '拥抱变化', at: now },
      { id: 't2', text: '保持专注', at: new Date(Date.now() - 120000).toISOString() },
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('拥抱变化')
    expect(wrapper.text()).toContain('保持专注')
  })

  // ------- 点击镜面触发涟漪 -------
  it('点击镜面触发涟漪动画效果', async () => {
    const wrapper = await createWrapper()
    const mirrorSurface = wrapper.find('.asm-mirror-surface')
    expect(mirrorSurface.classes()).not.toContain('rippling')
    const mirrorFrame = wrapper.find('.asm-mirror-frame')
    await mirrorFrame.trigger('click')
    expect(mirrorSurface.classes()).toContain('rippling')
  })

  // ------- 镜像消息显示 -------
  it('显示镜像消息（其中之一）', async () => {
    const wrapper = await createWrapper()
    const mirrorLabel = wrapper.find('.asm-mirror-label')
    expect(KNOWN_MESSAGES).toContain(mirrorLabel.text())
  })

  // ------- 粒子动画渲染 -------
  it('渲染 60 个粒子元素', async () => {
    const wrapper = await createWrapper()
    const particles = wrapper.findAll('.asm-mp')
    expect(particles.length).toBe(60)
  })
})