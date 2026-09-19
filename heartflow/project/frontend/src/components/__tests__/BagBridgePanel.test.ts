// ============================================================
// BagBridgePanel 组件测试 - 行囊桥·总览（INCR-379）
// 真实引擎（useBagBridge → useBagStore + useBagAnalytics）
// + mock storage（../../engine/storage 与 ../../engine/storage/kv 双入口）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const CATEGORIES_KEY = 'bag:categories'
const TREND_KEY = 'hf:bag:growth_trend'
const PATHS_KEY = 'hf:bag:learning_paths'

const { mockStore, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const mockStore: Record<string, any> = {}
  const mockGetKV = vi.fn((key: string, def: any) => mockStore[key] ?? def)
  const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })
  return { mockStore, mockGetKV, mockSetKV }
})

// bag/index.ts 直接 import { getKV, setKV } from '../../engine/storage/kv'
vi.mock('../../engine/storage/kv', () => ({
  getKV: (...a: any[]) => (mockGetKV as any)(...a),
  setKV: (...a: any[]) => (mockSetKV as any)(...a),
}))

// bag-bridge.ts / bag-analytics.ts import { storage } from '../../engine/storage'
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import BagBridgePanel from '../BagBridgePanel.vue'

// ============================================================
// 种子数据
// ============================================================

/** 7 个空分类（触发 store 的 saved.length === 7 归一化分支，totalItems = 0） */
function makeEmptyCategories(): any[] {
  return [
    { id: 'e1', name: '', icon: '', color: '', proficiency: 0, categoryType: 'tool', items: [] },
    { id: 'e2', name: '', icon: '', color: '', proficiency: 0, categoryType: 'language', items: [] },
    { id: 'e3', name: '', icon: '', color: '', proficiency: 0, categoryType: 'framework', items: [] },
    { id: 'e4', name: '', icon: '', color: '', proficiency: 0, categoryType: 'design', items: [] },
    { id: 'e5', name: '', icon: '', color: '', proficiency: 0, categoryType: 'softskill', items: [] },
    { id: 'e6', name: '', icon: '', color: '', proficiency: 0, categoryType: 'domain', items: [] },
    { id: 'e7', name: '', icon: '', color: '', proficiency: 0, categoryType: 'certification', items: [] },
  ]
}

/**
 * 7 个带数据分类：
 * 总物品 17、平均熟练 round(355/7)=51、精通分类 1（知识85）、薄弱分类 1（技能25）
 * 覆盖 6/7 类型 → diversity 6/7，健康分 round(51*0.4 + 6/7*30 + 1/7*30) = round(50.4) = 50
 */
function makeCategories(): any[] {
  return [
    {
      id: 'tools',
      name: '工具',
      icon: '🛠',
      color: '#c48a6a',
      proficiency: 65,
      categoryType: 'tool',
      items: [
        { name: 'VS Code', proficiency: 80 },
        { name: 'Git', proficiency: 80 },
        { name: 'Docker', proficiency: 40 },
      ],
    },
    {
      id: 'knowledge',
      name: '知识',
      icon: '📚',
      color: '#8a9ab8',
      proficiency: 85,
      categoryType: 'framework',
      items: [
        { name: 'Vue 3', proficiency: 90 },
        { name: 'TypeScript', proficiency: 85 },
        { name: 'Node.js', proficiency: 60 },
        { name: 'Python', proficiency: 70 },
        { name: 'CSS', proficiency: 80 },
      ],
    },
    {
      id: 'skills',
      name: '技能',
      icon: '⚡',
      color: '#e8c060',
      proficiency: 25,
      categoryType: 'softskill',
      items: [
        { name: '沟通协作', proficiency: 40 },
        { name: '问题分析', proficiency: 30 },
      ],
    },
    {
      id: 'materials',
      name: '素材',
      icon: '📦',
      color: '#7a9a8a',
      proficiency: 45,
      categoryType: 'domain',
      items: [
        { name: '组件库', proficiency: 30 },
        { name: '设计稿', proficiency: 20 },
      ],
    },
    {
      id: 'keepsakes',
      name: '珍藏',
      icon: '💎',
      color: '#c4a0b8',
      proficiency: 38,
      categoryType: 'certification',
      items: [
        { name: '优秀项目', proficiency: 30 },
        { name: '推荐读物', proficiency: 20 },
      ],
    },
    {
      id: 'references',
      name: '参考',
      icon: '📎',
      color: '#8a8a7a',
      proficiency: 55,
      categoryType: 'design',
      items: [
        { name: 'API 文档', proficiency: 30 },
        { name: '教程链接', proficiency: 30 },
      ],
    },
    {
      id: 'inspirations',
      name: '灵感',
      icon: '✨',
      color: '#a08ac4',
      proficiency: 42,
      categoryType: 'design',
      items: [
        { name: '创意笔记', proficiency: 30 },
      ],
    },
  ]
}

/** 两日点趋势：日增长率 (51-45)/30 = 0.2/天 */
function makeTrend(): any[] {
  return [
    { date: '2026-08-21', totalProficiency: 315, avgProficiency: 45, newItems: 10, masteredItems: 0 },
    { date: '2026-09-20', totalProficiency: 357, avgProficiency: 51, newItems: 17, masteredItems: 1 },
  ]
}

function makeActivePath(): any {
  return {
    id: 'lp_ts_adv',
    name: 'TypeScript 进阶',
    description: '掌握高级类型',
    targetCategory: 'framework',
    steps: [
      { name: '泛型', description: '', targetProficiency: 80, completed: false },
      { name: '装饰器', description: '', targetProficiency: 85, completed: false },
    ],
    currentStep: 0,
    completed: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  }
}

// ============================================================
// 挂载与种子
// ============================================================

function seedKV(key: string, value: any) {
  mockStore[key] = value
}

async function mountPanel() {
  setActivePinia(createPinia())
  const wrapper = mount(BagBridgePanel)
  await nextTick()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(mockStore).forEach((k) => delete mockStore[k])
})

describe('BagBridgePanel 行囊桥·总览（INCR-379）', () => {
  it('空态：徽标归零，健康卡常驻，概览/雷达/预测/趋势/路径卡不渲染', async () => {
    seedKV(CATEGORIES_KEY, makeEmptyCategories())
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="bag-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('行囊桥 · 此刻')
    expect(wrapper.find('[data-test="bbp-badge"]').text()).toBe('共 0 件 · 健康 30')
    expect(wrapper.find('[data-test="bbp-health"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="bbp-hscore"]').text()).toBe('30')
    expect(wrapper.find('[data-test="bbp-overview"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="bbp-radar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="bbp-predict"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="bbp-trend"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="bbp-paths"]').exists()).toBe(false)
  })

  it('行囊健康度：徽标件数/健康分、最强与最弱技能、改善建议', async () => {
    seedKV(CATEGORIES_KEY, makeCategories())
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="bbp-badge"]').text()).toBe('共 17 件 · 健康 50')
    expect(wrapper.find('[data-test="bbp-hscore"]').text()).toBe('50')
    const hline = wrapper.find('[data-test="bbp-hline"]')
    expect(hline.text()).toContain('知识')
    expect(hline.text()).toContain('85')
    expect(hline.text()).toContain('技能')
    expect(hline.text()).toContain('25')
    expect(wrapper.find('[data-test="bbp-hsug"]').text()).toContain('有 1 个类别熟练度偏低')
  })

  it('技能概览：分类行渲染件数与精通数', async () => {
    seedKV(CATEGORIES_KEY, makeCategories())
    const wrapper = await mountPanel()
    const overview = wrapper.find('[data-test="bbp-overview"]')
    expect(overview.exists()).toBe(true)
    const tool = overview.find('[data-test="bbp-skill-tool"]')
    expect(tool.text()).toContain('工具')
    expect(tool.text()).toContain('3 件')
    expect(tool.text()).toContain('精通 2')
    const framework = overview.find('[data-test="bbp-skill-framework"]')
    expect(framework.text()).toContain('知识')
    expect(framework.text()).toContain('5 件')
    expect(framework.text()).toContain('精通 3')
    expect(tool.find('.bbp-skill-seg').attributes('style')).toContain('65%')
  })

  it('技能雷达：7 行渲染，标签与熟练度', async () => {
    seedKV(CATEGORIES_KEY, makeCategories())
    const wrapper = await mountPanel()
    const radar = wrapper.find('[data-test="bbp-radar"]')
    expect(radar.exists()).toBe(true)
    expect(radar.findAll('.bbp-radar-row').length).toBe(7)
    expect(radar.text()).toContain('工具')
    expect(radar.text()).toContain('软技能')
    expect(radar.text()).toContain('65')
    expect(radar.text()).toContain('25')
  })

  it('成长趋势与熟练度预测：趋势行渲染，预测含达 80 天数', async () => {
    seedKV(CATEGORIES_KEY, makeCategories())
    seedKV(TREND_KEY, JSON.stringify(makeTrend()))
    const wrapper = await mountPanel()
    const trend = wrapper.find('[data-test="bbp-trend"]')
    expect(trend.exists()).toBe(true)
    expect(trend.text()).toContain('均 45')
    expect(trend.text()).toContain('新增 10')
    expect(trend.text()).toContain('均 51')
    expect(trend.text()).toContain('精通 1')
    const predict = wrapper.find('[data-test="bbp-predict"]')
    expect(predict.exists()).toBe(true)
    // 技能（25）→ ceil(55/0.2)=275 天；工具（65）→ ceil(15/0.2)=75 天
    expect(predict.text()).toContain('约 275 天达 80')
    expect(predict.text()).toContain('约 75 天达 80')
  })

  it('学习路径与技能推荐：进行中路径渲染，高优先级薄弱推荐，路径种子被消费', async () => {
    seedKV(CATEGORIES_KEY, makeCategories())
    seedKV(PATHS_KEY, JSON.stringify([makeActivePath()]))
    const wrapper = await mountPanel()
    const paths = wrapper.find('[data-test="bbp-paths"]')
    expect(paths.exists()).toBe(true)
    expect(paths.text()).toContain('TypeScript 进阶')
    expect(paths.text()).toContain('0/2 步')
    expect(paths.text()).toContain('框架')
    const recs = wrapper.find('[data-test="bbp-recs"]')
    expect(recs.exists()).toBe(true)
    expect(recs.text()).toContain('优先')
    expect(recs.text()).toContain('关注薄弱技能')
    expect(recs.text()).toContain('熟练度仅为 25%')
    expect(recs.text()).toContain('冲击精通')
    expect(recs.text()).toContain('丰富技能库')
    // 已有进行中路径 → 不推荐创建学习路径
    expect(recs.text()).not.toContain('创建学习路径')
  })
})
