<template>
  <section class="scp" aria-label="场景规划">
    <div class="scp-head">
      <span class="scp-title">🔭 场景规划</span>
      <span class="scp-sub">驱动因素 · What-If · 对比矩阵</span>
    </div>

    <!-- 统计总览 -->
    <div class="scp-stats">
      <div class="scp-stat"><b>{{ scenarios.length }}</b><span>场景</span></div>
      <div class="scp-stat"><b>{{ totalDrivers }}</b><span>驱动因素</span></div>
      <div class="scp-stat scp-stat--hot"><b>{{ avgScore }}</b><span>平均评分</span></div>
    </div>

    <!-- 空态 -->
    <div v-if="scenarios.length === 0" class="scp-empty">
      <span>🌌</span>
      <p>还没有场景规划。用模板快速构建未来可能性的地图。</p>
    </div>

    <!-- 创建场景 -->
    <div class="scp-block">
      <span class="scp-block-label">创建场景</span>
      <div class="scp-create">
        <input v-model="newName" class="scp-input" placeholder="场景主题，如「三年后的职业」" type="text" />
        <select v-model="newTemplate" class="scp-select">
          <option value="">空白场景</option>
          <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <button class="scp-btn scp-btn--primary" @click="createScenario">＋ 创建</button>
      </div>
    </div>

    <!-- 场景列表 -->
    <div v-if="scenarios.length" class="scp-block">
      <span class="scp-block-label">场景</span>
      <div class="scp-scenario-list">
        <button
          v-for="s in scenarios"
          :key="s.id"
          :class="['scp-scenario-chip', { active: current?.id === s.id }]"
          @click="selectScenario(s.id)"
        >
          {{ typeIcon(s.type) }} {{ s.name }}
          <span class="scp-scenario-score">{{ s.impactAssessment.overallScore || '—' }}/10</span>
        </button>
      </div>
    </div>

    <!-- 当前场景编辑 -->
    <div v-if="current" class="scp-block">
      <div class="scp-scenario-head">
        <span class="scp-scenario-name">{{ typeIcon(current.type) }} {{ current.name }}</span>
        <div class="scp-scenario-actions">
          <button class="scp-btn" @click="assess">📊 评估影响</button>
          <button class="scp-btn" @click="narrate">📝 生成叙事</button>
          <button class="scp-btn scp-btn--danger" @click="removeScenario(current.id)">删除</button>
        </div>
      </div>
      <p v-if="current.description" class="scp-scenario-desc">{{ current.description }}</p>

      <!-- 驱动因素 -->
      <div class="scp-sub-block">
        <span class="scp-sub-label">驱动因素</span>
        <div class="scp-drivers">
          <div v-for="d in current.drivers" :key="d.id" class="scp-driver">
            <div class="scp-driver-head">
              <span class="scp-driver-name">{{ d.name }}</span>
              <span class="scp-driver-unc" :style="{ color: uncColor(d.uncertainty) }">{{ uncLabel(d.uncertainty) }}</span>
              <span class="scp-driver-del" @click="removeDriver(d.id)">✕</span>
            </div>
            <div class="scp-driver-controls">
              <label class="scp-driver-control">
                不确定性
                <select :value="d.uncertainty" class="scp-select scp-select--sm" @change="setDriverUnc(d.id, ($event.target as HTMLSelectElement).value)">
                  <option v-for="u in uncLevels" :key="u" :value="u">{{ uncLabel(u) }}</option>
                </select>
              </label>
              <label class="scp-driver-control">
                影响 {{ d.impact.toFixed(1) }}
                <input
                  :value="d.impact"
                  class="scp-range"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  @input="setDriverImpact(d.id, Number(($event.target as HTMLInputElement).value))"
                />
              </label>
            </div>
          </div>
        </div>
        <div class="scp-add-row">
          <input v-model="newDriver" class="scp-input scp-input--sm" placeholder="添加驱动因素…" type="text" />
          <button class="scp-btn" @click="addDriver">＋ 添加</button>
        </div>
      </div>

      <!-- 场景因子 -->
      <div class="scp-sub-block">
        <span class="scp-sub-label">场景因子</span>
        <div class="scp-factors">
          <div v-for="f in current.factors" :key="f.id" class="scp-factor">
            <span class="scp-factor-name">{{ f.name }}</span>
            <select :value="f.value" class="scp-select scp-select--sm" @change="setFactorValue(f.id, ($event.target as HTMLSelectElement).value)">
              <option value="有利">有利</option>
              <option value="中性">中性</option>
              <option value="不利">不利</option>
            </select>
            <span class="scp-factor-prob">P={{ Math.round(f.probability * 100) }}%</span>
            <span class="scp-factor-del" @click="removeFactor(f.id)">✕</span>
          </div>
        </div>
        <div class="scp-add-row">
          <input v-model="newFactor" class="scp-input scp-input--sm" placeholder="添加因子…" type="text" />
          <button class="scp-btn" @click="addFactor">＋ 添加</button>
        </div>
      </div>

      <!-- 影响评估 -->
      <div v-if="current.impactAssessment.overallScore > 0" class="scp-impact">
        <div class="scp-impact-head">
          <span class="scp-impact-score">{{ current.impactAssessment.overallScore }}<small>/10</small></span>
          <span class="scp-impact-label">综合评分</span>
        </div>
        <div class="scp-impact-dims">
          <div class="scp-impact-dim">
            <span>积极影响</span>
            <b :style="{ color: '#8a9a7a' }">{{ current.impactAssessment.positiveImpact }}</b>
          </div>
          <div class="scp-impact-dim">
            <span>消极影响</span>
            <b :style="{ color: '#c46a5a' }">{{ current.impactAssessment.negativeImpact }}</b>
          </div>
          <div class="scp-impact-dim">
            <span>准备度</span>
            <b :style="{ color: '#6b9fc4' }">{{ current.impactAssessment.preparedness }}</b>
          </div>
          <div class="scp-impact-dim">
            <span>可控度</span>
            <b :style="{ color: '#f0c040' }">{{ current.impactAssessment.controllability }}</b>
          </div>
        </div>
      </div>

      <!-- 叙事 -->
      <div v-if="narrative" class="scp-narrative">
        <span class="scp-narrative-label">场景叙事</span>
        <p class="scp-narrative-text">{{ narrative }}</p>
      </div>
    </div>

    <!-- 对比矩阵 -->
    <div v-if="scenarios.length >= 2" class="scp-block">
      <span class="scp-block-label">场景对比</span>
      <button class="scp-btn scp-btn--primary" @click="compare">📊 生成对比矩阵</button>
      <div v-if="matrix" class="scp-matrix">
        <p class="scp-matrix-rec">{{ matrix.overallRecommendation }}</p>
        <div class="scp-matrix-table">
          <div class="scp-matrix-row scp-matrix-row--head">
            <span class="scp-matrix-cell">场景</span>
            <span v-for="dim in matrix.dimensions" :key="dim" class="scp-matrix-cell">{{ dim }}</span>
          </div>
          <div v-for="row in matrix.matrix" :key="row.scenarioId" class="scp-matrix-row">
            <span class="scp-matrix-cell scp-matrix-cell--name">{{ row.scenarioName }}</span>
            <span v-for="dim in matrix.dimensions" :key="dim" class="scp-matrix-cell">
              {{ row.values[dim] }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useScenarioPlanner } from '../../modules/knowledge'
import { getDecisionAnalysisStore } from '../../modules/knowledge'
import type { ScenarioPlan, ScenarioType, UncertaintyLevel, ScenarioComparisonMatrix } from '../../modules/knowledge'

const store = getDecisionAnalysisStore()
const api = useScenarioPlanner()

const scenarios = store.scenarios
const templates = api.PRESET_SCENARIO_TEMPLATES
const uncLevels: UncertaintyLevel[] = ['very_low', 'low', 'medium', 'high', 'very_high']

const newName = ref('')
const newTemplate = ref('')
const currentId = ref<string | null>(null)
const current = computed(() => scenarios.value.find(s => s.id === currentId.value) ?? null)

const newDriver = ref('')
const newFactor = ref('')
const narrative = ref('')
const matrix = ref<ScenarioComparisonMatrix | null>(null)

const totalDrivers = computed(() => scenarios.value.reduce((s, sc) => s + sc.drivers.length, 0))
const avgScore = computed(() => {
  const scored = scenarios.value.filter(s => s.impactAssessment.overallScore > 0)
  if (scored.length === 0) return '—'
  const avg = scored.reduce((s, sc) => s + sc.impactAssessment.overallScore, 0) / scored.length
  return (Math.round(avg * 10) / 10).toFixed(1)
})

function typeIcon(t: ScenarioType) {
  const m: Record<ScenarioType, string> = {
    best_case: '🌟', worst_case: '🌧️', most_likely: '📊', wild_card: '🦢', trend: '📈', custom: '✏️',
  }
  return m[t] ?? '✏️'
}
function uncLabel(u: UncertaintyLevel) {
  const m: Record<UncertaintyLevel, string> = { very_low: '极低', low: '低', medium: '中', high: '高', very_high: '极高' }
  return m[u]
}
function uncColor(u: UncertaintyLevel) {
  const m: Record<UncertaintyLevel, string> = { very_low: '#8a9a7a', low: '#6b9fc4', medium: '#f0c040', high: '#e0a96d', very_high: '#c46a5a' }
  return m[u]
}

function createScenario() {
  const name = newName.value.trim()
  if (!name) return
  let s: ScenarioPlan | null
  if (newTemplate.value) {
    s = api.createFromTemplate(newTemplate.value, name)
  } else {
    s = api.createScenario(name)
  }
  if (s) {
    scenarios.value.push(s)
    store.saveScenarios()
    currentId.value = s.id
    newName.value = ''
    newTemplate.value = ''
  }
}

function selectScenario(id: string) {
  currentId.value = id
  narrative.value = ''
}

function addDriver() {
  const s = current.value
  if (!s || !newDriver.value.trim()) return
  api.addDriver(s, newDriver.value.trim())
  store.saveScenarios()
  newDriver.value = ''
}

function removeDriver(id: string) {
  const s = current.value
  if (!s) return
  api.removeDriver(s, id)
  store.saveScenarios()
}

function setDriverUnc(id: string, v: string) {
  const s = current.value
  const d = s?.drivers.find(x => x.id === id)
  if (d) {
    d.uncertainty = v as UncertaintyLevel
    store.saveScenarios()
  }
}

function setDriverImpact(id: string, v: number) {
  const s = current.value
  const d = s?.drivers.find(x => x.id === id)
  if (d) {
    d.impact = v
    store.saveScenarios()
  }
}

function addFactor() {
  const s = current.value
  if (!s || !newFactor.value.trim()) return
  api.addFactor(s, newFactor.value.trim())
  store.saveScenarios()
  newFactor.value = ''
}

function removeFactor(id: string) {
  const s = current.value
  if (!s) return
  api.removeFactor(s, id)
  store.saveScenarios()
}

function setFactorValue(id: string, v: string) {
  const s = current.value
  const f = s?.factors.find(x => x.id === id)
  if (f) {
    f.value = v
    f.trend = v === '有利' ? 'increasing' : v === '不利' ? 'decreasing' : 'stable'
    store.saveScenarios()
  }
}

function removeScenario(id: string) {
  scenarios.value = scenarios.value.filter(s => s.id !== id)
  if (currentId.value === id) currentId.value = null
  store.saveScenarios()
}

function assess() {
  const s = current.value
  if (!s) return
  api.assessImpact(s)
  store.saveScenarios()
}

function narrate() {
  const s = current.value
  if (!s) return
  api.assessImpact(s)
  narrative.value = api.generateNarrative(s)
  store.saveScenarios()
}

function compare() {
  matrix.value = api.compareScenarios(scenarios.value)
  store.saveScenarios()
}

onMounted(() => {
  store.load()
})
</script>

<style scoped>
.scp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.scp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.scp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high, #d8c3a5);
}
.scp-sub {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.scp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.scp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.scp-stat b {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-high, #d8c3a5);
}
.scp-stat span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.scp-stat--hot b {
  color: #f0c040;
}
.scp-block {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(18, 14, 11, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.scp-block-label {
  display: block;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 221, 208, 0.5);
  margin-bottom: 10px;
}
.scp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 16px;
  text-align: center;
}
.scp-empty span {
  font-size: 28px;
}
.scp-empty p {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
}
.scp-create {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.scp-input {
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
.scp-input:focus {
  border-color: rgba(240, 192, 64, 0.4);
}
.scp-input--sm {
  flex: 0 1 auto;
  min-width: 120px;
  padding: 6px 8px;
}
.scp-select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-high, #d8c3a5);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.scp-select--sm {
  padding: 4px 6px;
  font-size: 11px;
}
.scp-btn {
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
.scp-btn--primary {
  background: rgba(240, 192, 64, 0.12);
  border-color: rgba(240, 192, 64, 0.35);
}
.scp-btn--primary:hover {
  background: rgba(240, 192, 64, 0.2);
}
.scp-btn--danger {
  border-color: rgba(196, 106, 90, 0.3);
  color: #c46a5a;
}
.scp-scenario-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.scp-scenario-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(232, 221, 208, 0.6);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.scp-scenario-chip.active {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
  background: rgba(240, 192, 64, 0.1);
}
.scp-scenario-score {
  font-size: 10px;
  opacity: 0.7;
  margin-left: 4px;
}
.scp-scenario-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.scp-scenario-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-high, #d8c3a5);
}
.scp-scenario-actions {
  display: flex;
  gap: 6px;
}
.scp-scenario-desc {
  margin: 6px 0 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.45);
}
.scp-sub-block {
  margin-top: 12px;
}
.scp-sub-label {
  display: block;
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(232, 221, 208, 0.45);
  margin-bottom: 8px;
}
.scp-drivers,
.scp-factors {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scp-driver {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.scp-driver-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.scp-driver-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-high, #d8c3a5);
}
.scp-driver-unc {
  font-size: 10px;
}
.scp-driver-del,
.scp-factor-del {
  font-size: 12px;
  cursor: pointer;
  color: rgba(232, 221, 208, 0.35);
  padding: 0 4px;
}
.scp-driver-del:hover,
.scp-factor-del:hover {
  color: #c46a5a;
}
.scp-driver-controls {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.scp-driver-control {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.scp-range {
  width: 80px;
  accent-color: #f0c040;
}
.scp-factor {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.scp-factor-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-high, #d8c3a5);
}
.scp-factor-prob {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.45);
}
.scp-add-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.scp-impact {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(240, 192, 64, 0.05);
  border: 1px solid rgba(240, 192, 64, 0.15);
}
.scp-impact-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.scp-impact-score {
  font-size: 26px;
  font-weight: 700;
  color: #f0c040;
}
.scp-impact-score small {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.4);
}
.scp-impact-label {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}
.scp-impact-dims {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 10px;
}
.scp-impact-dim {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.scp-impact-dim span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.scp-impact-dim b {
  font-size: 16px;
  font-weight: 600;
}
.scp-narrative {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.08);
}
.scp-narrative-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #8a9a7a;
  margin-bottom: 6px;
}
.scp-narrative-text {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.7);
  line-height: 1.7;
}
.scp-matrix {
  margin-top: 10px;
}
.scp-matrix-rec {
  margin: 0 0 10px;
  font-size: 12px;
  color: #f0c040;
}
.scp-matrix-table {
  overflow-x: auto;
}
.scp-matrix-row {
  display: grid;
  grid-template-columns: 1.4fr repeat(5, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}
.scp-matrix-row--head .scp-matrix-cell {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.scp-matrix-cell {
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 11px;
  color: rgba(232, 221, 208, 0.7);
  text-align: center;
}
.scp-matrix-cell--name {
  text-align: left;
  color: var(--text-high, #d8c3a5);
}
</style>
