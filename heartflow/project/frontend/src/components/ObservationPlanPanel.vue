<template>
  <section class="opp">
    <div class="opp-head">
      <div class="opp-title-wrap">
        <span class="opp-title">🌌 今夜观测计划</span>
        <span class="opp-sub">月相 · 时段 · 深空 · 行星</span>
      </div>
      <button v-if="plan" class="opp-btn" @click="refresh">重新生成</button>
    </div>

    <template v-if="plan">
      <!-- 开场摘要 -->
      <p class="opp-summary">{{ plan.summary }}</p>

      <!-- 今夜概况 -->
      <div class="opp-overview">
        <div class="opp-cell">
          <span class="opp-cell-icon">{{ plan.moon.icon }}</span>
          <b>{{ plan.moon.label }}</b>
          <span>月相</span>
        </div>
        <div class="opp-cell">
          <span class="opp-cell-icon">⭐</span>
          <b>{{ plan.score.total }}</b>
          <span>观星指数</span>
        </div>
        <div class="opp-cell">
          <span class="opp-cell-icon">🔭</span>
          <b>{{ plan.magnitudeLimit }}</b>
          <span>星等上限</span>
        </div>
      </div>

      <!-- 分时段建议 -->
      <div class="opp-block">
        <span class="opp-block-title">分时段建议</span>
        <div v-for="ph in plan.phases" :key="ph.label" class="opp-phase">
          <div class="opp-phase-head">
            <span class="opp-phase-label">{{ ph.icon }} {{ ph.label }}</span>
            <span v-if="ph.planets.length" class="opp-phase-planets">
              {{ ph.planets.map(p => p.icon + ' ' + p.label).join(' · ') }}
            </span>
          </div>
          <div class="opp-phase-targets">
            <span v-for="t in ph.targets" :key="t.id" class="opp-target-chip">{{ t.name }}</span>
            <span v-if="!ph.targets.length" class="opp-phase-empty">该时段无达标深空目标</span>
          </div>
          <p class="opp-phase-tip">{{ ph.tip }}</p>
        </div>
      </div>

      <!-- 今夜最值得看 -->
      <div class="opp-block">
        <span class="opp-block-title">今夜最值得看</span>
        <div v-for="b in plan.bestTargets" :key="b.target.id" class="opp-best">
          <span class="opp-best-icon">{{ b.typeIcon }}</span>
          <div class="opp-best-info">
            <span class="opp-best-name">{{ b.target.name }} <em>{{ b.target.id }}</em></span>
            <span class="opp-best-meta">{{ b.typeLabel }} · {{ b.vision }} · 高度 {{ b.altDeg }}°</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="opp-insights">
        <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
      </ul>
    </template>

    <div v-else class="opp-empty">正在生成今夜观测计划…</div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useObserving } from '../modules/observing'
import { buildObservationPlan, observationPlanInsights } from '../modules/observing/observation-plan'
import type { ObservationPlan } from '../modules/observing/observation-plan'

const observing = useObserving()
const plan = ref<ObservationPlan | null>(null)

function refresh() {
  const cfg = observing.config.value
  plan.value = buildObservationPlan(new Date(), {
    lightPollution: cfg.lightPollution,
    boostOnEvents: cfg.boostOnEvents,
  })
}

const insights = computed(() => (plan.value ? observationPlanInsights(plan.value) : []))

onMounted(refresh)
</script>

<style scoped>
.opp {
  margin: 8px auto 0;
  max-width: 520px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.opp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.opp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.opp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.opp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.opp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  flex-shrink: 0; padding: 4px 12px; border-radius: 10px; border: 1px solid rgba(240, 192, 64, 0.3);
  background: rgba(240, 192, 64, 0.08); color: #f0c040; font-size: 11px; font-family: inherit; cursor: pointer;

  min-height: 26px;
}
.opp-summary { margin: 0 0 12px; font-size: 12px; line-height: 1.7; color: rgba(232, 221, 200, 0.65); }

.opp-overview { display: flex; gap: 8px; margin-bottom: 14px; }
.opp-cell {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03));
}
.opp-cell-icon { font-size: 14px; }
.opp-cell b { font-size: 15px; font-weight: 500; color: #f0c040; }
.opp-cell span:last-child { font-size: 10px; color: rgba(232, 221, 200, 0.4); }

.opp-block { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.opp-block-title { font-size: 11px; color: rgba(232, 221, 200, 0.5); }
.opp-phase {
  display: flex; flex-direction: column; gap: 5px; padding: 9px 10px; border-radius: 8px;
  background: var(--bg-card, rgba(255,255,255,0.03));
}
.opp-phase-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.opp-phase-label { font-size: 12px; color: rgba(232, 221, 200, 0.8); }
.opp-phase-planets { font-size: 11px; color: #8a9a7a; }
.opp-phase-targets { display: flex; flex-wrap: wrap; gap: 5px; }
.opp-target-chip {
  font-size: 10px; padding: 2px 8px; border-radius: 10px; color: rgba(232, 221, 200, 0.75);
  background: rgba(240, 192, 64, 0.08); border: 1px solid rgba(240, 192, 64, 0.16);
}
.opp-phase-empty { font-size: 10px; color: rgba(232, 221, 200, 0.35); }
.opp-phase-tip { margin: 0; font-size: 11px; line-height: 1.6; color: rgba(232, 221, 200, 0.45); }

.opp-best { display: flex; align-items: center; gap: 9px; padding: 6px 10px; border-radius: 8px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.opp-best-icon { font-size: 14px; flex-shrink: 0; }
.opp-best-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.opp-best-name { font-size: 12px; color: rgba(232, 221, 200, 0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.opp-best-name em { font-style: normal; font-size: 10px; color: rgba(232, 221, 200, 0.4); margin-left: 4px; }
.opp-best-meta { font-size: 10px; color: rgba(232, 221, 200, 0.45); }

.opp-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.opp-insights li { font-size: 12px; line-height: 1.65; color: rgba(232, 221, 200, 0.6); }
.opp-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }

.opp-empty { margin: 0; font-size: 12px; color: rgba(232, 221, 200, 0.45); text-align: center; padding: 10px 0; }
</style>
