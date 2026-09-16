<template>
  <section data-enter class="ats-panel">
    <header class="ats-head">
      <span class="ats-title">⏳ 时间流</span>
      <div class="ats-scales">
        <button v-for="s in scales" :key="s.value" :class="['ats-scale', { on: scale === s.value }]" @click="pickScale(s.value)">
          {{ s.label }}
        </button>
      </div>
    </header>

    <div class="ats-nav">
      <button class="ats-nav-btn" @click="goPrev">‹</button>
      <button class="ats-nav-label" @click="resetToday">{{ rangeLabel }}</button>
      <button class="ats-nav-btn" @click="goNext" :disabled="!canGoNext">›</button>
    </div>

    <!-- 统计摘要 -->
    <div class="ats-summary" v-if="summary && filtered.length">
      <span class="ats-chip">共 {{ summary.total }}</span>
      <span class="ats-chip">已完成 {{ summary.done }}</span>
      <span class="ats-chip">待办 {{ summary.pending }}</span>
      <span class="ats-chip">完成率 {{ summary.completionRate }}%</span>
    </div>

    <!-- 分布热条（本周每日） -->
    <div class="ats-dist" v-if="dist.dailyInWeek.length">
      <span v-for="d in dist.dailyInWeek" :key="d.date"
        class="ats-dist-cell"
        :title="`${d.date} · ${d.count} 条`"
        :style="{ opacity: cellOpacity(d.count) }">
        {{ d.date.slice(5).replace('-', '/') }}
      </span>
    </div>

    <!-- 分组列 -->
    <div class="ats-groups" v-if="filtered.length">
      <div v-for="(g, i) in groups" :key="i" class="ats-group">
        <div class="ats-group-head">
          <span class="ats-group-label">{{ g.label }}</span>
          <span class="ats-group-count">{{ g.anchors.length }}</span>
        </div>
        <div class="ats-group-items">
          <div v-for="a in g.anchors" :key="a.id" class="ats-anchor" :class="[doneCls(a), prioCls(a)]">
            <span class="ats-anchor-text">{{ a.text }}</span>
            <span class="ats-anchor-meta">{{ prioLabel(a) }}{{ a.done ? ' ✓' : '' }}</span>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="ats-empty">该尺度内暂无锚点。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Anchor } from '../modules/anchor/types'
import {
  isAnchorInScale,
  getScaleRange,
  groupByHour,
  groupByDay,
  groupByWeek,
  groupByMonth,
  computeScaleSummary,
  createScaleNavigation,
  computeScaleDistribution,
  type AnchorScale,
} from '../modules/anchor/anchor-time-scale'

const props = defineProps<{ anchors: Anchor[] }>()

const scales: { label: string; value: AnchorScale }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

const scale = ref<AnchorScale>('week')
const cursor = ref<Date>(new Date())

function pickScale(s: AnchorScale) { scale.value = s; resetToday() }
function resetToday() { cursor.value = new Date() }

const range = computed(() => getScaleRange(scale.value, cursor.value))
const rangeLabel = computed(() => range.value.label)
const nav = computed(() => createScaleNavigation(scale.value, cursor.value))
const canGoNext = computed(() => nav.value.canGoNext)

const filtered = computed(() =>
  props.anchors.filter((a) => isAnchorInScale(a, scale.value, cursor.value)),
)
const summary = computed(() => computeScaleSummary(filtered.value))
const dist = computed(() => computeScaleDistribution(props.anchors, cursor.value))

const groups = computed(() => {
  const f = filtered.value
  const r = range.value
  switch (scale.value) {
    case 'day': return groupByHour(f).map((g) => ({ label: g.label, anchors: g.anchors }))
    case 'week': return groupByDay(f, r).map((g) => ({ label: g.label, anchors: g.anchors })).filter((g) => g.anchors.length)
    case 'month': return groupByWeek(f, r).map((g) => ({ label: g.label, anchors: g.anchors })).filter((g) => g.anchors.length)
    case 'year': return groupByMonth(f, r).map((g) => ({ label: g.label, anchors: g.anchors })).filter((g) => g.anchors.length)
  }
})

function goPrev() { cursor.value = nav.value.goPrev(cursor.value) }
function goNext() { if (canGoNext.value) cursor.value = nav.value.goNext(cursor.value) }

function cellOpacity(count: number): string {
  if (!count) return '0.12'
  const max = Math.max(1, ...dist.value.dailyInWeek.map((d) => d.count))
  return String(0.25 + (count / max) * 0.75)
}
function doneCls(a: Anchor) { return a.done ? 'done' : '' }
function prioCls(a: Anchor) { return a.priority || 'can' }
function prioLabel(a: Anchor) {
  return a.priority === 'must' ? '必锚' : a.priority === 'float' ? '浮锚' : '可锚'
}
</script>

<style scoped>
.ats-panel { padding: 16px; border-radius: 12px; background: var(--bg-card); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.ats-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.ats-title { font-size: 14px; letter-spacing: 2px; color: rgba(var(--accent-rgb), 0.75); }
.ats-scales { display: flex; gap: 6px; }
.ats-scale {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 2px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: transparent; color: inherit; font-size: 12px; cursor: pointer; 
  min-height: 26px;
}
.ats-scale.on { background: rgba(var(--accent-rgb), 0.22); border-color: rgba(var(--accent-rgb), 0.5); }

.ats-nav { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.ats-nav-btn { width: 26px; height: 26px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: inherit; cursor: pointer; }
.ats-nav-btn:disabled { opacity: 0.3; cursor: default; }
.ats-nav-label { flex: 1; text-align: center; font-size: 13px; color: #e8dcc8; padding: 4px; cursor: pointer; }

.ats-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.ats-chip { font-size: 11px; padding: 2px 10px; border-radius: 999px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); opacity: 0.8; }

.ats-dist { display: flex; gap: 4px; margin-bottom: 12px; }
.ats-dist-cell { flex: 1; text-align: center; font-size: 9px; padding: 3px 0; border-radius: 5px; background: rgba(var(--accent-rgb), 0.5); color: #201a14; }

.ats-groups { display: flex; flex-direction: column; gap: 10px; }
.ats-group-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ats-group-label { font-size: 12px; color: rgba(var(--accent-rgb), 0.7); }
.ats-group-count { font-size: 11px; opacity: 0.4; }
.ats-group-items { display: flex; flex-wrap: wrap; gap: 6px; }
.ats-anchor { display: flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); }
.ats-anchor.must { border-color: rgba(196,106,90,0.4); }
.ats-anchor.float { border-color: rgba(138,154,122,0.4); }
.ats-anchor.done { opacity: 0.45; }
.ats-anchor-text { font-size: 12px; }
.ats-anchor-meta { font-size: 10px; opacity: 0.5; }
.ats-empty { font-size: 12px; opacity: 0.5; padding: 8px 0; }
</style>