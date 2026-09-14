<template>
  <section class="atp" aria-label="审计时间线">
    <div class="atp-head">
      <span class="atp-title">🕐 审计时间线</span>
      <span class="atp-sub">事件分段 · 趋势分析 · 异常摘要</span>
    </div>

    <!-- 统计总览 -->
    <div class="atp-stats">
      <div class="atp-stat"><b>{{ events.length }}</b><span>事件</span></div>
      <div class="atp-stat"><b>{{ segments.length }}</b><span>分段</span></div>
      <div class="atp-stat atp-stat--hot"><b>{{ anomalySummary.totalAnomalies }}</b><span>异常</span></div>
      <div class="atp-stat"><b>{{ trend.direction === 'rising' ? '↑' : trend.direction === 'falling' ? '↓' : '→' }}</b><span>趋势</span></div>
    </div>

    <!-- 搜索 -->
    <div class="atp-block">
      <span class="atp-block-label">事件检索</span>
      <div class="atp-search">
        <input v-model="query" class="atp-input" placeholder="按操作 / 主体 / 目标 / 详情搜索" />
        <select v-model="granularity" class="atp-select" @change="onGranularity">
          <option value="hour">按小时</option>
          <option value="day">按天</option>
          <option value="week">按周</option>
          <option value="month">按月</option>
        </select>
      </div>
    </div>

    <!-- 趋势分析 -->
    <div class="atp-block">
      <span class="atp-block-label">趋势分析 · {{ trend.direction === 'rising' ? '上升' : trend.direction === 'falling' ? '下降' : '平稳' }}（{{ trend.changeRate > 0 ? '+' : '' }}{{ trend.changeRate }}%）</span>
      <div v-if="trend.dataPoints.length" class="atp-trend">
        <div v-for="dp in trend.dataPoints" :key="dp.timestamp" class="atp-trend-col" :title="`${dp.label} · ${dp.total} 事件`">
          <div class="atp-trend-bar-wrap">
            <i class="atp-trend-bar" :style="{ height: trendHeight(dp.total) }"></i>
          </div>
          <span class="atp-trend-label">{{ dp.label }}</span>
        </div>
      </div>
      <div v-else class="atp-empty">暂无趋势数据。</div>
      <div v-if="trend.anomalies.length" class="atp-trend-anomalies">
        <span v-for="a in trend.anomalies" :key="a.timestamp" class="atp-trend-anomaly">
          ⚠ {{ a.label }} · {{ a.description }}
        </span>
      </div>
    </div>

    <!-- 时间线分段 -->
    <div class="atp-block">
      <span class="atp-block-label">时间线分段 · {{ filteredSegments.length }}</span>
      <div v-if="filteredSegments.length" class="atp-seg-list">
        <div v-for="seg in filteredSegments" :key="seg.id" class="atp-seg" :class="{ critical: seg.hasCriticalEvents }">
          <div class="atp-seg-head">
            <strong class="atp-seg-label">{{ seg.label }}</strong>
            <span class="atp-seg-meta">{{ seg.eventCount }} 事件 · 成功率 {{ seg.successRate }}%</span>
          </div>
          <div v-if="seg.events.length" class="atp-seg-events">
            <div v-for="e in seg.events.slice(0, 5)" :key="e.entry.id" class="atp-event" :class="'atp-event--' + e.severity">
              <span class="atp-event-time">{{ fmtTime(e.entry.timestamp) }}</span>
              <span class="atp-event-action">{{ e.entry.action }}</span>
              <span class="atp-event-actor">{{ e.entry.actor }}</span>
              <span class="atp-event-result" :class="'atp-result--' + e.entry.result">{{ resultLabel(e.entry.result) }}</span>
            </div>
            <span v-if="seg.events.length > 5" class="atp-seg-more">+{{ seg.events.length - 5 }} 更多</span>
          </div>
        </div>
      </div>
      <div v-else class="atp-empty">暂无审计事件。在「安全态势」中记录事件后即可生成时间线。</div>
    </div>

    <!-- 异常摘要 -->
    <div class="atp-block">
      <span class="atp-block-label">异常摘要</span>
      <div v-if="anomalySummary.totalAnomalies" class="atp-anomaly-summary">
        <div class="atp-anomaly-count">
          <b>{{ anomalySummary.totalAnomalies }}</b>
          <span>异常事件</span>
        </div>
        <div class="atp-anomaly-groups">
          <span v-for="(count, group) in anomalySummary.byGroup" :key="group" class="atp-anomaly-group">
            {{ group }} ×{{ count }}
          </span>
        </div>
      </div>
      <div v-else class="atp-empty">没有异常事件。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuditLog, useAuditTimeline } from '../../modules/safety'
import type { TimelineConfig } from '../../modules/safety'

const auditApi = useAuditLog()
const timeline = useAuditTimeline(() => auditApi.auditLog.value)

const query = ref('')
const granularity = ref<TimelineConfig['segmentGranularity']>('day')

const events = computed(() => timeline.toTimelineEvents(auditApi.auditLog.value))
const segments = computed(() => timeline.createSegments(events.value))
const trend = computed(() => timeline.analyzeTrends(auditApi.auditLog.value, 24))
const anomalySummary = computed(() => timeline.getAnomalySummary(events.value))

const filteredSegments = computed(() => {
  if (!query.value.trim()) return segments.value
  const q = query.value.trim()
  return segments.value
    .map(seg => ({
      ...seg,
      events: seg.events.filter(e =>
        e.entry.action.toLowerCase().includes(q.toLowerCase()) ||
        e.entry.actor.toLowerCase().includes(q.toLowerCase()) ||
        e.entry.target.toLowerCase().includes(q.toLowerCase()) ||
        (e.entry.detail || '').toLowerCase().includes(q.toLowerCase()),
      ),
    }))
    .filter(seg => seg.events.length > 0)
})

const maxTrend = computed(() => {
  const vals = trend.value.dataPoints.map(dp => dp.total)
  return vals.length ? Math.max(...vals) : 1
})

onMounted(() => {
  // 空日志时播种一条演示审计事件
  if (auditApi.auditLog.value.length === 0) {
    auditApi.log('登录', 'system', '守护室', 'success', '初始化审计时间线')
  }
})

function onGranularity() {
  timeline.updateConfig({ segmentGranularity: granularity.value })
}

function trendHeight(total: number): string {
  return `${Math.max(8, Math.round((total / maxTrend.value) * 100))}%`
}

function resultLabel(r: string) {
  return ({ success: '成功', failure: '失败', blocked: '拦截' } as Record<string, string>)[r] ?? r
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.atp {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
}
.atp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}
.atp-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
}
.atp-sub {
  font-size: 11px;
  color: var(--text-low);
}
.atp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.atp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.atp-stat b {
  font-size: 18px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.atp-stat span {
  font-size: 11px;
  color: var(--text-low);
}
.atp-stat--hot b { color: #e74c3c; }
.atp-block {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.25);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.atp-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(var(--text-primary-rgb), 0.55);
  margin-bottom: 10px;
}
.atp-search {
  display: flex;
  gap: 8px;
}
.atp-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
}
.atp-select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
}
.atp-trend {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 90px;
  padding: 8px 4px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.1);
}
.atp-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.atp-trend-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.atp-trend-bar {
  display: block;
  width: 70%;
  min-height: 4px;
  border-radius: 3px 3px 0 0;
  background: var(--accent, #d4a574);
  transition: height 0.3s ease;
}
.atp-trend-label {
  font-size: 9px;
  color: var(--text-low);
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
}
.atp-trend-anomalies {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
.atp-trend-anomaly {
  font-size: 11px;
  color: #e67e22;
}
.atp-seg-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.atp-seg {
  padding: 10px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border-left: 3px solid rgba(var(--accent-rgb), 0.4);
}
.atp-seg.critical {
  border-left-color: #e74c3c;
}
.atp-seg-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.atp-seg-label {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.atp-seg-meta {
  font-size: 10px;
  color: var(--text-low);
}
.atp-seg-events {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.atp-event {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 6px;
  background: rgba(var(--bg-card-rgb), 0.3);
}
.atp-event--critical { border-left: 2px solid #e74c3c; }
.atp-event--danger { border-left: 2px solid #e67e22; }
.atp-event--warning { border-left: 2px solid #f39c12; }
.atp-event-time {
  flex: 0 0 64px;
  color: var(--text-low);
}
.atp-event-action {
  flex: 1;
  color: rgba(var(--text-primary-rgb), 0.75);
}
.atp-event-actor {
  flex: 0 0 56px;
  color: var(--text-low);
}
.atp-event-result {
  flex: 0 0 32px;
  text-align: right;
  font-size: 10px;
}
.atp-result--success { color: #2ecc71; }
.atp-result--failure { color: #f39c12; }
.atp-result--blocked { color: #e74c3c; }
.atp-seg-more {
  font-size: 10px;
  color: var(--text-low);
  padding: 2px 6px;
}
.atp-anomaly-summary {
  display: flex;
  align-items: center;
  gap: 16px;
}
.atp-anomaly-count {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.atp-anomaly-count b {
  font-size: 24px;
  color: #e74c3c;
}
.atp-anomaly-count span {
  font-size: 10px;
  color: var(--text-low);
}
.atp-anomaly-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.atp-anomaly-group {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}
.atp-empty {
  font-size: 12px;
  color: var(--text-low);
}
</style>
