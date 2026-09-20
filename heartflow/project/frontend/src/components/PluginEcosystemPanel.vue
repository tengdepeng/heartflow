<template>
  <section class="pep" data-test="plugin-ecosystem-panel" aria-label="插件生态总览">
    <header class="pep-head">
      <div class="pep-head-text">
        <h3 class="pep-title">🧩 插件生态总览</h3>
        <p class="pep-sub">概览 · 沙箱 · 调度 · 市场 · 权限 — 一眼总览生态之健</p>
      </div>
      <span class="pep-health" :class="`pep-health--${healthKey}`" data-test="pep-health">
        {{ overview.healthScore }} · {{ healthLabel }}
      </span>
    </header>

    <!-- 生态概览 -->
    <div class="pep-block" data-test="pep-overview">
      <span class="pep-block-label">生态概览</span>
      <div class="pep-grid pep-grid--6">
        <div class="pep-stat"><b class="pep-stat-num">{{ overview.totalPlugins }}</b><span class="pep-stat-label">插件总数</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ overview.enabledPlugins }}</b><span class="pep-stat-label">已启用</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ overview.loadedPlugins }}</b><span class="pep-stat-label">已加载</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ overview.corePlugins }}</b><span class="pep-stat-label">核心</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ overview.communityPlugins }}</b><span class="pep-stat-label">社区</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ overview.experimentalPlugins }}</b><span class="pep-stat-label">实验</span></div>
      </div>
      <div v-if="tierRows.length" class="pep-tiers" data-test="pep-tiers">
        <span v-for="t in tierRows" :key="t.key" class="pep-chip">{{ t.label }} {{ t.count }}</span>
      </div>
      <div v-if="overview.totalPlugins === 0" class="pep-empty" data-test="pep-overview-empty">
        插件系统已就绪，尚未初始化任何插件。
      </div>
    </div>

    <!-- 分类概览 -->
    <div v-if="categoryRows.length" class="pep-block" data-test="pep-category">
      <span class="pep-block-label">分类概览</span>
      <div class="pep-cat-list">
        <div v-for="c in categoryRows" :key="c.category" class="pep-cat">
          <span class="pep-cat-name">{{ c.label }}</span>
          <div class="pep-cat-bar"><div class="pep-cat-fill" :style="{ width: catPct(c.count) }"></div></div>
          <b class="pep-cat-count">{{ c.count }}<i>·{{ c.enabledCount }}启用</i></b>
        </div>
      </div>
    </div>

    <!-- 沙箱守卫 -->
    <div class="pep-block" data-test="pep-sandbox">
      <span class="pep-block-label">沙箱守卫</span>
      <div class="pep-grid pep-grid--4">
        <div class="pep-stat"><b class="pep-stat-num">{{ sandbox.totalSandboxes }}</b><span class="pep-stat-label">沙箱总数</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ sandbox.activeSandboxes }}</b><span class="pep-stat-label">活跃沙箱</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ sandbox.guardViolations }}</b><span class="pep-stat-label">守卫违规</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ sandbox.downgradeCount }}</b><span class="pep-stat-label">降级记录</span></div>
      </div>
      <div class="pep-sandbox-row">
        <span class="pep-guard" :class="sandbox.guardRunning ? 'is-on' : 'is-off'" data-test="pep-guard">
          {{ sandbox.guardRunning ? '🛡 守卫运行中' : '🛡 守卫已停止' }}
        </span>
        <span class="pep-guard-config">自动降级 {{ sandbox.guardConfig.autoDowngrade ? '开' : '关' }} · 阈值 {{ sandbox.guardConfig.violationThreshold }}</span>
      </div>
      <div v-if="tierDistRows.length" class="pep-tiers" data-test="pep-sandbox-tiers">
        <span v-for="t in tierDistRows" :key="t.key" class="pep-chip">{{ t.label }} {{ t.count }}</span>
      </div>
      <ul v-if="violationRows.length" class="pep-violation-list" data-test="pep-violations">
        <li v-for="(v, i) in violationRows" :key="i" class="pep-violation-item">
          <span class="pep-violation-plugin">{{ v.violation.pluginId }}</span>
          <span class="pep-violation-reason">{{ v.violation.message }}</span>
        </li>
      </ul>
      <p v-if="sandbox.totalSandboxes === 0" class="pep-empty" data-test="pep-sandbox-empty">
        尚无沙箱在运行，插件加载后隔离将自动显影。
      </p>
    </div>

    <!-- 调度器 -->
    <div v-if="scheduler.stats.totalTasks > 0" class="pep-block" data-test="pep-scheduler">
      <span class="pep-block-label">调度器</span>
      <div class="pep-grid pep-grid--5">
        <div class="pep-stat"><b class="pep-stat-num">{{ scheduler.stats.totalTasks }}</b><span class="pep-stat-label">任务总数</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ scheduler.stats.pendingTasks }}</b><span class="pep-stat-label">待处理</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ scheduler.stats.completedTasks }}</b><span class="pep-stat-label">已完成</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ scheduler.stats.failedTasks }}</b><span class="pep-stat-label">失败</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ scheduler.stats.successRate }}%</b><span class="pep-stat-label">成功率</span></div>
      </div>
      <div v-if="scheduler.readyTasks.length" class="pep-tiers" data-test="pep-scheduler-ready">
        <span class="pep-chip">就绪 {{ scheduler.readyTasks.length }}</span>
      </div>
      <div v-if="scheduler.blockedTasks.length" class="pep-tiers" data-test="pep-scheduler-blocked">
        <span class="pep-chip pep-chip--warn">阻塞 {{ scheduler.blockedTasks.length }}</span>
      </div>
    </div>

    <!-- 市场健康 -->
    <div v-if="marketVisible" class="pep-block" data-test="pep-market">
      <span class="pep-block-label">市场健康</span>
      <div class="pep-market-line">
        <b class="pep-market-status" :class="(marketplace?.status === 'healthy') ? 'is-ok' : 'is-warn'" data-test="pep-market-status">
          {{ marketplace?.message }}
        </b>
      </div>
      <div class="pep-grid pep-grid--4">
        <div class="pep-stat"><b class="pep-stat-num">{{ marketplace?.availableUpdates ?? 0 }}</b><span class="pep-stat-label">可用更新</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ marketplace?.pendingUpdateCount ?? 0 }}</b><span class="pep-stat-label">待更新</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ marketplaceStats?.installedCount ?? 0 }}</b><span class="pep-stat-label">已安装</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ marketplaceStats?.totalDownloads ?? 0 }}</b><span class="pep-stat-label">总下载</span></div>
      </div>
    </div>

    <!-- 权限摘要 -->
    <div v-if="permission.totalPermissionGrants > 0" class="pep-block" data-test="pep-permission">
      <span class="pep-block-label">权限摘要</span>
      <div class="pep-grid pep-grid--4">
        <div class="pep-stat"><b class="pep-stat-num">{{ permission.totalPermissionGrants }}</b><span class="pep-stat-label">总授权</span></div>
        <div class="pep-stat"><b class="pep-stat-num pep-num--risk">{{ permission.highRiskCount }}</b><span class="pep-stat-label">高风险</span></div>
        <div class="pep-stat"><b class="pep-stat-num pep-num--mid">{{ permission.mediumRiskCount }}</b><span class="pep-stat-label">中风险</span></div>
        <div class="pep-stat"><b class="pep-stat-num">{{ permission.lowRiskCount }}</b><span class="pep-stat-label">低风险</span></div>
      </div>
      <ul v-if="highRiskPerms.length" class="pep-perm-list" data-test="pep-perm-high">
        <li v-for="p in highRiskPerms" :key="p.permission" class="pep-perm-item">
          <span class="pep-perm-name">{{ p.label }}</span>
          <span class="pep-perm-count">{{ p.count }} 个插件</span>
        </li>
      </ul>
    </div>

    <!-- 建议 -->
    <div v-if="recommendations.length" class="pep-block" data-test="pep-recs">
      <span class="pep-block-label">生态建议</span>
      <ul class="pep-recs-list">
        <li v-for="(r, i) in recommendations" :key="i" class="pep-recs-item" :class="`pep-prio-${r.priority}`" data-test="pep-recs-item">
          <span class="pep-recs-tag" :class="`tag-${recoType(r.type)}`">{{ recoLabel(r.type) }}</span>
          <span class="pep-recs-title">{{ r.title }}</span>
          <span class="pep-recs-desc">{{ r.description }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePluginEcosystemBridge } from '../modules/plugin/plugin-ecosystem-bridge'

const bridge = usePluginEcosystemBridge()

const overview = computed(() => bridge.pluginOverview.value)
const categoryRows = computed(() => bridge.categoryList.value)
const sandbox = computed(() => bridge.sandboxStatus.value)
const scheduler = computed(() => bridge.schedulerDetails.value)
const marketplace = computed(() => bridge.marketplaceHealth.value)
const marketplaceStats = computed(() => bridge.marketplaceOverview.value ?? null)
const marketVisible = computed(() =>
  !!marketplaceStats.value ||
  (marketplace.value?.availableUpdates ?? 0) > 0 ||
  (marketplace.value?.pendingUpdateCount ?? 0) > 0
)
const permission = computed(() => bridge.permissionSummary.value)
const recommendations = computed(() => bridge.recommendations.value)

const TIER_LABELS: Record<string, string> = { official: '官方', community: '社区', experimental: '实验' }
const tierRows = computed(() =>
  Object.entries(overview.value.tierCounts).map(([key, count]) => ({ key, label: TIER_LABELS[key] ?? key, count }))
)

const SANDBOX_TIER_LABELS: Record<string, string> = { L0: 'L0 低沙', L1: 'L1 中沙', L2: 'L2 高沙' }
const tierDistRows = computed(() =>
  Object.entries(sandbox.value.tierDistribution).map(([key, count]) => ({ key, label: SANDBOX_TIER_LABELS[key] ?? key, count }))
)

const violationRows = computed(() => sandbox.value.recentViolations.slice(-5).reverse())

const highRiskPerms = computed(() => permission.value.permissions.filter(p => p.riskLevel === 'high'))

const healthKey = computed(() => overview.value.healthStatus)
const healthLabel = computed(() =>
  overview.value.healthStatus === 'healthy' ? '健康' : overview.value.healthStatus === 'warning' ? '需关注' : '危机'
)

const REC_TYPE_META: Record<string, string> = {
  security: '安全',
  performance: '性能',
  maintenance: '维护',
  discovery: '发现',
  usage: '使用',
}
function recoType(t: string): string { return REC_TYPE_META[t] ?? t }
function recoLabel(t: string): string { return REC_TYPE_META[t] ?? t }

function catPct(count: number): string {
  const max = Math.max(1, ...categoryRows.value.map(c => c.count))
  return `${Math.max(2, Math.round((count / max) * 100))}%`
}
</script>

<style scoped>
.pep {
  background: radial-gradient(120% 100% at 0% 0%, rgba(120, 180, 200, 0.10), transparent 55%), rgba(247, 250, 248, 0.85);
  border: 1px solid rgba(96, 150, 160, 0.22);
  border-radius: 16px;
  padding: 18px 20px 20px;
  box-shadow: 0 8px 28px rgba(60, 110, 120, 0.08);
}
.pep-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.pep-head-text { display: flex; flex-direction: column; gap: 2px; }
.pep-title { margin: 0; font-size: 17px; font-weight: 700; color: #2f4550; letter-spacing: .5px; }
.pep-sub { margin: 0; font-size: 12px; color: #7a8f98; }
.pep-health { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; background: #dfeef0; color: #2f7a88; }
.pep-health--warning { background: #f7e8c8; color: #b07a1f; }
.pep-health--critical { background: #f3d3cb; color: #b04a2f; }
.pep-block { margin-top: 14px; padding-top: 12px; border-top: 1px dashed rgba(96, 150, 160, 0.25); }
.pep-block-label { font-size: 12px; font-weight: 600; letter-spacing: 2px; color: #3f8fa0; text-transform: uppercase; }
.pep-grid { display: grid; gap: 8px; margin-top: 10px; }
.pep-grid--6 { grid-template-columns: repeat(6, 1fr); }
.pep-grid--5 { grid-template-columns: repeat(5, 1fr); }
.pep-grid--4 { grid-template-columns: repeat(4, 1fr); }
.pep-stat { background: rgba(226, 240, 242, 0.6); border: 1px solid rgba(96, 150, 160, 0.18); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 2px; align-items: center; }
.pep-stat-num { font-size: 20px; font-weight: 700; color: #2f4550; }
.pep-num--risk { color: #b04a2f; }
.pep-num--mid { color: #b07a1f; }
.pep-stat-label { font-size: 11px; color: #8aa0a8; }
.pep-tiers { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.pep-chip { background: rgba(120, 180, 200, 0.14); border: 1px solid rgba(96, 150, 160, 0.2); border-radius: 99px; padding: 3px 10px; font-size: 12px; color: #2f6a78; }
.pep-chip--warn { background: rgba(200, 140, 60, 0.16); border-color: rgba(190, 130, 50, 0.3); color: #a06a20; }
.pep-empty { margin: 12px 0 0; font-size: 13px; color: #8aa0a8; }
.pep-cat-list { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.pep-cat { display: grid; grid-template-columns: 64px 1fr 80px; align-items: center; gap: 10px; font-size: 12px; }
.pep-cat-name { color: #52707c; }
.pep-cat-bar { height: 8px; background: rgba(96, 150, 160, 0.14); border-radius: 99px; overflow: hidden; }
.pep-cat-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #5bb7c7, #3f8fa0); }
.pep-cat-count { text-align: right; color: #52707c; font-weight: 600; }
.pep-cat-count i { font-style: normal; font-weight: 400; color: #8aa0a8; }
.pep-sandbox-row { display: flex; align-items: center; gap: 12px; margin-top: 10px; font-size: 12px; }
.pep-guard { font-weight: 600; }
.pep-guard.is-on { color: #2f8a5a; }
.pep-guard.is-off { color: #b04a2f; }
.pep-guard-config { color: #8aa0a8; }
.pep-violation-list { margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.pep-violation-item { display: flex; gap: 10px; font-size: 12px; }
.pep-violation-plugin { color: #b04a2f; font-weight: 600; min-width: 90px; }
.pep-violation-reason { color: #7a868c; }
.pep-market-line { margin-top: 8px; }
.pep-market-status { font-size: 13px; }
.pep-market-status.is-ok { color: #2f8a5a; }
.pep-market-status.is-warn { color: #b07a1f; }
.pep-perm-list { margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
.pep-perm-item { display: flex; gap: 8px; align-items: center; background: rgba(224, 222, 220, 0.5); border: 1px solid rgba(140, 120, 110, 0.2); border-radius: 8px; padding: 6px 10px; font-size: 12px; }
.pep-perm-name { color: #5c4438; font-weight: 600; }
.pep-perm-count { color: #9b8b80; }
.pep-recs-list { margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.pep-recs-item { display: flex; align-items: center; gap: 10px; background: rgba(226, 240, 242, 0.5); border-left: 3px solid #4a9fab; border-radius: 8px; padding: 8px 12px; font-size: 12px; }
.pep-recs-item.pep-prio-high { border-left-color: #b04a2f; }
.pep-recs-item.pep-prio-medium { border-left-color: #b07a1f; }
.pep-recs-tag { flex-shrink: 0; border-radius: 6px; padding: 2px 8px; font-weight: 600; }
.tag-security { background: #f3d3cb; color: #b04a2f; }
.tag-performance { background: #f7e8c8; color: #b07a1f; }
.tag-maintenance { background: #dfeef0; color: #2f6a78; }
.tag-discovery { background: #e4efe0; color: #2f7a4a; }
.tag-usage { background: #ece7f3; color: #5f4a8a; }
.pep-recs-title { font-weight: 600; color: #2f4550; }
.pep-recs-desc { color: #7a868c; }
</style>