<template>
  <section class="cp">
    <div class="cp-head">
      <span class="cp-title">🧬 体质画像</span>
      <span class="cp-sub">知源中医「体质辨识问卷和雷达图」借鉴</span>
    </div>

    <!-- ===== 问卷模式 ===== -->
    <template v-if="!analysis">
      <p class="cp-hint">
        九种体质 5 分量表问卷 · 共 {{ totalQuestions }} 题。如实作答，生成你的体质画像——只作自我观察，不作诊断。
      </p>
      <div v-for="group in groupedQuestions" :key="group.type" class="cp-group">
        <div class="cp-group-head">
          <span class="cp-group-icon">{{ group.icon }}</span>
          <span class="cp-group-label">{{ group.label }}</span>
          <span class="cp-group-count">{{ group.done }}/{{ group.questions.length }}</span>
        </div>
        <div v-for="q in group.questions" :key="q.id" class="cp-q">
          <span class="cp-q-text">{{ q.question }}</span>
          <div class="cp-q-options">
            <button
              v-for="opt in scaleOptions"
              :key="opt.value"
              type="button"
              class="cp-opt"
              :class="{ on: answers[q.id] === opt.value }"
              @click="answers[q.id] = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>
      </div>
      <div class="cp-progress">
        <div class="cp-progress-bar">
          <div class="cp-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <span class="cp-progress-text">已完成 {{ answeredCount }} / {{ totalQuestions }}</span>
      </div>
      <button class="cp-submit" :disabled="answeredCount < totalQuestions" @click="submit">
        {{ answeredCount < totalQuestions ? '完成全部题目后生成' : '生成体质画像' }}
      </button>
    </template>

    <!-- ===== 结果模式 ===== -->
    <template v-else>
      <div class="cp-result">
        <div class="cp-radar-wrap">
          <svg class="cp-radar" viewBox="0 0 300 300" role="img" aria-label="九种体质雷达图">
            <g v-for="ring in [25, 50, 75, 100]" :key="ring">
              <polygon
                :points="ringPolygon(ring)"
                fill="none"
                stroke="rgba(var(--accent-rgb), 0.08)"
                stroke-width="0.6"
              />
            </g>
            <line
              v-for="(_, i) in radar"
              :key="'spoke-' + i"
              :x1="150" :y1="150"
              :x2="point(i, 100)[0]" :y2="point(i, 100)[1]"
              stroke="rgba(var(--accent-rgb), 0.06)"
              stroke-width="0.6"
            />
            <polygon
              :points="dataPolygon"
              fill="rgba(var(--accent-rgb), 0.12)"
              stroke="rgba(var(--accent-rgb), 0.45)"
              stroke-width="1.2"
              stroke-linejoin="round"
            />
            <circle
              v-for="(p, i) in radar"
              :key="'dot-' + i"
              :cx="point(i, p.score)[0]" :cy="point(i, p.score)[1]"
              :r="p.isPrimary ? 4 : 2.5"
              :fill="p.isPrimary ? 'var(--accent)' : 'rgba(var(--accent-rgb), 0.5)'"
            />
            <text
              v-for="(p, i) in radar"
              :key="'label-' + i"
              :x="point(i, 122)[0]" :y="point(i, 122)[1]"
              text-anchor="middle" dominant-baseline="central"
              class="cp-radar-label"
              :class="{ primary: p.isPrimary }"
            >{{ p.label }}</text>
          </svg>
        </div>

        <div class="cp-primary">
          <span class="cp-primary-kicker">主体质</span>
          <span class="cp-primary-name">{{ portrait?.primaryLabel }}</span>
          <span class="cp-primary-score">{{ portrait?.primaryScore }}<small> 分</small></span>
          <span class="cp-balance" :class="`cp-balance--${balanceClass}`">{{ portrait?.balanceDegree }}</span>
        </div>
      </div>

      <!-- 偏颇倾向 -->
      <div v-if="portrait?.topTendencies.length" class="cp-tendencies">
        <h4 class="cp-subtitle">偏颇倾向</h4>
        <div v-for="t in portrait?.topTendencies" :key="t.type" class="cp-tendency">
          <span class="cp-tendency-label">{{ CONSTITUTION_META[t.type].label }}</span>
          <div class="cp-tendency-bar">
            <div class="cp-tendency-fill" :style="{ width: t.score + '%' }"></div>
          </div>
          <span class="cp-tendency-score">{{ t.score }}</span>
        </div>
      </div>

      <!-- 特征 -->
      <div class="cp-block">
        <h4 class="cp-subtitle">体质特征</h4>
        <ul class="cp-list">
          <li v-for="(c, i) in analysis.characteristics" :key="i">{{ c }}</li>
        </ul>
      </div>

      <!-- 调理建议 -->
      <div class="cp-block">
        <h4 class="cp-subtitle">调理建议</h4>
        <ul class="cp-list">
          <li v-for="(r, i) in portrait?.advice" :key="i">{{ r }}</li>
        </ul>
      </div>

      <!-- 五运六气 -->
      <details class="cp-block">
        <summary class="cp-subtitle cp-summary">☯ 五运六气</summary>
        <div class="cp-wuxing">
          <div class="cp-wx-row"><span class="cp-wx-key">年份</span><span>{{ fiveSix.heavenlyStem }} {{ fiveSix.earthlyBranch }} 年 · 大运属{{ elementLabel(fiveSix.greatMovement) }}</span></div>
          <div class="cp-wx-row"><span class="cp-wx-key">司天</span><span>{{ fiveSix.celestialManager }}</span></div>
          <div class="cp-wx-row"><span class="cp-wx-key">在泉</span><span>{{ fiveSix.terrestrialSpring }}</span></div>
          <div class="cp-wx-row"><span class="cp-wx-key">主气</span><span>{{ fiveSix.hostQi }}</span></div>
          <div class="cp-wx-row"><span class="cp-wx-key">客气</span><span>{{ fiveSix.guestQi }}</span></div>
          <div class="cp-wx-row"><span class="cp-wx-key">节气</span><span>{{ fiveSix.currentTerm }}</span></div>
        </div>
      </details>

      <div class="cp-actions">
        <button class="cp-restart" @click="restart">重新测评</button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useConstitutionAnalyzer,
  analyzeConstitutionScale,
  CONSTITUTION_SCALE_QUESTIONS,
  CONSTITUTION_SCALE_OPTIONS,
  constitutionRadarData,
  constitutionPortrait,
} from '../modules/body-wisdom/constitution'
import type { ConstitutionType, FiveElement } from '../modules/body-wisdom/types'
import { CONSTITUTION_META } from '../modules/body-wisdom/types'
import { getConstitutionTrendStore } from '../modules/body-wisdom/constitution-trend'

const analyzer = useConstitutionAnalyzer()
const analysis = analyzer.analysis

const totalQuestions = CONSTITUTION_SCALE_QUESTIONS.length
const scaleOptions = CONSTITUTION_SCALE_OPTIONS

const answers = ref<Record<string, number>>({})
const answeredCount = computed(() => Object.keys(answers.value).length)
const progressPct = computed(() => Math.round((answeredCount.value / totalQuestions) * 100))

const GROUP_ORDER: ConstitutionType[] = [
  'balanced', 'qi-deficiency', 'yang-deficiency', 'yin-deficiency',
  'phlegm-dampness', 'damp-heat', 'blood-stasis', 'qi-stagnation', 'allergic',
]

const GROUP_ICONS: Record<ConstitutionType, string> = {
  balanced: '☯', 'qi-deficiency': '🌾', 'yang-deficiency': '❄',
  'yin-deficiency': '🌙', 'phlegm-dampness': '💧', 'damp-heat': '🔥',
  'blood-stasis': '🩸', 'qi-stagnation': '🌫', allergic: '🌸',
}

const groupedQuestions = computed(() =>
  GROUP_ORDER.map(type => {
    const questions = CONSTITUTION_SCALE_QUESTIONS.filter(q => q.type === type)
    return {
      type,
      label: CONSTITUTION_META[type].label,
      icon: GROUP_ICONS[type],
      questions,
      done: questions.filter(q => answers.value[q.id] !== undefined).length,
    }
  }),
)

const radar = computed(() => (analysis.value ? constitutionRadarData(analysis.value) : []))
const portrait = computed(() => (analysis.value ? constitutionPortrait(analysis.value) : null))
const fiveSix = computed(() => analyzer.calculateFiveMovementsSixQi())

const balanceClass = computed(() => {
  const d = portrait.value?.balanceDegree
  if (d === '平和') return 'ping'
  if (d === '轻度偏颇') return 'light'
  if (d === '中度偏颇') return 'mid'
  return 'heavy'
})

const ELEMENT_LABELS: Record<FiveElement, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
}
function elementLabel(e: FiveElement): string {
  return ELEMENT_LABELS[e] ?? e
}

// ---- 雷达图几何 ----
function point(i: number, value: number): [number, number] {
  const rad = ((-90 + i * 40) * Math.PI) / 180
  const r = 110 * (value / 100)
  return [150 + r * Math.cos(rad), 150 + r * Math.sin(rad)]
}
function ringPolygon(ring: number): string {
  return radar.value.map((_, i) => point(i, ring).join(',')).join(' ')
}
const dataPolygon = computed(() =>
  radar.value.map((p, i) => point(i, p.score).join(',')).join(' '),
)

async function submit(): Promise<void> {
  const list = CONSTITUTION_SCALE_QUESTIONS.map(q => answers.value[q.id] ?? 0)
  const result = analyzeConstitutionScale(list)
  await analyzer.saveAnalysis(result)
  // 自动记录到体质趋势（多次测评纵向对比）
  getConstitutionTrendStore().addTrendPoint(result)
}

async function restart(): Promise<void> {
  answers.value = {}
  await analyzer.clearAnalysis()
}
</script>

<style scoped>
.cp {
  margin-bottom: 56px;
  position: relative;
  z-index: 1;
}

.cp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.cp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  letter-spacing: 0.5px;
}
.cp-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.cp-hint {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin: 0 0 18px;
}

/* ---- 问卷 ---- */
.cp-group {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
}
.cp-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--border-color);
}
.cp-group-icon { font-size: 14px; }
.cp-group-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.cp-group-count {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.cp-q {
  padding: 8px 0;
}
.cp-q-text {
  display: block;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.cp-q-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cp-opt {
  flex: 1;
  min-width: 44px;
  padding: 5px 4px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}
.cp-opt:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}
.cp-opt.on {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.35);
  color: var(--accent);
  font-weight: 500;
}

.cp-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0 16px;
}
.cp-progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.cp-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.4), var(--accent));
  transition: width var(--transition);
}
.cp-progress-text {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cp-submit {
  width: 100%;
  padding: 12px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  cursor: pointer;
  transition: all var(--transition);
}
.cp-submit:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: rgba(var(--accent-rgb), 0.45);
}
.cp-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ---- 结果 ---- */
.cp-result {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.cp-radar-wrap {
  flex: 1;
  min-width: 220px;
  display: flex;
  justify-content: center;
}
.cp-radar {
  width: 260px;
  height: 260px;
  max-width: 100%;
}
.cp-radar-label {
  font-size: 9px;
  fill: rgba(var(--text-primary-rgb), 0.5);
}
.cp-radar-label.primary {
  fill: var(--accent);
  font-weight: 600;
}

.cp-primary {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 14px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.5), rgba(26, 22, 18, 0.7));
  border: 1px solid var(--border-color);
  text-align: center;
}
.cp-primary-kicker {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 2px;
}
.cp-primary-name {
  font-size: 22px;
  font-weight: 600;
  color: var(--accent);
  font-family: var(--font-heading-zh);
}
.cp-primary-score {
  font-size: 26px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.cp-primary-score small {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.6;
}
.cp-balance {
  font-size: 11px;
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid;
}
.cp-balance--ping { background: rgba(95, 217, 154, 0.12); color: #5fd99a; border-color: rgba(95, 217, 154, 0.3); }
.cp-balance--light { background: rgba(212, 180, 100, 0.12); color: #d4b464; border-color: rgba(212, 180, 100, 0.3); }
.cp-balance--mid { background: rgba(240, 160, 80, 0.12); color: #f0a050; border-color: rgba(240, 160, 80, 0.3); }
.cp-balance--heavy { background: rgba(200, 120, 100, 0.12); color: #c87864; border-color: rgba(200, 120, 100, 0.3); }

.cp-tendencies {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
}
.cp-tendency {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
}
.cp-tendency-label {
  width: 56px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-primary);
}
.cp-tendency-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.cp-tendency-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.35), rgba(var(--accent-rgb), 0.8));
  transition: width var(--transition);
}
.cp-tendency-score {
  width: 26px;
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.cp-block {
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
}
.cp-subtitle {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.cp-summary {
  cursor: pointer;
  list-style: none;
  margin-bottom: 0;
}
.cp-summary::-webkit-details-marker { display: none; }
.cp-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cp-list li {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  padding-left: 14px;
  position: relative;
}
.cp-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.5);
}

.cp-wuxing {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.cp-wx-row {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}
.cp-wx-key {
  width: 44px;
  flex-shrink: 0;
  color: var(--text-primary);
  opacity: 0.7;
}

.cp-actions {
  display: flex;
  justify-content: center;
  margin-top: 6px;
}
.cp-restart {
  padding: 9px 22px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}
.cp-restart:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
}

@media (max-width: 640px) {
  .cp-result {
    flex-direction: column;
  }
  .cp-primary {
    width: 100%;
  }
}
</style>
