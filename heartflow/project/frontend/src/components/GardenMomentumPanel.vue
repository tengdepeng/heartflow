<template>
  <section class="gmp">
    <div class="gmp-head">
      <div class="gmp-title-wrap">
        <span class="gmp-title">🌱 花园气象</span>
        <span class="gmp-sub">把"未完成"看成分层的光谱：哪些还温，哪些已蒙尘</span>
      </div>
    </div>

    <!-- 今日拾起建议 -->
    <div class="gmp-suggest">
      <p class="gmp-suggest-kicker">🌤 今日最该拾起</p>
      <div v-if="suggestion" class="gmp-suggest-main">
        <span class="gmp-suggest-icon" :class="'type-' + suggestion.item.type">{{ typeIcon(suggestion.item.type) }}</span>
        <div class="gmp-suggest-body">
          <span class="gmp-suggest-title">{{ suggestion.item.text }}</span>
          <span class="gmp-suggest-reason">{{ suggestion.reason }}</span>
        </div>
        <span class="gmp-suggest-score">拾起度 {{ suggestion.score }}</span>
      </div>
      <p v-else class="gmp-suggest-empty">花园此刻没有待拾起的未完成项——要么用一件小事让它重获生机，要么享受这份清净。</p>
    </div>

    <!-- 气象指标 -->
    <div class="gmp-metrics">
      <div class="gmp-metric">
        <div class="gmp-gauge" :style="{ background: progressRing }">
          <span class="gmp-gauge-num">{{ stats.completionRate }}<i>%</i></span>
        </div>
        <span class="gmp-metric-label">收束率</span>
      </div>
      <div class="gmp-metric">
        <span class="gmp-num">{{ stats.completed }}</span>
        <span class="gmp-metric-label">已完成</span>
      </div>
      <div class="gmp-metric">
        <span class="gmp-num accent">{{ stats.active }}</span>
        <span class="gmp-metric-label">待拾起</span>
      </div>
      <div class="gmp-metric">
        <span class="gmp-num">{{ stats.total }}</span>
        <span class="gmp-metric-label">全部</span>
      </div>
    </div>

    <!-- 类型分布 -->
    <div class="gmp-types">
      <div v-for="t in typeRows" :key="t.key" class="gmp-type">
        <span class="gmp-type-icon">{{ typeIcon(t.key) }}</span>
        <span class="gmp-type-label">{{ t.label }}</span>
        <span class="gmp-type-bar"><i :style="{ width: t.pct + '%' }"></i></span>
        <span class="gmp-type-num">{{ t.count }}</span>
      </div>
    </div>

    <!-- 沉淀分档 -->
    <div class="gmp-buckets">
      <div v-for="b in stats.buckets" :key="b.key" class="gmp-bucket" :class="'bk-' + b.key">
        <span class="gmp-bucket-dot"></span>
        <span class="gmp-bucket-label">{{ b.label }}</span>
        <span class="gmp-bucket-count">{{ b.count }}</span>
      </div>
    </div>

    <!-- 复垦洞察 -->
    <div v-if="insights.length" class="gmp-insights">
      <p class="gmp-insights-head">📝 复垦洞察</p>
      <ul class="gmp-insights-list">
        <li v-for="(s, i) in insights" :key="i" class="gmp-insight">{{ s }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { UItem } from '../modules/unfinished'
import {
  gardenStats,
  pickUpSuggestion,
  gardenInsights,
  type GardenType,
} from '../modules/unfinished/garden-analytics'

const props = defineProps<{ items: UItem[] }>()

const suggestion = ref<ReturnType<typeof pickUpSuggestion>>(null)
const stats = ref<ReturnType<typeof gardenStats>>(gardenStats([], new Date()))
const insights = ref<string[]>([])

const TYPE_META: Record<GardenType, string> = {
  seed: '种子',
  book: '书',
  draft: '笔记',
}
const TYPE_ICON: Record<GardenType, string> = {
  seed: '🌰',
  book: '📖',
  draft: '📝',
}

function refresh() {
  const now = new Date()
  stats.value = gardenStats(props.items, now)
  suggestion.value = pickUpSuggestion(props.items, now)
  insights.value = gardenInsights(props.items, now)
}

watch(
  () => props.items,
  () => refresh(),
  { deep: true }
)

refresh()

function typeIcon(t: GardenType): string {
  return TYPE_ICON[t]
}

const activeCount = computed(() => (stats.value.active || 0) || 1)

const typeRows = computed(() =>
  (['seed', 'book', 'draft'] as GardenType[]).map((key) => ({
    key,
    label: TYPE_META[key],
    icon: TYPE_ICON[key],
    count: stats.value.byType[key] || 0,
    pct: Math.round(((stats.value.byType[key] || 0) / activeCount.value) * 100),
  }))
)

// 收束率圆环色：低→从尘青到成熟金
const progressRing = computed(() => {
  const r = stats.value.completionRate
  const hue = r >= 60 ? 38 : r >= 30 ? 48 : 168
  return `conic-gradient(hsl(${hue} 60% 55%) ${r * 3.6}deg, rgba(var(--accent-rgb), 0.1) ${r * 3.6}deg)`
})

refresh()
</script>

<style scoped>
.gmp {
  margin-bottom: 28px;
  padding: 16px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  box-shadow: 0 6px 24px -12px rgba(0, 0, 0, 0.25);
}
.gmp-head { margin-bottom: 12px; }
.gmp-title-wrap { display: flex; align-items: baseline; gap: 10px; }
.gmp-title { font-size: 14px; font-weight: 600; color: var(--text-high); letter-spacing: 0.5px; }
.gmp-sub { font-size: 11px; color: var(--text-secondary); opacity: 0.8; }

/* 今日拾起 */
.gmp-suggest {
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  margin-bottom: 14px;
}
.gmp-suggest-kicker { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; letter-spacing: 0.5px; }
.gmp-suggest-main { display: flex; align-items: center; gap: 10px; }
.gmp-suggest-icon { font-size: 22px; }
.gmp-suggest-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.gmp-suggest-title { font-size: 14px; color: var(--text-high); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gmp-suggest-reason { font-size: 11px; color: var(--text-secondary); }
.gmp-suggest-score { font-size: 11px; color: var(--accent); white-space: nowrap; }
.gmp-suggest-empty { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }

/* 指标 */
.gmp-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.gmp-metric { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.gmp-gauge {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.gmp-gauge::before {
  content: '';
  position: absolute; inset: 6px;
  border-radius: 50%;
  background: var(--bg-card);
}
.gmp-gauge-num { position: relative; font-size: 16px; font-weight: 600; color: var(--text-high); }
.gmp-gauge-num i { font-style: normal; font-size: 10px; opacity: 0.55; margin-left: 1px; }
.gmp-num { font-size: 22px; font-weight: 600; color: var(--text-high); }
.gmp-num.accent { color: var(--accent); }
.gmp-metric-label { font-size: 10px; color: var(--text-secondary); }

/* 类型分布 */
.gmp-types { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.gmp-type { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }
.gmp-type-icon { width: 18px; text-align: center; }
.gmp-type-label { width: 34px; }
.gmp-type-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.gmp-type-bar i { display: block; height: 100%; border-radius: 3px; background: rgba(var(--accent-rgb), 0.35); transition: width .4s; }
.gmp-type-num { width: 18px; text-align: right; color: var(--text-high); }

/* 沉淀分档 */
.gmp-buckets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 14px; }
.gmp-bucket {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 8px; border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  font-size: 11px; color: var(--text-secondary);
}
.gmp-bucket-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.bk-fresh .gmp-bucket-dot { background: hsl(140 60% 55%); }
.bk-maturing .gmp-bucket-dot { background: hsl(90 55% 55%); }
.bk-dusty .gmp-bucket-dot { background: hsl(45 65% 55%); }
.bk-forgotten .gmp-bucket-dot { background: hsl(10 60% 55%); }
.gmp-bucket-count { margin-left: auto; color: var(--text-high); font-weight: 500; }

/* 洞察 */
.gmp-insights { padding-top: 12px; border-top: 1px dashed rgba(var(--accent-rgb), 0.16); }
.gmp-insights-head { font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; letter-spacing: 0.5px; }
.gmp-insights-list { display: flex; flex-direction: column; gap: 5px; margin: 0; padding: 0; list-style: none; }
.gmp-insight { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
</style>