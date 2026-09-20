<template>
  <section class="wbp" data-test="worklog-bridge-panel" aria-label="更漏·桥接总览">
    <header class="wbp-head">
      <div class="wbp-head-text">
        <h3 class="wbp-title">🧭 更漏·桥接总览</h3>
        <p class="wbp-sub">工作日志 · 统计 · 节律 — 一处放眼时间织机的运转</p>
      </div>
      <div class="wbp-badge" data-test="wbp-badge">
        <span class="wbp-badge-dot" :class="statusKey" data-test="wbp-status"></span>
        <span class="wbp-badge-label">{{ statusLabel }}</span>
      </div>
    </header>

    <!-- 概览 -->
    <div class="wbp-block" data-test="wbp-summary">
      <span class="wbp-block-label">概览</span>
      <div class="wbp-grid">
        <div class="wbp-cell" data-test="wbp-cell">
          <b class="wbp-cell-value">{{ summary.totalEntries }}</b>
          <span class="wbp-cell-label">总条目</span>
        </div>
        <div class="wbp-cell" data-test="wbp-cell">
          <b class="wbp-cell-value" :class="summary.todayEntries > 0 ? 'is-hot' : ''">{{ summary.todayEntries }}</b>
          <span class="wbp-cell-label">今日条目</span>
        </div>
        <div class="wbp-cell" data-test="wbp-cell">
          <b class="wbp-cell-value">{{ summary.weekEntries }}</b>
          <span class="wbp-cell-label">本周条目</span>
        </div>
        <div class="wbp-cell" data-test="wbp-cell">
          <b class="wbp-cell-value">{{ summary.streakDays }}<i>天</i></b>
          <span class="wbp-cell-label">连续天数</span>
        </div>
        <div class="wbp-cell" data-test="wbp-cell">
          <b class="wbp-cell-value">{{ fmtDay(summary.mostProductiveDay) }}</b>
          <span class="wbp-cell-label">最有效率日</span>
        </div>
        <div class="wbp-cell" data-test="wbp-cell">
          <b class="wbp-cell-value">{{ fmtHour(summary.mostProductiveHour) }}</b>
          <span class="wbp-cell-label">最有效率时</span>
        </div>
      </div>
    </div>

    <!-- 最近记录 -->
    <div v-if="recent.length > 0" class="wbp-block" data-test="wbp-recent">
      <span class="wbp-block-label">最近记录</span>
      <ul class="wbp-recent-list">
        <li v-for="e in recent" :key="e.id" class="wbp-recent-item" data-test="wbp-recent-item">
          <span class="wbp-recent-title">{{ e.title }}</span>
          <span class="wbp-recent-meta">{{ typeLabel(e.type) }} · {{ fmtTime(e.createdAt) }}</span>
        </li>
      </ul>
    </div>

    <p v-if="isIdle" class="wbp-empty" data-test="wbp-empty">
      更漏还没记下第一篇日志。当工作与价值被写入，统计与节律将在这里显影。
    </p>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useWorklogModuleBridge } from '../modules/worklog/worklog-module-bridge'

const bridge = useWorklogModuleBridge()
const summary = computed(() => bridge.summary.value)

const recent = computed(() => bridge.filteredEntries.value.slice(0, 5))

const isIdle = computed(() => summary.value.totalEntries === 0)

const statusKey = computed(() => {
  if (summary.value.todayEntries > 0) return 'today'
  if (summary.value.totalEntries > 0) return 'echo'
  return 'idle'
})
const statusLabel = computed(() => {
  if (summary.value.todayEntries > 0) return `今日 ${summary.value.todayEntries} 条`
  if (summary.value.totalEntries > 0) return `共 ${summary.value.totalEntries} 条`
  return '待记录'
})

function fmtDay(day: string): string {
  return day && day.length > 0 ? day : '—'
}
function fmtHour(hour: number): string {
  if (summary.value.totalEntries === 0) return '—'
  return `${hour}时`
}
function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function typeLabel(t: string): string {
  const map: Record<string, string> = { work: '工作', journal: '日志', idea: '灵感', milestone: '里程碑' }
  return map[t] || t
}
</script>
<style scoped>
.wbp {
  width: 264px;
  background: linear-gradient(165deg, rgba(26, 24, 30, 0.9), rgba(14, 13, 18, 0.94));
  border: 1px solid rgba(180, 170, 200, 0.14);
  border-radius: 16px;
  padding: 14px 16px;
  color: rgba(215, 205, 235, 0.86);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
}
.wbp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.wbp-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.wbp-sub {
  margin: 3px 0 0;
  font-size: 11px;
  opacity: 0.55;
}
.wbp-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(180, 170, 200, 0.1);
}
.wbp-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.wbp-badge-dot.idle { background: #95a5a6; }
.wbp-badge-dot.echo { background: #8a9a7a; }
.wbp-badge-dot.today { background: #d0b269; }
.wbp-badge-label { font-size: 11px; opacity: 0.85; }
.wbp-block { margin-top: 12px; }
.wbp-block:first-of-type { margin-top: 0; }
.wbp-block-label {
  display: inline-block;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.55;
  margin-bottom: 7px;
}
.wbp-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.wbp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(180, 170, 200, 0.05);
  border: 1px solid rgba(180, 170, 200, 0.08);
}
.wbp-cell-value {
  font-size: 14px;
  font-weight: 600;
}
.wbp-cell-value i { font-size: 10px; font-style: normal; opacity: 0.6; margin-left: 2px; }
.wbp-cell-value.is-hot { color: #d0b269; }
.wbp-cell-label {
  font-size: 10px;
  opacity: 0.6;
}
.wbp-recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wbp-recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(14, 13, 18, 0.3);
  border: 0.5px solid transparent;
}
.wbp-recent-title {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wbp-recent-meta { font-size: 10px; opacity: 0.55; flex-shrink: 0; }
.wbp-empty { margin: 10px 0 0; font-size: 11px; opacity: 0.55; line-height: 1.6; }
</style>