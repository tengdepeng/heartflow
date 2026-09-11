<template>
  <section class="shp" aria-label="空间健康">
    <div class="shp-head">
      <span class="shp-title">🩺 空间健康</span>
      <span class="shp-sub">报告 · 问题 · 告警 · 趋势</span>
    </div>

    <div class="shp-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="shp-tab"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 概览 -->
    <template v-if="tab === 'overview'">
      <div v-if="overview" class="shp-block">
        <div class="shp-overview-top">
          <div class="shp-score">
            <span class="shp-score-value">{{ overview.avgScore }}</span>
            <span class="shp-score-label">平均健康分</span>
          </div>
          <div class="shp-overview-meta">
            <span>{{ overview.totalSpaces }} 个空间</span>
            <span>{{ overview.activeIssueCount }} 活跃问题</span>
            <span>{{ overview.unreadAlertCount }} 未读告警</span>
            <span>{{ overview.totalErrors }} 未解决错误</span>
          </div>
        </div>
        <div class="shp-levels">
          <div v-for="lv in levelList" :key="lv.key" class="shp-level-row">
            <span class="shp-level-label">{{ lv.label }}</span>
            <div class="shp-level-bar">
              <div
                class="shp-level-fill"
                :style="{ width: levelPct(lv.count), background: lv.color }"
              ></div>
            </div>
            <span class="shp-level-count">{{ lv.count }}</span>
          </div>
        </div>
        <div v-if="overview.bestSpace || overview.worstSpace" class="shp-extreme">
          <span v-if="overview.bestSpace" class="shp-extreme-item">
            最佳 <b>{{ overview.bestSpace.spaceId }}</b> · {{ overview.bestSpace.score }} 分
          </span>
          <span v-if="overview.worstSpace" class="shp-extreme-item">
            最需关注 <b>{{ overview.worstSpace.spaceId }}</b> · {{ overview.worstSpace.score }} 分
          </span>
        </div>
      </div>
      <p v-else class="shp-empty">尚未生成健康报告。点击下方按钮，为各空间把脉。</p>
      <button class="shp-btn" @click="handleGenerateAll">生成全部报告</button>
    </template>

    <!-- 报告 -->
    <template v-else-if="tab === 'reports'">
      <div v-if="reports.length" class="shp-block">
        <div v-for="r in reports" :key="r.spaceId" class="shp-report">
          <div class="shp-report-head">
            <span class="shp-report-name">{{ r.spaceId }}</span>
            <span class="shp-report-level" :style="{ color: levelColor(r.level) }">
              {{ levelLabel(r.level) }}
            </span>
            <span class="shp-report-score">{{ r.score }} 分</span>
          </div>
          <div class="shp-report-meta">
            <span>{{ r.metrics.length }} 项指标</span>
            <span>{{ r.activeIssues.length }} 活跃问题</span>
            <span v-if="r.scoreDelta !== undefined" :class="deltaClass(r.scoreDelta)">
              {{ r.scoreDelta >= 0 ? '+' : '' }}{{ r.scoreDelta }}
            </span>
          </div>
        </div>
      </div>
      <p v-else class="shp-empty">暂无健康报告。</p>
      <button class="shp-btn" @click="handleGenerateAll">生成全部报告</button>
    </template>

    <!-- 问题 -->
    <template v-else-if="tab === 'issues'">
      <div v-if="activeIssues.length" class="shp-block">
        <div v-for="issue in activeIssues" :key="issue.id" class="shp-issue">
          <div class="shp-issue-head">
            <span class="shp-issue-type">{{ metricTypeLabel(issue.type) }}</span>
            <span class="shp-issue-sev" :class="`sev-${issue.severity}`">
              {{ severityLabel(issue.severity) }}
            </span>
          </div>
          <p class="shp-issue-desc">{{ issue.description }}</p>
          <p v-if="issue.suggestion" class="shp-issue-suggestion">建议：{{ issue.suggestion }}</p>
          <button class="shp-btn--small" @click="handleResolveIssue(issue.id)">标记已解决</button>
        </div>
      </div>
      <p v-else class="shp-empty">没有活跃问题，各空间运转良好。</p>
    </template>

    <!-- 告警 -->
    <template v-else>
      <div v-if="unreadAlerts.length" class="shp-block">
        <div v-for="a in unreadAlerts" :key="a.id" class="shp-alert">
          <div class="shp-alert-head">
            <span class="shp-alert-level" :class="`lvl-${a.level}`">{{ alertLevelLabel(a.level) }}</span>
            <span class="shp-alert-title">{{ a.title }}</span>
          </div>
          <p class="shp-alert-desc">{{ a.description }}</p>
          <div class="shp-alert-actions">
            <button class="shp-btn--small" @click="handleMarkRead(a.id)">标为已读</button>
            <button class="shp-btn--small" @click="handleResolveAlert(a.id)">解除</button>
          </div>
        </div>
      </div>
      <p v-else class="shp-empty">没有未读告警。</p>
      <div v-if="errorTrend.length" class="shp-block">
        <span class="shp-block-label">错误趋势 · 近 30 天</span>
        <div class="shp-trend">
          <div
            v-for="t in errorTrend"
            :key="t.date"
            class="shp-trend-col"
            :style="{ height: trendHeight(t.count) }"
            :title="`${t.date} · ${t.count} 次`"
          ></div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSpaceHealth, HEALTH_LEVELS } from '../modules/space/space-health'
import type { HealthLevel } from '../modules/space/space-health'

const { healthOverview, activeIssues, unreadAlerts, errorTrend, getAllReports, generateAllReports, resolveIssue, markAlertRead, resolveAlert } = useSpaceHealth()

const tab = ref<'overview' | 'reports' | 'issues' | 'alerts'>('overview')
const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'reports', label: '报告' },
  { key: 'issues', label: '问题' },
  { key: 'alerts', label: '告警' },
] as const

const overview = computed(() => healthOverview.value)
const reports = computed(() => getAllReports())

const levelList = computed(() => {
  const counts = overview.value?.levelCounts
  if (!counts) return []
  return (Object.keys(HEALTH_LEVELS) as HealthLevel[]).map(key => ({
    key,
    label: HEALTH_LEVELS[key].label,
    color: HEALTH_LEVELS[key].color,
    count: counts[key] ?? 0,
  }))
})

function levelPct(count: number): string {
  const total = overview.value?.totalSpaces ?? 0
  if (total === 0) return '0%'
  return `${Math.round((count / total) * 100)}%`
}

function levelLabel(level: HealthLevel): string {
  return HEALTH_LEVELS[level]?.label ?? level
}

function levelColor(level: HealthLevel): string {
  return HEALTH_LEVELS[level]?.color ?? '#f0c040'
}

function deltaClass(delta: number): string {
  return delta >= 0 ? 'shp-delta--up' : 'shp-delta--down'
}

const METRIC_TYPE_LABELS: Record<string, string> = {
  performance: '性能',
  dependency: '依赖',
  error: '错误',
  usage: '使用率',
  stability: '稳定性',
  accessibility: '可访问性',
}

function metricTypeLabel(type: string): string {
  return METRIC_TYPE_LABELS[type] ?? type
}

const SEVERITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '危急',
}

function severityLabel(severity: string): string {
  return SEVERITY_LABELS[severity] ?? severity
}

const ALERT_LEVEL_LABELS: Record<string, string> = {
  info: '信息',
  warning: '警告',
  error: '错误',
  critical: '危急',
}

function alertLevelLabel(level: string): string {
  return ALERT_LEVEL_LABELS[level] ?? level
}

function trendHeight(count: number): string {
  const max = Math.max(1, ...errorTrend.value.map(t => t.count))
  return `${Math.max(4, Math.round((count / max) * 48))}px`
}

function handleGenerateAll(): void {
  generateAllReports()
}

function handleResolveIssue(id: string): void {
  resolveIssue(id)
}

function handleMarkRead(id: string): void {
  markAlertRead(id)
}

function handleResolveAlert(id: string): void {
  resolveAlert(id)
}
</script>

<style scoped>
.shp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.shp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.shp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.shp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.shp-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.shp-tab {
  padding: 5px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
  font-size: 12px;
  cursor: pointer;
}
.shp-tab.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.shp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shp-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.shp-overview-top {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.shp-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.04));
}
.shp-score-value {
  font-size: 22px;
  font-weight: 700;
  color: #f0c040;
}
.shp-score-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.shp-overview-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.shp-levels {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.shp-level-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.shp-level-label {
  width: 32px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.shp-level-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.06));
  overflow: hidden;
}
.shp-level-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.shp-level-count {
  width: 16px;
  text-align: right;
  color: var(--text-primary, #e8e6e1);
}
.shp-extreme {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.shp-extreme-item b {
  color: var(--text-primary, #e8e6e1);
  font-weight: 600;
}
.shp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
  margin: 0;
}
.shp-btn {
  align-self: flex-start;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: #f0c040;
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.shp-btn--small {
  align-self: flex-start;
  padding: 4px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  font-size: 12px;
  cursor: pointer;
}
.shp-report {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.04));
}
.shp-report-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.shp-report-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.shp-report-level {
  font-size: 12px;
  font-weight: 600;
}
.shp-report-score {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.shp-report-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
}
.shp-delta--up {
  color: #8a9a7a;
}
.shp-delta--down {
  color: #c46a5a;
}
.shp-issue {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.04));
}
.shp-issue-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.shp-issue-type {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.shp-issue-sev {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}
.shp-issue-sev.sev-low {
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.12);
}
.shp-issue-sev.sev-medium {
  color: #f0c040;
  background: rgba(240, 192, 64, 0.12);
}
.shp-issue-sev.sev-high {
  color: #f59e6c;
  background: rgba(245, 158, 108, 0.12);
}
.shp-issue-sev.sev-critical {
  color: #c46a5a;
  background: rgba(196, 106, 90, 0.14);
}
.shp-issue-desc {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  margin: 0;
}
.shp-issue-suggestion {
  font-size: 12px;
  color: #8a9a7a;
  margin: 0;
}
.shp-alert {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.04));
}
.shp-alert-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.shp-alert-level {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}
.shp-alert-level.lvl-info {
  color: #6b9fc4;
  background: rgba(107, 159, 196, 0.12);
}
.shp-alert-level.lvl-warning {
  color: #f0c040;
  background: rgba(240, 192, 64, 0.12);
}
.shp-alert-level.lvl-error {
  color: #f59e6c;
  background: rgba(245, 158, 108, 0.12);
}
.shp-alert-level.lvl-critical {
  color: #c46a5a;
  background: rgba(196, 106, 90, 0.14);
}
.shp-alert-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.shp-alert-desc {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  margin: 0;
}
.shp-alert-actions {
  display: flex;
  gap: 6px;
}
.shp-trend {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 52px;
  padding: 2px;
  border-radius: 8px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.shp-trend-col {
  flex: 1;
  min-width: 2px;
  border-radius: 2px 2px 0 0;
  background: #c46a5a;
  opacity: 0.7;
}
</style>
