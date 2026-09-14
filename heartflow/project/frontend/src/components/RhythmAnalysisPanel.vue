<template>
  <section class="rap">
    <div class="rap-head">
      <div class="rap-title-wrap">
        <span class="rap-title">🎵 运动节奏</span>
        <span class="rap-sub">频率 · 多样性 · 强度 · 最佳时刻</span>
      </div>
      <span class="rap-tag">{{ analysis.frequencyScore }} 分</span>
    </div>

    <p v-if="!records.length" class="rap-empty">
      记录运动后，这里会分析你的运动节奏与最佳时刻。
    </p>

    <template v-else>
      <!-- 频率 + 多样性 -->
      <div class="rap-scores">
        <div class="rap-score">
          <span class="rap-score-label">运动频率</span>
          <div class="rap-bar"><i :style="{ width: analysis.frequencyScore + '%' }"></i></div>
          <b>{{ analysis.frequencyScore }}</b>
        </div>
        <div class="rap-score">
          <span class="rap-score-label">运动多样</span>
          <div class="rap-bar"><i :style="{ width: analysis.varietyScore + '%' }"></i></div>
          <b>{{ analysis.varietyScore }}</b>
        </div>
      </div>

      <!-- 强度分布 -->
      <div class="rap-block">
        <span class="rap-block-label">强度分布</span>
        <div class="rap-intensities">
          <div v-for="i in intensityOrder" :key="i" class="rap-intensity">
            <span class="rap-intensity-dot" :style="{ background: intensityColor(i) }"></span>
            <span class="rap-intensity-label">{{ intensityLabel(i) }}</span>
            <span class="rap-intensity-count">{{ analysis.intensityDistribution[i] || 0 }} 次</span>
          </div>
        </div>
      </div>

      <!-- 类型分布 -->
      <div v-if="analysis.typeDistribution.length" class="rap-block">
        <span class="rap-block-label">类型分布</span>
        <div v-for="t in analysis.typeDistribution" :key="t.type" class="rap-type">
          <span class="rap-type-icon">{{ typeIcon(t.type) }}</span>
          <span class="rap-type-label">{{ typeLabel(t.type) }}</span>
          <div class="rap-bar"><i :style="{ width: t.percentage + '%' }"></i></div>
          <span class="rap-type-pct">{{ t.percentage }}%</span>
        </div>
      </div>

      <!-- 最佳时刻 -->
      <div class="rap-best">
        <div class="rap-best-item">
          <span class="rap-best-label">最佳运动日</span>
          <b>{{ analysis.bestDayOfWeek }}</b>
        </div>
        <div class="rap-best-item">
          <span class="rap-best-label">最佳时段</span>
          <b>{{ analysis.bestTimeOfDay }}</b>
        </div>
      </div>

      <!-- 建议 -->
      <div class="rap-advice">
        <p class="rap-advice-line">{{ analysis.recoverySuggestion }}</p>
        <p class="rap-advice-line rap-advice-next">{{ analysis.nextGoalSuggestion }}</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMovement, useRhythmAnalysis, movesToRecords, deriveRhythm } from '../modules/movement'
import { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META } from '../modules/movement'
import type { RhythmAnalysis as RhythmAnalysisData } from '../modules/movement'

const movement = useMovement()
movement.load()
const ra = useRhythmAnalysis()

const records = computed(() => movesToRecords(movement.items.value))
const rhythm = computed(() => deriveRhythm(records.value))

const analysis = ref<RhythmAnalysisData>(ra.analyzeRhythm([], rhythm.value))

watch(records, () => {
  analysis.value = ra.analyzeRhythm(records.value, rhythm.value)
}, { immediate: true, deep: true })

const intensityOrder = ['light', 'moderate', 'vigorous', 'extreme'] as const

function typeLabel(t: string) { return MOVEMENT_TYPE_META[t as keyof typeof MOVEMENT_TYPE_META]?.label ?? t }
function typeIcon(t: string) { return MOVEMENT_TYPE_META[t as keyof typeof MOVEMENT_TYPE_META]?.icon ?? '🎯' }
function intensityLabel(i: string) { return MOVEMENT_INTENSITY_META[i as keyof typeof MOVEMENT_INTENSITY_META]?.label ?? i }
function intensityColor(i: string) { return MOVEMENT_INTENSITY_META[i as keyof typeof MOVEMENT_INTENSITY_META]?.color ?? '#888' }
</script>

<style scoped>
.rap {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.rap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.rap-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.rap-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.rap-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.rap-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e3c08a; white-space: nowrap; }
.rap-empty { font-size: 12px; color: rgba(232, 221, 208, 0.4); margin: 4px 0 0; line-height: 1.7; }

.rap-scores { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.rap-score { display: flex; align-items: center; gap: 10px; }
.rap-score-label { width: 62px; font-size: 11px; color: rgba(232, 221, 208, 0.55); flex-shrink: 0; }
.rap-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.rap-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(158 45% 52%), hsl(208 45% 55%)); }
.rap-score b { width: 26px; text-align: right; font-size: 11px; font-weight: 500; color: rgba(232, 221, 208, 0.7); }

.rap-block { margin-bottom: 14px; }
.rap-block-label { display: block; font-size: 11px; color: rgba(232, 221, 208, 0.5); letter-spacing: 1px; margin-bottom: 8px; }
.rap-intensities { display: flex; flex-wrap: wrap; gap: 6px; }
.rap-intensity { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); font-size: 11px; }
.rap-intensity-dot { width: 8px; height: 8px; border-radius: 50%; }
.rap-intensity-label { color: rgba(232, 221, 208, 0.6); }
.rap-intensity-count { color: rgba(232, 221, 208, 0.4); }

.rap-type { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
.rap-type-icon { width: 20px; text-align: center; }
.rap-type-label { width: 44px; font-size: 12px; color: rgba(232, 221, 208, 0.65); }
.rap-type-pct { width: 40px; text-align: right; font-size: 11px; color: rgba(232, 221, 208, 0.5); }

.rap-best { display: flex; gap: 8px; margin-bottom: 14px; }
.rap-best-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.06); }
.rap-best-label { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.rap-best-item b { font-size: 14px; font-weight: 500; color: var(--text-high, #d8c3a5); }

.rap-advice { padding: 10px 12px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.rap-advice-line { margin: 0; font-size: 12px; line-height: 1.7; color: rgba(232, 221, 208, 0.6); }
.rap-advice-next { color: rgba(var(--accent-rgb), 0.6); margin-top: 4px; }
</style>
