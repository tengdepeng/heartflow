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
          <div class="abp-sample-need">
            <span class="abp-sample-need-required">
              样本进度 {{ sampleProgress(exp).collected }} / 需 {{ sampleProgress(exp).required }}
            </span>
            <span
              class="abp-sample-need-state"
              :class="sampleProgress(exp).reached ? 'is-reached' : 'is-pending'"
            >{{ sampleProgress(exp).reached ? '已达标' : `还差 ${sampleProgress(exp).remaining}` }}</span>
            <span class="abp-sample-need-stat">
              {{ sampleProgress(exp).recommended === null
                ? `统计推荐 —（${metricLabel(exp.targetMetric)}非比例指标，按模板下限计）`
                : `统计推荐 ${sampleProgress(exp).recommended}（α ${(exp.significanceLevel * 100).toFixed(0)}% · MDE ${(DEFAULT_MDE * 100).toFixed(0)}pt · 功效 ${(DEFAULT_POWER * 100).toFixed(0)}%）` }}
            </span>
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
  estimateSampleSize,
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
  getVariantPrimaryMetric,
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

// ---- 样本量估算（INCR-464）----
//
// 入参口径说明（引擎 estimateSampleSize 有 4 个入参，ABExperiment 类型只带得动其中 1 个）：
//   baselineRate            -> 对照组实时指标值，见 baselineRateOf()
//   significanceLevel       -> exp.significanceLevel（类型真字段，ab-test-engine.ts:44）
//   minimumDetectableEffect -> DEFAULT_MDE
//   power                   -> DEFAULT_POWER

/**
 * 统计功效默认值。ABExperiment 无 power 字段，取值 0.8 是统计惯例：
 * Cohen(1988) 提议的 β=0.20（即 II 类错误容忍度是 I 类 0.05 的 4 倍），
 * 也是绝大多数 A/B 工具的出厂默认。
 */
const DEFAULT_POWER = 0.8

/**
 * 最小可检测效应（MDE）默认值，按「绝对比例差 5 个百分点」计。
 * 选择理由：引擎 targetMetric 的四个比例指标（点击率/打开率/转化率/关闭率）
 * 日常量级在 10%~30%，5pt 的绝对提升大致对应 20%~50% 的相对提升，
 * 是「值得改一次触达策略」的下限；再小则所需样本量会平方级膨胀（见 estimateSampleSize 分母 mde²）。
 */
const DEFAULT_MDE = 0.05

/** 实验指标是否为 [0,1] 比例；responseTime 是以毫秒为单位的均值，不属于比例，喂进比例公式会出 NaN */
function isProportionMetric(exp: ABExperiment): boolean {
  return exp.targetMetric !== 'responseTime'
}

/**
 * 对照组基线率。对照组的选取与引擎 testSignificance 的默认行为一致（取 variants[0]），
 * 指标值走引擎自己的 getVariantPrimaryMetric，不在面板另算一套口径。
 * 不用 variantMetrics.primaryMetric —— 那是 updateVariantMetrics() 才刷的快照，实验刚创建时恒为 0。
 */
function baselineRateOf(exp: ABExperiment): number | null {
  if (!isProportionMetric(exp)) return null
  const control = exp.variants[0]
  if (!control) return null
  const metrics = exp.variantMetrics[control.id]
  if (!metrics) return null
  return getVariantPrimaryMetric(metrics, exp.targetMetric)
}

/**
 * 按统计功效推荐的样本量。比例指标不成立（或估算出非有限值）时返回 null —— 不编造基线。
 */
function recommendedSampleSize(exp: ABExperiment): number | null {
  const baseline = baselineRateOf(exp)
  if (baseline === null) return null
  const need = estimateSampleSize(baseline, DEFAULT_MDE, exp.significanceLevel, DEFAULT_POWER)
  // 基线接近 1 时 baseline+MDE 会越过 1，合并方差开根号得 NaN，此处挡掉
  return Number.isFinite(need) && need > 0 ? need : null
}

interface SampleProgress {
  /** 已收集样本数（口径与既有 totalSamples 一致） */
  collected: number
  /** 达标线 */
  required: number
  /** 还差多少；已达标时为 0 */
  remaining: number
  reached: boolean
  /** 统计功效推荐值；非比例指标时为 null */
  recommended: number | null
}

/**
 * 样本量进度。达标线取 max(exp.minSampleSize, 统计推荐)：
 * 引擎 determineWinner 以 exp.minSampleSize 为硬门槛，只按统计推荐判「已达标」会出现
 * 「面板说达标、判定胜者却说样本量不足」的自相矛盾，故两者取较严者。
 */
function sampleProgress(exp: ABExperiment): SampleProgress {
  const collected = totalSamples(exp)
  const recommended = recommendedSampleSize(exp)
  const required = Math.max(exp.minSampleSize, recommended ?? 0)
  return {
    collected,
    required,
    remaining: Math.max(0, required - collected),
    reached: collected >= required,
    recommended,
  }
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
.abp-sample-need {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.abp-sample-need-state {
  padding: 1px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.abp-sample-need-state.is-reached {
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
}
.abp-sample-need-state.is-pending {
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
}
.abp-sample-need-stat {
  flex-basis: 100%;
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
