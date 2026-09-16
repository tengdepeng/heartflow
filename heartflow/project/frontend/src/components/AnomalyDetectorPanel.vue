<template>
  <section class="adp-panel" aria-label="实时异常检测">
    <div class="adp-head">
      <span class="adp-title">📡 实时异常检测</span>
      <span class="adp-sub">行为基线 · 滑动窗口 · 自适应阈值</span>
    </div>
    <div class="adp-badge">
      <span>{{ anomalies.length }} 异常</span>
      <span>{{ stats.unresolvedCount }} 未解决</span>
      <span>{{ dataPoints.length }} 数据点</span>
    </div>

    <nav class="adp-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="adp-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="adp-tab-icon">{{ tab.icon }}</span>
        <span class="adp-tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- 概览 Tab -->
    <div v-if="activeTab === 'overview'" class="adp-body">
      <div class="adp-actions">
        <button class="adp-btn" @click="runFull">运行全维度检测</button>
        <button class="adp-btn" @click="calcAll">计算全基线</button>
      </div>
      <div class="adp-grid">
        <div class="adp-cell"><b>{{ stats.totalDetections }}</b><span>检测次数</span></div>
        <div class="adp-cell"><b>{{ stats.totalAnomalies }}</b><span>异常总数</span></div>
        <div class="adp-cell"><b>{{ stats.anomalyRate }}%</b><span>异常率</span></div>
        <div class="adp-cell"><b>{{ stats.unresolvedCount }}</b><span>未解决</span></div>
      </div>
      <div class="adp-dist">
        <span v-for="(count, sev) in stats.bySeverity" :key="sev" class="adp-dist-item">
          <span class="adp-dist-dot" :style="{ background: severityColor(String(sev)) }"></span>
          {{ severityLabel(String(sev)) }} {{ count }}
        </span>
      </div>
      <p v-if="criticalList.length" class="adp-section-title">⚠️ 严重未解决异常</p>
      <ul v-if="criticalList.length" class="adp-list">
        <li v-for="a in criticalList" :key="a.id" class="adp-item">
          <span class="adp-chip" :style="severityChip(a.severity)">{{ severityLabel(a.severity) }}</span>
          <span class="adp-item-type">{{ dimLabel(a.dimension) }}</span>
          <span class="adp-item-desc">{{ a.description }}</span>
          <button class="adp-btn adp-btn-small" @click="resolve(a.id)">解决</button>
        </li>
      </ul>
      <p v-if="!criticalList.length" class="adp-hint">暂无严重未解决异常</p>
    </div>

    <!-- 检测 Tab -->
    <div v-if="activeTab === 'detect'" class="adp-body">
      <div class="adp-actions">
        <button class="adp-btn" @click="runFull">运行全维度检测</button>
      </div>
      <form class="adp-form" @submit.prevent="recordPoint">
        <select v-model="form.dimension" class="adp-input">
          <option v-for="(m, d) in ANOMALY_DIMENSION_META" :key="d" :value="d">{{ m.label }}</option>
        </select>
        <input v-model.number="form.value" type="number" class="adp-input" placeholder="数值" />
        <button type="submit" class="adp-btn adp-btn-primary">记录数据点</button>
      </form>
      <p class="adp-section-title">最近异常</p>
      <ul v-if="recentAnomalies.length" class="adp-list">
        <li v-for="a in recentAnomalies" :key="a.id" class="adp-item" :class="{ resolved: a.isResolved }">
          <span class="adp-chip" :style="severityChip(a.severity)">{{ severityLabel(a.severity) }}</span>
          <span class="adp-item-type">{{ dimLabel(a.dimension) }}</span>
          <span class="adp-item-desc">{{ a.description }}</span>
          <span class="adp-item-src">{{ a.zScore }}σ</span>
          <button v-if="!a.isResolved" class="adp-btn adp-btn-small" @click="resolve(a.id)">解决</button>
          <span v-else class="adp-item-res">已解决</span>
        </li>
      </ul>
      <p v-else class="adp-hint">暂无异常，可记录数据点或运行检测</p>
    </div>

    <!-- 基线 Tab -->
    <div v-if="activeTab === 'baseline'" class="adp-body">
      <div class="adp-actions">
        <input v-model.number="windowHours" type="number" class="adp-input adp-input-sm" placeholder="窗口小时" />
        <button class="adp-btn" @click="calcAll">计算全基线</button>
      </div>
      <div v-if="baselineList.length" class="adp-baseline-grid">
        <div v-for="b in baselineList" :key="b.dimension" class="adp-baseline-card">
          <span class="adp-baseline-title">{{ dimLabel(b.dimension) }}</span>
          <span class="adp-baseline-meta">均值 {{ b.mean.toFixed(1) }} · 标准差 {{ b.stdDev.toFixed(1) }}</span>
          <span class="adp-baseline-meta">中位 {{ b.median.toFixed(1) }} · 样本 {{ b.sampleCount }}</span>
          <span class="adp-baseline-meta">P25 {{ b.p25.toFixed(1) }} · P75 {{ b.p75.toFixed(1) }}</span>
        </div>
      </div>
      <p v-else class="adp-hint">暂无基线，请先计算（需至少 {{ windowConfig.minDataPoints }} 个数据点）</p>
    </div>

    <!-- 规则 Tab -->
    <div v-if="activeTab === 'rules'" class="adp-body">
      <div class="adp-actions">
        <button class="adp-btn" @click="resetRules">重置默认</button>
      </div>
      <div class="adp-config">
        <label class="adp-field">灵敏度 <input v-model.number="config.sensitivity" type="number" step="0.1" min="0" max="1" class="adp-input adp-input-sm" @change="saveConfig" /></label>
        <label class="adp-field">窗口大小 <input v-model.number="config.windowSize" type="number" class="adp-input adp-input-sm" @change="saveConfig" /></label>
      </div>
      <ul class="adp-list">
        <li v-for="r in rules" :key="r.id" class="adp-item">
          <span class="adp-chip" :style="severityChip(r.severity)">{{ severityLabel(r.severity) }}</span>
          <span class="adp-item-type">{{ dimLabel(r.dimension) }}</span>
          <span class="adp-item-desc">{{ r.name }}</span>
          <span class="adp-item-src">{{ ruleTypeLabel(r.type) }}</span>
          <label class="adp-check">
            <input type="checkbox" :checked="r.enabled" @change="toggle(r.id, ($event.target as HTMLInputElement).checked)" />
            启用
          </label>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  useAnomalyDetector,
  ANOMALY_DIMENSION_META,
  ANOMALY_SEVERITY_META,
} from '../modules/safety/anomaly-detector'
import type { AnomalyDimension, AnomalySeverity } from '../modules/safety/anomaly-detector'

const detector = useAnomalyDetector()

const anomalies = detector.anomalies
const rules = detector.rules
const dataPoints = detector.dataPoints
const stats = computed(() => detector.getDetectionStats())
const windowConfig = detector.windowConfig

const criticalList = computed(() => detector.getCriticalAnomalies())
const recentAnomalies = computed(() => detector.anomalies.value.slice(0, 20))
const baselineList = computed(() => Array.from(detector.baselines.value.values()))

type TabId = 'overview' | 'detect' | 'baseline' | 'rules'
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: '概览', icon: '📊' },
  { id: 'detect', label: '检测', icon: '🔍' },
  { id: 'baseline', label: '基线', icon: '📈' },
  { id: 'rules', label: '规则', icon: '📜' },
]
const activeTab = ref<TabId>('overview')

function dimLabel(dim: string): string {
  return ANOMALY_DIMENSION_META[dim as AnomalyDimension]?.label ?? dim
}
function severityLabel(sev: string): string {
  return ANOMALY_SEVERITY_META[sev as AnomalySeverity]?.label ?? sev
}
function severityColor(sev: string): string {
  return ANOMALY_SEVERITY_META[sev as AnomalySeverity]?.color ?? '#888'
}
function severityChip(sev: string) {
  const c = ANOMALY_SEVERITY_META[sev as AnomalySeverity]?.color ?? '#888'
  return { background: `${c}22`, color: c, borderColor: c }
}
function ruleTypeLabel(type: string): string {
  const map: Record<string, string> = { threshold: '阈值', statistical: '统计', pattern: '模式', rate: '变化率' }
  return map[type] ?? type
}

const form = ref<{ dimension: AnomalyDimension; value: number }>({
  dimension: 'login_frequency',
  value: 0,
})

function recordPoint() {
  detector.recordDataPoint(form.value.dimension, form.value.value)
  form.value.value = 0
}
function runFull() {
  detector.runFullDetection()
}
function resolve(id: string) {
  detector.resolveAnomaly(id)
}

const windowHours = ref(24)
function calcAll() {
  detector.calculateAllBaselines(windowHours.value)
}

const config = ref({ sensitivity: windowConfig.value.sensitivity, windowSize: windowConfig.value.windowSize })
function saveConfig() {
  detector.updateWindowConfig({ sensitivity: config.value.sensitivity, windowSize: config.value.windowSize })
}

function toggle(id: string, enabled: boolean) {
  detector.toggleRule(id, enabled)
}
function resetRules() {
  detector.resetRules()
}

onMounted(() => {
  config.value = { sensitivity: windowConfig.value.sensitivity, windowSize: windowConfig.value.windowSize }
})
</script>

<style scoped>
.adp-panel {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid rgba(240, 192, 64, 0.22);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(240, 192, 64, 0.06), rgba(138, 154, 122, 0.05));
}
.adp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.adp-title {
  font-size: 17px;
  font-weight: 700;
  color: #f0c040;
}
.adp-sub {
  font-size: 12px;
  color: rgba(230, 230, 220, 0.55);
}
.adp-badge {
  display: flex;
  gap: 8px;
  margin: 10px 0;
  flex-wrap: wrap;
}
.adp-badge span {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(240, 192, 64, 0.12);
  color: #e8d9a0;
}
.adp-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.adp-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid rgba(230, 230, 220, 0.14);
  border-radius: 999px;
  background: transparent;
  color: rgba(230, 230, 220, 0.6);
  font-size: 13px;
  cursor: pointer;
}
.adp-tab.active {
  border-color: rgba(240, 192, 64, 0.55);
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
}
.adp-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.adp-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.adp-btn {
  padding: 5px 12px;
  border: 1px solid rgba(138, 154, 122, 0.5);
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.12);
  color: #cfe0c0;
  font-size: 12px;
  cursor: pointer;
}
.adp-btn:hover {
  background: rgba(138, 154, 122, 0.22);
}
.adp-btn-primary {
  border-color: rgba(240, 192, 64, 0.55);
  background: rgba(240, 192, 64, 0.14);
  color: #f0c040;
}
.adp-btn-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 2px 8px;
  font-size: 11px;

  min-height: 26px;
}
.adp-input {
  padding: 5px 8px;
  border: 1px solid rgba(230, 230, 220, 0.16);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: #e6e6dc;
  font-size: 12px;
}
.adp-input-sm {
  width: 90px;
}
.adp-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.adp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.adp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  background: rgba(230, 230, 220, 0.05);
}
.adp-cell b {
  font-size: 18px;
  color: #e6e6dc;
}
.adp-cell span {
  font-size: 11px;
  color: rgba(230, 230, 220, 0.5);
}
.adp-dist {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: rgba(230, 230, 220, 0.7);
}
.adp-dist-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.adp-dist-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.adp-section-title {
  font-size: 13px;
  color: #e6e6dc;
  margin: 4px 0 0;
}
.adp-hint {
  font-size: 12px;
  color: rgba(230, 230, 220, 0.45);
}
.adp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.adp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(230, 230, 220, 0.04);
  font-size: 12px;
}
.adp-item.resolved {
  opacity: 0.55;
}
.adp-item-type {
  color: #e6e6dc;
  font-weight: 600;
}
.adp-item-desc {
  color: rgba(230, 230, 220, 0.8);
  flex: 1;
  min-width: 120px;
}
.adp-item-src {
  color: rgba(230, 230, 220, 0.45);
  font-size: 11px;
}
.adp-item-res {
  color: #8a9a7a;
  font-size: 11px;
}
.adp-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: rgba(230, 230, 220, 0.08);
  color: rgba(230, 230, 220, 0.75);
}
.adp-baseline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.adp-baseline-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(230, 230, 220, 0.05);
}
.adp-baseline-title {
  font-size: 13px;
  font-weight: 600;
  color: #f0c040;
}
.adp-baseline-meta {
  font-size: 11px;
  color: rgba(230, 230, 220, 0.6);
}
.adp-config {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.adp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(230, 230, 220, 0.65);
}
.adp-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: rgba(230, 230, 220, 0.7);
  cursor: pointer;
}
</style>
