<template>
  <section class="pfp">
    <div class="pfp-head">
      <div class="pfp-title-wrap">
        <span class="pfp-title">🌳 专注树园</span>
        <span class="pfp-sub">每一次专注种下一棵树，中途放弃则枯萎</span>
      </div>
      <span class="pfp-tag">成活 {{ ov.survivalRate }}%</span>
    </div>

    <!-- 概览指标 -->
    <div class="pfp-metrics">
      <div class="pfp-metric"><b>{{ ov.totalTrees }}</b><span>总棵树</span></div>
      <div class="pfp-metric"><b>{{ ov.growingTrees }}</b><span>成活</span></div>
      <div class="pfp-metric"><b>{{ ov.witheredTrees }}</b><span>枯萎</span></div>
      <div class="pfp-metric"><b>{{ fmtMs(ov.totalFocusMs) }}</b><span>专注时长</span></div>
      <div class="pfp-metric"><b>{{ ov.todayTrees }}</b><span>今日种下</span></div>
    </div>

    <!-- 品种分布 -->
    <div v-if="speciesRows.length" class="pfp-species">
      <div v-for="s in speciesRows" :key="s.species" class="pfp-species-row">
        <span class="pfp-species-icon">{{ s.icon }}</span>
        <span class="pfp-species-label">{{ s.label }}</span>
        <div class="pfp-species-bar"><i :style="{ width: s.percentage + '%' }"></i></div>
        <span class="pfp-species-count">{{ s.count }}</span>
      </div>
    </div>

    <!-- 7 日趋势 -->
    <div v-if="trend.some(t => t.count > 0)" class="pfp-trend">
      <div class="pfp-trend-label">近 7 日专注</div>
      <div class="pfp-trend-bars">
        <div v-for="t in trend" :key="t.date" class="pfp-trend-col" :title="`${t.date} · ${t.count} 棵 · ${fmtMs(t.focusMs)}`">
          <div class="pfp-trend-bar-wrap">
            <i class="pfp-trend-bar" :style="{ height: barHeight(t) + '%' }"></i>
          </div>
          <span class="pfp-trend-day">{{ t.date.slice(5) }}</span>
        </div>
      </div>
    </div>

    <!-- 任务绑定 -->
    <div v-if="taskRows.length" class="pfp-tasks">
      <div class="pfp-block-label">任务专注投入</div>
      <div v-for="r in taskRows" :key="r.taskId" class="pfp-task-row">
        <span class="pfp-task-title">{{ r.taskTitle }}</span>
        <div class="pfp-task-bar"><i :style="{ width: taskPercent(r) + '%' }"></i></div>
        <span class="pfp-task-count">{{ r.focusCount }} 次</span>
        <span class="pfp-task-ms">{{ fmtMs(r.focusMs) }}</span>
      </div>
    </div>

    <!-- 中断日志 -->
    <div class="pfp-interrupt">
      <div class="pfp-interrupt-head">
        <span class="pfp-block-label">中断日志</span>
        <button class="pfp-add-btn" @click="showForm = !showForm">
          {{ showForm ? '收起' : '+ 记录中断' }}
        </button>
      </div>

      <form v-if="showForm" class="pfp-intr-form" @submit.prevent="submitInterruption">
        <div class="pfp-intr-cats">
          <button
            v-for="c in INTERRUPTION_CATEGORIES"
            :key="c"
            type="button"
            :class="['pfp-intr-cat', { active: intrCategory === c }]"
            @click="intrCategory = c"
          >
            {{ INTERRUPTION_CATEGORY_META[c].icon }} {{ INTERRUPTION_CATEGORY_META[c].label }}
          </button>
        </div>
        <input
          v-model="intrReason"
          class="pfp-intr-reason"
          type="text"
          placeholder="这次中断的原因…"
        />
        <button class="pfp-intr-submit" type="submit">记录</button>
      </form>

      <div v-if="intrStats.total > 0" class="pfp-intr-stats">
        <span>共 <b>{{ intrStats.total }}</b> 次中断</span>
        <span>· 今日 <b>{{ intrStats.today }}</b> 次</span>
        <span v-if="intrStats.mostCommon !== 'none'">· 最多「{{ INTERRUPTION_CATEGORY_META[intrStats.mostCommon as InterruptionCategory]?.label ?? '' }}」</span>
        <span>· 平均坚持 <b>{{ fmtMs(intrStats.avgFocusMs) }}</b></span>
      </div>

      <ul v-if="interruptions.length" class="pfp-intr-list">
        <li v-for="r in interruptions" :key="r.id" class="pfp-intr-item">
          <span class="pfp-intr-icon">{{ INTERRUPTION_CATEGORY_META[r.category]?.icon ?? '📝' }}</span>
          <span class="pfp-intr-reason-text">{{ r.reason || INTERRUPTION_CATEGORY_META[r.category]?.label }}</span>
          <span class="pfp-intr-ms">{{ fmtMs(r.focusMs) }}</span>
          <span class="pfp-intr-date">{{ fmtDate(r.occurredAt) }}</span>
          <button class="pfp-intr-del" @click="removeInterruption(r.id)" title="删除">✕</button>
        </li>
      </ul>
      <p v-else-if="!showForm" class="pfp-intr-empty">还没有中断记录，专注被打断时如实记一笔</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FocusSession } from '../types'
import {
  buildForest,
  forestOverview,
  forestDailyTrend,
  taskFocusRows,
  interruptionStats,
  usePomodoroForest,
  TREE_SPECIES_META,
  INTERRUPTION_CATEGORY_META,
  INTERRUPTION_CATEGORIES,
} from '../modules/discipline/pomodoro-forest'
import type { TreeSpecies, InterruptionCategory } from '../modules/discipline/pomodoro-forest'

const props = defineProps<{
  sessions: FocusSession[]
  tasks: { id: string; title: string }[]
}>()

const forest = usePomodoroForest()
forest.load()

const showForm = ref(false)
const intrCategory = ref<InterruptionCategory>('distraction')
const intrReason = ref('')

const trees = computed(() => buildForest(props.sessions))
const ov = computed(() => forestOverview(trees.value, new Date()))
const trend = computed(() => forestDailyTrend(trees.value, 7, new Date()))
const taskRows = computed(() => taskFocusRows(trees.value, props.tasks))
const interruptions = computed(() => forest.interruptions.value)
const intrStats = computed(() => interruptionStats(interruptions.value, new Date()))

const speciesRows = computed(() => {
  const counts: Record<string, number> = {}
  for (const t of trees.value) {
    if (t.status !== 'growing') continue
    counts[t.species] = (counts[t.species] ?? 0) + 1
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0)
  return (Object.keys(TREE_SPECIES_META) as TreeSpecies[])
    .filter(s => counts[s])
    .map(s => ({
      species: s,
      label: TREE_SPECIES_META[s].label,
      icon: TREE_SPECIES_META[s].icon,
      count: counts[s],
      percentage: total > 0 ? Math.round((counts[s] / total) * 100) : 0,
    }))
})

const maxTrend = computed(() => Math.max(1, ...trend.value.map(t => t.count)))

function barHeight(t: { count: number }): number {
  return Math.max(4, Math.round((t.count / maxTrend.value) * 100))
}

const maxTaskMs = computed(() => Math.max(1, ...taskRows.value.map(r => r.focusMs)))

function taskPercent(r: { focusMs: number }): number {
  return Math.max(4, Math.round((r.focusMs / maxTaskMs.value) * 100))
}

function submitInterruption() {
  forest.recordInterruption({
    sessionId: '',
    reason: intrReason.value,
    category: intrCategory.value,
    focusMs: 0,
  })
  intrReason.value = ''
  showForm.value = false
}

function removeInterruption(id: string) {
  forest.removeInterruption(id)
}

function fmtMs(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} 分`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

function fmtDate(iso: string): string {
  return iso.slice(5, 10)
}

watch(
  () => [props.sessions, props.tasks] as const,
  () => {},
  { deep: true }
)
</script>

<style scoped>
.pfp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.pfp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.pfp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.pfp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.pfp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.pfp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e3c08a; white-space: nowrap; }

.pfp-metrics { display: flex; gap: 8px; margin-bottom: 14px; }
.pfp-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.pfp-metric b { font-size: 14px; font-weight: 500; color: var(--text-high, #d8c3a5); }
.pfp-metric span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.pfp-species { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.pfp-species-row { display: flex; align-items: center; gap: 10px; }
.pfp-species-icon { width: 20px; text-align: center; }
.pfp-species-label { width: 34px; font-size: 12px; color: rgba(232, 221, 208, 0.65); }
.pfp-species-bar { flex: 1; height: 7px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.pfp-species-bar i { display: block; height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); background: linear-gradient(90deg, hsl(96 50% 45%), hsl(150 55% 50%)); }
.pfp-species-count { width: 26px; text-align: right; font-size: 11px; color: rgba(232, 221, 208, 0.5); }

.pfp-trend { margin-bottom: 14px; }
.pfp-trend-label { font-size: 10px; color: rgba(232, 221, 208, 0.4); margin-bottom: 8px; }
.pfp-trend-bars { display: flex; gap: 8px; align-items: flex-end; height: 64px; }
.pfp-trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.pfp-trend-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.pfp-trend-bar { display: block; width: 60%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, hsl(150 55% 55%), hsl(96 50% 40%)); min-height: 3px; }
.pfp-trend-day { font-size: 9px; color: rgba(232, 221, 208, 0.4); }

.pfp-tasks { margin-bottom: 14px; }
.pfp-block-label { font-size: 10px; color: rgba(232, 221, 208, 0.4); margin-bottom: 8px; }
.pfp-task-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.pfp-task-title { width: 90px; font-size: 11px; color: rgba(232, 221, 208, 0.65); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.pfp-task-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.pfp-task-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(42 60% 55%), hsl(96 50% 55%)); }
.pfp-task-count { width: 42px; text-align: right; font-size: 10px; color: rgba(232, 221, 208, 0.5); flex-shrink: 0; }
.pfp-task-ms { width: 44px; text-align: right; font-size: 10px; color: rgba(232, 221, 208, 0.5); flex-shrink: 0; }

.pfp-interrupt { border-top: 1px dashed rgba(var(--accent-rgb), 0.14); padding-top: 12px; }
.pfp-interrupt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.pfp-interrupt-head .pfp-block-label { margin-bottom: 0; }
.pfp-add-btn { font-size: 10px; padding: 3px 10px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.25); background: transparent; color: rgba(232, 221, 208, 0.6); cursor: pointer; }
.pfp-add-btn:hover { color: #e3c08a; border-color: rgba(var(--accent-rgb), 0.5); }

.pfp-intr-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.pfp-intr-cats { display: flex; gap: 6px; flex-wrap: wrap; }
.pfp-intr-cat { font-size: 10px; padding: 3px 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(232, 221, 208, 0.55); cursor: pointer; }
.pfp-intr-cat.active { background: rgba(var(--accent-rgb), 0.14); color: #e3c08a; border-color: rgba(var(--accent-rgb), 0.4); }
.pfp-intr-reason { flex: 1; font-size: 11px; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(232, 221, 208, 0.8); outline: none; }
.pfp-intr-reason:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.pfp-intr-submit { align-self: flex-end; font-size: 11px; padding: 4px 14px; border-radius: 10px; border: none; background: rgba(var(--accent-rgb), 0.18); color: #e3c08a; cursor: pointer; }

.pfp-intr-stats { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; color: rgba(232, 221, 208, 0.45); margin-bottom: 8px; }
.pfp-intr-stats b { color: var(--accent); font-weight: 600; }

.pfp-intr-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.pfp-intr-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(232, 221, 208, 0.6); }
.pfp-intr-icon { width: 16px; text-align: center; }
.pfp-intr-reason-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pfp-intr-ms { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.pfp-intr-date { font-size: 10px; color: rgba(232, 221, 208, 0.35); }
.pfp-intr-del { font-size: 10px; border: none; background: transparent; color: rgba(232, 221, 208, 0.3); cursor: pointer; }
.pfp-intr-del:hover { color: #e07070; }
.pfp-intr-empty { font-size: 11px; color: rgba(232, 221, 208, 0.35); margin: 0; }
</style>
