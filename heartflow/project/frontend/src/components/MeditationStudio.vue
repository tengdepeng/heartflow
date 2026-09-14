<template>
  <div class="med-studio">
    <section class="ms-card ms-hero">
      <header class="ms-head">
        <span class="ms-title">🧘 冥想工坊</span>
        <span class="ms-sub">引导冥想 · 释怀仪式 · 澄明仪表（本地播放，无碍打扰）</span>
        <div class="ms-clarity" v-if="clarity">
          <span class="ms-clarity-icon">{{ clarityIcon }}</span>
          <span class="ms-clarity-label">{{ clarityLabel }}</span>
        </div>
      </header>

      <nav class="ms-tabs">
        <button v-for="t in TABS" :key="t.key"
          :class="['ms-tab', { active: tab === t.key }]"
          @click="switchTab(t.key)">{{ t.icon }} {{ t.label }}</button>
      </nav>
    </section>

    <!-- ── 引导冥想 ── -->
    <section v-if="tab === 'meditate'" class="ms-card">
      <template v-if="!active">
        <div class="ms-filters">
          <div class="ms-fgroup">
            <span class="ms-fglabel">类型</span>
            <button v-for="t in typeOptions" :key="t.key"
              :class="['ms-chip', { active: typeFilter === t.key }]"
              @click="typeFilter = t.key">{{ t.icon }} {{ t.label }}</button>
          </div>
          <div class="ms-fgroup">
            <span class="ms-fglabel">难度</span>
            <button v-for="d in difficultyOptions" :key="d.key"
              :class="['ms-chip', { active: diffFilter === d.key }]"
              @click="diffFilter = d.key">{{ d.label }}</button>
          </div>
        </div>

        <div v-if="filtered.length" class="ms-grid">
          <article v-for="m in filtered" :key="m.id" class="ms-item"
            @click="selectMeditation(m)">
            <div class="ms-item-top">
              <span class="ms-item-icon">{{ MEDITATION_TYPE_META[m.type]?.icon || '🧘' }}</span>
              <span class="ms-item-dur">{{ m.duration }} 分钟</span>
            </div>
            <h4 class="ms-item-title">{{ m.title }}</h4>
            <p class="ms-item-desc">{{ MEDITATION_TYPE_META[m.type]?.label }} · {{ difficultyLabel(m.difficulty) }}</p>
            <div class="ms-item-tags">
              <span v-for="t in m.tags.slice(0, 3)" :key="t" class="ms-tag">{{ t }}</span>
            </div>
            <span class="ms-begin">开始 ▸</span>
          </article>
        </div>
        <p v-else class="ms-empty">没有匹配的引导，换个筛选条件试试。</p>
      </template>

      <template v-else>
        <div class="ms-player">
          <header class="ms-phead">
            <div>
              <h3 class="ms-ptitle">{{ active.title }}</h3>
              <span class="ms-psub">{{ MEDITATION_TYPE_META[active.type]?.label }} · 第 {{ stepIndex + 1 }} / {{ active.steps.length }} 步</span>
            </div>
            <button class="ms-btn-ghost" @click="exitPlayer">退出</button>
          </header>

          <div class="ms-step" v-if="step">
            <span class="ms-step-icon">{{ STEP_PHASE_META[step.phase]?.icon || '🧎' }}</span>
            <span class="ms-step-phase">{{ STEP_PHASE_META[step.phase]?.label || step.phase }}</span>
            <p class="ms-step-text">{{ step.instruction }}</p>
            <div class="ms-countdown">{{ formatTime(secondsLeft) }}</div>
            <div class="ms-progress"><div class="ms-progress-fill" :style="{ width: stepProgress + '%' }"></div></div>
          </div>

          <footer class="ms-pfoot">
            <button class="ms-btn-ghost" @click="prevStep" :disabled="stepIndex === 0">‹ 上一步</button>
            <button class="ms-btn-primary" @click="nextStep">
              {{ isLast ? '完成' : '下一步 ›' }}
            </button>
          </footer>
        </div>
      </template>
    </section>

    <!-- ── 释怀仪式 ── -->
    <section v-if="tab === 'release'" class="ms-card">
      <template v-if="!ritualDetail">
        <p class="ms-lead">把想放下的心事，交托给一场仪式。结束后可记入释怀清单。</p>
        <div class="ms-grid">
          <article v-for="r in rituals" :key="r.id" class="ms-item"
            @click="openRitual(r)">
            <div class="ms-item-top">
              <span class="ms-item-icon">{{ methodIcon(r.method) }}</span>
              <span class="ms-item-dur">{{ r.duration }} 分钟</span>
            </div>
            <h4 class="ms-item-title">{{ r.name }}</h4>
            <p class="ms-item-desc">{{ methodMeta(r) }}</p>
            <div class="ms-item-scen">
              <span v-for="s in r.scenarios.slice(0, 3)" :key="s" class="ms-tag">{{ s }}</span>
            </div>
            <span class="ms-begin">开始 ▸</span>
          </article>
        </div>
      </template>

      <template v-else>
        <div class="ms-ritual-detail">
          <header class="ms-phead">
            <div>
              <h3 class="ms-ptitle">{{ ritualDetail.name }}</h3>
              <span class="ms-psub">{{ methodMeta(ritualDetail) }} · 预计 {{ ritualDetail.duration }} 分钟</span>
            </div>
            <button class="ms-btn-ghost" @click="ritualDetail = null">返回</button>
          </header>

          <div v-if="ritualDetail.preparations.length" class="ms-prep">
            <span class="ms-prep-label">准备</span>
            <div class="ms-prep-tags">
              <span v-for="p in ritualDetail.preparations" :key="p" class="ms-tag">{{ p }}</span>
            </div>
          </div>

          <ol class="ms-steps">
            <li v-for="(s, i) in ritualDetail.steps" :key="i" class="ms-step-item">
              <button class="ms-check" :class="{ done: checklist[i] }" @click="toggleCheck(i)">
                {{ checklist[i] ? '✓' : i + 1 }}
              </button>
              <span :class="['ms-step-text', { done: checklist[i] }]">{{ s }}</span>
            </li>
          </ol>

          <div class="ms-ritual-actions">
            <button class="ms-btn-primary" :disabled="!allChecked" @click="completeRitual">
              {{ allChecked ? '完成仪式，记入释怀清单' : '按步骤完成后即可提交' }}
            </button>
          </div>
        </div>
      </template>
    </section>

    <!-- ── 澄明仪表 ── -->
    <section v-if="tab === 'clarity'" class="ms-card">
      <div v-if="stats" class="ms-dash">
        <div class="ms-dash-hero">
          <span class="ms-dash-icon">{{ clarityIcon }}</span>
          <div>
            <div class="ms-dash-label">当前澄明 · {{ clarityLabel }}</div>
            <div class="ms-dash-sub">推荐：{{ MEDITATION_TYPE_META[stats.recommendedType]?.label }}</div>
          </div>
        </div>

        <div class="ms-stat-grid">
          <div class="ms-stat"><b>{{ stats.totalMeditationMinutes }}</b><span>总时长(分)</span></div>
          <div class="ms-stat"><b>{{ stats.totalMeditations }}</b><span>总次数</span></div>
          <div class="ms-stat"><b>{{ stats.monthlyMeditations }}</b><span>本月</span></div>
          <div class="ms-stat"><b>{{ stats.streak }}</b><span>连续天数</span></div>
          <div class="ms-stat"><b>{{ stats.bestStreak }}</b><span>最长连续</span></div>
          <div class="ms-stat"><b>{{ stats.releaseCompletionRate }}%</b><span>释怀完成率</span></div>
        </div>

        <div v-if="stats.meditationTypeDistribution.length" class="ms-block">
          <h5 class="ms-block-title">类型分布</h5>
          <div class="ms-bar">
            <div v-for="d in stats.meditationTypeDistribution" :key="d.type"
              class="ms-bar-row">
              <span class="ms-bar-label">{{ MEDITATION_TYPE_META[d.type]?.icon }} {{ MEDITATION_TYPE_META[d.type]?.label }}</span>
              <span class="ms-bar-track"><span class="ms-bar-fill" :style="{ width: typeWidth(d) + '%' }"></span></span>
              <span class="ms-bar-val">{{ d.count }} 次 · {{ d.minutes }} 分</span>
            </div>
          </div>
        </div>

        <div class="ms-block">
          <h5 class="ms-block-title">近 7 日澄明趋势</h5>
          <div class="ms-trend">
            <div v-for="t in lastTrend" :key="t.date" class="ms-trend-day">
              <span class="ms-trend-bar" :style="{ height: trendHeight(t) + '%', background: CLARITY_LEVEL_META[t.level]?.color }"></span>
              <span class="ms-trend-wd">{{ weekday(t.date) }}</span>
            </div>
          </div>
        </div>

        <div class="ms-dash-foot">
          <span>今日冥想建议：{{ MEDITATION_TYPE_META[stats.recommendedType]?.description }}</span>
        </div>
      </div>
      <p v-else class="ms-empty">暂无数据，先完成一场冥想或释怀吧。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useLightPavilion, useGuidedMeditation, useReleaseRituals, useClarityDashboard, STEP_PHASE_META } from '../modules/light'
import { MEDITATION_TYPE_META, RELEASE_METHOD_META, CLARITY_LEVEL_META } from '../modules/light/types'
import type { MeditationType } from '../modules/light/types'
import type { GuidedMeditation, ReleaseRitual, ClarityStats } from '../modules/light'

const TABS = [
  { key: 'meditate', icon: '🧘', label: '引导冥想' },
  { key: 'release', icon: '🕊️', label: '释怀仪式' },
  { key: 'clarity', icon: '💎', label: '澄明仪表' },
] as const
type TabKey = typeof TABS[number]['key']

const pavilion = useLightPavilion()
const guided = useGuidedMeditation()
const ritualsSet = useReleaseRituals()
const dash = useClarityDashboard()

const tab = ref<TabKey>('meditate')
function switchTab(k: TabKey) {
  if (k !== 'meditate') exitPlayer()
  ritualDetail.value = null
  tab.value = k
}

const typeOptions = [{ key: '__all__', icon: '☀️', label: '全部' },
  ...(Object.entries(MEDITATION_TYPE_META) as [MeditationType, { label: string; icon: string }][]).map(([key, v]) => ({ key, icon: v.icon, label: v.label }))]
const difficultyOptions = [
  { key: '__all__', label: '全部' },
  { key: 'beginner', label: '🌱 初学者' },
  { key: 'intermediate', label: '🌿 进阶' },
  { key: 'advanced', label: '🌳 深入' },
]
const typeFilter = ref('__all__')
const diffFilter = ref('__all__')

const meditations = computed(() => guided.getGuidedMeditations())
const filtered = computed(() => meditations.value.filter(m =>
  (typeFilter.value === '__all__' || m.type === typeFilter.value) &&
  (diffFilter.value === '__all__' || m.difficulty === diffFilter.value)))

function difficultyLabel(d: string) {
  const map: Record<string, string> = { beginner: '初学者', intermediate: '进阶', advanced: '深入' }
  return map[d] || d
}

// ---- 播放器 ----
const active = ref<GuidedMeditation | null>(null)
const stepIndex = ref(0)
const secondsLeft = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const step = computed(() => active.value?.steps[stepIndex.value])
const isLast = computed(() => !!active.value && stepIndex.value >= active.value.steps.length - 1)
const stepProgress = computed(() => {
  if (!step.value) return 0
  return Math.round(((step.value.durationSeconds - secondsLeft.value) / step.value.durationSeconds) * 100)
})

function selectMeditation(m: GuidedMeditation) {
  active.value = m
  stepIndex.value = 0
  secondsLeft.value = m.steps[0].durationSeconds
  startTimer()
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    if (secondsLeft.value > 0) {
      secondsLeft.value--
      return
    }
    nextStep()
  }, 1000)
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function resetStepTimer(i: number) {
  const s = active.value?.steps[i]
  secondsLeft.value = s ? s.durationSeconds : 0
}

function nextStep() {
  if (!active.value) return
  if (isLast.value) { completePractice(); return }
  stepIndex.value++
  resetStepTimer(stepIndex.value)
}

function prevStep() {
  if (stepIndex.value > 0) {
    stepIndex.value--
    resetStepTimer(stepIndex.value)
  }
}

function exitPlayer() {
  stopTimer()
  active.value = null
}

function completePractice() {
  if (!active.value) return
  stopTimer()
  pavilion.recordMeditation(active.value.type, active.value.duration, '纷扰', '宁静')
  lastCompleted.value = active.value
  active.value = null
}

const lastCompleted = ref<GuidedMeditation | null>(null)

function formatTime(s: number) {
  const m = Math.floor(s / 60); const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
watch(lastCompleted, c => {
  if (c) {
    setTimeout(() => { lastCompleted.value = null }, 4000)
  }
}, { immediate: true })

onUnmounted(stopTimer)

// ---- 释怀仪式 ----
const ritualDetail = ref<ReleaseRitual | null>(null)
const checklist = ref<boolean[]>([])
const rituals = computed(() => ritualsSet.getRituals())

function methodMeta(r: ReleaseRitual) {
  const meta = RELEASE_METHOD_META[r.method]
  return meta ? `${meta.label} · ${meta.ritual}` : r.method
}
function methodIcon(m: string) { return RELEASE_METHOD_META[m]?.icon || '🕊️' }

function openRitual(r: ReleaseRitual) {
  ritualDetail.value = r
  checklist.value = r.steps.map(() => false)
}
function toggleCheck(i: number) { checklist.value[i] = !checklist.value[i] }
const allChecked = computed(() => checklist.value.length > 0 && checklist.value.every(Boolean))

function completeRitual() {
  if (!ritualDetail.value) return
  pavilion.release(ritualDetail.value.name, ritualDetail.value.method, '释怀')
  ritualDetail.value = null
}

// ---- 澄明仪表 ----
const clarity = computed(() => pavilion.lightState.value)
const clarityLabel = computed(() => CLARITY_LEVEL_META[clarity.value?.clarity]?.label || '平和')
const clarityIcon = computed(() => CLARITY_LEVEL_META[clarity.value?.clarity]?.icon || '🌤️')

const stats = computed<ClarityStats | null>(() => {
  if (!pavilion.meditations.value.length && !pavilion.releases.value.length) return null
  return dash.computeClarityStats(pavilion.meditations.value, pavilion.releases.value, pavilion.lightState.value)
})

const typeWidth = (d: { count: number; minutes: number }) => {
  if (!stats.value?.meditationTypeDistribution?.length) return 0
  const max = Math.max(...stats.value.meditationTypeDistribution.map(x => x.count))
  return max > 0 ? (d.count / max) * 100 : 0
}
const lastTrend = computed(() => stats.value?.clarityTrend?.slice(-7) || [])
const trendHeight = (t: { score: number }) => Math.max(8, Math.min(100, (t.score / 90) * 100))
function weekday(d: string) { return ['日', '一', '二', '三', '四', '五', '六'][new Date(d).getDay()] }
</script>

<style scoped>
.med-studio { display: flex; flex-direction: column; gap: 14px; }
.ms-card { background: rgba(20, 26, 40, 0.62); border: 1px solid rgba(140, 160, 200, 0.16); border-radius: 16px; padding: 18px; }
.ms-card + .ms-card { margin-top: 2px; }

.ms-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.ms-title { font-size: 17px; font-weight: 700; color: #e8ecf6; letter-spacing: 1px; }
.ms-sub { font-size: 12px; color: #8a94ad; }
.ms-clarity { margin-left: auto; display: flex; align-items: center; gap: 6px; background: rgba(120, 140, 200, 0.14); padding: 5px 12px; border-radius: 999px; font-size: 13px; color: #cfd8ef; }
.ms-clarity-icon { font-size: 15px; }
.ms-clarity-label { font-weight: 600; }

.ms-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.ms-tab { padding: 7px 16px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.18); background: transparent; color: #aab4cd; font-size: 13px; cursor: pointer; transition: all .18s; }
.ms-tab:hover { background: rgba(120, 140, 200, 0.12); }
.ms-tab.active { background: linear-gradient(135deg, #5b7bd8, #7c5cd8); color: #fff; border-color: transparent; }

.ms-filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.ms-fgroup { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ms-fglabel { font-size: 12px; color: #7c86a0; width: 34px; flex: none; }
.ms-chip { padding: 4px 11px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.18); background: transparent; color: #aab4cd; font-size: 12px; cursor: pointer; transition: all .15s; }
.ms-chip:hover { background: rgba(120, 140, 200, 0.1); }
.ms-chip.active { background: rgba(90, 120, 220, 0.22); border-color: #6b86d8; color: #dbe3f7; }

.ms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.ms-item { background: rgba(30, 38, 58, 0.55); border: 1px solid rgba(150, 170, 210, 0.1); border-radius: 12px; padding: 14px; cursor: pointer; transition: all .18s; display: flex; flex-direction: column; gap: 6px; }
.ms-item:hover { border-color: rgba(120, 150, 230, 0.45); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); }
.ms-item-top { display: flex; align-items: center; justify-content: space-between; }
.ms-item-icon { font-size: 22px; }
.ms-item-dur { font-size: 12px; color: #7fa8d8; background: rgba(80, 120, 200, 0.14); padding: 2px 8px; border-radius: 999px; }
.ms-item-title { margin: 2px 0 0; font-size: 15px; color: #e6ebf6; }
.ms-item-desc { margin: 0; font-size: 12px; color: #8a94ad; }
.ms-item-tags, .ms-item-scen { display: flex; gap: 6px; flex-wrap: wrap; }
.ms-tag { font-size: 11px; color: #93a3c4; background: rgba(120, 140, 200, 0.1); padding: 2px 8px; border-radius: 999px; }
.ms-begin { font-size: 13px; color: #6b86d8; font-weight: 600; margin-top: 4px; }
.ms-empty { color: #7c86a0; font-size: 13px; text-align: center; padding: 24px 0; }

/* player */
.ms-player { display: flex; flex-direction: column; gap: 14px; }
.ms-phead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ms-ptitle { margin: 0; font-size: 17px; color: #e9edf8; }
.ms-psub { font-size: 12px; color: #8a94ad; }
.ms-btn-ghost { padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.2); background: transparent; color: #b6c0d8; font-size: 13px; cursor: pointer; }
.ms-btn-ghost:hover:not(:disabled) { background: rgba(120, 140, 200, 0.12); }
.ms-btn-ghost:disabled { opacity: .4; cursor: not-allowed; }
.ms-btn-primary { padding: 8px 18px; border-radius: 999px; border: none; background: linear-gradient(135deg, #5b7bd8, #7c5cd8); color: #fff; font-size: 13px; cursor: pointer; font-weight: 600; }
.ms-btn-primary:disabled { opacity: .45; cursor: not-allowed; }

.ms-step { text-align: center; padding: 26px 16px; background: rgba(30, 40, 70, 0.5); border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.ms-step-icon { font-size: 34px; }
.ms-step-phase { font-size: 12px; color: #7fa8d8; letter-spacing: 2px; }
.ms-step-text { font-size: 17px; color: #eef1fa; max-width: 480px; line-height: 1.7; }
.ms-countdown { font-size: 30px; font-weight: 300; color: #cfd8ef; font-variant-numeric: tabular-nums; }
.ms-progress { width: 100%; max-width: 380px; height: 6px; border-radius: 999px; background: rgba(120, 140, 200, 0.16); overflow: hidden; }
.ms-progress-fill { height: 100%; background: linear-gradient(90deg, #5b7bd8, #8a6cd8); border-radius: 999px; transition: width .4s linear; }
.ms-pfoot { display: flex; justify-content: space-between; }

/* release */
.ms-lead { margin: 0 0 14px; font-size: 13px; color: #8a94ad; }
.ms-ritual-detail { display: flex; flex-direction: column; gap: 16px; }
.ms-prep { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ms-prep-label { font-size: 12px; color: #7c86a0; }
.ms-prep-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.ms-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.ms-step-item { display: flex; align-items: flex-start; gap: 12px; }
.ms-check { flex: none; width: 26px; height: 26px; border-radius: 50%; border: 1px solid rgba(140, 160, 200, 0.3); background: transparent; color: #9fb0d4; font-size: 13px; cursor: pointer; transition: all .15s; }
.ms-check.done { background: #5b7bd8; border-color: #5b7bd8; color: #fff; }
.ms-step-item .ms-step-text { font-size: 14px; text-align: left; color: #cdd6ec; line-height: 1.6; max-width: none; }
.ms-step-item .ms-step-text.done { color: #7c86a0; text-decoration: line-through; }
.ms-ritual-actions { display: flex; justify-content: flex-end; }

/* dashboard */
.ms-dash { display: flex; flex-direction: column; gap: 16px; }
.ms-dash-hero { display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, rgba(91, 123, 216, 0.18), rgba(124, 92, 216, 0.14)); border: 1px solid rgba(130, 150, 220, 0.2); border-radius: 14px; padding: 14px 18px; }
.ms-dash-icon { font-size: 34px; }
.ms-dash-label { font-size: 16px; font-weight: 700; color: #e9edf8; }
.ms-dash-sub { font-size: 12px; color: #8a94ad; margin-top: 3px; }
.ms-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 10px; }
.ms-stat { background: rgba(30, 38, 58, 0.5); border-radius: 12px; padding: 12px; text-align: center; }
.ms-stat b { display: block; font-size: 20px; color: #e3e8f6; }
.ms-stat span { font-size: 11px; color: #8a94ad; }
.ms-block-title { margin: 0 0 10px; font-size: 13px; color: #9dabc9; font-weight: 600; }
.ms-bar { display: flex; flex-direction: column; gap: 8px; }
.ms-bar-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #aab4cd; }
.ms-bar-label { flex: none; width: 110px; }
.ms-bar-track { flex: 1; height: 8px; border-radius: 999px; background: rgba(120, 140, 200, 0.14); overflow: hidden; }
.ms-bar-fill { display: block; height: 100%; background: linear-gradient(90deg, #5b7bd8, #8a6cd8); border-radius: 999px; transition: width .3s; }
.ms-bar-val { flex: none; width: 92px; text-align: right; color: #7fa8d8; }
.ms-trend { display: flex; align-items: flex-end; gap: 6px; height: 100px; }
.ms-trend-day { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; height: 100%; }
.ms-trend-bar { width: 100%; max-width: 26px; border-radius: 6px 6px 2px 2px; transition: height .3s; }
.ms-trend-wd { font-size: 11px; color: #7c86a0; }
.ms-dash-foot { font-size: 12px; color: #7fa8d8; border-top: 1px solid rgba(120, 140, 200, 0.14); padding-top: 12px; }
</style>