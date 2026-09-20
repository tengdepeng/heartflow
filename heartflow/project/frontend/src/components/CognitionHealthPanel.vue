<template>
  <section class="chp" data-test="cognition-health-panel" aria-label="冥想健康驾驶舱">
    <header class="chp-head">
      <div class="chp-head-text">
        <h3 class="chp-title">🧘 冥想健康驾驶舱</h3>
        <p class="chp-sub">健康度 · 连续追踪 · 洞察 · 情绪关联 — 一页尽览修行之骨</p>
      </div>
      <span class="chp-level" :class="`chp-level--${levelKey}`" data-test="chp-level">
        {{ health.level.label }}
      </span>
    </header>

    <!-- 健康度 -->
    <div class="chp-block" data-test="chp-health">
      <div class="chp-health-grid">
        <div class="chp-health-score">
          <b class="chp-health-num" :style="{ color: health.level.color }">{{ health.score }}</b>
          <span class="chp-health-max">/ 100</span>
          <div class="chp-bar"><div class="chp-bar-fill" :style="{ width: barPct(health.score), background: health.level.color }"></div></div>
        </div>
        <div class="chp-health-meta">
          <div class="chp-health-meta-row">
            <span class="chp-k">总次数</span><b class="chp-v">{{ health.totalSessions }}</b>
            <span class="chp-k">总时长</span><b class="chp-v">{{ health.totalDuration }}min</b>
            <span class="chp-k">完成率</span><b class="chp-v">{{ health.completionRate }}%</b>
          </div>
          <div class="chp-health-meta-row">
            <span class="chp-k">平均时长</span><b class="chp-v">{{ health.averageDuration }}min</b>
            <span class="chp-k">每周频率</span><b class="chp-v">{{ health.weeklyFrequency }}</b>
            <span class="chp-k">情绪改善率</span><b class="chp-v">{{ health.moodImprovementRate }}%</b>
          </div>
          <ul v-if="health.suggestions.length" class="chp-sug" data-test="chp-sug">
            <li v-for="(s, i) in health.suggestions" :key="i" class="chp-sug-item">{{ s }}</li>
          </ul>
        </div>
      </div>
      <p v-if="health.totalSessions === 0" class="chp-empty" data-test="chp-empty">还没有冥想记录，健康数据将在首次冥落后显影。</p>
    </div>

    <!-- 连续追踪 -->
    <div v-if="health.totalSessions > 0" class="chp-block" data-test="chp-streak">
      <span class="chp-block-label">连续追踪</span>
      <div class="chp-streak-grid">
        <div class="chp-stat"><b class="chp-stat-num">{{ streak.currentStreak }}<i>天</i></b><span class="chp-stat-label">当前连续</span></div>
        <div class="chp-stat"><b class="chp-stat-num">{{ streak.longestStreak }}<i>天</i></b><span class="chp-stat-label">最长连续</span></div>
        <div class="chp-stat"><b class="chp-stat-num">{{ streak.daysToRecord }}<i>天</i></b><span class="chp-stat-label">距破纪录</span></div>
        <div class="chp-stat"><b class="chp-stat-num">{{ streak.streaksThisYear }}<i>段</i></b><span class="chp-stat-label">今年连续段</span></div>
        <div class="chp-stat"><b class="chp-stat-num">{{ streak.averageStreakLength }}<i>天</i></b><span class="chp-stat-label">平均连续长</span></div>
      </div>
    </div>

    <!-- 洞察摘要 -->
    <div v-if="insight.totalInsights > 0" class="chp-block" data-test="chp-insight">
      <span class="chp-block-label">洞察摘要</span>
      <div class="chp-insight-types">
        <span v-for="t in insight.byType" :key="t.type" class="chp-chip">{{ t.label }} {{ t.count }}</span>
      </div>
      <div v-if="insight.highPriority.length" class="chp-insight-group" data-test="chp-insight-high">
        <span class="chp-insight-group-label">需关注</span>
        <ul class="chp-insight-list">
          <li v-for="ins in insight.highPriority" :key="ins.id" class="chp-insight-item">
            <span class="chp-insight-title">{{ ins.title }}</span>
            <span class="chp-insight-desc">{{ ins.description }}</span>
          </li>
        </ul>
      </div>
      <div v-if="insight.milestones.length" class="chp-insight-group" data-test="chp-insight-milestone">
        <span class="chp-insight-group-label">里程碑</span>
        <ul class="chp-insight-list">
          <li v-for="ins in insight.milestones" :key="ins.id" class="chp-insight-item">
            <span class="chp-insight-title">🏆 {{ ins.title }}</span>
            <span class="chp-insight-desc">{{ ins.description }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- 情绪 → 冥想类型关联 -->
    <div v-if="moodRows.length" class="chp-block" data-test="chp-mood">
      <span class="chp-block-label">情绪 · 冥想类型关联</span>
      <div class="chp-mood-grid">
        <div v-for="m in moodRows" :key="m.mood" class="chp-mood-card" data-test="chp-mood-card">
          <span class="chp-mood-name">{{ moodLabel(m.mood) }}</span>
          <span v-if="m.mostEffectiveType" class="chp-mood-effective">{{ MEDITATION_TYPE_META[m.mostEffectiveType]?.icon }} {{ typeLabel(m.mostEffectiveType) }}</span>
          <span class="chp-mood-count">{{ m.totalSessions }} 次</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCognitionBridge } from '../modules/cognition/cognition-bridge'
import { MEDITATION_TYPE_META } from '../modules/light/types'
import type { MeditationType } from '../modules/light/types'

const bridge = useCognitionBridge()

const health = computed(() => bridge.meditationHealth.value)
const streak = computed(() => bridge.streakSummary.value)
const insight = computed(() => bridge.insightSummary.value)

const levelKey = computed(() => {
  const label = health.value.level.label
  if (label === '卓越') return 'excellence'
  if (label === '良好') return 'good'
  if (label === '发展中') return 'growing'
  if (label === '起步') return 'starting'
  return 'idle'
})

const moodRows = computed(() =>
  bridge.moodCorrelations.value
    .slice()
    .sort((a, b) => b.totalSessions - a.totalSessions)
    .slice(0, 4)
)

const MOOD_LABELS: Record<string, string> = {
  anxious: '焦虑',
  stressed: '压力',
  sad: '忧伤',
  tired: '疲惫',
  restless: '躁动',
  frustrated: '沮丧',
  neutral: '平静',
  calm: '宁静',
  peaceful: '平和',
  content: '满足',
  grateful: '感恩',
  joyful: '喜悦',
  energized: '充满活力',
  blissful: '极乐',
  lonely: '孤独',
}

function moodLabel(mood: string): string {
  return MOOD_LABELS[mood] ?? mood
}

function typeLabel(t: MeditationType): string {
  return MEDITATION_TYPE_META[t]?.label ?? t
}

function barPct(p: number): string {
  return `${Math.max(2, p)}%`
}
</script>

<style scoped>
.chp {
  margin-top: 20px;
  padding: 16px 18px;
  border: 1px solid rgba(var(--accent-rgb, 183, 134, 86), 0.22);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(var(--accent-rgb, 183, 134, 86), 0.08), rgba(0, 0, 0, 0.15) 70%);
}
.chp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.chp-title {
  margin: 0;
  font-size: 17px;
  letter-spacing: 0.5px;
}
.chp-sub {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.66;
}
.chp-level {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid currentColor;
}
.chp-level--excellence { color: #27ae60; background: #27ae6022; }
.chp-level--good { color: #3498db; background: #3498db22; }
.chp-level--growing { color: #f0b03a; background: #f0b03a22; }
.chp-level--starting { color: #e0955a; background: #e0955a22; }
.chp-level--idle { color: #95a5a6; background: #95a5a622; }
.chp-block { margin-top: 16px; }
.chp-block-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.85;
  letter-spacing: 0.4px;
}
.chp-health-grid {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 16px;
  align-items: center;
}
.chp-health-score { text-align: left; }
.chp-health-num { font-size: 44px; line-height: 1; font-weight: 700; }
.chp-health-max { font-size: 12px; opacity: 0.55; }
.chp-bar {
  margin-top: 8px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.chp-bar-fill { height: 100%; border-radius: 999px; }
.chp-health-meta-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.chp-k { font-size: 12px; opacity: 0.6; }
.chp-k + .chp-k { margin-left: 8px; }
.chp-v { font-size: 14px; }
.chp-sug {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.chp-sug-item {
  padding: 6px 10px;
  border-left: 2px solid var(--accent, #b78656);
  font-size: 12.5px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0 8px 8px 0;
}
.chp-empty { font-size: 12.5px; opacity: 0.7; margin: 12px 0 0; }
.chp-streak-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.chp-stat {
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  text-align: center;
}
.chp-stat-num { display: block; font-size: 22px; }
.chp-stat-num i { font-style: normal; font-size: 12px; opacity: 0.6; margin-left: 2px; }
.chp-stat-label { font-size: 11.5px; opacity: 0.65; }
.chp-insight-types { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.chp-chip {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(var(--accent-rgb, 183, 134, 86), 0.18);
  border: 1px solid rgba(var(--accent-rgb, 183, 134, 86), 0.3);
}
.chp-insight-group { margin-top: 10px; }
.chp-insight-group-label { display: block; font-size: 12px; opacity: 0.66; margin-bottom: 6px; }
.chp-insight-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.chp-insight-item {
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 12.5px;
}
.chp-insight-title { display: block; font-weight: 600; }
.chp-insight-desc { display: block; opacity: 0.72; margin-top: 2px; }
.chp-mood-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.chp-mood-card {
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chp-mood-name { font-weight: 600; font-size: 13px; }
.chp-mood-effective { font-size: 12.5px; opacity: 0.9; }
.chp-mood-count { font-size: 11.5px; opacity: 0.6; }
@media (max-width: 640px) {
  .chp-health-grid { grid-template-columns: 1fr; }
  .chp-streak-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>