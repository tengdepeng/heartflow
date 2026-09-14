<template>
  <section class="swp-archive" aria-label="书房气象档案">
    <!-- 空态（无笔记） -->
    <template v-if="!hasData">
      <div class="swp-head">
        <span class="swp-title">✨ 书房气象档案</span>
        <span class="swp-badge swp-badge-neutral">书房未启</span>
      </div>
      <p class="swp-empty">
        书房还空着。落下一行字，腾出脑中一格——笔迹会在这面墙上显影成书房的气象。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="swp-head">
        <span class="swp-title">✨ 书房气象档案</span>
        <span class="swp-badge swp-badge-gold">{{ health?.label }}</span>
      </div>

      <!-- 藏书概览 -->
      <div class="swp-block" v-if="overview">
        <h3 class="swp-block-title">藏书概览</h3>
        <div class="swp-g8">
          <div class="swp-cell"><span class="swp-cell-num">{{ overview.total }}</span><span class="swp-cell-label">总笔记</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ overview.active }}</span><span class="swp-cell-label">活跃</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ overview.archived }}</span><span class="swp-cell-label">归档</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ overview.atomicCount }}</span><span class="swp-cell-label">速记</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ overview.totalTags }}</span><span class="swp-cell-label">标签</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ overview.notesThisWeek }}</span><span class="swp-cell-label">近7天</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ overview.avgPerDay }}</span><span class="swp-cell-label">日均</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ overview.totalWords }}</span><span class="swp-cell-label">总字数</span></div>
        </div>
      </div>

      <!-- 落字节奏 -->
      <div class="swp-block" v-if="rhythm">
        <h3 class="swp-block-title">落字节奏</h3>
        <div class="swp-g4">
          <div class="swp-cell"><span class="swp-cell-num">{{ rhythm.consecutiveDays }}</span><span class="swp-cell-label">连续落字</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ rhythm.activeDays7 }}</span><span class="swp-cell-label">近7天活跃</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ rhythm.longestStreak }}</span><span class="swp-cell-label">最长连续</span></div>
          <div class="swp-cell"><span class="swp-cell-num">{{ rhythm.peakHour !== null ? rhythm.peakHour + '时' : '—' }}</span><span class="swp-cell-label">落字时段</span></div>
        </div>
        <div class="swp-tags" v-if="rhythm.topTags.length">
          <span v-for="t in rhythm.topTags" :key="t.tag" class="swp-tag">{{ t.tag }} · {{ t.count }}</span>
        </div>
      </div>

      <!-- 温故建议 -->
      <div class="swp-block" v-if="suggestion">
        <h3 class="swp-block-title">温故建议</h3>
        <div class="swp-suggest">
          <span class="swp-suggest-title">{{ suggestion.note.title || '未命名' }}</span>
          <span class="swp-suggest-reason">{{ suggestion.reason }}（{{ suggestion.days }} 天）</span>
        </div>
      </div>

      <!-- 书房健康 -->
      <div class="swp-block" v-if="health">
        <h3 class="swp-block-title">书房健康</h3>
        <div class="swp-health">
          <div class="swp-health-score">
            <span class="swp-health-num">{{ health.score }}</span>
            <span class="swp-health-label">{{ health.label }}</span>
          </div>
          <div class="swp-health-bars">
            <div class="swp-hbar">
              <span class="swp-hbar-label">节奏</span>
              <div class="swp-hbar-track"><div class="swp-hbar-fill" :style="{ width: pct(health.cadence / 40) }"></div></div>
              <span class="swp-hbar-num">{{ health.cadence }}/40</span>
            </div>
            <div class="swp-hbar">
              <span class="swp-hbar-label">广度</span>
              <div class="swp-hbar-track"><div class="swp-hbar-fill swp-hbar-fill--breadth" :style="{ width: pct(health.breadth / 30) }"></div></div>
              <span class="swp-hbar-num">{{ health.breadth }}/30</span>
            </div>
            <div class="swp-hbar">
              <span class="swp-hbar-label">深耕</span>
              <div class="swp-hbar-track"><div class="swp-hbar-fill swp-hbar-fill--depth" :style="{ width: pct(health.depth / 30) }"></div></div>
              <span class="swp-hbar-num">{{ health.depth }}/30</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="swp-insights">
        <li v-for="ins in insights" :key="ins" class="swp-insight">
          <span class="swp-insight-mark">✦</span>
          <span class="swp-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStudy } from '../modules/study'
import {
  studioOverview,
  writingRhythm,
  revisitSuggestion,
  studioHealth,
  studioInsights,
} from '../modules/study/study-analytics'

const { notes } = useStudy()

const hasData = computed(() => notes.value.length > 0)
const now = computed(() => new Date())

const overview = computed(() => (hasData.value ? studioOverview(notes.value, now.value) : null))
const rhythm = computed(() => (hasData.value ? writingRhythm(notes.value, now.value) : null))
const suggestion = computed(() => (hasData.value ? revisitSuggestion(notes.value, now.value) : null))
const health = computed(() => (hasData.value ? studioHealth(notes.value, now.value) : null))
const insights = computed(() => (hasData.value ? studioInsights(notes.value, now.value) : []))

function pct(v: number): string {
  return `${Math.max(0, Math.min(100, Math.round(v * 100)))}%`
}
</script>

<style scoped>
.swp-archive {
  display: block;
  width: 100%;
  max-width: 640px;
}
.swp-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.swp-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #ede5d8);
  letter-spacing: 0.02em;
}
.swp-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.swp-badge-gold {
  color: var(--accent-warm, #f0c040);
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.swp-badge-neutral {
  color: var(--text-secondary, #b5aa98);
  border-color: var(--border-light, #3a332a);
  background: transparent;
}
.swp-empty {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #b5aa98);
}
.swp-block {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light, #3a332a);
}
.swp-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #b5aa98);
  margin-bottom: 10px;
  letter-spacing: 0.06em;
}
.swp-g8 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.swp-g4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.swp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 55%, transparent);
}
.swp-cell-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #ede5d8);
}
.swp-cell-label {
  font-size: 11px;
  color: var(--text-secondary, #b5aa98);
  text-align: center;
}
.swp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.swp-tag {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-primary, #ede5d8);
  background: color-mix(in srgb, var(--bg-card, #241f18) 60%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.swp-suggest {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 45%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.swp-suggest-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #ede5d8);
}
.swp-suggest-reason {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.swp-health {
  display: flex;
  gap: 20px;
  align-items: center;
}
.swp-health-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 88px;
}
.swp-health-num {
  font-size: 34px;
  font-weight: 700;
  color: var(--accent-warm, #f0c040);
  line-height: 1;
}
.swp-health-label {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.swp-health-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.swp-hbar {
  display: grid;
  grid-template-columns: 40px 1fr 44px;
  align-items: center;
  gap: 8px;
}
.swp-hbar-label {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.swp-hbar-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 70%, transparent);
  overflow: hidden;
}
.swp-hbar-fill {
  width: 0;
  height: 100%;
  border-radius: 999px;
  background: #f0c040;
  transition: width 0.3s ease;
}
.swp-hbar-fill--breadth {
  background: #8a9a7a;
}
.swp-hbar-fill--depth {
  background: #c46a5a;
}
.swp-hbar-num {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
  text-align: right;
}
.swp-insights {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.swp-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #ede5d8);
}
.swp-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}
</style>
