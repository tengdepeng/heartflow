<template>
  <section class="atp-panel" aria-label="审计时间线">
    <div class="atp-head">
      <span class="atp-title">🕐 审计时间线</span>
      <span class="atp-sub">时间线 · 聚合分析 · 趋势检测 · 导出</span>
    </div>
    <div class="atp-badge">
      <span>{{ totalEvents }} 事件</span>
      <span>{{ anomalySummary.totalAnomalies }} 异常</span>
      <span>{{ segments.length }} 分段</span>
    </div>

    <!-- 空态 -->
    <div v-if="totalEvents === 0" class="atp-empty">
      <p class="atp-empty-title">暂无审计日志</p>
      <p class="atp-empty-hint">安全操作产生的审计记录将在此汇聚成时间线</p>
    </div>

    <template v-else>
      <!-- 标签导航 -->
      <nav class="atp-tabs">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="atp-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="atp-tab-icon">{{ tab.icon }}</span>
          <span class="atp-tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- 时间线 Tab -->
      <div v-if="activeTab === 'timeline'" class="atp-body">
        <div class="atp-config">
          <label class="atp-cfg">粒度
            <select v-model="granularity" class="atp-select">
              <option value="hour">小时</option>
              <option value="day">天</option>
              <option value="week">周</option>
              <option value="month">月</option>
            </select>
          </label>
          <label class="atp-cfg"><input v-model="showResolved" type="checkbox" /> 成功</label>
          <label class="atp-cfg"><input v-model="showLowRisk" type="checkbox" /> 低风险</label>
          <input v-model="query" class="atp-search" placeholder="搜索事件…" />
        </div>

        <div v-if="visibleSegments.length === 0" class="atp-empty">
          <p class="atp-empty-hint">当前筛选条件下无事件</p>
        </div>
        <div v-for="seg in visibleSegments" :key="seg.id" class="atp-seg">
          <div class="atp-seg-head">
            <span class="atp-seg-label">{{ seg.label }}</span>
            <span class="atp-seg-meta">{{ seg.eventCount }} 事件 · 成功率 {{ seg.successRate }}%</span>
            <span v-if="seg.hasCriticalEvents" class="atp-seg-warn">⚠ 高危</span>
          </div>
          <ul class="atp-list">
            <li v-for="ev in seg.events" :key="ev.entry.id" class="atp-item" :class="`atp-sev-${ev.severity}`">
              <span class="atp-item-time">{{ fmtTime(ev.entry.timestamp) }}</span>
              <span class="atp-item-action">{{ ev.entry.action }}</span>
              <span class="atp-item-actor">{{ ev.entry.actor }}</span>
              <span class="atp-item-result" :class="`atp-res-${ev.entry.result}`">{{ resultLabel(ev.entry.result) }}</span>
              <span class="atp-item-sev">{{ severityLabel(ev.severity) }}</span>
              <span class="atp-item-group">{{ ev.group }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 分析 Tab -->
      <div v-if="activeTab === 'analysis'" class="atp-body">
        <div class="atp-block">
          <div class="atp-block-head">
            <span class="atp-block-label">📊 聚合分析</span>
            <select v-model="dimension" class="atp-select">
              <option value="action">按操作</option>
              <option value="actor">按主体</option>
              <option value="result">按结果</option>
              <option value="hour">按小时</option>
              <option value="day">按星期</option>
            </select>
          </div>
          <ul class="atp-agg-list">
            <li v-for="a in aggregations" :key="a.key" class="atp-agg-item">
              <span class="atp-agg-label">{{ a.label }}</span>
              <span class="atp-agg-bar"><span class="atp-agg-fill" :style="{ width: a.percentage + '%' }"></span></span>
              <span class="atp-agg-count">{{ a.count }} · {{ a.percentage }}%</span>
            </li>
          </ul>
        </div>

        <div class="atp-block">
          <span class="atp-block-label">⚠️ 异常事件 · {{ anomalySummary.totalAnomalies }}</span>
          <div class="atp-anomaly-meta">
            <span v-for="(count, sev) in anomalySummary.bySeverity" :key="sev" class="atp-anomaly-chip" :class="`atp-sev-${sev}`">{{ severityLabel(sev) }} {{ count }}</span>
          </div>
          <ul class="atp-list">
            <li v-for="ev in anomalySummary.recentAnomalies" :key="ev.entry.id" class="atp-item" :class="`atp-sev-${ev.severity}`">
              <span class="atp-item-time">{{ fmtTime(ev.entry.timestamp) }}</span>
              <span class="atp-item-action">{{ ev.entry.action }}</span>
              <span class="atp-item-actor">{{ ev.entry.actor }}</span>
              <span class="atp-item-sev">{{ severityLabel(ev.severity) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 趋势 Tab -->
      <div v-if="activeTab === 'trend'" class="atp-body">
        <div class="atp-trend-head">
          <span class="atp-trend-dir">{{ trendDirectionLabel }}</span>
          <span class="atp-trend-rate">变化率 {{ trend.changeRate }}%</span>
          <span class="atp-trend-anom">异常点 {{ trend.anomalies.length }}</span>
        </div>
        <div class="atp-trend-bars">
          <div v-for="dp in trend.dataPoints" :key="dp.timestamp" class="atp-trend-col" :title="`${dp.label} · 共 ${dp.total}`">
            <div class="atp-trend-bar" :style="{ height: barHeight(dp.total) }"></div>
            <span class="atp-trend-col-label">{{ dp.label }}</span>
          </div>
        </div>
        <ul v-if="trend.anomalies.length" class="atp-list">
          <li v-for="a in trend.anomalies" :key="a.timestamp" class="atp-item atp-sev-danger">
            <span class="atp-item-time">{{ a.label }}</span>
            <span class="atp-item-action">{{ anomalyTypeLabel(a.type) }}</span>
            <span class="atp-item-actor">{{ a.description }}</span>
            <span class="atp-item-sev">z={{ a.deviationScore }}</span>
          </li>
        </ul>
        <div class="atp-heatmap">
          <div v-for="(row, ri) in heatmap.data" :key="ri" class="atp-heatmap-row">
            <span class="atp-heatmap-row-label">{{ heatmap.rows[ri] }}</span>
            <div class="atp-heatmap-cells">
              <span
                v-for="(val, ci) in row"
                :key="ci"
                class="atp-heatmap-cell"
                :style="{ background: heatColor(val) }"
                :title="`${heatmap.rows[ri]} ${heatmap.columns[ci]} · ${val}`"
              ></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 导出 Tab -->
      <div v-if="activeTab === 'export'" class="atp-body">
        <div class="atp-export">
          <label class="atp-cfg">格式
            <select v-model="exportFormat" class="atp-select">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="markdown">Markdown</option>
            </select>
          </label>
          <button class="atp-btn" @click="doExport">导出时间线</button>
        </div>
        <div v-if="exportResult" class="atp-export-result">
          <span class="atp-export-ok">✓ {{ exportResult.filename }} · {{ exportResult.sizeBytes }} 字节</span>
          <pre class="atp-export-preview">{{ exportResult.content.slice(0, 400) }}</pre>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuditTimeline } from '../modules/safety/audit-timeline'
import { useAuditLog } from '../modules/safety/incident-response'
import type { AuditLogEntry } from '../modules/safety/incident-response'
import type { ExportFormat, EventAggregation, TimelineConfig, TimelineEvent } from '../modules/safety/audit-timeline'

const audit = useAuditLog()
const timeline = useAuditTimeline(() => audit.auditLog.value)

const config = timeline.config

const totalEvents = computed(() => audit.auditLog.value.length)
const events = computed<TimelineEvent[]>(() => timeline.toTimelineEvents(audit.auditLog.value))
const anomalySummary = computed(() => timeline.getAnomalySummary(events.value))
const trend = computed(() => timeline.analyzeTrends(audit.auditLog.value))
const heatmap = computed(() => timeline.generateHeatmap(audit.auditLog.value))

type TabId = 'timeline' | 'analysis' | 'trend' | 'export'
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'timeline', label: '时间线', icon: '🕐' },
  { id: 'analysis', label: '分析', icon: '📊' },
  { id: 'trend', label: '趋势', icon: '📈' },
  { id: 'export', label: '导出', icon: '📤' },
]
const activeTab = ref<TabId>('timeline')

const query = ref('')
const dimension = ref<EventAggregation['dimension']>('action')
const exportFormat = ref<ExportFormat>('json')
const exportResult = ref<ReturnType<typeof timeline.exportTimeline> | null>(null)

const granularity = computed({
  get: () => config.value.segmentGranularity,
  set: (v: TimelineConfig['segmentGranularity']) => timeline.updateConfig({ segmentGranularity: v }),
})
const showResolved = computed({
  get: () => config.value.showResolved,
  set: (v: boolean) => timeline.updateConfig({ showResolved: v }),
})
const showLowRisk = computed({
  get: () => config.value.showLowRisk,
  set: (v: boolean) => timeline.updateConfig({ showLowRisk: v }),
})

const visibleEvents = computed(() => {
  let list = events.value
  if (!config.value.showResolved) list = list.filter(e => e.entry.result !== 'success')
  if (!config.value.showLowRisk) list = list.filter(e => e.severity !== 'info')
  const q = query.value.trim()
  if (q) list = timeline.searchEvents(list, q)
  return list
})

const visibleSegments = computed(() => timeline.createSegments(visibleEvents.value))
const segments = computed(() => timeline.createSegments(events.value))
const aggregations = computed(() => timeline.aggregateEvents(events.value, dimension.value))

const trendDirectionLabel = computed(() => {
  const map: Record<string, string> = { rising: '📈 上升', falling: '📉 下降', stable: '➖ 平稳' }
  return map[trend.value.direction] ?? trend.value.direction
})

function barHeight(total: number): string {
  const max = Math.max(...trend.value.dataPoints.map(d => d.total), 1)
  return `${Math.max(4, Math.round((total / max) * 100))}%`
}

function heatColor(val: number): string {
  if (val === 0) return 'rgba(140, 154, 122, 0.08)'
  const ratio = heatmap.value.maxValue > 0 ? val / heatmap.value.maxValue : 0
  if (ratio < 0.33) return 'rgba(140, 154, 122, 0.35)'
  if (ratio < 0.66) return 'rgba(240, 192, 64, 0.55)'
  return 'rgba(196, 106, 90, 0.75)'
}

function fmtTime(ts: string): string {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function resultLabel(r: AuditLogEntry['result']): string {
  const map: Record<string, string> = { success: '成功', failure: '失败', blocked: '拦截' }
  return map[r] ?? r
}

function severityLabel(s: string): string {
  const map: Record<string, string> = { info: '信息', warning: '警告', danger: '危险', critical: '严重' }
  return map[s] ?? s
}

function anomalyTypeLabel(t: string): string {
  const map: Record<string, string> = { spike: '突增', drop: '骤降', pattern_change: '模式变化' }
  return map[t] ?? t
}

function doExport() {
  exportResult.value = timeline.exportTimeline(events.value, exportFormat.value)
}
</script>

<style scoped>
.atp-panel {
  margin: 28px auto 0;
  max-width: 760px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}
.atp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.atp-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high);
}
.atp-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.atp-badge {
  display: flex;
  gap: 8px;
  margin: 10px 0 12px;
  flex-wrap: wrap;
}
.atp-badge span {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
  border: 1px solid rgba(240, 192, 64, 0.25);
}
.atp-empty {
  padding: 22px 0;
  text-align: center;
}
.atp-empty-title {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--text-medium);
}
.atp-empty-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
}
.atp-tabs {
  display: flex;
  gap: 6px;
  margin: 0 0 14px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}
.atp-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-dim);
  font-size: 13px;
  cursor: pointer;
}
.atp-tab.active {
  background: rgba(240, 192, 64, 0.14);
  color: #f0c040;
}
.atp-config {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.atp-cfg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-medium);
}
.atp-select {
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-high);
  font-size: 12px;
}
.atp-search {
  flex: 1;
  min-width: 140px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-high);
  font-size: 12px;
}
.atp-seg {
  margin-bottom: 14px;
}
.atp-seg-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.atp-seg-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-high);
}
.atp-seg-meta {
  font-size: 11px;
  color: var(--text-dim);
}
.atp-seg-warn {
  font-size: 11px;
  color: #c46a5a;
}
.atp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.atp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  background: rgba(140, 154, 122, 0.06);
  font-size: 12px;
}
.atp-sev-danger, .atp-sev-critical {
  background: rgba(196, 106, 90, 0.1);
}
.atp-sev-warning {
  background: rgba(240, 192, 64, 0.1);
}
.atp-item-time {
  flex: 0 0 86px;
  color: var(--text-dim);
  font-size: 11px;
}
.atp-item-action {
  flex: 1;
  color: var(--text-high);
}
.atp-item-actor {
  flex: 0 0 64px;
  color: var(--text-medium);
}
.atp-item-result {
  flex: 0 0 34px;
  font-size: 11px;
}
.atp-res-success { color: #8a9a7a; }
.atp-res-failure { color: #c46a5a; }
.atp-res-blocked { color: #e74c3c; }
.atp-item-sev {
  flex: 0 0 34px;
  font-size: 11px;
  color: var(--text-medium);
}
.atp-item-group {
  flex: 0 0 40px;
  font-size: 11px;
  color: var(--text-dim);
}
.atp-block {
  margin-bottom: 16px;
}
.atp-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.atp-block-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-high);
}
.atp-agg-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.atp-agg-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.atp-agg-label {
  flex: 0 0 110px;
  color: var(--text-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atp-agg-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(140, 154, 122, 0.12);
  overflow: hidden;
}
.atp-agg-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
}
.atp-agg-count {
  flex: 0 0 74px;
  text-align: right;
  color: var(--text-dim);
  font-size: 11px;
}
.atp-anomaly-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 8px 0;
}
.atp-anomaly-chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}
.atp-trend-head {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-medium);
}
.atp-trend-dir { color: var(--text-high); }
.atp-trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  margin-bottom: 14px;
  padding: 0 4px;
  overflow-x: auto;
}
.atp-trend-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 26px;
  height: 100%;
}
.atp-trend-bar {
  width: 14px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, #f0c040, #8a9a7a);
}
.atp-trend-col-label {
  margin-top: 4px;
  font-size: 9px;
  color: var(--text-dim);
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.atp-heatmap {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-x: auto;
}
.atp-heatmap-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.atp-heatmap-row-label {
  flex: 0 0 44px;
  font-size: 10px;
  color: var(--text-dim);
  text-align: right;
}
.atp-heatmap-cells {
  display: flex;
  gap: 2px;
}
.atp-heatmap-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.atp-export {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.atp-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.16);
  color: #f0c040;
  font-size: 13px;
  cursor: pointer;
}
.atp-btn:hover {
  background: rgba(240, 192, 64, 0.26);
}
.atp-export-result {
  padding: 10px;
  border-radius: 8px;
  background: rgba(140, 154, 122, 0.08);
}
.atp-export-ok {
  font-size: 12px;
  color: #8a9a7a;
}
.atp-export-preview {
  margin: 8px 0 0;
  max-height: 220px;
  overflow: auto;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-medium);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
