<template>
  <section class="abp" aria-label="A/B 测试">
    <div class="abp-head">
      <span class="abp-title">🧪 A/B 测试</span>
      <span class="abp-sub">实验 · 分析 · 报告</span>
    </div>

    <div class="abp-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="abp-tab"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 实验 -->
    <template v-if="tab === 'experiments'">
      <div class="abp-stats">
        <div class="abp-stat">
          <span class="abp-stat-value">{{ experiments.length }}</span>
          <span class="abp-stat-label">实验</span>
        </div>
        <div class="abp-stat">
          <span class="abp-stat-value">{{ runningExperiments.length }}</span>
          <span class="abp-stat-label">运行中</span>
        </div>
        <div class="abp-stat">
          <span class="abp-stat-value">{{ completedExperiments.length }}</span>
          <span class="abp-stat-label">已完成</span>
        </div>
      </div>

      <div class="abp-create">
        <select v-model="templateId" class="abp-select">
          <option v-for="t in EXPERIMENT_TEMPLATES" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <input v-model="newName" class="abp-input" placeholder="实验名称…" />
        <button class="abp-btn" @click="handleCreate">创建实验</button>
      </div>

      <div v-if="experiments.length" class="abp-list">
        <div v-for="exp in experiments" :key="exp.id" class="abp-exp">
          <div class="abp-exp-head">
            <span class="abp-exp-name">{{ exp.name }}</span>
            <span class="abp-exp-status" :class="`st-${exp.status}`">{{ statusLabel(exp.status) }}</span>
          </div>
          <p class="abp-exp-desc">{{ exp.description }}</p>
          <div class="abp-exp-meta">
            <span>{{ metricLabel(exp.targetMetric) }}</span>
            <span>{{ exp.variants.length }} 个变体</span>
            <span>样本 {{ totalSamples(exp) }}</span>
          </div>
          <div v-if="exp.resultSummary" class="abp-exp-result">{{ exp.resultSummary }}</div>
          <div class="abp-exp-actions">
            <button v-if="exp.status === 'draft'" class="abp-btn--small" @click="handleStart(exp.id)">开始</button>
            <button v-if="exp.status === 'running'" class="abp-btn--small" @click="handleStop(exp.id)">停止</button>
            <button v-if="exp.status === 'running' || exp.status === 'stopped'" class="abp-btn--small" @click="handleComplete(exp.id)">完成</button>
            <button v-if="exp.status === 'completed'" class="abp-btn--small" @click="handleArchive(exp.id)">归档</button>
            <button class="abp-btn--small" @click="handleDelete(exp.id)">删除</button>
          </div>
        </div>
      </div>
      <p v-else class="abp-empty">暂无实验。从模板创建一个吧。</p>
    </template>

    <!-- 分析 -->
    <template v-else-if="tab === 'analysis'">
      <div class="abp-select-row">
        <select v-model="selectedId" class="abp-select">
          <option v-for="exp in experiments" :key="exp.id" :value="exp.id">{{ exp.name }}</option>
        </select>
        <button class="abp-btn" @click="handleAnalyze">显著性检验</button>
        <button class="abp-btn" @click="handleDetermineWinner">判定胜者</button>
        <button class="abp-btn" @click="handleGenerateReport">生成报告</button>
      </div>

      <template v-if="selectedExp">
        <div class="abp-variant-list">
          <div v-for="v in selectedVariants" :key="v.id" class="abp-variant">
            <div class="abp-variant-head">
              <span class="abp-variant-name">{{ v.name }}</span>
              <span v-if="isWinner(v.id)" class="abp-winner">🏆 胜者</span>
              <span v-if="v.metrics?.isSignificant" class="abp-sig">显著</span>
            </div>
            <div class="abp-variant-metrics">
              <span>样本 {{ v.metrics?.deliveries ?? 0 }}</span>
              <span>指标 {{ fmtMetric(v.metrics?.primaryMetric ?? 0) }}</span>
              <span v-if="v.metrics?.lift !== null && v.metrics?.lift !== undefined">
                提升 {{ (v.metrics.lift * 100).toFixed(1) }}%
              </span>
              <span v-if="v.metrics?.pValue !== null && v.metrics?.pValue !== undefined">
                p={{ v.metrics.pValue.toFixed(3) }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="selectedExp.resultSummary" class="abp-result-box">{{ selectedExp.resultSummary }}</div>
      </template>
      <p v-else class="abp-empty">请先创建实验。</p>
    </template>

    <!-- 报告 -->
    <template v-else>
      <div v-if="reports.length" class="abp-list">
        <div v-for="r in reports" :key="r.experimentId + r.generatedAt" class="abp-report">
          <div class="abp-report-head">
            <span class="abp-report-name">{{ r.experimentName }}</span>
            <span class="abp-report-status" :class="`st-${r.status}`">{{ statusLabel(r.status) }}</span>
          </div>
          <div class="abp-report-meta">
            <span>时长 {{ r.duration }} 天</span>
            <span>样本 {{ r.totalSamples }}</span>
            <span>{{ formatTime(r.generatedAt) }}</span>
          </div>
          <div v-if="r.winner" class="abp-report-winner">
            🏆 {{ r.winner.variantName }} · 置信度 {{ (r.winner.confidence * 100).toFixed(0) }}%
          </div>
          <p class="abp-report-rec">{{ r.recommendation }}</p>
        </div>
      </div>
      <p v-else class="abp-empty">暂无实验报告。</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useABTestEngine,
  EXPERIMENT_TEMPLATES,
  METRIC_LABELS,
} from '../modules/touchpoints/ab-test-engine'
import type { ABExperiment } from '../modules/touchpoints/ab-test-engine'

const {
  experiments,
  reports,
  runningExperiments,
  completedExperiments,
  createFromTemplate,
  startExperiment,
  stopExperiment,
  completeExperiment,
  archiveExperiment,
  deleteExperiment,
  testSignificance,
  autoDetermineWinner,
  generateReport,
} = useABTestEngine()

const tab = ref<'experiments' | 'analysis' | 'reports'>('experiments')
const tabs = [
  { key: 'experiments', label: '实验' },
  { key: 'analysis', label: '分析' },
  { key: 'reports', label: '报告' },
] as const

const templateId = ref(EXPERIMENT_TEMPLATES[0]?.id ?? '')
const newName = ref('')
const selectedId = ref('')

const selectedExp = computed<ABExperiment | undefined>(() =>
  experiments.value.find(e => e.id === selectedId.value),
)

// 引擎将指标存于 exp.variantMetrics[v.id]，此处合并到变体上便于模板渲染
const selectedVariants = computed(() => {
  const exp = selectedExp.value
  if (!exp) return []
  return exp.variants.map(v => ({
    ...v,
    metrics: exp.variantMetrics[v.id],
  }))
})

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  running: '运行中',
  stopped: '已停止',
  completed: '已完成',
  archived: '已归档',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function metricLabel(metric: string): string {
  return METRIC_LABELS[metric as keyof typeof METRIC_LABELS] ?? metric
}

function totalSamples(exp: ABExperiment): number {
  return Object.values(exp.variantMetrics).reduce((sum, m) => sum + m.deliveries, 0)
}

function fmtMetric(v: number): string {
  return v >= 100 ? Math.round(v).toString() : v.toFixed(3)
}

function isWinner(variantId: string): boolean {
  return selectedExp.value?.winnerId === variantId
}

function handleCreate(): void {
  if (!newName.value.trim()) return
  createFromTemplate(templateId.value, newName.value.trim())
  newName.value = ''
}

function handleStart(id: string): void {
  startExperiment(id)
}

function handleStop(id: string): void {
  stopExperiment(id)
}

function handleComplete(id: string): void {
  completeExperiment(id)
}

function handleArchive(id: string): void {
  archiveExperiment(id)
}

function handleDelete(id: string): void {
  deleteExperiment(id)
  if (selectedId.value === id) selectedId.value = ''
}

function handleAnalyze(): void {
  if (!selectedId.value) return
  testSignificance(selectedId.value)
}

function handleDetermineWinner(): void {
  if (!selectedId.value) return
  autoDetermineWinner(selectedId.value)
}

function handleGenerateReport(): void {
  if (!selectedId.value) return
  generateReport(selectedId.value)
}

function formatTime(ts: string): string {
  return ts.slice(0, 16).replace('T', ' ')
}
</script>

<style scoped>
.abp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--bg-panel, #1a1612);
}
.abp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.abp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.abp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.abp-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.abp-tab {
  padding: 5px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
}
.abp-tab.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.abp-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.abp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.05);
  border: 1px solid rgba(240, 192, 64, 0.12);
  min-width: 72px;
}
.abp-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #f0c040;
}
.abp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.abp-create,
.abp-select-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.abp-select,
.abp-input {
  padding: 6px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
}
.abp-input {
  flex: 1;
  min-width: 140px;
}
.abp-btn {
  padding: 6px 14px;
  border: 1px solid #f0c040;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.08);
  color: #f0c040;
  font-size: 12px;
  cursor: pointer;
}
.abp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.abp-exp,
.abp-report {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.abp-exp-head,
.abp-report-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.abp-exp-name,
.abp-report-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
}
.abp-exp-status,
.abp-report-status {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.st-draft {
  background: rgba(107, 159, 196, 0.14);
  color: #6b9fc4;
}
.st-running {
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
}
.st-stopped {
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
}
.st-completed {
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
}
.st-archived {
  background: rgba(122, 127, 140, 0.14);
  color: #7a7f8c;
}
.abp-exp-desc {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  line-height: 1.5;
  margin: 8px 0;
}
.abp-exp-meta,
.abp-report-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.abp-exp-result {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.08);
  color: #f0c040;
  font-size: 12px;
}
.abp-exp-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.abp-btn--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  cursor: pointer;

  min-height: 26px;
}
.abp-btn--small:hover {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
}
.abp-variant-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.abp-variant {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.abp-variant-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.abp-variant-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
}
.abp-winner {
  font-size: 12px;
  color: #f0c040;
}
.abp-sig {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
}
.abp-variant-metrics {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-top: 6px;
}
.abp-result-box {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.08);
  color: #f0c040;
  font-size: 12px;
}
.abp-report-winner {
  margin-top: 8px;
  font-size: 12px;
  color: #f0c040;
}
.abp-report-rec {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  line-height: 1.5;
  margin-top: 6px;
}
.abp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  padding: 16px 0;
  text-align: center;
}
</style>
