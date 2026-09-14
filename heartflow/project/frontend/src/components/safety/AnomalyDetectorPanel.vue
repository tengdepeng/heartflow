<template>
  <section class="adp" aria-label="异常检测">
    <div class="adp-head">
      <span class="adp-title">📡 异常检测</span>
      <span class="adp-sub">行为基线 · 滑动窗口 · 实时告警</span>
    </div>

    <!-- 统计总览 -->
    <div class="adp-stats">
      <div class="adp-stat"><b>{{ stats.totalDetections }}</b><span>检测次数</span></div>
      <div class="adp-stat"><b>{{ stats.totalAnomalies }}</b><span>异常总数</span></div>
      <div class="adp-stat"><b>{{ stats.anomalyRate }}%</b><span>异常率</span></div>
      <div class="adp-stat adp-stat--hot"><b>{{ stats.unresolvedCount }}</b><span>未解决</span></div>
    </div>

    <!-- 数据录入 -->
    <div class="adp-block">
      <span class="adp-block-label">数据录入</span>
      <div class="adp-create">
        <select v-model="form.dimension" class="adp-select">
          <option v-for="(meta, d) in ANOMALY_DIMENSION_META" :key="d" :value="d">{{ meta.icon }} {{ meta.label }}</option>
        </select>
        <input v-model.number="form.value" type="number" class="adp-input" placeholder="数值" />
        <button class="adp-btn adp-btn--primary adp-record-btn" @click="recordPoint">＋ 记录数据点</button>
      </div>
      <div class="adp-actions">
        <button class="adp-btn adp-btn--sm" @click="runBaseline">📐 计算基线</button>
        <button class="adp-btn adp-btn--sm" @click="runDetection">🔍 全量检测</button>
        <button class="adp-btn adp-btn--sm" @click="resetRules">↺ 重置规则</button>
      </div>
    </div>

    <!-- 异常列表 -->
    <div class="adp-block">
      <span class="adp-block-label">异常告警 · {{ anomalies.length }}</span>
      <div v-if="anomalies.length" class="adp-anomaly-list">
        <div v-for="a in anomalies" :key="a.id" class="adp-anomaly" :class="{ resolved: a.isResolved }">
          <span class="adp-anomaly-icon" :style="{ color: ANOMALY_SEVERITY_META[a.severity].color }">
            {{ ANOMALY_SEVERITY_META[a.severity].icon }}
          </span>
          <div class="adp-anomaly-body">
            <strong class="adp-anomaly-title">{{ dimensionLabel(a.dimension) }}</strong>
            <span class="adp-anomaly-desc">{{ a.description }}</span>
            <span class="adp-anomaly-meta">
              值 {{ a.value }} · 期望 {{ a.expectedValue }} · 偏差 {{ a.deviation }} · {{ fmtTime(a.detectedAt) }}
            </span>
          </div>
          <button v-if="!a.isResolved" class="adp-btn adp-btn--sm adp-resolve-btn" @click="resolveAnomaly(a.id)">解决</button>
          <span v-else class="adp-anomaly-done">✓</span>
        </div>
      </div>
      <div v-else class="adp-empty">还没有异常告警。录入数据点并运行检测。</div>
    </div>

    <!-- 检测规则 -->
    <div class="adp-block">
      <span class="adp-block-label">检测规则 · {{ rules.length }}</span>
      <div v-if="rules.length" class="adp-rule-list">
        <div v-for="r in rules" :key="r.id" class="adp-rule">
          <span class="adp-rule-icon">{{ ANOMALY_DIMENSION_META[r.dimension]?.icon }}</span>
          <div class="adp-rule-body">
            <strong class="adp-rule-name">{{ r.name }}</strong>
            <span class="adp-rule-meta">
              {{ ANOMALY_DIMENSION_META[r.dimension]?.label }} · {{ ANOMALY_SEVERITY_META[r.severity].label }}
            </span>
          </div>
          <label class="adp-toggle">
            <input type="checkbox" :checked="r.enabled" @change="toggleRule(r.id, ($event.target as HTMLInputElement).checked)" />
            <span class="adp-toggle-slider"></span>
          </label>
        </div>
      </div>
      <div v-else class="adp-empty">暂无规则。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import {
  useAnomalyDetector,
  ANOMALY_DIMENSION_META,
  ANOMALY_SEVERITY_META,
} from '../../modules/safety'
import type { AnomalyDimension } from '../../modules/safety'

const detector = useAnomalyDetector()

const form = reactive({
  dimension: 'login_frequency' as AnomalyDimension,
  value: 0,
})

const stats = detector.stats
const anomalies = detector.anomalies
const rules = detector.rules

onMounted(() => {
  // 空数据时播种一条基线数据点，便于演示
  if (detector.dataPoints.value.length === 0) {
    detector.recordDataPoint('login_frequency', 3)
  }
})

function recordPoint() {
  detector.recordDataPoint(form.dimension, form.value || 0)
  form.value = 0
}

function runBaseline() {
  detector.calculateAllBaselines()
}

function runDetection() {
  detector.runFullDetection()
}

function resolveAnomaly(id: string) {
  detector.resolveAnomaly(id)
}

function toggleRule(id: string, enabled: boolean) {
  detector.toggleRule(id, enabled)
}

function resetRules() {
  detector.resetRules()
}

function dimensionLabel(d: AnomalyDimension) {
  return ANOMALY_DIMENSION_META[d]?.label ?? d
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.adp {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
}
.adp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}
.adp-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
}
.adp-sub {
  font-size: 11px;
  color: var(--text-low);
}
.adp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.adp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.adp-stat b {
  font-size: 18px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.adp-stat span {
  font-size: 11px;
  color: var(--text-low);
}
.adp-stat--hot b { color: #e74c3c; }
.adp-block {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.25);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.adp-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(var(--text-primary-rgb), 0.55);
  margin-bottom: 10px;
}
.adp-create {
  display: flex;
  gap: 8px;
}
.adp-select,
.adp-input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
}
.adp-select { flex: 1; }
.adp-input { width: 90px; }
.adp-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--text-primary-rgb), 0.75);
  font-size: 12px;
  cursor: pointer;
}
.adp-btn--primary {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.35);
}
.adp-btn--sm {
  padding: 5px 10px;
  font-size: 11px;
}
.adp-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.adp-anomaly-list,
.adp-rule-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.adp-anomaly {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.3);
}
.adp-anomaly.resolved { opacity: 0.55; }
.adp-anomaly-icon { font-size: 16px; }
.adp-anomaly-body { flex: 1; min-width: 0; }
.adp-anomaly-title {
  display: block;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.adp-anomaly-desc {
  display: block;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.6);
  margin-top: 2px;
}
.adp-anomaly-meta {
  display: block;
  font-size: 10px;
  color: var(--text-low);
  margin-top: 2px;
}
.adp-anomaly-done { color: #2ecc71; }
.adp-rule {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.3);
}
.adp-rule-icon { font-size: 14px; }
.adp-rule-body { flex: 1; min-width: 0; }
.adp-rule-name {
  display: block;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.adp-rule-meta {
  display: block;
  font-size: 10px;
  color: var(--text-low);
}
.adp-toggle {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
  flex-shrink: 0;
}
.adp-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.adp-toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.2);
  transition: 0.2s;
}
.adp-toggle-slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 2px;
  top: 2px;
  border-radius: 50%;
  background: rgba(var(--text-primary-rgb), 0.5);
  transition: 0.2s;
}
.adp-toggle input:checked + .adp-toggle-slider {
  background: rgba(46, 204, 113, 0.4);
}
.adp-toggle input:checked + .adp-toggle-slider::before {
  transform: translateX(16px);
  background: #2ecc71;
}
.adp-empty {
  font-size: 12px;
  color: var(--text-low);
}
</style>
