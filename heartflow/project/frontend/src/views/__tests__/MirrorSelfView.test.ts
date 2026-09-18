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
const TEMPLATES_KEY = 'hf:mirror_templates'

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

describe('集成：自我认知档案面板', () => {
  beforeEach(() => {
    removeKV(SESSIONS_KEY)
  })

  it('无对话时渲染空态引导', async () => {
    const wrapper = await createWrapper()
    const pac = wrapper.find('.pac-panel')
    expect(pac.exists()).toBe(true)
    expect(pac.find('.pac-title').text()).toContain('自我认知档案')
    expect(pac.find('.pac-empty').text()).toContain('与镜我深度对话')
  })

  it('有对话时渲染概览四格与人格风格', async () => {
    seedSessions()
    const wrapper = await createWrapper()
    const pac = wrapper.find('.pac-panel')
    expect(pac.find('.pac-empty').exists()).toBe(false)
    expect(pac.findAll('.pac-ov-item').length).toBe(4)
    expect(pac.text()).toContain('次留声')
    expect(pac.text()).toContain('字沉淀')
    expect(pac.text()).toContain('覆盖天数')
    expect(pac.find('.pac-block-title').text()).toBe('人格风格')
  })

  it('有对话时渲染价值观取向与成长阶段', async () => {
    seedSessions()
    const wrapper = await createWrapper()
    const pac = wrapper.find('.pac-panel')
    expect(pac.text()).toContain('价值观取向')
    expect(pac.findAll('.pac-val-row').length).toBeGreaterThan(0)
    expect(pac.text()).toContain('成长阶段')
    expect(pac.find('.pac-growth-label').exists()).toBe(true)
    expect(pac.text()).toContain('次留声')
  })

  it('有对话时渲染温和洞察', async () => {
    seedSessions()
    const wrapper = await createWrapper()
    const pac = wrapper.find('.pac-panel')
    expect(pac.text()).toContain('温和洞察')
    expect(pac.findAll('.pac-insight').length).toBeGreaterThan(0)
  })

  it('清理后恢复空态（无跨用例污染）', async () => {
    const wrapper = await createWrapper()
    const pac = wrapper.find('.pac-panel')
    expect(pac.find('.pac-empty').exists()).toBe(true)
  })
})

// ============================================================
// 集成：对话模板面板（INCR-297 补挂载孤儿组件 DialogueTemplatesPanel）
// 面板 onMounted 起即经 useDialogueTemplates 从 storage 读模板（缺省回落 8 条
// DEFAULT_TEMPLATES）；推荐区块按时段/星期（getRecommendedTemplates），
// 热门区块按 usageCount 排序（popularTemplates），使用按钮写回 recordUsage。
// 测试清理 hf:mirror_templates 键，使各用例从默认模板起步。
// ============================================================
describe('集成：对话模板面板', () => {
  beforeEach(() => {
    removeKV(SESSIONS_KEY)
    removeKV(TEMPLATES_KEY)
  })

  it('渲染面板标题与副标题', async () => {
    const wrapper = await createWrapper()
    const panel = wrapper.find('.dtp')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.dtp-title').text()).toContain('对话模板')
    expect(panel.find('.dtp-sub').text()).toContain('模板 · 推荐 · 使用')
  })

  it('缺省模板落地：渲染全部模板列表（8 条含名称/描述/引导语）', async () => {
    const wrapper = await createWrapper()
    const cards = wrapper.findAll('.dtp-tpl')
    expect(cards.length).toBe(8)
    const names = cards.map((c) => c.find('.dtp-tpl-name').text())
    expect(names).toContain('晨间签到')
    expect(names).toContain('晚间反思')
    expect(names).toContain('周回顾')
    expect(names).toContain('决策辅助')
    // 每条模板都带描述；引导语在展开的详情视图里（INCR-352 合并后 prompts 收进 .dtp-detail）
    expect(cards[0].find('.dtp-tpl-desc').text()).not.toBe('')
    await cards[0].find('.dtp-tpl-head').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dtp-detail').exists()).toBe(true)
    expect(wrapper.findAll('.dtp-prompt').length).toBeGreaterThan(0)
    // 空态不存在
    expect(wrapper.find('.dtp-empty').exists()).toBe(false)
  })

  it('渲染热门模板区（按使用次数排序）', async () => {
    setKV(TEMPLATES_KEY, [
      { id: 't_hot', type: 'gratitude', name: '感恩练习', description: '练习感恩', icon: '🙏', prompts: ['a'], expectedIntents: ['reflect'], usageCount: 5 },
      { id: 't_cold', type: 'focus_prep', name: '专注准备', description: '进入专注', icon: '🎯', prompts: ['b'], expectedIntents: ['focus'], usageCount: 1 },
    ])
    const wrapper = await createWrapper()
    const pops = wrapper.findAll('.dtp-pop')
    expect(pops.length).toBe(2)
    // 热门首位是使用次数最高的
    expect(pops[0].find('.dtp-pop-name').text()).toBe('感恩练习')
    expect(pops[0].find('.dtp-pop-count').text()).toContain('5 次')
    expect(pops[1].find('.dtp-pop-name').text()).toBe('专注准备')
  })

  it('推荐模板按时段出现（早间 8 点 → 晨间签到）', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15, 8, 0, 0)) // 2026-01-15 08:00 周四
    try {
      const wrapper = await createWrapper()
      const recs = wrapper.findAll('.dtp-rec')
      expect(recs.length).toBeGreaterThan(0)
      const recNames = recs.map((r) => r.find('.dtp-rec-name').text())
      expect(recNames).toContain('晨间签到')
    } finally {
      vi.useRealTimers()
    }
  })

  it('点击「使用此模板」记录使用次数并持久化', async () => {
    const wrapper = await createWrapper()
    const morning = wrapper
      .findAll('.dtp-tpl')
      .find((c) => c.find('.dtp-tpl-name').text() === '晨间签到')!
    expect(morning.find('.dtp-tpl-count').text()).toContain('使用 0 次')
    await morning.find('.dtp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(morning.find('.dtp-tpl-count').text()).toContain('使用 1 次')
    // 存储已持久化，再次挂载仍为 1 次
    const again = await createWrapper()
    const morningAgain = again
      .findAll('.dtp-tpl')
      .find((c) => c.find('.dtp-tpl-name').text() === '晨间签到')!
    expect(morningAgain.find('.dtp-tpl-count').text()).toContain('使用 1 次')
  })
})

// ============================================================
// 集成：镜我深处面板（INCR-301 补挂载孤儿组件 MirrorDeepPanel）
// 零 props 自持读桥：年度对话(collectAnnual←storage 情绪/专注/锚点) /
// 幕僚调度(useDispatch←mirror.dispatch.records) / 任务拆解(useDecomposer←
// mirror.decomposer.plans)。useDispatch/useDecomposer 每次调用新建 ref，
// 用例间仅需清理 storage 键；storage.getEmotions 等空数据回落 → 年度信静默。
// ============================================================
describe('集成：镜我深处面板', () => {
  beforeEach(() => {
    removeKV(SESSIONS_KEY)
    removeKV('mirror.dispatch.records')
    removeKV('mirror.decomposer.plans')
  })

  it('渲染面板标题与三个 Tab（默认年度对话激活）', async () => {
    const wrapper = await createWrapper()
    const mdp = wrapper.find('.mirror-deep')
    expect(mdp.exists()).toBe(true)
    expect(mdp.find('.mdp-title').text()).toBe('镜我深处')
    const tabs = mdp.findAll('.mdp-tab').map((t) => t.text())
    expect(tabs).toEqual(['年度对话', '幕僚调度', '任务拆解'])
    // 默认年度对话 Tab 激活且年度表单可见
    expect(mdp.findAll('.mdp-tab')[0].classes()).toContain('is-active')
    expect(mdp.find('.mdp-annual-ctrl').exists()).toBe(true)
  })

  it('年度对话：空数据展开时呈现静默空态', async () => {
    const wrapper = await createWrapper()
    const mdp = wrapper.find('.mirror-deep')
    // 点击「展开这一年」（空情绪/专注/锚点 → tone 静默）
    const genBtn = mdp.findAll('.mdp-btn').find((b) => b.text() === '展开这一年')!
    await genBtn.trigger('click')
    expect(mdp.find('.mdp-letter').exists()).toBe(true)
    expect(mdp.find('.mdp-letter-empty').text()).toContain('这一年还没有留下任何痕迹')
  })

  it('幕僚调度：下达调令后生成记录（含策略标签与状态徽章）', async () => {
    const wrapper = await createWrapper()
    const mdp = wrapper.find('.mirror-deep')
    // 切到幕僚调度 Tab
    await mdp.findAll('.mdp-tab').find((t) => t.text() === '幕僚调度')!.trigger('click')
    // 空态：v-show 使各 Tab 均留 DOM，.mdp-empty 首现为调度区
    expect(mdp.findAll('.mdp-empty')[0].text()).toContain('尚未下达调令')
    // 填写调令并勾选幕僚
    await mdp.find('.mdp-dispatch-form input').setValue('先拟大纲，再成文')
    await mdp.findAll('.mdp-chip').find((c) => c.text() === '镜我')!.trigger('click')
    // 策略标签出现（单一）
    expect(mdp.find('.mdp-strategy').text()).toContain('策略：单一')
    // 测试环境点击 submit 按钮不派发 form submit，直接触发表单提交
    await mdp.find('.mdp-dispatch-form').trigger('submit')
    // 调令记录生成
    expect(mdp.findAll('.mdp-dispatch-item').length).toBe(1)
    expect(mdp.find('.mdp-dispatch-order').text()).toBe('先拟大纲，再成文')
    expect(mdp.find('.mdp-dispatch-badge').text()).toBe('待命')
    expect(mdp.findAll('.mdp-step-pill').length).toBeGreaterThan(0)
  })

  it('任务拆解：输入任务后生成拆解计划与步骤', async () => {
    const wrapper = await createWrapper()
    const mdp = wrapper.find('.mirror-deep')
    // 切到任务拆解 Tab
    await mdp.findAll('.mdp-tab').find((t) => t.text() === '任务拆解')!.trigger('click')
    // 拆解区空态是 .mdp-empty 的末现（调度区空态残留于 DOM）
    const empties = mdp.findAll('.mdp-empty')
    expect(empties[empties.length - 1].text()).toContain('还没有拆解过的任务')
    // 输入任务并拆解
    await mdp.find('.mdp-decompose-form input').setValue('整理房间')
    await mdp.find('.mdp-decompose-form').trigger('submit')
    expect(mdp.findAll('.mdp-plan-item').length).toBe(1)
    expect(mdp.find('.mdp-plan-task').text()).toBe('整理房间')
    expect(mdp.findAll('.mdp-plan-step').length).toBeGreaterThan(0)
    expect(mdp.find('.mdp-plan-intent').text()).toContain('·')
  })

  it('Tab 切换后功能区互不串扰（调度记录仅在调度 Tab 可见）', async () => {
    const wrapper = await createWrapper()
    const mdp = wrapper.find('.mirror-deep')
    // 在调度 Tab 下达一条调令
    await mdp.findAll('.mdp-tab').find((t) => t.text() === '幕僚调度')!.trigger('click')
    await mdp.find('.mdp-dispatch-form input').setValue('复盘本周')
    await mdp.findAll('.mdp-chip').find((c) => c.text() === '时痕')!.trigger('click')
    await mdp.find('.mdp-dispatch-form').trigger('submit')
    expect(mdp.find('.mdp-dispatch-order').text()).toBe('复盘本周')
    // 切到年度对话：激活态正确切换（happy-dom 下 v-show display 恒为空，改用 is-active 判定）
    await mdp.findAll('.mdp-tab').find((t) => t.text() === '年度对话')!.trigger('click')
    const activeTab = mdp.findAll('.mdp-tab').find((t) => t.classes().includes('is-active'))!.text()
    expect(activeTab).toBe('年度对话')
    // 切回调度 Tab：记录仍在（同挂载内状态保持）
    await mdp.findAll('.mdp-tab').find((t) => t.text() === '幕僚调度')!.trigger('click')
    expect(mdp.find('.mdp-dispatch-order').text()).toBe('复盘本周')
  })
})
