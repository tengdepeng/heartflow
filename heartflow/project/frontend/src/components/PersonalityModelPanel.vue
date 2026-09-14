<template>
  <section class="pmp-panel" aria-label="人格建模">
    <div class="pmp-head">
      <span class="pmp-title">🧬 人格建模</span>
      <span class="pmp-sub">风格画像 · 价值观 · 成长轨迹 · 自我认知 · 演化预测</span>
    </div>
    <div class="pmp-badge">
      <span>{{ styleProfiles.length }} 画像</span>
      <span>{{ reports.length }} 报告</span>
      <span>{{ predictions.length }} 预测</span>
    </div>

    <!-- 空态 -->
    <div v-if="isEmpty" class="pmp-empty">
      <p class="pmp-empty-title">暂无人格画像</p>
      <p class="pmp-empty-hint">积累至少 {{ model.config.value.minDialoguesForStyle }} 条自我对话后，即可开始分析沟通风格与价值观</p>
    </div>

    <template v-else>
      <!-- 标签导航 -->
      <nav class="pmp-tabs">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="pmp-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="pmp-tab-icon">{{ tab.icon }}</span>
          <span class="pmp-tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- 风格 Tab -->
      <div v-if="activeTab === 'style'" class="pmp-body">
        <div class="pmp-actions">
          <button class="pmp-btn" @click="runAnalyzeStyle">分析风格</button>
          <span v-if="styleHint" class="pmp-hint">{{ styleHint }}</span>
        </div>
        <template v-if="latestStyle">
          <div class="pmp-chips">
            <span v-for="s in latestStyle.dominantStyles" :key="s" class="pmp-chip">{{ s }}</span>
          </div>
          <div class="pmp-block">
            <span class="pmp-block-label">风格维度</span>
            <ul class="pmp-bar-list">
              <li v-for="(v, dim) in latestStyle.dimensions" :key="dim" class="pmp-bar-item">
                <span class="pmp-bar-label">{{ STYLE_META[dim]?.label ?? dim }}</span>
                <span class="pmp-bar"><span class="pmp-bar-fill" :style="{ width: (v * 100).toFixed(0) + '%' }"></span></span>
                <span class="pmp-bar-val">{{ (v * 100).toFixed(0) }}%</span>
              </li>
            </ul>
          </div>
          <div class="pmp-block">
            <span class="pmp-block-label">表达偏好 · 平均 {{ latestStyle.lengthPreference.averageLength }} 字 · {{ lengthTrendLabel }}</span>
            <div class="pmp-words">
              <span v-for="w in latestStyle.frequentWords.slice(0, 12)" :key="w.word" class="pmp-word">{{ w.word }}<i>{{ w.count }}</i></span>
            </div>
          </div>
        </template>
        <p v-else class="pmp-empty-hint">点击「分析风格」基于自我对话生成沟通风格画像</p>
      </div>

      <!-- 价值观 Tab -->
      <div v-if="activeTab === 'values'" class="pmp-body">
        <div class="pmp-actions">
          <button class="pmp-btn" @click="runAnalyzeValues">分析价值观</button>
          <span v-if="valuesHint" class="pmp-hint">{{ valuesHint }}</span>
        </div>
        <template v-if="latestValues">
          <div class="pmp-block">
            <span class="pmp-block-label">核心价值观</span>
            <div class="pmp-chips">
              <span v-for="v in latestValues.coreValues" :key="v.dimension" class="pmp-chip pmp-chip-core">{{ v.label }}</span>
            </div>
          </div>
          <div class="pmp-block">
            <span class="pmp-block-label">价值观维度</span>
            <ul class="pmp-bar-list">
              <li v-for="v in latestValues.values" :key="v.dimension" class="pmp-bar-item">
                <span class="pmp-bar-label">{{ v.label }}</span>
                <span class="pmp-bar"><span class="pmp-bar-fill" :class="{ 'pmp-fill-core': v.isCore }" :style="{ width: (v.score * 100).toFixed(0) + '%' }"></span></span>
                <span class="pmp-bar-val">{{ (v.score * 100).toFixed(0) }}%</span>
              </li>
            </ul>
          </div>
          <div v-if="latestValues.conflicts.length" class="pmp-block">
            <span class="pmp-block-label">内在冲突</span>
            <ul class="pmp-list">
              <li v-for="(c, i) in latestValues.conflicts" :key="i" class="pmp-item pmp-item-warn">{{ c.description }}</li>
            </ul>
          </div>
        </template>
        <p v-else class="pmp-empty-hint">点击「分析价值观」基于自我对话提取价值取向</p>
      </div>

      <!-- 轨迹 Tab -->
      <div v-if="activeTab === 'trajectory'" class="pmp-body">
        <div class="pmp-actions">
          <button class="pmp-btn" @click="runBuildTrajectory">构建成长轨迹</button>
        </div>
        <template v-if="latestTrajectory">
          <div class="pmp-meta">
            <span>{{ latestTrajectory.startDate }} → {{ latestTrajectory.lastDate }}</span>
            <span>变化量 {{ (latestTrajectory.totalChange * 100).toFixed(0) }}%</span>
            <span>稳定性 {{ (latestTrajectory.stabilityScore * 100).toFixed(0) }}%</span>
          </div>
          <div class="pmp-block">
            <span class="pmp-block-label">成长阶段 · {{ latestTrajectory.nodes.length }} 节点</span>
            <ul class="pmp-list">
              <li v-for="n in latestTrajectory.nodes" :key="n.date" class="pmp-item">
                <span class="pmp-item-icon">{{ PHASE_META[n.phase]?.icon }}</span>
                <span class="pmp-item-main">
                  <span class="pmp-item-title">{{ PHASE_META[n.phase]?.label }} · {{ n.date }}</span>
                  <span class="pmp-item-desc">{{ n.phaseDescription }}</span>
                  <span v-if="n.keyEvents.length" class="pmp-item-tags">{{ n.keyEvents.join(' · ') }}</span>
                </span>
              </li>
            </ul>
          </div>
          <div v-if="latestTrajectory.turningPoints.length" class="pmp-block">
            <span class="pmp-block-label">关键转折点</span>
            <ul class="pmp-list">
              <li v-for="tp in latestTrajectory.turningPoints" :key="tp.date" class="pmp-item pmp-item-warn">{{ tp.date }} · {{ PHASE_META[tp.phase]?.label }}</li>
            </ul>
          </div>
        </template>
        <p v-else class="pmp-empty-hint">点击「构建成长轨迹」按时间线沉淀自我认知的演变</p>
      </div>

      <!-- 报告 Tab -->
      <div v-if="activeTab === 'report'" class="pmp-body">
        <div class="pmp-actions">
          <button class="pmp-btn" @click="runGenerateReport">生成自我认知报告</button>
        </div>
        <template v-if="latestReport">
          <p class="pmp-summary">{{ latestReport.summary }}</p>
          <div class="pmp-block">
            <span class="pmp-block-label">六维分析 · v{{ latestReport.version }}</span>
            <ul class="pmp-list">
              <li v-for="d in latestReport.dimensions" :key="d.dimension" class="pmp-item">
                <span class="pmp-item-main">
                  <span class="pmp-item-title">{{ d.label }} · 置信度 {{ (d.confidence * 100).toFixed(0) }}%</span>
                  <span class="pmp-item-desc">{{ d.content }}</span>
                </span>
              </li>
            </ul>
          </div>
          <div class="pmp-block">
            <span class="pmp-block-label">个性化建议</span>
            <ul class="pmp-list">
              <li v-for="(r, i) in latestReport.recommendations" :key="i" class="pmp-item">💡 {{ r }}</li>
            </ul>
          </div>
        </template>
        <p v-else class="pmp-empty-hint">先生成风格与价值观画像，再生成自我认知报告</p>
      </div>

      <!-- 预测 Tab -->
      <div v-if="activeTab === 'prediction'" class="pmp-body">
        <div class="pmp-actions">
          <select v-model="horizon" class="pmp-select">
            <option value="1_month">1 个月</option>
            <option value="3_months">3 个月</option>
            <option value="6_months">6 个月</option>
            <option value="1_year">1 年</option>
          </select>
          <button class="pmp-btn" @click="runPredict">生成演化预测</button>
        </div>
        <template v-if="latestPrediction">
          <div class="pmp-meta">
            <span>置信度 {{ (latestPrediction.overallConfidence * 100).toFixed(0) }}%</span>
            <span>时间范围 {{ horizonLabel }}</span>
          </div>
          <div class="pmp-block">
            <span class="pmp-block-label">风格演化</span>
            <ul class="pmp-list">
              <li v-for="p in latestPrediction.stylePredictions.slice(0, 8)" :key="p.dimension" class="pmp-item">
                <span class="pmp-item-title">{{ STYLE_META[p.dimension]?.label }}：{{ (p.current * 100).toFixed(0) }}% → {{ (p.predicted * 100).toFixed(0) }}%</span>
                <span class="pmp-item-tags">{{ directionLabel(p.direction) }} · 置信 {{ (p.confidence * 100).toFixed(0) }}%</span>
              </li>
            </ul>
          </div>
          <div class="pmp-block">
            <span class="pmp-block-label">可能的发展路径</span>
            <ul class="pmp-list">
              <li v-for="path in latestPrediction.possiblePaths" :key="path.label" class="pmp-item">
                <span class="pmp-item-main">
                  <span class="pmp-item-title">{{ path.label }} · {{ (path.probability * 100).toFixed(0) }}%</span>
                  <span class="pmp-item-desc">{{ path.description }}</span>
                </span>
              </li>
            </ul>
          </div>
          <div v-if="latestPrediction.basis.length" class="pmp-block">
            <span class="pmp-block-label">预测依据</span>
            <ul class="pmp-list">
              <li v-for="(b, i) in latestPrediction.basis" :key="i" class="pmp-item">{{ b }}</li>
            </ul>
          </div>
        </template>
        <p v-else class="pmp-empty-hint">需要至少 2 次风格与价值观画像快照才能预测演化</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePersonalityModel, STYLE_DIMENSION_META, GROWTH_PHASE_META } from '../modules/mirror/personality-model'
import type { EvolutionPrediction } from '../modules/mirror/personality-model'
import type { DialogueEntry } from '../modules/mirror/types'
import type { SelfTalk } from '../modules/self'

const props = defineProps<{ talks: SelfTalk[] }>()

const dialogues = computed<DialogueEntry[]>(() =>
  props.talks.map(t => ({
    id: t.id,
    role: 'user' as const,
    text: t.text,
    timestamp: new Date(t.at).getTime(),
  })),
)

const model = usePersonalityModel(() => dialogues.value)

const styleProfiles = model.styleProfiles
const reports = model.reports
const predictions = model.predictions

const latestStyle = computed(() => model.getLatestStyleProfile())
const latestValues = computed(() => model.getLatestValueProfile())
const latestTrajectory = computed(() => model.getLatestTrajectory())
const latestReport = computed(() => model.getLatestReport())
const latestPrediction = computed(() => model.getLatestPrediction())

const isEmpty = computed(() => dialogues.value.length === 0)

type TabId = 'style' | 'values' | 'trajectory' | 'report' | 'prediction'
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'style', label: '风格', icon: '💬' },
  { id: 'values', label: '价值观', icon: '💎' },
  { id: 'trajectory', label: '轨迹', icon: '🌱' },
  { id: 'report', label: '报告', icon: '📋' },
  { id: 'prediction', label: '预测', icon: '🔮' },
]
const activeTab = ref<TabId>('style')
const horizon = ref<EvolutionPrediction['horizon']>('3_months')

const STYLE_META = STYLE_DIMENSION_META
const PHASE_META = GROWTH_PHASE_META

const styleHint = computed(() =>
  dialogues.value.length < model.config.value.minDialoguesForStyle
    ? `还需 ${model.config.value.minDialoguesForStyle - dialogues.value.length} 条对话`
    : '',
)
const valuesHint = computed(() =>
  dialogues.value.length < model.config.value.minDialoguesForValues
    ? `还需 ${model.config.value.minDialoguesForValues - dialogues.value.length} 条对话`
    : '',
)

const lengthTrendLabel = computed(() => {
  const map: Record<string, string> = { increasing: '趋详实', stable: '平稳', decreasing: '趋精简' }
  return map[latestStyle.value?.lengthPreference.trend ?? 'stable'] ?? '平稳'
})

const horizonLabel = computed(() => {
  const map: Record<string, string> = { '1_month': '1 个月', '3_months': '3 个月', '6_months': '6 个月', '1_year': '1 年' }
  return map[horizon.value] ?? horizon.value
})

function directionLabel(d: string): string {
  const map: Record<string, string> = { increasing: '上升', decreasing: '下降', stable: '平稳' }
  return map[d] ?? d
}

function runAnalyzeStyle() {
  model.analyzeStyle()
  activeTab.value = 'style'
}
function runAnalyzeValues() {
  model.analyzeValues()
  activeTab.value = 'values'
}
function runBuildTrajectory() {
  model.buildTrajectory()
  activeTab.value = 'trajectory'
}
function runGenerateReport() {
  model.generateReport()
  activeTab.value = 'report'
}
function runPredict() {
  model.predictEvolution(horizon.value)
  activeTab.value = 'prediction'
}
</script>

<style scoped>
.pmp-panel {
  margin: 28px auto 0;
  max-width: 760px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}
.pmp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.pmp-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high);
}
.pmp-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.pmp-badge {
  display: flex;
  gap: 8px;
  margin: 10px 0 12px;
  flex-wrap: wrap;
}
.pmp-badge span {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
  border: 1px solid rgba(240, 192, 64, 0.25);
}
.pmp-empty {
  padding: 22px 0;
  text-align: center;
}
.pmp-empty-title {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--text-medium);
}
.pmp-empty-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
}
.pmp-tabs {
  display: flex;
  gap: 6px;
  margin: 0 0 14px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
  flex-wrap: wrap;
}
.pmp-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-dim);
  font-size: 13px;
  cursor: pointer;
}
.pmp-tab.active {
  background: rgba(240, 192, 64, 0.14);
  color: #f0c040;
}
.pmp-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pmp-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.pmp-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.16);
  color: #f0c040;
  font-size: 13px;
  cursor: pointer;
}
.pmp-btn:hover {
  background: rgba(240, 192, 64, 0.26);
}
.pmp-hint {
  font-size: 12px;
  color: var(--text-dim);
}
.pmp-select {
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-high);
  font-size: 12px;
}
.pmp-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pmp-chip {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
  border: 1px solid rgba(138, 154, 122, 0.3);
}
.pmp-chip-core {
  background: rgba(240, 192, 64, 0.16);
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.35);
}
.pmp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pmp-block-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-high);
}
.pmp-bar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pmp-bar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.pmp-bar-label {
  flex: 0 0 90px;
  color: var(--text-medium);
}
.pmp-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(140, 154, 122, 0.12);
  overflow: hidden;
}
.pmp-bar-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
}
.pmp-fill-core {
  background: linear-gradient(90deg, #f0c040, #c46a5a);
}
.pmp-bar-val {
  flex: 0 0 40px;
  text-align: right;
  color: var(--text-dim);
  font-size: 11px;
}
.pmp-words {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pmp-word {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(140, 154, 122, 0.08);
  font-size: 12px;
  color: var(--text-medium);
}
.pmp-word i {
  margin-left: 4px;
  font-style: normal;
  color: var(--text-dim);
  font-size: 10px;
}
.pmp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pmp-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(140, 154, 122, 0.06);
  font-size: 12px;
}
.pmp-item-warn {
  background: rgba(196, 106, 90, 0.1);
}
.pmp-item-icon {
  flex: 0 0 20px;
  font-size: 14px;
}
.pmp-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pmp-item-title {
  font-weight: 600;
  color: var(--text-high);
}
.pmp-item-desc {
  color: var(--text-medium);
  line-height: 1.5;
}
.pmp-item-tags {
  color: var(--text-dim);
  font-size: 11px;
}
.pmp-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-medium);
}
.pmp-summary {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.08);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-high);
}
</style>
