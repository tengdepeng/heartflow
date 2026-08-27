<template>
  <section class="jn-panel" aria-label="季节日志">
    <div class="jn-panel-head">
      <span class="jn-panel-title">📔 季节日志</span>
      <span class="jn-panel-sub">情绪追踪 · 季节反思 · 年度回顾</span>
    </div>
    <!-- 概览 -->
    <div class="jn-block">
      <span class="jn-block-label">日志概览</span>
      <div class="jn-stats">
        <div class="jn-stat">
          <span class="jn-stat-num">{{ entries.length }}</span>
          <span class="jn-stat-label">日志</span>
        </div>
        <div class="jn-stat">
          <span class="jn-stat-num">{{ currentSeasonLabel }}</span>
          <span class="jn-stat-label">当前季节</span>
        </div>
        <div class="jn-stat">
          <span class="jn-stat-num">{{ trendLabel }}</span>
          <span class="jn-stat-label">情绪趋势</span>
        </div>
      </div>
    </div>
    <!-- 新建日志 -->
    <div class="jn-block">
      <span class="jn-block-label">记录此刻</span>
      <div class="jn-row">
        <select v-model="form.season" class="jn-select">
          <option value="spring">🌸 春</option>
          <option value="summer">☀️ 夏</option>
          <option value="autumn">🍂 秋</option>
          <option value="winter">❄️ 冬</option>
        </select>
        <select v-model="form.mood" class="jn-select">
          <option v-for="m in moodOptions" :key="m.key" :value="m.key">{{ m.icon }} {{ m.label }}</option>
        </select>
      </div>
      <input v-model="form.title" class="jn-input" placeholder="标题（如：这个春天的感悟）" />
      <textarea v-model="form.content" class="jn-textarea" rows="3" placeholder="写下此刻的心情与思考…"></textarea>
      <button class="jn-btn jn-btn-primary" :disabled="!form.title.trim() || !form.content.trim()" @click="doCreate">记录</button>
      <div v-if="prompts.length" class="jn-prompts">
        <span class="jn-prompt-hint">季节反思提示：</span>
        <p v-for="p in prompts" :key="p.id" class="jn-prompt">「{{ p.question }}」<span class="jn-prompt-hint">（{{ p.hint }}）</span></p>
      </div>
    </div>
    <!-- 日志列表 -->
    <div v-if="entries.length" class="jn-block">
      <span class="jn-block-label">日志列表（{{ entries.length }}）</span>
      <div v-for="e in entries" :key="e.id" class="jn-entry">
        <div class="jn-entry-head">
          <span class="jn-entry-mood">{{ MOOD_ICONS[e.mood] }}</span>
          <span class="jn-entry-title">{{ e.title }}</span>
          <span class="jn-entry-season">{{ seasonLabel(e.season) }} {{ e.year }}</span>
          <button class="jn-entry-del" @click="removeEntry(e.id)">×</button>
        </div>
        <p class="jn-entry-content">{{ e.content }}</p>
        <div class="jn-entry-meta">
          <span v-if="e.solarTerm" class="jn-entry-tag">{{ e.solarTerm }}</span>
          <span v-if="e.weather" class="jn-entry-tag">{{ e.weather }}</span>
          <span v-if="e.keyEvents.length" class="jn-entry-tag">事件 {{ e.keyEvents.length }}</span>
          <span class="jn-entry-time">{{ formatTime(e.createdAt) }}</span>
        </div>
      </div>
    </div>
    <!-- 情绪分析 -->
    <div v-if="seasonMood" class="jn-block">
      <span class="jn-block-label">本季情绪分析</span>
      <p class="jn-mood-dominant">{{ MOOD_ICONS[seasonMood.dominantMood] }} 主导情绪：{{ MOOD_LABELS[seasonMood.dominantMood] }}</p>
      <div class="jn-dist">
        <div v-for="(count, mood) in seasonMood.moodDistribution" :key="mood" class="jn-dist-row">
          <span class="jn-dist-label">{{ moodIcon(mood) }} {{ moodLabel(mood) }}</span>
          <span class="jn-dist-bar">
            <span class="jn-dist-fill" :style="{ width: distPct(mood) + '%' }"></span>
          </span>
          <span class="jn-dist-num">{{ count }}</span>
        </div>
      </div>
      <p v-if="seasonMood.keywords.length" class="jn-keywords">关键词：{{ seasonMood.keywords.join('、') }}</p>
      <p class="jn-change">{{ seasonMood.changeFromPrevious }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useJournalStore } from '../modules/seasonal/journal-store'
import {
  getCurrentSeason,
  getSeasonalPrompts,
  analyzeSeasonalMood,
  generateMoodTrend,
  MOOD_LABELS,
  MOOD_ICONS,
} from '../modules/seasonal/seasonal-journal'
import type { Season } from '../modules/seasonal/types'

const journal = useJournalStore()

const moodOptions = (Object.keys(MOOD_LABELS) as Array<keyof typeof MOOD_LABELS>).map(key => ({
  key,
  label: MOOD_LABELS[key],
  icon: MOOD_ICONS[key],
}))

const entries = computed(() => journal.entries.value)
const currentSeason = getCurrentSeason()
const currentSeasonLabel = seasonLabel(currentSeason)
const prompts = computed(() => getSeasonalPrompts(currentSeason))

const form = reactive({
  season: currentSeason as Season,
  mood: 'peaceful' as keyof typeof MOOD_LABELS,
  title: '',
  content: '',
})

const trend = computed(() => generateMoodTrend(entries.value))
const trendLabel = computed(() => {
  if (trend.value.seasons.length < 2) return '—'
  const map = { improving: '上升 ↗', stable: '平稳 →', declining: '回落 ↘' }
  return map[trend.value.overallTrend]
})

const seasonMood = computed(() => analyzeSeasonalMood(entries.value, currentSeason, new Date().getFullYear()))

function doCreate() {
  journal.createJournalEntry(form.title, form.content, form.mood, form.season)
  form.title = ''
  form.content = ''
}

function removeEntry(id: string) {
  journal.removeJournalEntry(id)
}

function seasonLabel(s: Season) {
  const map: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
  return map[s]
}

function moodLabel(mood: string) {
  return MOOD_LABELS[mood as keyof typeof MOOD_LABELS] || mood
}

function moodIcon(mood: string) {
  return MOOD_ICONS[mood as keyof typeof MOOD_LABELS] || '💭'
}

function distPct(mood: string) {
  if (!seasonMood.value) return 0
  const total = Object.values(seasonMood.value.moodDistribution).reduce((s, n) => s + n, 0)
  return total ? Math.round(((seasonMood.value.moodDistribution[mood] || 0) / total) * 100) : 0
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<style scoped>
.jn-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.jn-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.jn-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.jn-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.jn-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.jn-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.jn-stats {
  display: flex;
  gap: 20px;
}
.jn-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.jn-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #c9d6b8;
}
.jn-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.jn-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.jn-select,
.jn-input,
.jn-textarea {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: #e8e4d8;
  font-size: 13px;
}
.jn-select {
  flex: 1;
}
.jn-input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.jn-textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 8px;
  resize: vertical;
}
.jn-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  color: #e8e4d8;
  background: rgba(139, 155, 122, 0.2);
}
.jn-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.jn-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.jn-prompts {
  margin-top: 10px;
}
.jn-prompt-hint {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.jn-prompt {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin: 3px 0;
}
.jn-entry {
  padding: 10px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.15);
}
.jn-entry:last-child {
  border-bottom: none;
}
.jn-entry-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.jn-entry-mood {
  font-size: 16px;
}
.jn-entry-title {
  font-size: 14px;
  font-weight: 600;
  color: #e8e4d8;
}
.jn-entry-season {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.jn-entry-del {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(232, 228, 216, 0.4);
  font-size: 16px;
  cursor: pointer;
}
.jn-entry-content {
  font-size: 13px;
  color: rgba(232, 228, 216, 0.75);
  margin: 4px 0;
}
.jn-entry-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.jn-entry-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(139, 155, 122, 0.15);
  color: rgba(232, 228, 216, 0.6);
}
.jn-entry-time {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.35);
  margin-left: auto;
}
.jn-mood-dominant {
  font-size: 14px;
  color: #c9d6b8;
  margin-bottom: 8px;
}
.jn-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}
.jn-dist-label {
  flex: 0 0 90px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.7);
}
.jn-dist-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.jn-dist-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #c9d6b8);
}
.jn-dist-num {
  flex: 0 0 20px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  text-align: right;
}
.jn-keywords {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
  margin-top: 8px;
}
.jn-change {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-top: 6px;
}
</style>
