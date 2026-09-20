// ============================================================
// PluginEcosystemPanel 插件生态总览桥接面板（INCR-384）组件测试
// mock 直接子路径注入受控 ref（遵循 INCR-99 ref 可改写教训）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'

const overview = ref<any>({
  totalPlugins: 0, enabledPlugins: 0, loadedPlugins: 0,
  corePlugins: 0, communityPlugins: 0, experimentalPlugins: 0,
  categoryCounts: {},
  tierCounts: { official: 0, community: 0, experimental: 0 },
  healthStatus: 'healthy', healthScore: 0,
})
const categoryList = ref<any[]>([])
const sandbox = ref<any>({
  totalSandboxes: 0, activeSandboxes: 0, isolatedCount: 0,
  guardRunning: false, guardViolations: 0, downgradeCount: 0,
  tierDistribution: { L0: 0, L1: 0, L2: 0 },
  recentViolations: [],
  guardConfig: { memoryWarningThreshold: 80, storageWarningThreshold: 80, autoDowngrade: true, violationThreshold: 3 },
})
const scheduler = ref<any>({
  stats: { totalTasks: 0, pendingTasks: 0, runningTasks: 0, completedTasks: 0, failedTasks: 0, averageWaitTime: 0, averageExecutionTime: 0, successRate: 0 },
  isRunning: false, config: {}, blockedTasks: [], readyTasks: [], sortedPendingTasks: [], failedTasks: [],
})
const marketplaceHealth = ref<any>({ status: 'healthy', message: '市场状态正常', availableUpdates: 0, pendingUpdateCount: 0 })
const marketplaceOverview = ref<any>(null)
const permission = ref<any>({ permissions: [], totalPermissionGrants: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0 })
const recommendations = ref<any[]>([])

vi.mock('../../modules/plugin/plugin-ecosystem-bridge', () => ({
  usePluginEcosystemBridge: () => ({
    pluginOverview: overview,
    categoryList,
    sandboxStatus: sandbox,
    schedulerDetails: scheduler,
    marketplaceHealth,
    marketplaceOverview,
    permissionSummary: permission,
    recommendations,
  }),
}))

import PluginEcosystemPanel from '../PluginEcosystemPanel.vue'

async function mountPanel(): Promise<VueWrapper> {
  return mount(PluginEcosystemPanel)
}

describe('PluginEcosystemPanel 插件生态总览桥接面板（INCR-384）', () => {
  beforeEach(() => {
    overview.value = {
      totalPlugins: 0, enabledPlugins: 0, loadedPlugins: 0,
      corePlugins: 0, communityPlugins: 0, experimentalPlugins: 0,
      categoryCounts: {},
      tierCounts: { official: 0, community: 0, experimental: 0 },
      healthStatus: 'healthy', healthScore: 0,
    }
    categoryList.value = []
    sandbox.value = {
      totalSandboxes: 0, activeSandboxes: 0, isolatedCount: 0,
      guardRunning: false, guardViolations: 0, downgradeCount: 0,
      tierDistribution: { L0: 0, L1: 0, L2: 0 },
      recentViolations: [],
      guardConfig: { memoryWarningThreshold: 80, storageWarningThreshold: 80, autoDowngrade: true, violationThreshold: 3 },
    }
    scheduler.value = {
      stats: { totalTasks: 0, pendingTasks: 0, runningTasks: 0, completedTasks: 0, failedTasks: 0, averageWaitTime: 0, averageExecutionTime: 0, successRate: 0 },
      isRunning: false, config: {}, blockedTasks: [], readyTasks: [], sortedPendingTasks: [], failedTasks: [],
    }
    marketplaceHealth.value = { status: 'healthy', message: '市场状态正常', availableUpdates: 0, pendingUpdateCount: 0 }
    marketplaceOverview.value = null
    permission.value = { permissions: [], totalPermissionGrants: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0 }
    recommendations.value = []
  })

  it('空态：标题 + 健康徽标归零 + 概览空态 + 沙箱空态, 分类/调度/市场/权限/建议不渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="plugin-ecosystem-panel"]').exists()).toBe(true)
    expect(wrapper.find('.pep-title').text()).toContain('插件生态总览')
    expect(wrapper.find('[data-test="pep-health"]').text()).toContain('健康')
    expect(wrapper.find('[data-test="pep-overview-empty"]').text()).toContain('尚未初始化')
    expect(wrapper.find('[data-test="pep-sandbox-empty"]').text()).toContain('尚无沙箱在运行')
    expect(wrapper.find('[data-test="pep-category"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pep-scheduler"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pep-market"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pep-permission"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pep-recs"]').exists()).toBe(false)
  })

  it('生态概览：六统计卡 + 分级 chips + 危机徽标', async () => {
    overview.value = {
      totalPlugins: 6, enabledPlugins: 4, loadedPlugins: 3,
      corePlugins: 2, communityPlugins: 3, experimentalPlugins: 1,
      categoryCounts: { timer: 3, note: 2, emotion: 1 },
      tierCounts: { official: 2, community: 3, experimental: 1 },
      healthStatus: 'critical', healthScore: 22,
    }
    const wrapper = await mountPanel()
    const ov = wrapper.find('[data-test="pep-overview"]')
    expect(ov.text()).toContain('插件总数')
    expect(ov.text()).toContain('已启用')
    expect(ov.text()).toContain('已加载')
    expect(ov.text()).toContain('核心')
    expect(ov.text()).toContain('社区')
    expect(ov.text()).toContain('实验')
    expect(ov.find('b').text()).toContain('6')
    expect(wrapper.find('[data-test="pep-health"]').text()).toContain('22')
    expect(wrapper.find('[data-test="pep-health"]').text()).toContain('危机')
    expect(wrapper.find('[data-test="pep-health"]').classes()).toContain('pep-health--critical')
    const tiers = wrapper.find('[data-test="pep-tiers"]')
    expect(tiers.text()).toContain('官方 2')
    expect(tiers.text()).toContain('社区 3')
    expect(wrapper.find('[data-test="pep-overview-empty"]').exists()).toBe(false)
  })

  it('分类概览：分类名 + 计数 + 启用计数 + 进度条', async () => {
    categoryList.value = [
      { category: 'timer', label: '计时', count: 3, enabledCount: 2 },
      { category: 'note', label: '笔记', count: 1, enabledCount: 1 },
    ]
    const wrapper = await mountPanel()
    const cat = wrapper.find('[data-test="pep-category"]')
    expect(cat.exists()).toBe(true)
    expect(cat.text()).toContain('计时')
    expect(cat.text()).toContain('3')
    expect(cat.text()).toContain('2启用')
    expect(cat.text()).toContain('笔记')
    expect(cat.find('.pep-cat-fill').attributes('style')).toContain('%')
  })

  it('沙箱守卫：四统计 + 守卫运行中 + 等级分布 + 最近违规', async () => {
    sandbox.value = {
      totalSandboxes: 4, activeSandboxes: 3, isolatedCount: 3,
      guardRunning: true, guardViolations: 2, downgradeCount: 1,
      tierDistribution: { L0: 1, L1: 2, L2: 1 },
      recentViolations: [
        { violation: { pluginId: 'x', message: '越权访问文件系统' } },
        { violation: { pluginId: 'y', message: '过度内存占用' } },
      ],
      guardConfig: { memoryWarningThreshold: 80, storageWarningThreshold: 80, autoDowngrade: true, violationThreshold: 3 },
    }
    const wrapper = await mountPanel()
    const sb = wrapper.find('[data-test="pep-sandbox"]')
    expect(sb.text()).toContain('沙箱总数')
    expect(sb.text()).toContain('活跃沙箱')
    expect(sb.text()).toContain('守卫违规')
    expect(wrapper.find('[data-test="pep-guard"]').text()).toContain('守卫运行中')
    expect(wrapper.find('[data-test="pep-sandbox-tiers"]').text()).toContain('L0 低沙 1')
    const vl = wrapper.find('[data-test="pep-violations"]')
    expect(vl.text()).toContain('x')
    expect(vl.text()).toContain('越权访问文件系统')
    expect(wrapper.find('[data-test="pep-sandbox-empty"]').exists()).toBe(false)
  })

  it('调度器：五统计 + 成功率 + 就绪/阻塞 chips', async () => {
    scheduler.value = {
      stats: { totalTasks: 10, pendingTasks: 2, runningTasks: 1, completedTasks: 7, failedTasks: 1, averageWaitTime: 5, averageExecutionTime: 3, successRate: 70 },
      isRunning: true, config: {},
      blockedTasks: [{ id: 'b1' }], readyTasks: [{ id: 'r1' }, { id: 'r2' }], sortedPendingTasks: [], failedTasks: [{ id: 'f1' }],
    }
    const wrapper = await mountPanel()
    const sc = wrapper.find('[data-test="pep-scheduler"]')
    expect(sc.exists()).toBe(true)
    expect(sc.text()).toContain('任务总数')
    expect(sc.text()).toContain('10')
    expect(sc.text()).toContain('成功率')
    expect(sc.text()).toContain('70%')
    expect(wrapper.find('[data-test="pep-scheduler-ready"]').text()).toContain('就绪 2')
    expect(wrapper.find('[data-test="pep-scheduler-blocked"]').text()).toContain('阻塞 1')
  })

  it('市场健康 + 权限摘要：更新状态 + 授权风险统计 + 高风险权限', async () => {
    marketplaceHealth.value = { status: 'needs_attention', message: '有 3 个可用更新，建议检查', availableUpdates: 3, pendingUpdateCount: 3 }
    marketplaceOverview.value = { totalPlugins: 6, installedCount: 6, availableUpdates: 3, categoryStats: [], totalDownloads: 42 }
    permission.value = {
      permissions: [
        { permission: 'network', count: 4, pluginIds: ['a', 'b', 'c', 'd'], label: '网络访问', riskLevel: 'high' },
        { permission: 'read:history', count: 2, pluginIds: ['a', 'b'], label: '读取历史数据', riskLevel: 'medium' },
      ],
      totalPermissionGrants: 6, highRiskCount: 1, mediumRiskCount: 1, lowRiskCount: 0,
    }
    const wrapper = await mountPanel()
    const mk = wrapper.find('[data-test="pep-market"]')
    expect(mk.exists()).toBe(true)
    expect(wrapper.find('[data-test="pep-market-status"]').text()).toContain('有 3 个可用更新')
    expect(mk.text()).toContain('已安装')
    expect(mk.text()).toContain('6')
    expect(mk.text()).toContain('总下载')
    expect(mk.text()).toContain('42')
    const pm = wrapper.find('[data-test="pep-permission"]')
    expect(pm.exists()).toBe(true)
    expect(pm.text()).toContain('总授权')
    expect(pm.text()).toContain('高风险')
    expect(wrapper.find('[data-test="pep-perm-high"]').text()).toContain('网络访问')
    expect(wrapper.find('[data-test="pep-perm-high"]').text()).toContain('4 个插件')
  })

  it('建议：按优先级渲染类型标签 + 标题 + 描述', async () => {
    recommendations.value = [
      { type: 'security', priority: 'high', title: '高权限插件数量较多', description: '当前有 4 项高风险权限' },
      { type: 'usage', priority: 'low', title: '有关闭的插件', description: '2 个插件处于关闭状态' },
    ]
    const wrapper = await mountPanel()
    const rc = wrapper.find('[data-test="pep-recs"]')
    expect(rc.exists()).toBe(true)
    const items = wrapper.findAll('[data-test="pep-recs-item"]')
    expect(items.length).toBe(2)
    expect(items[0].classes()).toContain('pep-prio-high')
    expect(items[0].text()).toContain('安全')
    expect(items[0].text()).toContain('高权限插件数量较多')
    expect(items[0].text()).toContain('当前有 4 项高风险权限')
    expect(items[1].text()).toContain('使用')
  })
})