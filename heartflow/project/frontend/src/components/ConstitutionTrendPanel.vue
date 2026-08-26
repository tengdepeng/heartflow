<template>
  <section class="ctp" aria-label="体质趋势">
    <div class="ctp-head">
      <span class="ctp-title">🧬 体质趋势</span>
      <span class="ctp-sub">体质稳定性 · 趋势方向 · 养生评分 · 转变记录</span>
    </div>

    <!-- 体质稳定性 -->
    <div class="ctp-block">
      <span class="ctp-block-label">体质稳定性</span>
      <template v-if="stability">
        <div class="ctp-stability-row">
          <span class="ctp-stability-badge" :class="{ stable: stability.stable }">
            {{ stability.stable ? '稳定' : '波动' }}
          </span>
          <span class="ctp-stability-text">{{ stability.analysis }}</span>
        </div>
        <div class="ctp-bar"><span class="ctp-bar-fill" :style="{ width: Math.round(stability.stability * 100) + '%' }"></span></div>
        <span class="ctp-stability-meta">
          稳定度 {{ Math.round(stability.stability * 100) }}% · 主导体质 {{ metaOf(stability.dominantType) }} · 近 10 次出现 {{ stability.uniqueTypes }} 种
        </span>
      </template>
      <p v-else class="ctp-empty">暂无体质记录，完成体质分析后自动生成趋势。</p>
    </div>

    <!-- 最近趋势 -->
    <div class="ctp-block">
      <span class="ctp-block-label">最近趋势</span>
      <template v-if="recent">
        <div class="ctp-trend-row">
          <span class="ctp-trend-badge" :class="recent.direction">
            {{ recent.direction === 'improving' ? '↑ 改善' : recent.direction === 'declining' ? '↓ 波动' : '→ 平稳' }}
          </span>
          <span class="ctp-trend-change">近 5 次主分变化 {{ recent.change > 0 ? '+' : '' }}{{ recent.change }}</span>
        </div>
        <div class="ctp-trend-list">
          <div v-for="p in recent.trend" :key="p.date" class="ctp-trend-point">
            <span class="ctp-trend-date">{{ fmtDate(p.date) }}</span>
            <span class="ctp-trend-label">{{ metaOf(p.type) }}</span>
            <div class="ctp-trend-bar"><span class="ctp-trend-fill" :style="{ width: Math.round(p.primaryScore * 100) + '%' }"></span></div>
            <span class="ctp-trend-score">{{ Math.round(p.primaryScore * 100) }}</span>
          </div>
        </div>
      </template>
      <p v-else class="ctp-empty">至少需要 2 次体质记录才能生成趋势。</p>
    </div>

    <!-- 养生评分 -->
    <div class="ctp-block">
      <span class="ctp-block-label">养生评分</span>
      <template v-if="latestScore">
        <div class="ctp-score-head">
          <span class="ctp-score-overall">{{ latestScore.overall }}</span>
          <span class="ctp-score-trend" :class="latestScore.trend">
            {{ latestScore.trend === 'improving' ? '↑' : latestScore.trend === 'declining' ? '↓' : '→' }}
            {{ latestScore.change > 0 ? '+' : '' }}{{ latestScore.change }}
          </span>
        </div>
        <div class="ctp-score-dims">
          <div v-for="(val, key) in latestScore.dimensions" :key="key" class="ctp-score-dim">
            <span class="ctp-score-dim-label">{{ latestScore.labels[key] }}</span>
            <div class="ctp-score-dim-bar"><span class="ctp-score-dim-fill" :style="{ width: val + '%' }"></span></div>
            <span class="ctp-score-dim-val">{{ val }}</span>
          </div>
        </div>
      </template>
      <p v-else class="ctp-empty">暂无养生评分。</p>
    </div>

    <!-- 体质转变记录 -->
    <div class="ctp-block">
      <span class="ctp-block-label">体质转变记录 · {{ changeLog.length }}</span>
      <div v-if="changeLog.length" class="ctp-changelog">
        <div v-for="c in changeLog.slice(0, 6)" :key="c.detectedAt" class="ctp-change">
          <span class="ctp-change-badge" :class="c.direction">
            {{ c.direction === 'improved' ? '改善' : c.direction === 'worsened' ? '恶化' : '转变' }}
          </span>
          <span class="ctp-change-text">
            {{ c.hasChanged ? metaOf(c.previousType) + ' → ' : '' }}{{ metaOf(c.currentType) }}
            <span v-if="c.changeType === 'sudden'" class="ctp-change-tag">突变</span>
          </span>
          <span class="ctp-change-date">{{ fmtDate(c.detectedAt) }}</span>
        </div>
      </div>
      <p v-else class="ctp-empty">暂无体质转变记录。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getConstitutionTrendStore } from '../modules/body-wisdom/constitution-trend'
import { CONSTITUTION_META } from '../modules/body-wisdom/types'
import type { ConstitutionType } from '../modules/body-wisdom/types'

const store = getConstitutionTrendStore()

const stability = computed(() => store.stabilityAnalysis.value)
const recent = computed(() => store.recentTrend.value)
const latestScore = computed(() => store.latestWellnessScore.value)
const changeLog = computed(() => store.changeLog.value)

function metaOf(type: ConstitutionType | null | undefined): string {
  if (!type) return '—'
  return CONSTITUTION_META[type]?.label ?? type
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.ctp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border, rgba(120, 140, 120, 0.25));
  border-radius: 12px;
  background: var(--surface, rgba(20, 26, 20, 0.6));
}
.ctp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ctp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #e8ece4);
}
.ctp-sub {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
}
.ctp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.ctp-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent, #8a9a7a);
}
.ctp-stability-row,
.ctp-trend-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ctp-stability-badge,
.ctp-trend-badge,
.ctp-change-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.ctp-stability-badge.stable,
.ctp-trend-badge.improving,
.ctp-change-badge.improved {
  background: rgba(138, 154, 122, 0.2);
  color: #8a9a7a;
}
.ctp-stability-badge:not(.stable),
.ctp-trend-badge.declining,
.ctp-change-badge.worsened {
  background: rgba(196, 106, 90, 0.2);
  color: #c46a5a;
}
.ctp-trend-badge.stable,
.ctp-change-badge.shifted {
  background: rgba(160, 124, 140, 0.2);
  color: #a07c8c;
}
.ctp-stability-text,
.ctp-trend-change {
  font-size: 12px;
  color: var(--text, #e8ece4);
}
.ctp-stability-meta {
  font-size: 11px;
  color: var(--text-dim, #9aa59a);
}
.ctp-bar,
.ctp-trend-bar,
.ctp-score-dim-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.ctp-bar-fill,
.ctp-trend-fill,
.ctp-score-dim-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent, #8a9a7a);
}
.ctp-trend-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ctp-trend-point {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.ctp-trend-date {
  color: var(--text-dim, #9aa59a);
  min-width: 44px;
}
.ctp-trend-label {
  color: var(--text, #e8ece4);
  min-width: 56px;
}
.ctp-trend-bar {
  flex: 1;
}
.ctp-trend-score {
  color: var(--accent, #8a9a7a);
  min-width: 28px;
  text-align: right;
}
.ctp-score-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ctp-score-overall {
  font-size: 28px;
  font-weight: 700;
  color: var(--text, #e8ece4);
}
.ctp-score-trend {
  font-size: 12px;
}
.ctp-score-trend.improving {
  color: #8a9a7a;
}
.ctp-score-trend.declining {
  color: #c46a5a;
}
.ctp-score-trend.stable {
  color: #a07c8c;
}
.ctp-score-dims {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ctp-score-dim {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.ctp-score-dim-label {
  color: var(--text-dim, #9aa59a);
  min-width: 56px;
}
.ctp-score-dim-bar {
  flex: 1;
}
.ctp-score-dim-val {
  color: var(--accent, #8a9a7a);
  min-width: 24px;
  text-align: right;
}
.ctp-changelog {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ctp-change {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.ctp-change-text {
  color: var(--text, #e8ece4);
  flex: 1;
}
.ctp-change-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(196, 106, 90, 0.2);
  color: #c46a5a;
}
.ctp-change-date {
  color: var(--text-dim, #9aa59a);
}
.ctp-empty {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
  margin: 0;
}
</style>
