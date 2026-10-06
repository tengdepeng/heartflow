<template>
  <section class="nrp" aria-label="叙事报告">
    <div class="nrp-head">
      <span class="nrp-title">📜 叙事报告</span>
      <span class="nrp-sub">日 · 周 · 月 · 年 · 生成与导出</span>
    </div>

    <!-- 生成区 -->
    <p class="nrp-subtitle">生成报告</p>
    <div class="nrp-generate">
      <button class="nrp-btn" @click="handleGenerate('daily')">生成今日叙事</button>
      <button class="nrp-btn" @click="handleGenerate('weekly')">生成本周周报</button>
      <button class="nrp-btn" @click="handleGenerate('monthly')">生成本月月报</button>
      <button class="nrp-btn" @click="handleGenerate('yearly')">生成年度报告</button>
    </div>

    <!-- 报告列表 -->
    <p class="nrp-subtitle">已生成报告</p>
    <div v-if="reportList.length" class="nrp-list">
      <button
        v-for="r in reportList"
        :key="r.id"
        class="nrp-item"
        :class="{ active: selectedId === r.id }"
        @click="selectReport(r.id)"
      >
        <span class="nrp-item-title">{{ r.title }}</span>
        <span class="nrp-item-type">{{ typeLabel(r.type) }}</span>
      </button>
    </div>
    <p v-else class="nrp-empty">暂无报告，点击上方按钮生成。</p>

    <!-- 报告详情 -->
    <template v-if="selected">
      <p class="nrp-subtitle">报告详情</p>
      <div class="nrp-detail">
        <div class="nrp-detail-head">
          <span class="nrp-detail-title">{{ selected.title }}</span>
          <span class="nrp-detail-range">{{ selected.dateRange.start }} ~ {{ selected.dateRange.end }}</span>
        </div>
        <p class="nrp-summary">{{ selected.summary }}</p>

        <!-- 统计 -->
        <div class="nrp-stats">
          <div class="nrp-stat">
            <span class="nrp-stat-value">{{ selected.stats.totalFocusMinutes }}</span>
            <span class="nrp-stat-label">专注分钟</span>
          </div>
          <div class="nrp-stat">
            <span class="nrp-stat-value">{{ selected.stats.totalCrystals }}</span>
            <span class="nrp-stat-label">结晶</span>
          </div>
          <div class="nrp-stat">
            <span class="nrp-stat-value">{{ selected.stats.totalNotes }}</span>
            <span class="nrp-stat-label">笔记</span>
          </div>
          <div class="nrp-stat">
            <span class="nrp-stat-value">{{ selected.stats.totalEmotions }}</span>
            <span class="nrp-stat-label">情绪</span>
          </div>
          <div class="nrp-stat">
            <span class="nrp-stat-value">{{ selected.stats.anchorCompletionRate }}%</span>
            <span class="nrp-stat-label">锚点完成率</span>
          </div>
          <div class="nrp-stat">
            <span class="nrp-stat-value">{{ selected.stats.dominantEmotion }}</span>
            <span class="nrp-stat-label">主导情绪</span>
          </div>
        </div>

        <!-- 叙事段落 -->
        <div v-if="selected.segments.length" class="nrp-segments">
          <div v-for="seg in selected.segments" :key="seg.date + seg.label" class="nrp-segment">
            <div class="nrp-segment-head">
              <span class="nrp-segment-label">{{ seg.label }}</span>
              <span class="nrp-segment-highlight">{{ seg.highlight }}</span>
            </div>
            <p class="nrp-segment-emotion">情绪：{{ seg.emotion }}</p>
            <p class="nrp-segment-insight">{{ seg.insight }}</p>
            <ul class="nrp-segment-items">
              <li v-for="(item, i) in seg.items" :key="i" class="nrp-segment-item">{{ item.summary }}</li>
            </ul>
          </div>
        </div>

        <!-- 情绪趋势 -->
        <div v-if="selected.emotionTrend.length" class="nrp-block">
          <p class="nrp-block-title">情绪趋势</p>
          <div class="nrp-trend">
            <div v-for="et in selected.emotionTrend" :key="et.date" class="nrp-trend-item">
              <span class="nrp-trend-date">{{ et.label }}</span>
              <span class="nrp-trend-dominant">{{ emotionLabel(et.dominant) }}</span>
            </div>
          </div>
        </div>

        <!-- 里程碑 -->
        <div v-if="selected.milestones?.length" class="nrp-block">
          <p class="nrp-block-title">里程碑</p>
          <div class="nrp-milestones">
            <div v-for="m in selected.milestones" :key="m.id" class="nrp-milestone">
              <span class="nrp-milestone-icon">{{ milestoneIcon(m.icon) }}</span>
              <span class="nrp-milestone-title">{{ m.title }}</span>
              <span class="nrp-milestone-desc">{{ m.description }}</span>
            </div>
          </div>
        </div>

        <!-- 个性化建议 -->
        <div v-if="selected.suggestions?.length" class="nrp-block">
          <p class="nrp-block-title">个性化建议</p>
          <div class="nrp-suggestions">
            <div v-for="s in selected.suggestions" :key="s.id" class="nrp-suggestion">
              <span class="nrp-suggestion-title" :class="'nrp-suggestion--' + s.priority">{{ s.title }}</span>
              <span class="nrp-suggestion-desc">{{ s.description }}</span>
            </div>
          </div>
        </div>

        <!-- 词云 -->
        <div v-if="selected.wordCloud?.length" class="nrp-block">
          <p class="nrp-block-title">词云</p>
          <div class="nrp-cloud">
            <span
              v-for="(w, i) in selected.wordCloud.slice(0, 20)"
              :key="i"
              class="nrp-cloud-word"
              :style="{ fontSize: cloudSize(w.weight), color: w.color || 'rgba(var(--accent-rgb), 0.7)' }"
            >{{ w.text }}</span>
          </div>
        </div>

        <!-- 导出 -->
        <div class="nrp-export">
          <button class="nrp-btn" @click="handleExport('json')">导出 JSON</button>
          <button class="nrp-btn" @click="handleExport('markdown')">导出 Markdown</button>
          <button class="nrp-btn" @click="handleExport('text')">导出文本</button>
        </div>
        <div v-if="exportResult" class="nrp-export-result">
          <span class="nrp-export-name">{{ exportResult.filename }}（{{ exportResult.size }} 字节）</span>
          <button class="nrp-btn--small" @click="downloadExport">下载</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { getLocalDateKey } from '../utils/time'
import { ref, computed, onMounted } from 'vue'
import { useNarrativeGenerator, useReportExporter } from '../modules/timeline/narrative-generator'
import { getRiverSource } from '../modules/timeline/river'
import type { NarrativeReport, ExportFormat } from '../modules/timeline/narrative-generator'

const {
  reports,
  loadReports,
  generateDailyNarrative,
  generateWeeklyReport,
  generateMonthlyReport,
  generateYearlyReport,
} = useNarrativeGenerator()
const { exportResult, exportReport } = useReportExporter()

const selectedId = ref('')

const reportList = computed(() => reports.value)

const selected = computed<NarrativeReport | undefined>(() =>
  reports.value.find(r => r.id === selectedId.value),
)

function typeLabel(type: string): string {
  const map: Record<string, string> = { daily: '日', weekly: '周', monthly: '月', yearly: '年' }
  return map[type] || type
}

function emotionLabel(dominant: string): string {
  const map: Record<string, string> = {
    happy: '快乐', calm: '平静', sad: '悲伤', anxious: '焦虑', angry: '愤怒', none: '—',
  }
  return map[dominant] || dominant
}

function milestoneIcon(icon: string): string {
  const map: Record<string, string> = {
    trophy: '🏆', star: '⭐', flame: '🔥', zap: '⚡', gem: '💎',
    'trending-up': '📈', edit: '✏️', heart: '💗', anchor: '⚓',
  }
  return map[icon] || '✦'
}

function cloudSize(weight: number): string {
  return `${Math.round(12 + weight * 14)}px`
}

function handleGenerate(type: NarrativeReport['type']): void {
  const source = getRiverSource()
  const now = new Date()
  let report: NarrativeReport
  switch (type) {
    case 'daily': {
      const today = getLocalDateKey(now)
      report = generateDailyNarrative(source, today)
      break
    }
    case 'weekly': {
      const day = now.getDay() || 7
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - day + 1)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      report = generateWeeklyReport(
        source,
        getLocalDateKey(weekStart),
        getLocalDateKey(weekEnd),
      )
      break
    }
    case 'monthly':
      report = generateMonthlyReport(source, now.getFullYear(), now.getMonth() + 1)
      break
    case 'yearly':
      report = generateYearlyReport(source, now.getFullYear())
      break
  }
  selectedId.value = report.id
}

function selectReport(id: string): void {
  selectedId.value = id
}

function handleExport(format: ExportFormat): void {
  if (!selected.value) return
  exportReport(selected.value, format)
}

function downloadExport(): void {
  if (!exportResult.value) return
  const blob = new Blob([exportResult.value.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportResult.value.filename
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
/* =============================================
   叙事报告 · 日/周/月/年 生成与导出（INCR-103）
   ============================================= */

.nrp {
  position: relative;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.nrp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.nrp-title {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.7);
  letter-spacing: 2px;
}

.nrp-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

.nrp-subtitle {
  margin: 14px 0 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  letter-spacing: 2px;
}

/* ---- 生成区 ---- */
.nrp-generate {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.nrp-btn {
  font-size: 12px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 6px;
  padding: 5px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.nrp-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
}

.nrp-btn--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.6);
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;

  min-height: 26px;
}

.nrp-btn--small:hover {
  color: rgba(var(--accent-rgb), 0.9);
  border-color: rgba(var(--accent-rgb), 0.3);
}

/* ---- 报告列表 ---- */
.nrp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}

.nrp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.nrp-item:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
}

.nrp-item.active {
  border-color: rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.1);
}

.nrp-item-title {
  color: rgba(var(--accent-rgb), 0.75);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nrp-item-type {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
  flex-shrink: 0;
}

.nrp-empty {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- 报告详情 ---- */
.nrp-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nrp-detail-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.nrp-detail-title {
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.8);
}

.nrp-detail-range {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
}

.nrp-summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(var(--accent-rgb), 0.65);
}

/* ---- 统计 ---- */
.nrp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.nrp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.nrp-stat-value {
  font-size: 15px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nrp-stat-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

/* ---- 叙事段落 ---- */
.nrp-segments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nrp-segment {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.nrp-segment-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.nrp-segment-label {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.8);
}

.nrp-segment-highlight {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}

.nrp-segment-emotion,
.nrp-segment-insight {
  margin: 4px 0 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}

.nrp-segment-items {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nrp-segment-item {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
}

/* ---- 通用块 ---- */
.nrp-block-title {
  margin: 0 0 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  letter-spacing: 2px;
}

.nrp-trend {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.nrp-trend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.nrp-trend-date {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

.nrp-trend-dominant {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
}

.nrp-milestones {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nrp-milestone {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 12px;
}

.nrp-milestone-icon {
  font-size: 14px;
}

.nrp-milestone-title {
  color: rgba(var(--accent-rgb), 0.8);
  flex-shrink: 0;
}

.nrp-milestone-desc {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}

.nrp-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nrp-suggestion {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.nrp-suggestion-title {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.8);
}

.nrp-suggestion--high {
  color: #c46a5a;
}

.nrp-suggestion-desc {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}

.nrp-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.nrp-cloud-word {
  line-height: 1.2;
}

/* ---- 导出 ---- */
.nrp-export {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.nrp-export-result {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.nrp-export-name {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}
</style>
