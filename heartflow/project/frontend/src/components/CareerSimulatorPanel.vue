<template>
  <section class="csp">
    <div class="csp-head">
      <div class="csp-title-wrap">
        <span class="csp-title">🎲 职业模拟器</span>
        <span class="csp-sub">在行动之前，先看一步棋的路况与岔口</span>
      </div>
      <span v-if="activePresetName" class="csp-tag">{{ activePresetName }}</span>
    </div>

    <!-- 场景选择 -->
    <div class="csp-scenarios">
      <button
        v-for="p in presets"
        :key="p.id"
        class="csp-scenario"
        :class="{ active: activeScenarioId === p.id }"
        :style="{ '--scn-color': scenarioColor(p.type) }"
        @click="runPreset(p)"
      >
        <span class="csp-scn-icon">{{ scenarioIcon(p.type) }}</span>
        <div class="csp-scn-body">
          <b class="csp-scn-name">{{ p.name }}</b>
          <span class="csp-scn-desc">{{ p.description }}</span>
          <em class="csp-scn-type">{{ scenarioLabel(p.type) }}</em>
        </div>
      </button>
    </div>
    <p class="csp-hint">点击场景，基于当前技能与人脉模拟决策路径</p>

    <!-- 结果 -->
    <template v-if="result">
      <!-- 总分 + 综合评分 -->
      <div class="csp-result-head">
        <div class="csp-score" :style="{ background: scoreRing }">
          <b>{{ result.overallScore }}</b>
          <span>综合评分</span>
        </div>
        <div class="csp-ev">
          <span class="csp-ev-label">期望值</span>
          <b>{{ result.expectedValue }}</b>
          <span v-if="scenarioMeta" class="csp-ev-type">{{ scenarioMeta.icon }} {{ scenarioMeta.label }}路径</span>
        </div>
      </div>

      <!-- 建议 -->
      <div class="csp-reco">
        <span class="csp-reco-label">💡 建议</span>
        <p>{{ result.recommendation }}</p>
      </div>

      <!-- 决策路径 -->
      <div v-if="result.decisionPath.length" class="csp-block">
        <span class="csp-block-label">决策路径</span>
        <div class="csp-path">
          <div v-for="(step, i) in result.decisionPath" :key="step.nodeId" class="csp-path-step">
            <div class="csp-path-head">
              <span class="csp-path-idx">{{ i + 1 }}</span>
              <b>{{ step.title }}</b>
              <span class="csp-cum">累计 {{ step.cumulativeScore }}</span>
            </div>
            <p class="csp-path-outcome">{{ step.chosenOutcome.description }}
              <span v-if="step.chosenOutcome.isOptimal" class="csp-badge-is-best">最优</span>
              <span v-if="step.chosenOutcome.isWorst" class="csp-badge-is-worst">最差</span>
            </p>
            <div class="csp-path-meta">
              <span>概率 {{ pct(step.chosenOutcome.probability) }}</span>
              <span>收入 {{ signed(step.chosenOutcome.incomeImpact) }}%</span>
              <span>满意度 {{ step.chosenOutcome.satisfactionImpact }}</span>
              <span>人脉 {{ signed(step.chosenOutcome.networkGrowth * 100) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 技能变化 -->
      <div v-if="result.skillChanges.length" class="csp-block">
        <span class="csp-block-label">技能变化</span>
        <div class="csp-skills">
          <div v-for="sc in result.skillChanges" :key="sc.skillName" class="csp-skill">
            <span class="csp-skill-name">{{ sc.skillName }}</span>
            <div class="csp-skill-bar">
              <i :style="{ width: pct(sc.before / 100) }" class="is-before"></i>
              <i :style="{ width: pct(sc.after / 100) }" class="is-after"></i>
            </div>
            <span class="csp-skill-delta">{{ signed(sc.delta) }}</span>
          </div>
        </div>
        <div class="csp-skill-hint"><i class="is-before"></i>初始<i class="is-after"></i>模拟后</div>
      </div>

      <!-- 风险评估 -->
      <div v-if="result.riskAssessment" class="csp-block">
        <span class="csp-block-label">风险评估</span>
        <div class="csp-risk-head">
          <span class="csp-risk-overall">总体风险
            <b :style="{ color: riskColor(result.riskAssessment.overallRisk) }">{{ result.riskAssessment.overallRisk }} / 5</b>
          </span>
        </div>
        <div class="csp-risks">
          <div class="csp-risk-row">
            <span>财务</span><i :style="{ width: riskPct(result.riskAssessment.financialRisk) }"></i>
          </div>
          <div class="csp-risk-row">
            <span>职业</span><i :style="{ width: riskPct(result.riskAssessment.careerRisk) }"></i>
          </div>
          <div class="csp-risk-row">
            <span>技能</span><i :style="{ width: riskPct(result.riskAssessment.skillRisk) }"></i>
          </div>
          <div class="csp-risk-row">
            <span>人脉</span><i :style="{ width: riskPct(result.riskAssessment.networkRisk) }"></i>
          </div>
        </div>
        <div v-for="f in result.riskAssessment.factors" :key="f.name" class="csp-factor">
          <div class="csp-factor-head">
            <b>{{ f.name }}</b>
            <span class="csp-factor-sev" :style="{ color: riskColor(f.severity) }">{{ '★'.repeat(f.severity) }}</span>
          </div>
          <ul class="csp-factor-mit">
            <li v-for="m in f.mitigations" :key="m">{{ m }}</li>
          </ul>
        </div>
      </div>

      <!-- 备选方案 -->
      <div v-if="result.alternatives.length" class="csp-block">
        <span class="csp-block-label">备选方案对比</span>
        <div class="csp-alts">
          <div v-for="alt in result.alternatives" :key="alt.name" class="csp-alt">
            <div class="csp-alt-head">
              <b>{{ alt.name }}</b>
              <span class="csp-alt-ev">期望 {{ alt.expectedValue }}</span>
            </div>
            <p>{{ alt.description }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- 未开始 -->
    <div v-else class="csp-empty">
      <span class="csp-empty-icon">🎬</span>
      <p>选择一个场景开始模拟，据此预演你的职业选择</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useCareerSimulator,
  SCENARIO_TYPE_META,
} from '../modules/career/career-simulator'
import type { CareerContact, CareerConnection } from '../modules/career/career'
import type { Contact as SimContact, CareerConnection as SimConn } from '../modules/career/types'
import type { SkillNode, CareerMilestone } from '../modules/career/skill-map'

const props = defineProps<{
  skills: SkillNode[]
  contacts: CareerContact[]
  connections: CareerConnection[]
  milestones: CareerMilestone[]
}>()

const sim = useCareerSimulator()

// 组合式函数返回对象内的 ref 不会自动解包
const result = computed(() => sim.result.value)

const presets = sim.getPresetScenarios()
const activeScenarioId = ref<string | null>(null)
const activePresetName = ref<string | null>(null)

// createFromPreset 会生成随机的 scenario id，无法据 result.scenarioId 反推类型，
// 故在点击预设时直接记录所选场景类型
const activeType = ref<string>('promotion')

const scenarioMeta = computed(() => SCENARIO_TYPE_META[activeType.value as keyof typeof SCENARIO_TYPE_META] ?? null)

function scenarioLabel(type: string) {
  return SCENARIO_TYPE_META[type as keyof typeof SCENARIO_TYPE_META]?.label ?? type
}
function scenarioIcon(type: string) {
  return SCENARIO_TYPE_META[type as keyof typeof SCENARIO_TYPE_META]?.icon ?? '🎯'
}
function scenarioColor(type: string) {
  return SCENARIO_TYPE_META[type as keyof typeof SCENARIO_TYPE_META]?.color ?? '#8a9a7a'
}

// 视图层 CareerContact(CareerConnection) 与 types.ts Contact 结构不完全相同，
// 但模拟器只读取 id/tier/nodeType 等重叠字段，故做安全转换
function toSimContacts(): SimContact[] {
  return props.contacts as unknown as SimContact[]
}
function toSimConns(): SimConn[] {
  return props.connections as unknown as SimConn[]
}

function runPreset(p: { id: string; name: string; type: string }) {
  const scenario = sim.createFromPreset(
    p.id,
    props.skills,
    toSimContacts(),
    toSimConns(),
    props.milestones,
  )
  if (scenario) {
    activeScenarioId.value = p.id
    activePresetName.value = p.name
    activeType.value = p.type
    sim.quickSimulate(scenario)
  }
}

function pct(v: number) {
  return Math.round(v * 100) + '%'
}
function signed(v: number) {
  return (v > 0 ? '+' : '') + v
}
function riskPct(v: number) {
  return Math.round((Math.min(v, 5) / 5) * 100) + '%'
}
function riskColor(v: number) {
  if (v >= 4) return '#c46a5a'
  if (v >= 3) return '#d89a5a'
  return '#8a9a7a'
}

const scoreRing = computed(() => {
  const s = result.value?.overallScore || 0
  const hue = s >= 80 ? 150 : s >= 60 ? 130 : s >= 40 ? 38 : 22
  return `conic-gradient(hsl(${hue} 50% 55%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})
</script>

<style scoped>
.csp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.csp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.csp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.csp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.csp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.csp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; white-space: nowrap; }

.csp-scenarios { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.csp-scenario { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: 12px; border: 1px solid var(--border, rgba(255,255,255,0.08)); background: rgba(255,255,255,0.02); color: inherit; text-align: left; cursor: pointer; transition: all 0.25s ease; font-family: inherit; }
.csp-scenario:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.16); transform: translateY(-2px); }
.csp-scenario.active { border-color: var(--scn-color, #8a9a7a); background: rgba(var(--accent-rgb), 0.1); }
.csp-scn-icon { font-size: 20px; flex-shrink: 0; }
.csp-scn-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.csp-scn-name { font-size: 13px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.csp-scn-desc { font-size: 10px; color: rgba(232, 221, 208, 0.5); line-height: 1.5; }
.csp-scn-type { font-size: 9px; color: var(--scn-color, #8a9a7a); font-style: normal; }

.csp-hint { font-size: 10px; color: rgba(232, 221, 208, 0.35); margin: 10px 0 0; }

.csp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 0; text-align: center; }
.csp-empty-icon { font-size: 30px; opacity: 0.5; }
.csp-empty p { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.csp-result-head { display: flex; align-items: center; gap: 20px; padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.03); margin-bottom: 12px; }
.csp-score { width: 84px; height: 84px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.csp-score::before { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: rgba(18,14,11,0.9); }
.csp-score b { position: relative; font-size: 22px; font-weight: 500; color: #ecd6b5; }
.csp-score span { position: relative; font-size: 9px; color: rgba(232,221,208,0.5); }
.csp-ev { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
.csp-ev-label { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.csp-ev b { font-size: 22px; font-weight: 500; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.csp-ev-type { font-size: 11px; color: rgba(232, 221, 208, 0.6); }

.csp-reco { padding: 12px 14px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.08); margin-bottom: 14px; }
.csp-reco-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.7); }
.csp-reco p { font-size: 12px; line-height: 1.65; color: rgba(232, 221, 208, 0.7); margin: 4px 0 0; }

.csp-block { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; padding-top: 14px; border-top: 1px solid rgba(var(--accent-rgb), 0.1); }
.csp-block-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }

.csp-path { display: flex; flex-direction: column; gap: 8px; }
.csp-path-step { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.csp-path-head { display: flex; align-items: center; gap: 8px; }
.csp-path-idx { width: 20px; height: 20px; border-radius: 50%; background: rgba(var(--accent-rgb), 0.14); display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--text-high); flex-shrink: 0; }
.csp-path-head b { font-size: 12px; color: var(--text-high, rgba(232, 224, 216, 0.88)); font-weight: 500; }
.csp-cum { margin-left: auto; font-size: 10px; color: rgba(var(--accent-rgb), 0.75); }
.csp-path-outcome { font-size: 12px; color: rgba(232, 221, 208, 0.65); margin: 6px 0 4px; }
.csp-badge-is-best { font-size: 9px; padding: 1px 6px; border-radius: 6px; background: rgba(138,154,122,0.18); color: #8a9a7a; margin-left: 6px; }
.csp-badge-is-worst { font-size: 9px; padding: 1px 6px; border-radius: 6px; background: rgba(196,106,90,0.16); color: #c46a5a; margin-left: 6px; }
.csp-path-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.csp-skills { display: flex; flex-direction: column; gap: 6px; }
.csp-skill { display: flex; align-items: center; gap: 10px; }
.csp-skill-name { width: 88px; font-size: 11px; color: rgba(232, 221, 208, 0.65); flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.csp-skill-bar { flex: 1; height: 7px; border-radius: 999px; background: rgba(255,255,255,0.05); position: relative; overflow: hidden; }
.csp-skill-bar i { position: absolute; top: 0; left: 0; height: 100%; border-radius: 999px; }
.csp-skill-bar .is-before { background: rgba(216,154,90,0.45); }
.csp-skill-bar .is-after { background: rgba(138,154,122,0.85); }
.csp-skill-delta { width: 32px; text-align: right; font-size: 11px; color: #8ab87a; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.csp-skill-hint { display: flex; align-items: center; gap: 5px; font-size: 9px; color: rgba(232, 221, 208, 0.35); }
.csp-skill-hint i { width: 10px; height: 5px; border-radius: 3px; }
.csp-skill-hint .is-before { background: rgba(216,154,90,0.45); }
.csp-skill-hint .is-after { background: rgba(138,154,122,0.85); }

.csp-risk-head { margin-bottom: 4px; }
.csp-risk-overall { font-size: 12px; color: rgba(232, 221, 208, 0.6); display: flex; align-items: baseline; gap: 8px; }
.csp-risk-overall b { font-size: 15px; font-weight: 600; }
.csp-risks { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.csp-risk-row { display: flex; align-items: center; gap: 10px; }
.csp-risk-row span { width: 34px; font-size: 10px; color: rgba(232, 221, 208, 0.55); flex-shrink: 0; }
.csp-risk-row i { height: 6px; border-radius: 999px; background: linear-gradient(90deg, #8a9a7a, #c46a5a); }
.csp-factor { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.csp-factor + .csp-factor { margin-top: 8px; }
.csp-factor-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.csp-factor-head b { font-size: 12px; color: var(--text-high, rgba(232, 224, 216, 0.88)); font-weight: 500; }
.csp-factor-sev { font-size: 10px; letter-spacing: 2px; }
.csp-factor-mit { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; }
.csp-factor-mit li { font-size: 11px; color: rgba(232, 221, 208, 0.55); }

.csp-alts { display: flex; flex-direction: column; gap: 8px; }
.csp-alt { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.csp-alt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.csp-alt-head b { font-size: 12px; color: var(--text-high, rgba(232, 224, 216, 0.88)); font-weight: 500; }
.csp-alt-ev { font-size: 10px; color: rgba(var(--accent-rgb), 0.75); }
.csp-alt p { font-size: 11px; color: rgba(232, 221, 208, 0.55); margin: 0; line-height: 1.5; }

@media (max-width: 640px) {
  .csp-scenarios { grid-template-columns: 1fr; }
  .csp { padding: 14px 14px; }
}
</style>