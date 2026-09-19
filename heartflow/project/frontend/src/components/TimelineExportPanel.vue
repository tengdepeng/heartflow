<template>
  <section class="tep" data-test="timeline-export" aria-label="时光导出">
    <header class="tep-head">
      <div class="tep-head-titles">
        <span class="tep-title">📤 时光导出</span>
        <span class="tep-sub">叙事报告 · 年度回顾 · 情感曲线 · 数据雷达 · 原始数据</span>
      </div>
      <span class="tep-year-chip">{{ year }} 年</span>
    </header>

    <p v-if="!itemCount" class="tep-empty">先让时间之河泛起涟漪（记录专注/情绪/笔记），即可导出你的时光档案。</p>

    <div v-else class="tep-grid">
      <article
        v-for="t in targets"
        :key="t.id"
        class="tep-card"
        :class="{ 'tep-card--active': lastTarget === t.id }"
        :data-test="`export-${t.id}`"
      >
        <div class="tep-card-head">
          <span class="tep-card-icon">{{ t.icon }}</span>
          <div>
            <strong class="tep-card-title">{{ t.title }}</strong>
            <p class="tep-card-desc">{{ t.desc }}</p>
          </div>
        </div>
        <div class="tep-card-actions">
          <select v-model="formats[t.id]" class="tep-select" :data-test="`fmt-${t.id}`">
            <option v-for="f in t.formats" :key="f" :value="f">{{ formatLabel(f) }}</option>
          </select>
          <button class="tep-btn" :data-test="`run-${t.id}`" @click="doExport(t.id)">
            导出
          </button>
        </div>
      </article>
    </div>

    <transition name="tep-fade">
      <div v-if="lastResult" class="tep-result" data-test="tep-result">
        <div class="tep-result-head">
          <strong>{{ lastResult.filename }}</strong>
          <span class="tep-result-meta">
            {{ formatLabel(lastResult.format) }} · {{ formatSize(lastResult.fileSize) }} · {{ statusText }} ·
            <time>{{ shortTime(lastResult.exportedAt) }}</time>
          </span>
          <button class="tep-mini" @click="downloadCurrent">↓ 下载</button>
        </div>
        <pre class="tep-preview">{{ lastResult.content }}</pre>
      </div>
    </transition>

    <div v-if="history.items.length" class="tep-history" data-test="tep-history">
      <div class="tep-history-head">
        <h4 class="tep-history-title">本次会话导出记录</h4>
        <button class="tep-mini" @click="clearHistory">清除</button>
      </div>
      <ul class="tep-history-list">
        <li v-for="h in history.items" :key="h.id" class="tep-history-item">
          <span class="tep-h-dot" :class="`tep-h-dot--${h.target}`"></span>
          <code>{{ h.filename }}</code>
          <span>{{ formatSize(h.fileSize) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTimelineBridge } from '../modules/timeline/timeline-bridge'
import type { ExportFormat, ExportHistory, ExportTarget, ExportResult, ExportConfig } from '../modules/timeline/export-enhance'

const bridge = useTimelineBridge()

const year = ref(new Date().getFullYear())
const lastTarget = ref<ExportTarget | null>(null)
const lastResult = ref<ExportResult | null>(null)
const history = ref<ExportHistory>({ items: [], totalExports: 0, totalSize: 0, lastExportAt: undefined })

const itemCount = computed(() => bridge.items.value.length)

interface ExportTargetSpec {
  id: ExportTarget
  icon: string
  title: string
  desc: string
  formats: ExportFormat[]
}

const targets: ExportTargetSpec[] = [
  { id: 'narrative', icon: '📜', title: '叙事报告', desc: `${year} 年的时光叙事与里程碑`, formats: ['markdown', 'json', 'html', 'csv'] },
  { id: 'annual_review', icon: '🗺️', title: '年度回顾', desc: `${year} 年全景复盘与展望`, formats: ['markdown', 'json', 'html'] },
  { id: 'emotion_curve', icon: '📈', title: '情感曲线', desc: '情绪起伏与高峰低谷图谱', formats: ['json', 'csv', 'markdown'] },
  { id: 'radar', icon: '📡', title: '数据雷达', desc: '活跃热力与多维数据雷达', formats: ['json', 'markdown'] },
  { id: 'raw_data', icon: '🧺', title: '原始数据', desc: '时间线全量条目 CSV/JSON', formats: ['csv', 'json'] },
]

const formats = ref<Record<string, ExportFormat>>({
  narrative: 'markdown',
  annual_review: 'markdown',
  emotion_curve: 'json',
  radar: 'json',
  raw_data: 'csv',
})

const FORMAT_LABELS: Record<ExportFormat, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  csv: 'CSV',
  html: 'HTML',
  pdf: 'PDF',
}
function formatLabel(f: ExportFormat): string {
  return FORMAT_LABELS[f] ?? f
}
function formatSize(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`
}
function shortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const statusText = computed(() => {
  const r = lastResult.value
  if (!r) return ''
  return r.rowCount != null ? `${r.rowCount} 行` : r.sectionCount != null ? `${r.sectionCount} 节` : '已导出'
})

function refreshHistory(): void {
  history.value = bridge.exportEngine.getHistory()
}

function buildConfig(target: ExportTarget): ExportConfig {
  const visual = target === 'emotion_curve' || target === 'radar'
  return {
    includeMetadata: true,
    includeStats: true,
    includeCharts: visual,
    compress: false,
    encrypt: false,
    title: undefined,
    description: undefined,
  }
}

function doExport(target: ExportTarget): void {
  let data: unknown
  if (target === 'narrative') {
    const report = bridge.generateNarrative('yearly', year.value)
    if (!report) return
    data = report
  } else if (target === 'annual_review') {
    data = bridge.annualReviewModule.generateReview(bridge.items.value, year.value)
  } else if (target === 'emotion_curve') {
    const curve = bridge.emotionAnalysis.value.curve
    if (!curve) return
    data = curve
  } else if (target === 'radar') {
    data = bridge.radarCharts.value
  } else {
    data = bridge.items.value
  }

  const task = bridge.exportEngine.createBatchTask([{ target, data, format: formats.value[target], config: buildConfig(target) }])
  bridge.exportEngine.executeBatchTask(task)
  const item = task.items[0]
  if (item.result) {
    lastResult.value = item.result
    lastTarget.value = target
  }
  refreshHistory()
}

function downloadCurrent(): void {
  if (!lastResult.value) return
  const blob = new Blob([lastResult.value.content], { type: lastResult.value.mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = lastResult.value.filename
  a.click()
  URL.revokeObjectURL(url)
}

function clearHistory(): void {
  bridge.exportEngine.clearHistory()
  refreshHistory()
  lastResult.value = null
  lastTarget.value = null
}
</script>

<style scoped>
.tep {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}
.tep-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tep-head-titles { display: flex; flex-direction: column; gap: 2px; }
.tep-title { font-size: 18px; font-weight: 700; color: #3a4a3a; }
.tep-sub { font-size: 12px; color: #8a9a8a; }
.tep-year-chip {
  font-size: 12px; color: #6b7a6b; background: #eef3ee; border: 1px solid #dce6dc;
  padding: 4px 10px; border-radius: 999px;
}
.tep-empty { padding: 28px; text-align: center; color: #8a9a8a; font-size: 13px; background: #f7faf7; border: 1px dashed #dce6dc; border-radius: 12px; }
.tep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.tep-card {
  background: #fff;
  border: 1px solid #e5ece5;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color .2s, box-shadow .2s;
}
.tep-card--active { border-color: #8a9a7a; box-shadow: 0 2px 10px rgba(120, 140, 110, .12); }
.tep-card-head { display: flex; gap: 10px; align-items: flex-start; }
.tep-card-icon { font-size: 20px; }
.tep-card-title { font-size: 14px; color: #3a4a3a; }
.tep-card-desc { font-size: 11px; color: #8a9a8a; margin: 2px 0 0; }
.tep-card-actions { display: flex; gap: 8px; align-items: center; }
.tep-select {
  flex: 1; min-width: 0; font-size: 12px; color: #4a5a4a; background: #f7faf7;
  border: 1px solid #dce6dc; border-radius: 8px; padding: 6px 8px;
}
.tep-btn {
  font-size: 12px; color: #fff; background: #7c8c6c; border: none; border-radius: 8px;
  padding: 6px 14px; cursor: pointer; transition: background .2s;
}
.tep-btn:hover { background: #6b7b5b; }
.tep-result {
  border: 1px solid #dce6dc; border-radius: 12px; background: #fbfcfb; overflow: hidden;
}
.tep-result-head {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  background: #eef3ee; border-bottom: 1px solid #dce6dc; flex-wrap: wrap;
}
.tep-result-head strong { font-size: 13px; color: #3a4a3a; }
.tep-result-meta { font-size: 12px; color: #7c8c6c; flex: 1; }
.tep-preview {
  max-height: 260px; overflow: auto; margin: 0; padding: 14px;
  font-size: 12px; line-height: 1.6; color: #4a5a4a; white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.tep-mini {
  font-size: 12px; color: #6b7b5b; background: #fff; border: 1px solid #dce6dc;
  border-radius: 8px; padding: 4px 10px; cursor: pointer;
}
.tep-mini:hover { background: #f2f6f2; }
.tep-history { border-top: 1px solid #e5ece5; padding-top: 12px; }
.tep-history-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.tep-history-title { font-size: 13px; color: #3a4a3a; margin: 0; }
.tep-history-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.tep-history-item {
  display: flex; align-items: center; gap: 10px; font-size: 12px; color: #6b7a6b;
}
.tep-history-item code { color: #4a5a4a; flex: 1; }
.tep-h-dot { width: 8px; height: 8px; border-radius: 50%; background: #a8b8a0; }
.tep-h-dot--narrative { background: #c98a5a; }
.tep-h-dot--annual_review { background: #6b93b8; }
.tep-h-dot--emotion_curve { background: #b890a8; }
.tep-h-dot--radar { background: #8aa878; }
.tep-h-dot--raw_data { background: #b0a080; }
.tep-fade-enter-active, .tep-fade-leave-active { transition: opacity .2s; }
.tep-fade-enter-from, .tep-fade-leave-to { opacity: 0; }
</style>