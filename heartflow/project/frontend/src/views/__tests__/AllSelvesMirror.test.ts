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
    // 自我对话档案（INCR-08）随对话数据联动
    expect(wrapper.find('.stalk-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('自我对话档案')
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

  // ============================================================
  // 集成：对话主题洞察面板 TopicClusteringPanel（INCR-234 补挂载孤儿组件）
  // 面板消费真实 useTopicClustering 纯计算引擎，经 storage 喂 SelfTalk
  // ============================================================
  describe('集成：对话主题洞察面板', () => {
    it('无对话时渲染面板骨架与空态引导', async () => {
      mockStore['hf:self_talks_v2'] = []
      const wrapper = await createWrapper()
      expect(wrapper.find('.tcl-panel').exists()).toBe(true)
      expect(wrapper.text()).toContain('对话主题洞察')
      expect(wrapper.text()).toContain('还没有足够的自我对话')
    })

    it('有共享关键词的对话时聚出主题卡片与高频关键词', async () => {
      mockStore['hf:self_talks_v2'] = [
        { id: 't1', text: '阅读能带来平静的夜晚', at: new Date().toISOString() },
        { id: 't2', text: '阅读完把体悟写进日记', at: new Date().toISOString() },
        { id: 't3', text: '保持每晚阅读的好习惯', at: new Date().toISOString() },
      ]
      const wrapper = await createWrapper()
      expect(wrapper.find('.tcl-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('阅读')
      const statNum = wrapper.find('.tcl-stat-value')
      expect(statNum.exists()).toBe(true)
      expect(parseInt(statNum.text(), 10)).toBeGreaterThan(0)
    })

    it('关键词搜索命中主题并显示相关度', async () => {
      mockStore['hf:self_talks_v2'] = [
        { id: 't1', text: '阅读让我专注平静', at: new Date().toISOString() },
        { id: 't2', text: '专注很难，但阅读是捷径', at: new Date().toISOString() },
        { id: 't3', text: '每天阅读保持专注', at: new Date().toISOString() },
      ]
      const wrapper = await createWrapper()
      const input = wrapper.find('.tcl-input')
      await input.setValue('阅读')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.tcl-results').exists()).toBe(true)
      expect(wrapper.text()).toContain('相关度')
    })
  })

  // ============================================================
  // 集成：人格建模面板 PersonalityModelPanel（INCR-236 补挂载孤儿组件）
  // 引擎 usePersonalityModel 内部 ref 按调用自 storage 读，清存储即复位
  // ============================================================
  describe('集成：人格建模面板', () => {
    // 生成 20+ 条可分析的自我对话（minDialoguesForStyle = 20）
    function seedTalks(count: number = 20) {
      const talks = Array.from({ length: count }, (_, i) => ({
        id: `p-${i}`,
        text: `保持习惯与思考，第 ${i + 1} 次复盘让我更平静专注`,
        at: new Date(Date.now() + i * 60000).toISOString(),
      }))
      mockStore['hf:self_talks_v2'] = talks
      return talks
    }

    it('无对话时渲染人格建模空态', async () => {
      mockStore['hf:self_talks_v2'] = []
      const wrapper = await createWrapper()
      expect(wrapper.find('.pmp-panel').exists()).toBe(true)
      expect(wrapper.text()).toContain('人格建模')
      expect(wrapper.text()).toContain('暂无人格画像')
    })

    it('有对话时渲染徽章与五个标签导航', async () => {
      seedTalks(2)
      const wrapper = await createWrapper()
      expect(wrapper.find('.pmp-badge').exists()).toBe(true)
      expect(wrapper.text()).toContain('0 画像')
      const tabs = wrapper.findAll('.pmp-tab')
      expect(tabs.length).toBe(5)
      expect(wrapper.text()).toContain('风格')
      expect(wrapper.text()).toContain('价值观')
      expect(wrapper.text()).toContain('预测')
    })

    it('积累 20 条对话后点击「分析风格」生成风格画像', async () => {
      seedTalks(20)
      const wrapper = await createWrapper()
      const btn = wrapper.find('button.pmp-btn')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.pmp-chips').exists()).toBe(true)
      expect(wrapper.text()).toContain('1 画像')
      expect(wrapper.find('.pmp-bar-item').exists()).toBe(true)
    })
  })

  // ============================================================
  // 集成：意图反馈学习面板 IntentFeedbackPanel（INCR-244 补挂载孤儿组件）
  // 引擎 useIntentFeedbackLearning 内 refs 于 use 调用时自 storage 读（hf:mirror_intent_feedback / hf:mirror_learning_model），
  // 本文件 mock 的 storage.getKV 直读 mockStore，先 seed 键再挂载即复位
  // ============================================================
  describe('集成：意图反馈学习面板', () => {
    const SEED_MODEL = {
      keywordWeights: { focus: { 专注: 6, 番茄: 3 }, plan: { 计划: 4, 日程: 2 } },
      totalFeedback: 10,
      correctionRate: 0.3,
      lastTrainedAt: '2026-09-11T08:00:00.000Z',
    }

    function seedLearning() {
      mockStore['hf:mirror_intent_feedback'] = [
        { input: '想开始专注', parsedIntent: 'focus', confirmed: true, feedbackAt: '2026-09-11T08:00:00.000Z' },
        { input: '安排日程', parsedIntent: 'journal', confirmed: false, correctedIntent: 'plan', feedbackAt: '2026-09-11T09:00:00.000Z' },
      ]
      mockStore['hf:mirror_learning_model'] = SEED_MODEL
    }

    it('无学习数据时渲染面板骨架与空态引导', async () => {
      mockStore['hf:mirror_intent_feedback'] = []
      mockStore['hf:mirror_learning_model'] = undefined
      const wrapper = await createWrapper()
      expect(wrapper.find('.ifp').exists()).toBe(true)
      expect(wrapper.text()).toContain('🧠 意图反馈学习')
      expect(wrapper.text()).toContain('学习 · 反馈 · 权重')
      expect(wrapper.text()).toContain('暂无学习数据')
    })

    it('有反馈数据时渲染四格学习统计', async () => {
      seedLearning()
      const wrapper = await createWrapper()
      expect(wrapper.find('.ifp-stats').exists()).toBe(true)
      expect(wrapper.text()).toContain('反馈总数')
      expect(wrapper.text()).toContain('修正率')
      expect(wrapper.text()).toContain('学习意图')
      expect(wrapper.text()).toContain('最近训练')
      expect(wrapper.text()).toContain('10') // 反馈总数
      expect(wrapper.text()).toContain('30%') // 修正率
    })

    it('渲染关键词权重块与关键词计数', async () => {
      seedLearning()
      const wrapper = await createWrapper()
      const weights = wrapper.findAll('.ifp-weight')
      expect(weights.length).toBe(2)
      expect(wrapper.text()).toContain('关键词权重')
      expect(wrapper.text()).toContain('专注')
      expect(wrapper.find('.ifp-kw').exists()).toBe(true)
    })

    it('渲染最近反馈（已确认/已修正徽章）', async () => {
      seedLearning()
      const wrapper = await createWrapper()
      expect(wrapper.find('.ifp-fb').exists()).toBe(true)
      expect(wrapper.text()).toContain('最近反馈')
      expect(wrapper.text()).toContain('想开始专注')
      expect(wrapper.text()).toContain('已确认')
      expect(wrapper.text()).toContain('已修正')
      expect(wrapper.find('.ifp-fb-badge--ok').exists()).toBe(true)
      expect(wrapper.find('.ifp-fb-badge--fix').exists()).toBe(true)
    })

    it('无数据时重置按钮禁用，有数据时点击重置清空学习模型', async () => {
      // 空态：禁用
      mockStore['hf:mirror_intent_feedback'] = []
      mockStore['hf:mirror_learning_model'] = undefined
      let wrapper = await createWrapper()
      expect(wrapper.find('.ifp-btn--danger').attributes('disabled')).toBeDefined()
      // 有数据：可点击并重置
      seedLearning()
      wrapper = await createWrapper()
      const btn = wrapper.find('.ifp-btn--danger')
      expect(btn.attributes('disabled')).toBeUndefined()
      await btn.trigger('click')
      await wrapper.vm.$nextTick()
      expect(mockSetKV).toHaveBeenCalledWith('hf:mirror_intent_feedback', [])
      expect(mockSetKV).toHaveBeenCalledWith('hf:mirror_learning_model', expect.objectContaining({ totalFeedback: 0, keywordWeights: {} }))
      expect(wrapper.text()).toContain('暂无学习数据')
    })
  })
})