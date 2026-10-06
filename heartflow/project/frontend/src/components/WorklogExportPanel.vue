<template>
  <section class="we-panel" aria-label="更漏导出">
    <div class="we-panel-head">
      <span class="we-panel-title">📤 导出留档</span>
      <span class="we-panel-sub">多格式导出 · 报告生成</span>
    </div>

    <!-- 概览 -->
    <div class="we-block">
      <span class="we-block-label">日志概览</span>
      <div class="we-stats">
        <div class="we-stat">
          <span class="we-stat-num">{{ entries.length }}</span>
          <span class="we-stat-label">日志</span>
        </div>
        <div class="we-stat">
          <span class="we-stat-num">{{ tagCount }}</span>
          <span class="we-stat-label">标签</span>
        </div>
        <div class="we-stat">
          <span class="we-stat-num">{{ lastExport ? '✓' : '—' }}</span>
          <span class="we-stat-label">最近导出</span>
        </div>      </div>
    </div>

    <!-- 条目导出 -->
    <div class="we-block">
      <span class="we-block-label">条目导出</span>
      <div class="we-row">
        <select v-model="entryFormat" class="we-select">
          <option v-for="f in formats" :key="f.key" :value="f.key">{{ f.icon }} {{ f.label }}</option>
        </select>
        <label class="we-check"><input type="checkbox" v-model="entryOpts.includeMood" /> 情绪</label>
        <label class="we-check"><input type="checkbox" v-model="entryOpts.includeTags" /> 标签</label>
      </div>
      <div class="we-row">
        <input v-model="entryOpts.dateRange.start" type="date" class="we-input we-date" />
        <span class="we-sep">—</span>
        <input v-model="entryOpts.dateRange.end" type="date" class="we-input we-date" />
      </div>
      <div class="we-row">
        <button class="we-btn we-btn-primary" @click="doExport">导出</button>
        <button class="we-btn" @click="doCopy">复制</button>
        <button class="we-btn" @click="doDownload">下载</button>
      </div>
      <p v-if="exportResult" class="we-result">已导出 {{ exportResult.entryCount }} 条 → {{ exportResult.filename }}</p>
    </div>

    <!-- 报告生成 -->
    <div class="we-block">
      <span class="we-block-label">报告生成</span>
      <div class="we-row">
        <select v-model="reportOpts.template" class="we-select">
          <option v-for="t in REPORT_TEMPLATES" :key="t.id" :value="t.id">{{ t.icon }} {{ t.label }}</option>
        </select>
        <select v-model="reportOpts.format" class="we-select">
          <option v-for="f in formats" :key="f.key" :value="f.key">{{ f.icon }} {{ f.label }}</option>
        </select>
      </div>
      <div class="we-row">
        <input v-model="reportPeriod" type="text" class="we-input" placeholder="周期（如 2026-08 / 2026）" />
        <button class="we-btn we-btn-primary" @click="doReport">生成</button>
        <button class="we-btn" @click="doReportCopy">复制</button>
      </div>
      <p v-if="reportResult" class="we-result">已生成 {{ reportResult.entryCount }} 条 → {{ reportResult.filename }}</p>
    </div>

    <!-- 内容预览 -->
    <div v-if="preview" class="we-block">
      <span class="we-block-label">内容预览</span>
      <pre class="we-preview">{{ preview }}</pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  useWorklog,
  useWorklogExport,
  EXPORT_FORMAT_META,
  REPORT_TEMPLATES,
} from '../modules/worklog'
import type { ExportFormat, ExportResult, ReportOptions } from '../modules/worklog'
import { getLocalMonthKey, getLocalDateKey } from '../utils/time'

const worklog = useWorklog()
const exportEngine = useWorklogExport()

const entries = computed(() => worklog.entries.value)
const tagCount = computed(() => {
  const set = new Set<string>()
  for (const e of entries.value) for (const t of e.tags) set.add(t)
  return set.size
})

const formats = Object.entries(EXPORT_FORMAT_META).map(([key, meta]) => ({
  key: key as ExportFormat,
  ...meta,
}))

const entryFormat = ref<ExportFormat>('markdown')
const entryOpts = reactive({
  includeMood: true,
  includeTags: true,
  includeSessions: false,
  includeRoom: false,
  dateRange: { start: '', end: '' },
})

const reportOpts = reactive({
  template: 'weekly' as ReportOptions['template'],
  format: 'markdown' as ExportFormat,
})
const reportPeriod = ref('')

const exportResult = ref<ExportResult | null>(null)
const reportResult = ref<ExportResult | null>(null)
const preview = ref('')
const lastExport = ref(false)

function buildEntryConfig() {
  return {
    format: entryFormat.value,
    includeMood: entryOpts.includeMood,
    includeTags: entryOpts.includeTags,
    includeSessions: entryOpts.includeSessions,
    includeRoom: entryOpts.includeRoom,
    dateRange:
      entryOpts.dateRange.start && entryOpts.dateRange.end
        ? { start: entryOpts.dateRange.start, end: entryOpts.dateRange.end }
        : undefined,
    pretty: true,
  }
}

function doExport() {
  const r = exportEngine.exportEntries(entries.value, buildEntryConfig())
  exportResult.value = r
  preview.value = r.content
}

async function doCopy() {
  const r = exportEngine.exportEntries(entries.value, buildEntryConfig())
  await exportEngine.copyToClipboard(r)
  exportResult.value = r
  preview.value = r.content
}

function doDownload() {
  const r = exportEngine.exportEntries(entries.value, buildEntryConfig())
  exportEngine.download(r)
  exportResult.value = r
  preview.value = r.content
}

function buildSummaries() {
  const template = reportOpts.template
  const now = new Date()
  if (template === 'daily') {
    const date = reportPeriod.value || getLocalDateKey(now)
    return { summaries: [worklog.generateDailySummary(new Date(date))], weekly: null, period: date }
  }
  if (template === 'weekly') {
    const weekly = worklog.generateWeeklySummary(now)
    return { summaries: weekly.dailySummaries, weekly, period: weekly.weekStart }
  }
  if (template === 'monthly') {
    const month = reportPeriod.value || getLocalMonthKey(now)
    const [y, m] = month.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const summaries = []
    for (let d = 1; d <= daysInMonth; d++) summaries.push(worklog.generateDailySummary(new Date(y, m - 1, d)))
    return { summaries, weekly: null, period: month }
  }
  const year = reportPeriod.value || String(now.getFullYear())
  const summaries = []
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(Number(year), m + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) summaries.push(worklog.generateDailySummary(new Date(Number(year), m, d)))
  }
  return { summaries, weekly: null, period: year }
}

function doReport() {
  const { summaries, weekly, period } = buildSummaries()
  const r = exportEngine.generateReport(entries.value, summaries, weekly, {
    template: reportOpts.template,
    format: reportOpts.format,
    period,
    includeHabits: true,
    includePrediction: true,
    includeMood: true,
  })
  reportResult.value = r
  preview.value = r.content
}

async function doReportCopy() {
  const { summaries, weekly, period } = buildSummaries()
  const r = exportEngine.generateReport(entries.value, summaries, weekly, {
    template: reportOpts.template,
    format: reportOpts.format,
    period,
    includeHabits: true,
    includePrediction: true,
    includeMood: true,
  })
  await exportEngine.copyToClipboard(r)
  reportResult.value = r
  preview.value = r.content
}
</script>

<style scoped>
.we-panel {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.we-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.we-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.we-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.we-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.we-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.we-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.we-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.we-stat-num {
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.we-stat-label {
  font-size: 10px;
  color: var(--text-low);
}
.we-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.we-select {
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.we-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.we-date {
  flex: 0 0 130px;
}
.we-sep {
  font-size: 11px;
  color: var(--text-low);
}
.we-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-medium);
}
.we-btn {
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.we-btn-primary {
  background: rgba(240, 192, 64, 0.12);
  border-color: rgba(240, 192, 64, 0.3);
  color: #f0c040;
}
.we-result {
  margin: 0;
  font-size: 11px;
  color: var(--text-medium);
}
.we-preview {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 10px;
  line-height: 1.5;
  color: rgba(240, 242, 255, 0.6);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
