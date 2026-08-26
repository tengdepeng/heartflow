<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance archive">
    <!-- 装饰性头部 -->
    <header data-enter class="archive-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">这里存放着你在这个世界留下的所有痕迹</p>
      <h1 class="header-title">数据档案馆</h1>
      <div class="header-overview">
        <div v-for="card in overviewCards" :key="card.label" class="overview-card">
          <span class="overview-count">{{ card.count }}</span>
          <span class="overview-label">{{ card.label }}</span>
        </div>
      </div>
    </header>

    <!-- 导出区 -->
    <section data-enter class="archive-section">
      <h2>📤 导出数据</h2>
      <p class="section-desc">将全部数据导出为 JSON、Markdown 或 CSV 格式，方便备份或迁移。</p>
      <div class="export-row">
        <select v-model="exportFormat" class="ar-select">
          <option value="json">JSON</option>
          <option value="md">Markdown</option>
          <option value="csv">CSV</option>
          <option value="html">HTML 报告</option>
          <option value="txt">纯文本</option>
        </select>
        <button class="ar-btn export-btn" @click="handleExport">
          <span class="btn-icon">↓</span>
          导出数据
        </button>
      </div>
    </section>

    <!-- 导入区 -->
    <section data-enter class="archive-section">
      <h2>📥 导入数据</h2>
      <p class="section-desc">从之前导出的文件恢复数据，新记录会自动合并，不会覆盖已有内容。</p>
      <div class="import-row">
        <button class="ar-btn import-btn" @click="openImportFilePicker">
          <span class="btn-icon">↑</span>
          选择文件并导入
        </button>
        <span v-if="selectedFileName" class="file-name">{{ selectedFileName }}</span>
      </div>
      <input ref="importFileInput" class="ar-file-input" type="file" accept=".json,.md,.csv,.txt,.html" @change="handleImportFileChange">
      <p class="import-hint">支持 JSON、Markdown、CSV、TXT 格式导入。</p>
      <div v-if="importFeedback" class="import-feedback" :class="`is-${importFeedback.kind}`">
        <template v-if="importFeedback.kind === 'success'">
          <span>已导入新增数据：</span>
          <span v-for="entry in importEntries" :key="entry.key" class="import-count-item">{{ entry.label }} +{{ entry.count }}</span>
        </template>
        <span v-else>{{ importFeedback.message }}</span>
      </div>
    </section>

    <!-- 数据概览区 -->
    <section data-enter class="archive-section">
      <h2>📊 数据概览</h2>
      <p class="section-desc">当前存储中各数据域的数量统计。</p>
      <div class="stats-grid">
        <div v-for="card in dataCards" :key="card.key" class="stat-card">
          <span class="stat-count">{{ card.count }}</span>
          <span class="stat-label">{{ card.label }}</span>
        </div>
      </div>
    </section>

    <!-- 归档管理（统一入口） -->
    <section data-enter class="archive-section">
      <h2>🗄️ 归档管理</h2>
      <p class="section-desc">集中管理可归档的内容：留光阁的冥想与释怀记录、镜我对白会话。也可在各自房间内直接归档，这里作为统一入口。</p>
      <LightRecordsPanel />
      <DialogueSessionList />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDataPort } from '../composables/useDataPort'
import { getImportCountEntries } from '../engine/data-port'
import type { ImportCounts } from '../engine/data-port'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useStatsStore } from '../stores'
import LightRecordsPanel from '../components/LightRecordsPanel.vue'
import DialogueSessionList from '../components/DialogueSessionList.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const dataPort = useDataPort()
const statsStore = useStatsStore()

// 导出格式选择
const exportFormat = ref('json')

function handleExport() {
  switch (exportFormat.value) {
    case 'json':
      dataPort.downloadJSON()
      break
    case 'md':
      dataPort.downloadData('md')
      break
    case 'csv':
      dataPort.downloadData('csv')
      break
    case 'html':
      dataPort.downloadData('html')
      break
    case 'txt':
      dataPort.downloadData('txt')
      break
    default:
      dataPort.downloadJSON()
  }
}

// 数据概览 - 使用 stats store
const dataCards = statsStore.dataCards

// 头部概览卡片 - 使用 stats store
const overviewCards = statsStore.overviewCards

// 导入
const importFileInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('')
const importFeedback = ref<{ kind: 'success'; counts: ImportCounts } | { kind: 'error'; message: string } | null>(null)

const importEntries = computed(() =>
  importFeedback.value?.kind === 'success' ? getImportCountEntries(importFeedback.value.counts) : []
)

function openImportFilePicker() {
  importFileInput.value?.click()
}

async function handleImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  selectedFileName.value = file.name

  // 根据文件扩展名确定格式
  const ext = file.name.split('.').pop()?.toLowerCase() || 'json'
  const formatMap: Record<string, string> = {
    json: 'json', md: 'md', markdown: 'md', csv: 'csv', txt: 'txt', html: 'html',
  }
  const format = formatMap[ext] || 'json'

  let content: string
  try {
    content = await file.text()
  } catch {
    importFeedback.value = { kind: 'error', message: '无法读取此本地文件。请确认文件可访问后重试。' }
    return
  }

  try {
    importFeedback.value = { kind: 'success', counts: dataPort.importData(content, format) }
  } catch (error) {
    importFeedback.value = {
      kind: 'error',
      message: error instanceof Error
        ? error.message
        : '此文件暂时无法导入，原有数据未被更改。',
    }
  }
}
</script>

<style scoped>
.archive {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100%;
  overflow-y: auto;
  position: relative;
  background: transparent;
  color: var(--text-high);
}

/* 环境光晕 */
.archive::before {
  content: '';
  position: fixed;
  top: 0;
  left: var(--sidebar-w, 220px);
  width: 30vw;
  height: 100dvh;
  background: radial-gradient(ellipse at left center, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.archive::after {
  content: '';
  position: fixed;
  top: 0;
  right: 0;
  width: 30vw;
  height: 100dvh;
  background: radial-gradient(ellipse at right center, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* 装饰性头部 */
.archive-header {
  text-align: center;
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.orn-line {
  display: inline-block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent);
}

.orn-diamond {
  font-size: 12px;
  color: var(--accent);
  opacity: 0.7;
}

.header-kicker {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.header-title {
  font-family: var(--font-heading-zh);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--text-high);
  margin-bottom: 24px;
}

.header-overview {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.overview-count {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.overview-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* 存档区段落 */
.archive-section {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
  padding: 20px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.archive-section h2 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-high);
}

.section-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

/* 按钮 */
.ar-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ar-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
}

.export-btn {
  border-color: rgba(90, 184, 160, 0.25);
  color: var(--accent-cyan);
}

.export-btn:hover {
  background: rgba(90, 184, 160, 0.08);
  border-color: rgba(90, 184, 160, 0.4);
}

.import-btn {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

.import-btn:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.4);
}

.btn-icon {
  font-size: 16px;
  font-weight: 600;
}

/* 导出格式选择行 */
.export-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ar-select {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--card-bg);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23d4a574' opacity='0.5' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
  min-width: 130px;
}

.ar-select:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--bg-card-rgb), 0.5);
}

.ar-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.ar-select option {
  background: var(--bg-panel);
  color: var(--text-high);
}

.ar-file-input {
  display: none;
}

.import-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 8px;
  opacity: 0.7;
}

.file-name {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
}

.import-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 12px;
  margin-top: 12px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid rgba(255,255,255,0.08);
}

.import-feedback.is-success {
  border-color: rgba(90, 184, 160, 0.2);
  background: rgba(90, 184, 160, 0.06);
}

.import-feedback.is-error {
  color: var(--text-secondary);
  border-color: rgba(240, 192, 64, 0.2);
}

.import-count-item {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(90, 184, 160, 0.1);
  color: var(--accent-cyan);
  font-size: 11px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  transition: all 0.2s;
}

.stat-card:hover {
  background: rgba(55, 48, 40, 0.7);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.stat-count {
  font-size: 22px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .archive { padding: 32px 20px 64px; }
  .header-overview { gap: 8px; }
  .overview-card { padding: 12px 8px; }
  .stats-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .archive { padding: 24px 14px 56px; }
  .header-overview { flex-direction: column; }
  .archive-section h2 { font-size: 12px; }
}

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .stat-card { padding: 8px; }
  .stat-count { font-size: 16px; }
  .stat-label { font-size: 9px; }
}
</style>