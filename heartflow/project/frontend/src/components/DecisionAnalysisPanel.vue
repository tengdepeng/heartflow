<template>
  <section class="da-panel" aria-label="决策分析">
    <div class="da-panel-head">
      <span class="da-panel-title">🧭 决策分析</span>
      <span class="da-panel-sub">策略评估 · SWOT · 推荐排序</span>
    </div>
    <!-- 概览 -->
    <div class="da-block">
      <span class="da-block-label">策略总览</span>
      <div class="da-stats">
        <div class="da-stat">
          <span class="da-stat-num">{{ strategies.length }}</span>
          <span class="da-stat-label">策略</span>
        </div>
        <div class="da-stat">
          <span class="da-stat-num">{{ topRecommendation ? topRecommendation.grade : '—' }}</span>
          <span class="da-stat-label">最优等级</span>
        </div>
        <div class="da-stat">
          <span class="da-stat-num">{{ topRecommendation ? topRecommendation.totalScore : '—' }}</span>
          <span class="da-stat-label">最高分</span>
        </div>
      </div>
    </div>
    <!-- 新建策略 -->
    <div class="da-block">
      <span class="da-block-label">新建策略</span>
      <input v-model="form.name" class="da-input" placeholder="策略名称" />
      <input v-model="form.description" class="da-input" placeholder="策略描述" />
      <div class="da-scores">
        <div v-for="d in dimensionMeta" :key="d.key" class="da-score-row">
          <span class="da-score-label">{{ d.icon }} {{ d.label }}</span>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            class="da-range"
            :value="form.scores[d.key] ?? 5"
            @input="form.scores[d.key] = Number(($event.target as HTMLInputElement).value)"
          />
          <span class="da-score-num">{{ form.scores[d.key] ?? 5 }}</span>
        </div>
      </div>
      <!-- 关联知识节点（并入 StrategyEvaluatorPanel 独有能力，SWOT 知识支撑 INCR-397） -->
      <div v-if="nodes.length" class="da-node-pick">
        <span class="da-node-label">关联知识节点（用于 SWOT 分析）</span>
        <div class="da-chips">
          <button
            v-for="n in nodes"
            :key="n.id"
            :class="['da-chip', { active: pickedNodes.includes(n.id) }]"
            type="button"
            @click="togglePick(n.id)"
          >{{ n.title }}</button>
        </div>
      </div>
      <button class="da-btn da-btn-primary" :disabled="!form.name.trim()" @click="doCreate">创建策略</button>
    </div>
    <!-- 策略列表 -->
    <div v-if="strategies.length" class="da-block">
      <span class="da-block-label">策略列表（{{ strategies.length }}）</span>
      <div v-for="s in strategies" :key="s.id" class="da-strategy">
        <div class="da-strategy-head">
          <span class="da-strategy-name">{{ s.name }}</span>
          <span :class="['da-grade', gradeClass(evalResult(s).grade)]">{{ evalResult(s).grade }} · {{ evalResult(s).totalScore }}</span>
          <button class="da-strategy-del" @click="removeStrategy(s.id)">×</button>
        </div>
        <p v-if="s.description" class="da-strategy-desc">{{ s.description }}</p>
        <div class="da-strategy-actions">
          <button class="da-btn da-btn-sm" @click="toggleSwot(s.id)">SWOT</button>
          <button class="da-btn da-btn-sm" @click="toggleSensitivity(s.id)">敏感度</button>
        </div>
        <div v-if="swotFor === s.id && swot" class="da-swot">
          <div class="da-swot-grid">
            <div class="da-swot-cell da-swot-s">
              <span class="da-swot-title">优势</span>
              <p v-for="(item, i) in swot.strengths" :key="i" class="da-swot-item">{{ item.content }}</p>
              <p v-if="!swot.strengths.length" class="da-swot-empty">—</p>
            </div>
            <div class="da-swot-cell da-swot-w">
              <span class="da-swot-title">劣势</span>
              <p v-for="(item, i) in swot.weaknesses" :key="i" class="da-swot-item">{{ item.content }}</p>
              <p v-if="!swot.weaknesses.length" class="da-swot-empty">—</p>
            </div>
            <div class="da-swot-cell da-swot-o">
              <span class="da-swot-title">机会</span>
              <p v-for="(item, i) in swot.opportunities" :key="i" class="da-swot-item">{{ item.content }}</p>
              <p v-if="!swot.opportunities.length" class="da-swot-empty">—</p>
            </div>
            <div class="da-swot-cell da-swot-t">
              <span class="da-swot-title">威胁</span>
              <p v-for="(item, i) in swot.threats" :key="i" class="da-swot-item">{{ item.content }}</p>
              <p v-if="!swot.threats.length" class="da-swot-empty">—</p>
            </div>
          </div>
          <p v-for="(rec, i) in swot.recommendations" :key="i" class="da-swot-rec">💡 {{ rec }}</p>
        </div>
        <div v-if="sensitivityFor === s.id" class="da-sens">
          <div v-for="row in sensitivity(s)" :key="row.dimension" class="da-sens-row">
            <span class="da-sens-label">{{ row.label }}</span>
            <span class="da-sens-val">±10% 权重 → {{ row.minus10pct }} / {{ row.plus10pct }}</span>
            <span class="da-sens-delta">Δ{{ row.sensitivity }}</span>
          </div>
        </div>
      </div>
    </div>
    <!-- 推荐排序 -->
    <div v-if="recommendations.length" class="da-block">
      <span class="da-block-label">推荐排序</span>
      <div v-for="r in recommendations" :key="r.strategyId" class="da-rec">
        <span class="da-rec-rank">#{{ r.rank }}</span>
        <span class="da-rec-name">{{ r.strategyName }}</span>
        <span :class="['da-grade', gradeClass(r.grade)]">{{ r.grade }}</span>
        <span class="da-rec-score">{{ r.totalScore }}</span>
      </div>
    </div>
    <!-- 对比全部策略（并入 StrategyEvaluatorPanel 独有能力，排行+优势矩阵 INCR-397） -->
    <div v-if="strategies.length >= 2" class="da-block">
      <span class="da-block-label">对比推荐</span>
      <button class="da-btn da-btn-primary da-compare-btn" @click="runCompare">📊 对比全部策略</button>
      <div v-if="comparison" class="da-compare">
        <div class="da-rank">
          <div v-for="(id, idx) in comparison.overallRanking" :key="id" class="da-rank-row">
            <span class="da-rank-no">{{ idx + 1 }}</span>
            <span class="da-rank-name">{{ nameById(id) }}</span>
            <span class="da-rank-score">{{ scoreById(id) }} 分</span>
          </div>
        </div>
        <div v-if="comparison.advantageMatrix.length" class="da-adv">
          <span class="da-adv-label">优势矩阵</span>
          <div v-for="a in comparison.advantageMatrix" :key="a.strategyName" class="da-adv-row">
            <span class="da-adv-name">{{ a.strategyName }}</span>
            <span class="da-adv-best">最优 {{ a.bestFor }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { getDecisionAnalysisStore } from '../modules/knowledge/decision-analysis-store'
import { useStrategyEvaluator } from '../modules/knowledge/strategy-evaluator'
import { getNodes } from '../modules/knowledge/relation'
import type { EvalDimension, EvalGrade, StrategyOption, StrategyComparison } from '../modules/knowledge/strategy-evaluator'
import type { KnowledgeNode } from '../modules/knowledge/types'

const store = getDecisionAnalysisStore()
const evaluator = useStrategyEvaluator()

const strategies = computed(() => store.strategies.value)

const dimensionMeta = Object.entries(evaluator.DIMENSION_META).map(([key, meta]) => ({
  key: key as EvalDimension,
  ...meta,
}))

const form = reactive({
  name: '',
  description: '',
  scores: {} as Partial<Record<EvalDimension, number>>,
})

const nodes = ref<KnowledgeNode[]>([])
const pickedNodes = ref<string[]>([])
const comparison = ref<StrategyComparison | null>(null)

const swotFor = ref('')
const sensitivityFor = ref('')

const swot = computed(() => {
  const s = strategies.value.find(x => x.id === swotFor.value)
  if (!s) return null
  const linked = nodes.value.filter(n => s.knowledgeNodeIds.includes(n.id))
  return evaluator.swotAnalyze(s, linked)
})

const recommendations = computed(() => evaluator.recommend(strategies.value, undefined, 5))
const topRecommendation = computed(() => recommendations.value[0] || null)

function evalResult(s: StrategyOption) {
  return evaluator.evaluate(s)
}

function sensitivity(s: StrategyOption) {
  return evaluator.sensitivityAnalysis(s)
}

function doCreate() {
  const s = evaluator.createStrategy(form.name, form.description, [...pickedNodes.value], { ...form.scores })
  store.strategies.value.push(s)
  store.saveStrategies()
  form.name = ''
  form.description = ''
  form.scores = {}
  pickedNodes.value = []
}

function removeStrategy(id: string) {
  store.strategies.value = store.strategies.value.filter(s => s.id !== id)
  store.saveStrategies()
}

function toggleSwot(id: string) {
  swotFor.value = swotFor.value === id ? '' : id
  if (sensitivityFor.value === id) sensitivityFor.value = ''
}

function toggleSensitivity(id: string) {
  sensitivityFor.value = sensitivityFor.value === id ? '' : id
  if (swotFor.value === id) swotFor.value = ''
}

function gradeClass(g: EvalGrade) {
  const map: Record<EvalGrade, string> = { A: 'g-a', B: 'g-b', C: 'g-c', D: 'g-d', F: 'g-f' }
  return map[g]
}

function togglePick(id: string) {
  const i = pickedNodes.value.indexOf(id)
  if (i >= 0) pickedNodes.value.splice(i, 1)
  else pickedNodes.value.push(id)
}

function runCompare() {
  comparison.value = evaluator.compare(strategies.value)
}
function nameById(id: string): string {
  return strategies.value.find(s => s.id === id)?.name ?? id
}
function scoreById(id: string): number {
  return comparison.value?.strategies.find(r => r.strategyId === id)?.totalScore ?? 0
}

onMounted(() => {
  nodes.value = getNodes()
})
</script>

<style scoped>
.da-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.da-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.da-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.da-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.da-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.da-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.da-stats {
  display: flex;
  gap: 20px;
}
.da-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.da-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #c9d6b8;
}
.da-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.da-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: #e8e4d8;
  font-size: 13px;
  margin-bottom: 8px;
}
.da-scores {
  margin-bottom: 8px;
}
.da-score-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;
}
.da-score-label {
  flex: 0 0 90px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.7);
}
.da-range {
  flex: 1;
  accent-color: #8a9a7a;
}
.da-score-num {
  flex: 0 0 20px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  text-align: right;
}
.da-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  color: #e8e4d8;
  background: rgba(139, 155, 122, 0.2);
}
.da-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.da-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.da-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
.da-strategy {
  padding: 10px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.15);
}
.da-strategy:last-child {
  border-bottom: none;
}
.da-strategy-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.da-strategy-name {
  font-size: 14px;
  font-weight: 600;
  color: #e8e4d8;
}
.da-grade {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
}
.da-grade.g-a {
  color: #8a9a7a;
}
.da-grade.g-b {
  color: #6b9fc4;
}
.da-grade.g-c {
  color: #f0c040;
}
.da-grade.g-d {
  color: #e0a96d;
}
.da-grade.g-f {
  color: #c46a5a;
}
.da-strategy-del {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(232, 228, 216, 0.4);
  font-size: 16px;
  cursor: pointer;
}
.da-strategy-desc {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
  margin: 4px 0;
}
.da-strategy-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.da-swot {
  margin-top: 8px;
}
.da-swot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.da-swot-cell {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.da-swot-s {
  border-left: 3px solid #8a9a7a;
}
.da-swot-w {
  border-left: 3px solid #c46a5a;
}
.da-swot-o {
  border-left: 3px solid #6b9fc4;
}
.da-swot-t {
  border-left: 3px solid #e0a96d;
}
.da-swot-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(232, 228, 216, 0.7);
}
.da-swot-item {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.65);
  margin: 3px 0;
}
.da-swot-empty {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.3);
}
.da-swot-rec {
  font-size: 12px;
  color: #c9d6b8;
  margin-top: 6px;
}
.da-sens {
  margin-top: 8px;
}
.da-sens-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 12px;
}
.da-sens-label {
  flex: 0 0 70px;
  color: rgba(232, 228, 216, 0.7);
}
.da-sens-val {
  flex: 1;
  color: rgba(232, 228, 216, 0.55);
}
.da-sens-delta {
  color: #c9d6b8;
}
.da-rec {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.12);
}
.da-rec:last-child {
  border-bottom: none;
}
.da-rec-rank {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.4);
}
.da-rec-name {
  flex: 1;
  font-size: 13px;
  color: #e8e4d8;
}
.da-rec-score {
  font-size: 13px;
  font-weight: 600;
  color: #c9d6b8;
}
.da-node-pick {
  margin-top: 10px;
}
.da-node-label {
  display: block;
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
  margin-bottom: 6px;
}
.da-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.da-chip {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(139, 155, 122, 0.25);
  background: transparent;
  color: rgba(232, 228, 216, 0.6);
  font-family: inherit;
  cursor: pointer;
}
.da-chip.active {
  border-color: rgba(240, 192, 64, 0.45);
  color: #f0c040;
  background: rgba(240, 192, 64, 0.1);
}
.da-compare-btn {
  margin-bottom: 8px;
}
.da-compare {
  margin-top: 8px;
}
.da-rank {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.da-rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.da-rank-no {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  background: rgba(240, 192, 64, 0.15);
  color: #f0c040;
}
.da-rank-name {
  flex: 1;
  font-size: 13px;
  color: #e8e4d8;
}
.da-rank-score {
  font-size: 12px;
  font-weight: 600;
  color: #c9d6b8;
}
.da-adv {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.da-adv-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
  margin-bottom: 2px;
}
.da-adv-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.da-adv-name {
  font-size: 13px;
  font-weight: 600;
  color: #e8e4d8;
  min-width: 90px;
}
.da-adv-best {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
</style>
