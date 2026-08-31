// ============================================================
// 隐私仪表盘面板测试（INCR-45）
// 覆盖空态（数据未显影）与填充态（评分/暴露面/权限/预警/锁定）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'

const mock = vi.hoisted(() => {
  const state = {
    exposures: [] as any[],
    permissions: [] as any[],
    lockState: {
      locked: false,
      lockedAt: null as string | null,
      reason: '',
      scope: 'all' as const,
      duration: 0,
      expiresAt: null as string | null,
      unlockMethod: 'password' as const,
      lockedBy: '',
    },
    latestScore: null as any,
    latestAudit: null as any,
    activeWarnings: [] as any[],
  }
  const lock = vi.fn()
  const unlock = vi.fn()
  return { state, lock, unlock }
})

vi.mock('../../modules/safety/privacy-dashboard', () => ({
  usePrivacyDashboard: () => ({
    exposures: computed(() => mock.state.exposures),
    permissions: computed(() => mock.state.permissions),
    lockState: computed(() => mock.state.lockState),
    getLatestScore: () => mock.state.latestScore,
    getLatestAudit: () => mock.state.latestAudit,
    getActiveWarnings: () => mock.state.activeWarnings,
    getExposureSummary: () => {
      const total = mock.state.exposures.length
      const safe = mock.state.exposures.filter((e: any) => e.exposureStatus === 'safe').length
      const atRisk = mock.state.exposures.filter(
        (e: any) => e.exposureStatus === 'at_risk' || e.exposureStatus === 'exposed',
      ).length
      const breached = mock.state.exposures.filter((e: any) => e.exposureStatus === 'breached').length
      return {
        totalCategories: total,
        safeCategories: safe,
        atRiskCategories: atRisk,
        breachedCategories: breached,
        totalRiskScore: 0,
        highestRiskCategory: null,
      }
    },
    lock: mock.lock,
    unlock: mock.unlock,
  }),
  DATA_CATEGORY_META: {
    emotion: { label: '情绪数据', icon: '🌸', description: '', defaultSensitivity: 'sensitive' },
    diary: { label: '日记笔记', icon: '📝', description: '', defaultSensitivity: 'confidential' },
    personal: { label: '个人信息', icon: '👤', description: '', defaultSensitivity: 'confidential' },
    behavior: { label: '行为记录', icon: '📊', description: '', defaultSensitivity: 'internal' },
    health: { label: '健康数据', icon: '💚', description: '', defaultSensitivity: 'critical' },
    location: { label: '位置数据', icon: '📍', description: '', defaultSensitivity: 'sensitive' },
    social: { label: '社交数据', icon: '👥', description: '', defaultSensitivity: 'sensitive' },
    system: { label: '系统配置', icon: '⚙️', description: '', defaultSensitivity: 'internal' },
    creative: { label: '创作内容', icon: '🎨', description: '', defaultSensitivity: 'sensitive' },
    financial: { label: '财务数据', icon: '💰', description: '', defaultSensitivity: 'critical' },
  },
  SENSITIVITY_META: {
    public: { label: '公开', color: '#2ecc71', score: 0 },
    internal: { label: '内部', color: '#3498db', score: 20 },
    sensitive: { label: '敏感', color: '#f39c12', score: 50 },
    confidential: { label: '机密', color: '#e67e22', score: 75 },
    critical: { label: '关键', color: '#e74c3c', score: 100 },
  },
  EXPOSURE_STATUS_META: {
    safe: { label: '安全', color: '#2ecc71', icon: '🟢' },
    monitored: { label: '监控中', color: '#3498db', icon: '🔵' },
    exposed: { label: '已暴露', color: '#f39c12', icon: '🟡' },
    at_risk: { label: '有风险', color: '#e67e22', icon: '🟠' },
    breached: { label: '已泄露', color: '#e74c3c', icon: '🔴' },
  },
}))

function exposure(overrides: Record<string, any> = {}) {
  return {
    category: 'emotion',
    label: '情绪数据',
    description: '',
    sensitivity: 'sensitive',
    storageLocation: 'encrypted_local',
    encrypted: true,
    estimatedCount: 0,
    estimatedSize: 0,
    exposureStatus: 'safe',
    recentAccessCount: 0,
    lastAccessedAt: null,
    relatedModules: [],
    riskScore: 25,
    ...overrides,
  }
}

function permission(overrides: Record<string, any> = {}) {
  return {
    id: `perm_${Math.random().toString(36).slice(2, 8)}`,
    name: '情绪数据读取',
    description: '',
    module: 'emotion',
    dataCategories: ['emotion'],
    level: 'read',
    granted: true,
    grantedAt: '2026-08-01T00:00:00.000Z',
    grantedBy: 'system',
    revocable: true,
    lastUsedAt: null,
    riskLevel: 'low',
    ...overrides,
  }
}

function score(overrides: Record<string, any> = {}) {
  return {
    total: 82,
    grade: 'B',
    dimensions: [
      { name: '数据加密保护', score: 90, weight: 25, items: [] },
      { name: '暴露面控制', score: 80, weight: 25, items: [] },
      { name: '权限管理', score: 75, weight: 25, items: [] },
      { name: '泄露风险', score: 84, weight: 25, items: [] },
    ],
    scoredAt: '2026-08-31T00:00:00.000Z',
    trend: 'improving',
    delta: 6,
    ...overrides,
  }
}

function warning(overrides: Record<string, any> = {}) {
  return {
    id: `warn_${Math.random().toString(36).slice(2, 8)}`,
    level: 'high',
    title: '未加密的敏感数据',
    description: '发现敏感数据未加密存储',
    affectedCategories: ['health'],
    probability: 0.8,
    impact: 'significant',
    recommendations: [],
    warnedAt: '2026-08-31T00:00:00.000Z',
    acknowledged: false,
    resolved: false,
    autoGenerated: true,
    ...overrides,
  }
}

async function mountPanel() {
  const { default: PrivacyDashboardPanel } = await import('../PrivacyDashboardPanel.vue')
  const wrapper = mount(PrivacyDashboardPanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  mock.state.exposures = []
  mock.state.permissions = []
  mock.state.lockState = {
    locked: false,
    lockedAt: null,
    reason: '',
    scope: 'all',
    duration: 0,
    expiresAt: null,
    unlockMethod: 'password',
    lockedBy: '',
  }
  mock.state.latestScore = null
  mock.state.latestAudit = null
  mock.state.activeWarnings = []
  mock.lock.mockClear()
  mock.unlock.mockClear()
})

describe('PrivacyDashboardPanel 空态', () => {
  it('无暴露面也无权限时显示「数据未显影」', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.pdp-panel').exists()).toBe(true)
    expect(wrapper.find('.pdp-badge-neutral').text()).toBe('数据未显影')
    expect(wrapper.text()).toContain('还没有可审计的隐私数据')
    expect(wrapper.find('.pdp-block').exists()).toBe(false)
  })
})

describe('PrivacyDashboardPanel 填充态', () => {
  beforeEach(() => {
    mock.state.exposures = [
      exposure({ category: 'emotion', label: '情绪数据', exposureStatus: 'safe', riskScore: 25 }),
      exposure({ category: 'health', label: '健康数据', sensitivity: 'critical', exposureStatus: 'monitored', riskScore: 70 }),
      exposure({ category: 'diary', label: '日记笔记', sensitivity: 'confidential', exposureStatus: 'at_risk', encrypted: false, riskScore: 80 }),
    ]
    mock.state.permissions = [
      permission({ name: '情绪数据读取', granted: true, riskLevel: 'low' }),
      permission({ name: '健康数据读取', granted: true, riskLevel: 'high' }),
      permission({ name: '数据导出', granted: false, riskLevel: 'critical' }),
    ]
  })

  it('渲染标题与安全徽章', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.pdp-title').text()).toBe('🔐 隐私仪表盘')
    expect(wrapper.find('.pdp-badge').exists()).toBe(true)
  })

  it('渲染数据暴露面统计与条目', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.pdp-stat-num').text()).toBe('3')
    const rows = wrapper.findAll('.pdp-exposure')
    expect(rows.length).toBe(3)
    expect(wrapper.text()).toContain('情绪数据')
    expect(wrapper.text()).toContain('健康数据')
    expect(wrapper.text()).toContain('日记笔记')
  })

  it('渲染权限审计统计', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('权限总数')
    expect(wrapper.text()).toContain('已授权')
    expect(wrapper.text()).toContain('高风险')
    expect(wrapper.text()).toContain('未使用')
  })

  it('有评分时渲染隐私评分区块', async () => {
    mock.state.latestScore = score()
    const wrapper = await mountPanel()
    expect(wrapper.find('.pdp-score-num').text()).toBe('82')
    expect(wrapper.text()).toContain('评级 · 良好')
    expect(wrapper.text()).toContain('趋势 · 上升')
    const dims = wrapper.findAll('.pdp-dim')
    expect(dims.length).toBe(4)
  })

  it('无评分时显示评分提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('尚未生成隐私评分')
  })

  it('有活跃预警时渲染泄露预警区块', async () => {
    mock.state.activeWarnings = [warning({ level: 'high', title: '未加密的敏感数据' })]
    const wrapper = await mountPanel()
    expect(wrapper.find('.pdp-warning').exists()).toBe(true)
    expect(wrapper.text()).toContain('未加密的敏感数据')
  })

  it('无活跃预警时显示安全提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('暂无活跃预警')
  })

  it('未锁定时点击「立即锁定」调用 lock', async () => {
    const wrapper = await mountPanel()
    const btn = wrapper.findAll('.pdp-btn').find(b => b.text() === '立即锁定')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(mock.lock).toHaveBeenCalledTimes(1)
  })

  it('锁定时显示「已锁定」并可解锁', async () => {
    mock.state.lockState = {
      locked: true,
      lockedAt: '2026-08-31T00:00:00.000Z',
      reason: '用户手动锁定',
      scope: 'all',
      duration: 0,
      expiresAt: null,
      unlockMethod: 'password',
      lockedBy: 'user',
    }
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('已锁定')
    const btn = wrapper.findAll('.pdp-btn').find(b => b.text() === '解锁')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(mock.unlock).toHaveBeenCalledTimes(1)
  })

  it('渲染温和洞察', async () => {
    mock.state.latestScore = score()
    const wrapper = await mountPanel()
    const insights = wrapper.findAll('.pdp-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('暴露面概览')
  })
})
