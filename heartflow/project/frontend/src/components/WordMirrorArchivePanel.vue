<template>
  <section class="wmap-archive" aria-label="字镜档案">
    <!-- 空态（无词汇且无分析历史） -->
    <template v-if="!hasData">
      <div class="wmap-head">
        <span class="wmap-title">✨ 字镜档案</span>
        <span class="wmap-badge wmap-badge-neutral">字镜未启</span>
      </div>
      <p class="wmap-empty">
        字镜还是空的。记下第一个词，或映照第一段文字——字里行间会在这面墙上显影成习得的余温。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="wmap-head">
        <span class="wmap-title">✨ 字镜档案</span>
        <span class="wmap-badge wmap-badge-gold">{{ health?.label }}</span>
      </div>

      <!-- 字镜概览 -->
      <div class="wmap-block" v-if="overview">
        <h3 class="wmap-block-title">字镜概览</h3>
        <div class="wmap-g8">
          <div class="wmap-cell"><span class="wmap-cell-num">{{ overview.total }}</span><span class="wmap-cell-label">总词汇</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ overview.mastered }}</span><span class="wmap-cell-label">精通</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ overview.favorites }}</span><span class="wmap-cell-label">收藏</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ overview.staleCount }}</span><span class="wmap-cell-label">生疏</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ overview.avgProficiency }}</span><span class="wmap-cell-label">平均熟练</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ overview.reviewedOnce }}</span><span class="wmap-cell-label">已复习</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ overview.reviewed7 }}</span><span class="wmap-cell-label">近7天复习</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ overview.totalAnalyses }}</span><span class="wmap-cell-label">文字分析</span></div>
        </div>
      </div>

      <!-- 熟练度分布 -->
      <div class="wmap-block" v-if="profRows.length">
        <h3 class="wmap-block-title">熟练度分布</h3>
        <div class="wmap-rows">
          <div v-for="r in profRows" :key="r.key" class="wmap-row">
            <span class="wmap-dot" :style="{ background: r.color }"></span>
            <span class="wmap-row-label">{{ r.label }}</span>
            <div class="wmap-row-track"><div class="wmap-row-fill" :style="{ width: pct(r.pct / 100), background: r.color }"></div></div>
            <span class="wmap-row-num">{{ r.count }} · {{ r.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 词条状态分布 -->
      <div class="wmap-block" v-if="statusRows.length">
        <h3 class="wmap-block-title">词条状态</h3>
        <div class="wmap-rows">
          <div v-for="r in statusRows" :key="r.key" class="wmap-row">
            <span class="wmap-dot" :style="{ background: r.color }"></span>
            <span class="wmap-row-label">{{ r.label }}</span>
            <div class="wmap-row-track"><div class="wmap-row-fill" :style="{ width: pct(r.pct / 100), background: r.color }"></div></div>
            <span class="wmap-row-num">{{ r.count }} · {{ r.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 复习节律 -->
      <div class="wmap-block" v-if="rhythm">
        <h3 class="wmap-block-title">复习节律</h3>
        <div class="wmap-g5">
          <div class="wmap-cell"><span class="wmap-cell-num">{{ rhythm.reviewed7 }}</span><span class="wmap-cell-label">近7天</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ rhythm.reviewed30 }}</span><span class="wmap-cell-label">近30天</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ rhythm.reviewCoverage }}%</span><span class="wmap-cell-label">复习覆盖</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ rhythm.staleDays !== null ? rhythm.staleDays + '天' : '—' }}</span><span class="wmap-cell-label">最久未复习</span></div>
          <div class="wmap-cell"><span class="wmap-cell-num">{{ rhythm.staleCount }}</span><span class="wmap-cell-label">生疏词</span></div>
        </div>
      </div>

      <!-- 近期打磨词 -->
      <div class="wmap-block" v-if="recent.length">
        <h3 class="wmap-block-title">近期打磨词</h3>
        <div class="wmap-tags">
          <span v-for="w in recent" :key="w.word" class="wmap-tag">{{ w.word }}</span>
        </div>
      </div>

      <!-- 字镜健康 -->
      <div class="wmap-block" v-if="health">
        <h3 class="wmap-block-title">字镜健康</h3>
        <div class="wmap-health">
          <div class="wmap-health-score">
            <span class="wmap-health-num">{{ health.score }}</span>
            <span class="wmap-health-label">{{ health.label }}</span>
          </div>
          <div class="wmap-health-bars">
            <div class="wmap-hbar">
              <span class="wmap-hbar-label">广度</span>
              <div class="wmap-hbar-track"><div class="wmap-hbar-fill" :style="{ width: pct(health.breadth / 100) }"></div></div>
              <span class="wmap-hbar-num">{{ health.breadth }}</span>
            </div>
            <div class="wmap-hbar">
              <span class="wmap-hbar-label">厚度</span>
              <div class="wmap-hbar-track"><div class="wmap-hbar-fill wmap-hbar-fill--depth" :style="{ width: pct(health.depth / 100) }"></div></div>
              <span class="wmap-hbar-num">{{ health.depth }}</span>
            </div>
            <div class="wmap-hbar">
              <span class="wmap-hbar-label">延续</span>
              <div class="wmap-hbar-track"><div class="wmap-hbar-fill wmap-hbar-fill--continuity" :style="{ width: pct(health.continuity / 100) }"></div></div>
              <span class="wmap-hbar-num">{{ health.continuity }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 温和回看建议 -->
      <ul v-if="insights.length" class="wmap-insights">
        <li v-for="ins in insights" :key="ins" class="wmap-insight">
          <span class="wmap-insight-mark">✦</span>
          <span class="wmap-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWordMirror } from '../modules/word-mirror/word-mirror-store'
import {
  wordMirrorOverview,
  wordProficiencyRows,
  wordStatusRows,
  wordMirrorRhythm,
  wordRecentlyPracticed,
  wordMirrorHealth,
  wordMirrorInsights,
} from '../modules/word-mirror/word-mirror-analytics'

const { words, history } = useWordMirror()

const hasData = computed(() => words.value.length > 0 || history.value.length > 0)
const now = computed(() => new Date())

const overview = computed(() => (hasData.value ? wordMirrorOverview(words.value, history.value, now.value) : null))
const profRows = computed(() => (hasData.value ? wordProficiencyRows(words.value) : []))
const statusRows = computed(() => (hasData.value ? wordStatusRows(words.value, now.value) : []))
const rhythm = computed(() => (hasData.value ? wordMirrorRhythm(words.value, now.value) : null))
const recent = computed(() => (hasData.value ? wordRecentlyPracticed(words.value, 5) : []))
const health = computed(() => (hasData.value ? wordMirrorHealth(words.value, history.value, now.value) : null))
const insights = computed(() => (hasData.value ? wordMirrorInsights(words.value, history.value, now.value) : []))

function pct(v: number): string {
  return `${Math.max(0, Math.min(100, Math.round(v * 100)))}%`
}
</script>

<style scoped>
.wmap-archive {
  display: block;
  width: 100%;
  max-width: 640px;
}
.wmap-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.wmap-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #ede5d8);
  letter-spacing: 0.02em;
}
.wmap-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.wmap-badge-gold {
  color: var(--accent-warm, #f0c040);
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.wmap-badge-neutral {
  color: var(--text-secondary, #b5aa98);
  border-color: var(--border-light, #3a332a);
  background: transparent;
}
.wmap-empty {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #b5aa98);
}
.wmap-block {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light, #3a332a);
}
.wmap-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #b5aa98);
  margin-bottom: 10px;
  letter-spacing: 0.06em;
}
.wmap-g8 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.wmap-g5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.wmap-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 55%, transparent);
}
.wmap-cell-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #ede5d8);
}
.wmap-cell-label {
  font-size: 11px;
  color: var(--text-secondary, #b5aa98);
  text-align: center;
}
.wmap-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wmap-row {
  display: grid;
  grid-template-columns: 12px 64px 1fr 72px;
  align-items: center;
  gap: 8px;
}
.wmap-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.wmap-row-label {
  font-size: 12px;
  color: var(--text-primary, #ede5d8);
}
.wmap-row-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 70%, transparent);
  overflow: hidden;
}
.wmap-row-fill {
  width: 0;
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.wmap-row-num {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
  text-align: right;
}
.wmap-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.wmap-tag {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-primary, #ede5d8);
  background: color-mix(in srgb, var(--bg-card, #241f18) 60%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.wmap-health {
  display: flex;
  gap: 20px;
  align-items: center;
}
.wmap-health-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 88px;
}
.wmap-health-num {
  font-size: 34px;
  font-weight: 700;
  color: var(--accent-warm, #f0c040);
  line-height: 1;
}
.wmap-health-label {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.wmap-health-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wmap-hbar {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 8px;
}
.wmap-hbar-label {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.wmap-hbar-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 70%, transparent);
  overflow: hidden;
}
.wmap-hbar-fill {
  width: 0;
  height: 100%;
  border-radius: 999px;
  background: #f0c040;
  transition: width 0.3s ease;
}
.wmap-hbar-fill--depth {
  background: #8a9a7a;
}
.wmap-hbar-fill--continuity {
  background: #c46a5a;
}
.wmap-hbar-num {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
  text-align: right;
}
.wmap-insights {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.wmap-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #ede5d8);
}
.wmap-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}
</style>
