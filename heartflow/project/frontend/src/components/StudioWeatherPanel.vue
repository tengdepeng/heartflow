<template>
  <section class="swp">
    <div class="swp-head">
      <span class="swp-title">📚 书房气象</span>
      <span class="swp-tag">{{ health.label }}</span>
    </div>

    <!-- 温故建议 -->
    <div class="swp-suggest">
      <p class="swp-suggest-kicker">今日值得温故</p>
      <div v-if="suggestion" class="swp-suggest-main">
        <span class="swp-suggest-icon">📖</span>
        <div class="swp-suggest-body">
          <span class="swp-suggest-title">{{ suggestion.note.title || '(无题)' }}</span>
          <span class="swp-suggest-reason">{{ suggestion.reason }} · 距上次 {{ suggestion.days }} 天</span>
        </div>
      </div>
      <p v-else class="swp-suggest-empty">没有躺在书架角落蒙尘的笔记——要么刚翻过，要么书房还空着。</p>
    </div>

    <!-- 健康三轴 -->
    <div class="swp-health">
      <div class="swp-health-row"><span>节奏</span><div class="swp-bar"><i :style="{ width: health.cadence + '%' }"></i></div><b>{{ health.cadence }}</b></div>
      <div class="swp-health-row"><span>广度</span><div class="swp-bar"><i :style="{ width: health.breadth + '%' }"></i></div><b>{{ health.breadth }}</b></div>
      <div class="swp-health-row"><span>深耕</span><div class="swp-bar"><i :style="{ width: health.depth + '%' }"></i></div><b>{{ health.depth }}</b></div>
    </div>

    <!-- 节奏指标 -->
    <div class="swp-metrics">
      <div class="swp-metric"><b>{{ rhythm.consecutiveDays }}</b><span>连日</span></div>
      <div class="swp-metric"><b>{{ rhythm.activeDays7 }}</b><span>近7天</span></div>
      <div class="swp-metric"><b>{{ rhythm.longestStreak }}</b><span>最长连</span></div>
      <div class="swp-metric"><b>{{ ov.notesThisWeek }}</b><span>本周</span></div>
      <div class="swp-metric"><b>{{ ov.avgPerDay }}</b><span>日均</span></div>
    </div>

    <!-- 高频标签 -->
    <div v-if="rhythm.topTags.length" class="swp-tags">
      <div v-for="(t, i) in rhythm.topTags" :key="t.tag" class="swp-tag" :style="{ fontSize: (11 + (rhythm.topTags.length - i) * 1.2) + 'px' }">
        <span class="swp-tag-name">{{ t.tag }}</span>
        <span class="swp-tag-count">{{ t.count }}</span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="swp-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Note } from '../modules/study'
import {
  studioOverview,
  writingRhythm,
  studioHealth,
  revisitSuggestion,
  studioInsights,
} from '../modules/study/study-analytics'

const props = defineProps<{ notes: Note[] }>()

const ov = ref(studioOverview([], new Date()))
const rhythm = ref(writingRhythm([], new Date()))
const health = ref(studioHealth([], new Date()))
const suggestion = ref<ReturnType<typeof revisitSuggestion>>(null)
const insights = ref<string[]>([])

function refresh() {
  const now = new Date()
  ov.value = studioOverview(props.notes, now)
  rhythm.value = writingRhythm(props.notes, now)
  health.value = studioHealth(props.notes, now)
  suggestion.value = revisitSuggestion(props.notes, now)
  insights.value = studioInsights(props.notes, now, 3)
}

watch(
  () => props.notes,
  () => refresh(),
  { deep: true }
)

refresh()
</script>

<style scoped>
.swp {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
}
.swp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.swp-title { font-size: 13px; font-weight: 600; color: var(--text-high); letter-spacing: 1px; }
.swp-tag { font-size: 10px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }

.swp-suggest { padding: 12px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.05); border: 1px solid rgba(var(--accent-rgb), 0.12); margin-bottom: 12px; }
.swp-suggest-kicker { font-size: 11px; color: var(--text-secondary); margin: 0 0 8px; letter-spacing: 0.5px; }
.swp-suggest-main { display: flex; align-items: center; gap: 10px; }
.swp-suggest-icon { font-size: 20px; }
.swp-suggest-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.swp-suggest-title { font-size: 13px; color: var(--text-high); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.swp-suggest-reason { font-size: 11px; color: var(--text-secondary); }
.swp-suggest-empty { font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin: 0; }

.swp-health { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.swp-health-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-secondary); }
.swp-health-row span { width: 34px; }
.swp-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.swp-bar i { display: block; height: 100%; border-radius: 3px; background: rgba(var(--accent-rgb), 0.4); transition: width .4s; }
.swp-health-row b { width: 30px; text-align: right; font-weight: 500; color: var(--text-high); }

.swp-metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; }
.swp-metric { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; border-radius: 8px; background: rgba(var(--accent-rgb), 0.04); }
.swp-metric b { font-size: 15px; font-weight: 600; color: var(--accent); }
.swp-metric span { font-size: 9px; color: var(--text-secondary); }

.swp-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: baseline; }
.swp-tag { display: inline-flex; align-items: baseline; gap: 4px; padding: 3px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.08); color: var(--text-medium); transition: all .2s; }
.swp-tag:hover { background: rgba(var(--accent-rgb), 0.15); color: var(--accent); }
.swp-tag-count { font-size: 9px; opacity: 0.6; }

.swp-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.16); display: flex; flex-direction: column; gap: 5px; }
.swp-insights li { font-size: 11px; color: var(--text-secondary); line-height: 1.6; }
</style>