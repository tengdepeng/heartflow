<template>
  <section class="gmp">
    <div class="gmp-head">
      <span class="gmp-title">🌤 成长气象</span>
      <span class="gmp-sub">把庭院里的目标、种子、习惯与光茧，看成一片生长的天气</span>
    </div>

    <!-- 成长势能圆环 -->
    <div class="gmp-hero">
      <div class="gmp-ring" :style="ringStyle">
        <div class="gmp-ring-inner">
          <b :style="{ color: m.color }">{{ m.score }}</b>
          <span>{{ m.label }}</span>
        </div>
      </div>

      <!-- 概览指标 -->
      <div class="gmp-metrics">
        <div class="gmp-metric"><b>{{ ov.bloomRate }}<i>%</i></b><span>目标开花率</span></div>
        <div class="gmp-metric"><b>{{ ov.sproutRate }}<i>%</i></b><span>种子发芽率</span></div>
        <div class="gmp-metric"><b>{{ ov.habitCount }}</b><span>习惯</span></div>
        <div class="gmp-metric"><b>{{ ov.cocoonCount }}</b><span>光茧</span></div>
      </div>
    </div>

    <!-- 领域分布 -->
    <div v-if="domains.length" class="gmp-domains">
      <div v-for="d in domains" :key="d.domain" class="gmp-domain">
        <span class="gmp-domain-label" :style="{ color: d.color }">{{ d.label }}</span>
        <span class="gmp-domain-bar"><i :style="{ width: d.pct + '%', background: d.color }"></i></span>
        <span class="gmp-domain-count">{{ d.count }}</span>
      </div>
    </div>

    <!-- 阶段分布 -->
    <div v-if="stages.length" class="gmp-stages">
      <span v-for="s in stages" :key="s.status" class="gmp-stage-chip">
        {{ STAGE_LABELS[s.status] }} ×{{ s.count }}
      </span>
    </div>

    <!-- 习惯审视 -->
    <div v-if="review.best" class="gmp-habits">
      <h4>🔄 习惯节水</h4>
      <p v-if="review.strong.length" class="gmp-habit-strong">「{{ review.strong[0].text }}」已连续 {{ review.strong[0].streak }} 天</p>
      <p v-if="review.stagnant.length" class="gmp-habit-stagnant">「{{ review.stagnant[0].text }}」总是中断，试着拆小一点</p>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="gmp-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Goal } from '../modules/goal/types'
import type { Cocoon } from '../modules/seasonal/cocoon'
import {
  growthOverview,
  domainDistribution,
  stageDistribution,
  habitReview,
  growthMomentum,
  growthInsights,
  STAGE_LABELS,
} from '../modules/garden/growth-meteor'

interface SeedLike { id: string; sprouted: boolean; at: string }
interface HabitLike { id: string; text: string; streak: number; streakPct: number; ticks: string[] }

const props = defineProps<{
  targets: Goal[]
  seeds: SeedLike[]
  habits: HabitLike[]
  cocoons: Cocoon[]
}>()

const ov = ref(growthOverview([], [], [], []))
const domains = ref(domainDistribution([]))
const stages = ref(stageDistribution([]))
const review = ref(habitReview([]))
const m = ref(growthMomentum([], [], []))
const insights = ref<string[]>([])
const maxDomainPct = ref(1)

function refresh() {
  const now = new Date()
  ov.value = growthOverview(props.targets, props.seeds, props.habits, props.cocoons)
  domains.value = domainDistribution(props.targets)
  stages.value = stageDistribution(props.targets)
  review.value = habitReview(props.habits)
  m.value = growthMomentum(props.targets, props.seeds, props.habits)
  insights.value = growthInsights(props.targets, props.seeds, props.habits, props.cocoons, now, 4)
  maxDomainPct.value = Math.max(1, ...domains.value.map(d => d.pct))
}

watch(
  () => [props.targets, props.seeds, props.habits, props.cocoons],
  () => refresh(),
  { deep: true }
)

const ringStyle = computed(() => ({
  background: `conic-gradient(${m.value.color} ${m.value.score * 3.6}deg, rgba(var(--accent-rgb), 0.08) 0deg)`,
}))

refresh()
</script>

<style scoped>
.gmp {
  margin: 4px 0 24px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--bg-card, rgba(18, 14, 11, 0.6));
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.gmp-head { margin-bottom: 14px; }
.gmp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); display: block; }
.gmp-sub { font-size: 11px; color: rgba(200, 180, 160, 0.5); }

/* ---- 势能圆环 + 指标 ---- */
.gmp-hero { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
.gmp-ring {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gmp-ring-inner {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: var(--bg-card, rgba(18, 14, 11, 0.9));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.gmp-ring-inner b { font-size: 24px; font-weight: 300; line-height: 1; }
.gmp-ring-inner span { font-size: 10px; color: rgba(200, 180, 160, 0.5); }

.gmp-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; flex: 1; }
.gmp-metric { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.gmp-metric b { font-size: 17px; font-weight: 300; color: #e8cdae; }
.gmp-metric b i { font-style: normal; font-size: 10px; opacity: 0.5; }
.gmp-metric span { font-size: 10px; color: rgba(200, 180, 160, 0.5); }

/* ---- 领域分布 ---- */
.gmp-domains { margin-bottom: 12px; }
.gmp-domain { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.gmp-domain-label { width: 30px; font-size: 11px; }
.gmp-domain-bar { flex: 1; height: 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.gmp-domain-bar i { display: block; height: 100%; border-radius: 4px; }
.gmp-domain-count { font-size: 11px; color: rgba(200, 180, 160, 0.6); width: 18px; text-align: right; }

/* ---- 阶段分布 ---- */
.gmp-stages { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.gmp-stage-chip { font-size: 11px; padding: 3px 9px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.08); border: 1px solid rgba(var(--accent-rgb), 0.12); color: rgba(200, 180, 160, 0.7); }

/* ---- 习惯审视 ---- */
.gmp-habits { margin-bottom: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.gmp-habits h4 { font-size: 12px; margin: 0 0 6px; color: rgba(200, 180, 160, 0.6); font-weight: 500; }
.gmp-habits p { font-size: 11px; margin: 0 0 3px; line-height: 1.6; }
.gmp-habit-strong { color: #7bd15a; }
.gmp-habit-stagnant { color: #e0a96d; }

/* ---- 洞察 ---- */
.gmp-insights { margin: 0; padding-left: 18px; }
.gmp-insights li { font-size: 11px; color: rgba(200, 180, 160, 0.65); line-height: 1.7; margin-bottom: 3px; }

@media (max-width: 480px) {
  .gmp-hero { flex-direction: column; align-items: center; }
  .gmp-metrics { width: 100%; }
}
</style>