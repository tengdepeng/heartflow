<template>
  <section class="sep" aria-label="策略评估">
    <div class="sep-head">
      <span class="sep-title">⚖️ 策略评估</span>
      <span class="sep-sub">七维评分 · SWOT · 对比推荐</span>
    </div>

    <!-- 统计总览 -->
    <div class="sep-stats">
      <div class="sep-stat"><b>{{ strategies.length }}</b><span>策略方案</span></div>
      <div class="sep-stat"><b>{{ linkedNodes }}</b><span>关联节点</span></div>
      <div class="sep-stat sep-stat--hot"><b>{{ bestName }}</b><span>当前最佳</span></div>
    </div>

    <!-- 空态 -->
    <div v-if="strategies.length === 0" class="sep-empty">
      <span>🧭</span>
      <p>还没有策略方案。为你的决策创建第一个策略，用七个维度评估它。</p>
    </div>

    <!-- 创建策略 -->
    <div class="sep-block">
      <span class="sep-block-label">创建策略</span>
      <div class="sep-create">
        <input v-model="newName" class="sep-input" placeholder="策略名称，如「转行做产品」" type="text" />
        <input v-model="newDesc" class="sep-input" placeholder="一句话描述（可选）" type="text" />
        <button class="sep-btn sep-btn--primary" @click="createStrategy">＋ 创建</button>
      </div>
      <div v-if="nodes.length" class="sep-node-pick">
        <span class="sep-node-label">关联知识节点（可选，用于 SWOT 分析）</span>
        <div class="sep-chips">
          <button
            v-for="n in nodes"
            :key="n.id"
            :class="['sep-chip', { active: pickedNodes.includes(n.id) }]"
            @click="togglePick(n.id)"
          >{{ n.title }}</button>
        </div>
      </div>
    </div>

    <!-- 策略列表 -->
    <div v-if="strategies.length" class="sep-block">
      <span class="sep-block-label">策略方案</span>
      <div class="sep-strategy-list">
        <article
          v-for="s in strategies"
          :key="s.id"
          :class="['sep-strategy', { active: current?.id === s.id }]"
        >
          <div class="sep-strategy-head" @click="select(s)">
            <span class="sep-strategy-name">{{ s.name }}</span>
            <span v-if="resultOf(s.id)" class="sep-grade" :style="{ color: gradeColor(resultOf(s.id)!.grade) }">
              {{ resultOf(s.id)!.grade }} · {{ resultOf(s.id)!.totalScore }}分
            </span>
            <span class="sep-strategy-caret">{{ current?.id === s.id ? '▾' : '▸' }}</span>
          </div>

          <div v-if="current?.id === s.id" class="sep-strategy-detail">
            <p v-if="s.description" class="sep-strategy-desc">{{ s.description }}</p>

            <!-- 维度评分 -->
            <div class="sep-dims">
              <div v-for="d in dims" :key="d.dimension" class="sep-dim">
                <span class="sep-dim-label">{{ d.icon }} {{ d.label }}</span>
                <input
                  :value="scores[s.id]?.[d.dimension] ?? ''"
                  class="sep-dim-input"
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  @input="setScore(s.id, d.dimension, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>

            <div class="sep-actions">
              <button class="sep-btn sep-btn--primary" @click="runEvaluate(s)">⚡ 评估</button>
              <button class="sep-btn" @click="runSwot(s)">🧭 SWOT</button>
              <button class="sep-btn sep-btn--danger" @click="removeStrategy(s.id)">删除</button>
            </div>

            <!-- 评估结果 -->
            <div v-if="resultOf(s.id)" class="sep-result">
              <div class="sep-result-head">
                <span class="sep-grade-big" :style="{ color: gradeColor(resultOf(s.id)!.grade) }">
                  {{ resultOf(s.id)!.grade }}
                </span>
                <span class="sep-result-total">{{ resultOf(s.id)!.totalScore }} / 100</span>
              </div>
              <div class="sep-result-bar">
                <i :style="{ width: resultOf(s.id)!.totalScore + '%', background: gradeColor(resultOf(s.id)!.grade) }"></i>
              </div>
              <div class="sep-result-dims">
                <div v-for="d in resultOf(s.id)!.dimensions" :key="d.dimension" class="sep-result-dim">
                  <span class="sep-result-dim-label">{{ d.icon }} {{ d.label }}</span>
                  <span class="sep-result-dim-score" :style="{ color: dimColor(d.score) }">{{ d.score }}分</span>
                  <span class="sep-result-dim-weight">权重 {{ Math.round(d.weight * 100) }}%</span>
                </div>
              </div>
            </div>

            <!-- SWOT -->
            <div v-if="swotOf(s.id)" class="sep-swot">
              <div class="sep-swot-grid">
                <div class="sep-swot-cell sep-swot--s">
                  <span class="sep-swot-title">优势</span>
                  <ul><li v-for="(i, idx) in swotOf(s.id)!.strengths" :key="idx">{{ i.content }}</li></ul>
                </div>
                <div class="sep-swot-cell sep-swot--w">
                  <span class="sep-swot-title">劣势</span>
                  <ul><li v-for="(i, idx) in swotOf(s.id)!.weaknesses" :key="idx">{{ i.content }}</li></ul>
                </div>
                <div class="sep-swot-cell sep-swot--o">
                  <span class="sep-swot-title">机会</span>
                  <ul><li v-for="(i, idx) in swotOf(s.id)!.opportunities" :key="idx">{{ i.content }}</li></ul>
                </div>
                <div class="sep-swot-cell sep-swot--t">
                  <span class="sep-swot-title">威胁</span>
                  <ul><li v-for="(i, idx) in swotOf(s.id)!.threats" :key="idx">{{ i.content }}</li></ul>
                </div>
              </div>
              <div v-if="swotOf(s.id)!.recommendations.length" class="sep-swot-rec">
                <span class="sep-swot-rec-label">建议</span>
                <p v-for="(r, idx) in swotOf(s.id)!.recommendations" :key="idx">{{ r }}</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- 对比推荐 -->
    <div v-if="strategies.length >= 2" class="sep-block">
      <span class="sep-block-label">对比推荐</span>
      <button class="sep-btn sep-btn--primary" @click="runCompare">📊 对比全部策略</button>
      <div v-if="comparison" class="sep-compare">
        <div class="sep-rank">
          <div
            v-for="(id, idx) in comparison.overallRanking"
            :key="id"
            class="sep-rank-row"
          >
            <span class="sep-rank-no">{{ idx + 1 }}</span>
            <span class="sep-rank-name">{{ nameOf(id) }}</span>
            <span class="sep-rank-score">{{ scoreOf(id) }}分</span>
          </div>
        </div>
        <div v-if="comparison.advantageMatrix.length" class="sep-adv">
          <div v-for="a in comparison.advantageMatrix" :key="a.strategyName" class="sep-adv-row">
            <span class="sep-adv-name">{{ a.strategyName }}</span>
            <span class="sep-adv-best">{{ a.bestFor }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getNodes } from '../../modules/knowledge/relation'
import { useStrategyEvaluator } from '../../modules/knowledge'
import { getDecisionAnalysisStore } from '../../modules/knowledge'
import type { StrategyOption, EvalDimension, EvaluationResult, SWOTAnalysis, StrategyComparison } from '../../modules/knowledge'

const store = getDecisionAnalysisStore()
const api = useStrategyEvaluator()

const strategies = store.strategies

const nodes = ref(getNodes())
const newName = ref('')
const newDesc = ref('')
const pickedNodes = ref<string[]>([])

const currentId = ref<string | null>(null)
const current = computed(() => strategies.value.find(s => s.id === currentId.value) ?? null)

// 各策略的维度评分草稿
const scores = ref<Record<string, Partial<Record<EvalDimension, number>>>>({})
const results = ref<Record<string, EvaluationResult>>({})
const swots = ref<Record<string, SWOTAnalysis>>({})
const comparison = ref<StrategyComparison | null>(null)

const dims = (Object.keys(api.DIMENSION_META) as EvalDimension[]).map(d => ({
  dimension: d,
  icon: api.DIMENSION_META[d].icon,
  label: api.DIMENSION_META[d].label,
}))

const linkedNodes = computed(() =>
  strategies.value.reduce((s, st) => s + st.knowledgeNodeIds.length, 0),
)
const bestName = computed(() => {
  if (strategies.value.length === 0) return '—'
  const best = strategies.value
    .map(s => ({ s, r: results.value[s.id] }))
    .filter(x => x.r)
    .sort((a, b) => b.r!.totalScore - a.r!.totalScore)[0]
  return best ? best.s.name : '待评估'
})

function resultOf(id: string) { return results.value[id] ?? null }
function swotOf(id: string) { return swots.value[id] ?? null }
function nameOf(id: string) { return strategies.value.find(s => s.id === id)?.name ?? id }
function scoreOf(id: string) { return results.value[id]?.totalScore ?? 0 }

function gradeColor(g: string) {
  const m: Record<string, string> = { A: '#8a9a7a', B: '#6b9fc4', C: '#f0c040', D: '#e0a96d', F: '#c46a5a' }
  return m[g] ?? '#f0c040'
}
function dimColor(score: number) {
  if (score >= 8) return '#8a9a7a'
  if (score >= 5) return '#f0c040'
  return '#c46a5a'
}

function togglePick(id: string) {
  const i = pickedNodes.value.indexOf(id)
  if (i >= 0) pickedNodes.value.splice(i, 1)
  else pickedNodes.value.push(id)
}

function createStrategy() {
  const name = newName.value.trim()
  if (!name) return
  const s = api.createStrategy(name, newDesc.value.trim(), [...pickedNodes.value])
  strategies.value.unshift(s)
  store.saveStrategies()
  scores.value[s.id] = {}
  currentId.value = s.id
  newName.value = ''
  newDesc.value = ''
  pickedNodes.value = []
}

function select(s: StrategyOption) {
  currentId.value = currentId.value === s.id ? null : s.id
}

function setScore(id: string, dim: EvalDimension, raw: string) {
  const v = raw === '' ? 0 : Math.max(0, Math.min(10, Number(raw) || 0))
  if (!scores.value[id]) scores.value[id] = {}
  scores.value[id][dim] = v
}

function applyScores(s: StrategyOption) {
  const draft = scores.value[s.id] ?? {}
  for (const d of dims) {
    if (draft[d.dimension] !== undefined) s.scores[d.dimension] = draft[d.dimension]
  }
  s.updatedAt = new Date().toISOString()
}

function runEvaluate(s: StrategyOption) {
  applyScores(s)
  store.saveStrategies()
  results.value[s.id] = api.evaluate(s)
}

function runSwot(s: StrategyOption) {
  applyScores(s)
  store.saveStrategies()
  swots.value[s.id] = api.swotAnalyze(s, nodes.value)
}

function runCompare() {
  for (const s of strategies.value) applyScores(s)
  store.saveStrategies()
  for (const s of strategies.value) {
    results.value[s.id] = api.evaluate(s)
  }
  comparison.value = api.compare(strategies.value)
}

function removeStrategy(id: string) {
  strategies.value = strategies.value.filter(s => s.id !== id)
  delete scores.value[id]
  delete results.value[id]
  delete swots.value[id]
  if (currentId.value === id) currentId.value = null
  store.saveStrategies()
}

onMounted(() => {
  store.load()
  nodes.value = getNodes()
})
</script>

<style scoped>
.sep {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.sep-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sep-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high, #d8c3a5);
}
.sep-sub {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.sep-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.sep-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.sep-stat b {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-high, #d8c3a5);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sep-stat span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.sep-stat--hot b {
  color: #f0c040;
}
.sep-block {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(18, 14, 11, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.sep-block-label {
  display: block;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 221, 208, 0.5);
  margin-bottom: 10px;
}
.sep-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 16px;
  text-align: center;
}
.sep-empty span {
  font-size: 28px;
}
.sep-empty p {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
}
.sep-create {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sep-input {
  flex: 1;
  min-width: 140px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-high, #d8c3a5);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.sep-input:focus {
  border-color: rgba(240, 192, 64, 0.4);
}
.sep-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(240, 192, 64, 0.25);
  background: transparent;
  color: var(--accent, #d8c3a5);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.sep-btn--primary {
  background: rgba(240, 192, 64, 0.12);
  border-color: rgba(240, 192, 64, 0.35);
}
.sep-btn--primary:hover {
  background: rgba(240, 192, 64, 0.2);
}
.sep-btn--danger {
  border-color: rgba(196, 106, 90, 0.3);
  color: #c46a5a;
}
.sep-node-pick {
  margin-top: 10px;
}
.sep-node-label {
  display: block;
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
  margin-bottom: 6px;
}
.sep-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sep-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(232, 221, 208, 0.6);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;

  min-height: 26px;
}
.sep-chip.active {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
  background: rgba(240, 192, 64, 0.1);
}
.sep-strategy-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sep-strategy {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.18);
}
.sep-strategy.active {
  border-color: rgba(240, 192, 64, 0.3);
}
.sep-strategy-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
}
.sep-strategy-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-high, #d8c3a5);
}
.sep-grade {
  font-size: 11px;
  font-weight: 600;
}
.sep-strategy-caret {
  color: rgba(232, 221, 208, 0.35);
  font-size: 11px;
}
.sep-strategy-detail {
  padding: 10px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.sep-strategy-desc {
  margin: 0 0 10px;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}
.sep-dims {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.sep-dim {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.sep-dim-label {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.6);
}
.sep-dim-input {
  width: 52px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-high, #d8c3a5);
  font-size: 12px;
  font-family: inherit;
  text-align: center;
  outline: none;
}
.sep-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.sep-result {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(240, 192, 64, 0.05);
  border: 1px solid rgba(240, 192, 64, 0.15);
}
.sep-result-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sep-grade-big {
  font-size: 24px;
  font-weight: 700;
}
.sep-result-total {
  font-size: 14px;
  color: var(--text-high, #d8c3a5);
}
.sep-result-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  margin: 8px 0 10px;
  overflow: hidden;
}
.sep-result-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s;
}
.sep-result-dims {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 6px;
}
.sep-result-dim {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.sep-result-dim-label {
  color: rgba(232, 221, 208, 0.55);
}
.sep-result-dim-score {
  font-weight: 600;
}
.sep-result-dim-weight {
  color: rgba(232, 221, 208, 0.3);
  font-size: 10px;
}
.sep-swot {
  margin-top: 12px;
}
.sep-swot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.sep-swot-cell {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.02);
}
.sep-swot-title {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.sep-swot--s .sep-swot-title { color: #8a9a7a; }
.sep-swot--w .sep-swot-title { color: #c46a5a; }
.sep-swot--o .sep-swot-title { color: #6b9fc4; }
.sep-swot--t .sep-swot-title { color: #e0a96d; }
.sep-swot-cell ul {
  margin: 0;
  padding-left: 16px;
}
.sep-swot-cell li {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.6);
  line-height: 1.6;
}
.sep-swot-rec {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.08);
}
.sep-swot-rec-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #8a9a7a;
  margin-bottom: 4px;
}
.sep-swot-rec p {
  margin: 2px 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.65);
}
.sep-compare {
  margin-top: 10px;
}
.sep-rank {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sep-rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.sep-rank-no {
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
.sep-rank-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-high, #d8c3a5);
}
.sep-rank-score {
  font-size: 12px;
  font-weight: 600;
  color: #f0c040;
}
.sep-adv {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sep-adv-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.sep-adv-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-high, #d8c3a5);
  min-width: 90px;
}
.sep-adv-best {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.55);
}
</style>
