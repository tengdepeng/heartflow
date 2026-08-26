<template>
  <section class="cap" aria-label="生物钟分析">
    <div class="cap-head">
      <div class="cap-title-wrap">
        <span class="cap-title">生物钟</span>
        <span class="cap-sub">晨型 · 夜猫 · 中间 · 双峰</span>
      </div>
      <span class="cap-count">{{ sleepRecords.length }} 条睡眠</span>
    </div>

    <p v-if="sleepRecords.length < 7" class="cap-empty">
      积累至少 7 天的睡眠记录后，这里会展开生物钟分析。
    </p>
    <template v-else>
      <div class="cap-hero">
        <div class="cap-chrono">
          <span class="cap-chrono-icon">{{ chronoIcon }}</span>
          <b class="cap-chrono-name">{{ chronoLabel }}</b>
          <span class="cap-chrono-conf">置信度 {{ Math.round(analysis.confidence * 100) }}%</span>
        </div>
        <div class="cap-hero-main">
          <span class="cap-block-label">你的作息节奏</span>
          <p class="cap-hero-desc">{{ chronoDesc }}</p>
        </div>
      </div>

      <div class="cap-metrics">
        <div class="cap-metric">
          <span class="cap-metric-label">最佳入睡</span>
          <b class="cap-metric-value">{{ analysis.optimalBedtime }}</b>
        </div>
        <div class="cap-metric">
          <span class="cap-metric-label">最佳起床</span>
          <b class="cap-metric-value">{{ analysis.optimalWakeTime }}</b>
        </div>
        <div class="cap-metric">
          <span class="cap-metric-label">平均睡眠</span>
          <b class="cap-metric-value">{{ analysis.averageSleepDuration.toFixed(1) }}<small> h</small></b>
        </div>
        <div class="cap-metric">
          <span class="cap-metric-label">睡眠效率</span>
          <b class="cap-metric-value">{{ Math.round(analysis.sleepEfficiency * 100) }}<small>%</small></b>
        </div>
        <div class="cap-metric">
          <span class="cap-metric-label">规律性</span>
          <b class="cap-metric-value">{{ Math.round(analysis.sleepRegularity * 100) }}<small>%</small></b>
        </div>
        <div class="cap-metric">
          <span class="cap-metric-label">社会时差</span>
          <b class="cap-metric-value">{{ analysis.socialJetlag.toFixed(1) }}<small> h</small></b>
        </div>
      </div>

      <div v-if="analysis.recommendations.length" class="cap-rec">
        <span class="cap-block-label">作息建议</span>
        <div v-for="(r, i) in analysis.recommendations" :key="i" class="cap-rec-item">
          <span class="cap-rec-pri" :class="'pri-' + r.priority">{{ PRIORITY_META[r.priority] }}</span>
          <div class="cap-rec-main">
            <b class="cap-rec-title">{{ r.title }}</b>
            <p class="cap-rec-desc">{{ r.description }}</p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChronotypeAnalysis, useBodyGreenhouse } from '../modules/body'
import type { ChronotypeAnalysis } from '../modules/body'

const chronoStore = useChronotypeAnalysis()
const greenhouse = useBodyGreenhouse()

const sleepRecords = computed(() => greenhouse.sleepRecords.value)
const analysis = computed<ChronotypeAnalysis>(() => chronoStore.analyzeChronotype(sleepRecords.value))

const CHRONO_META: Record<ChronotypeAnalysis['chronotype'], { label: string; icon: string; desc: string }> = {
  morning_lark: { label: '晨型人', icon: '🌅', desc: '你的身体在清晨最清醒，适合把重要的事安排在上午。' },
  night_owl: { label: '夜猫子', icon: '🦉', desc: '你的精力在夜晚更充沛，但可以尝试让入睡时间慢慢前移。' },
  intermediate: { label: '中间型', icon: '🌗', desc: '你的作息较为均衡，保持固定节奏就能维持良好状态。' },
  bimodal: { label: '双峰型', icon: '🌓', desc: '你的精力有两次高峰，善用午间小憩补充第二段清醒。' },
}

const PRIORITY_META: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const chronoLabel = computed(() => CHRONO_META[analysis.value.chronotype].label)
const chronoIcon = computed(() => CHRONO_META[analysis.value.chronotype].icon)
const chronoDesc = computed(() => CHRONO_META[analysis.value.chronotype].desc)
</script>

<style scoped>
.cap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}

.cap-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.cap-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cap-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}
.cap-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.cap-count {
  flex-shrink: 0;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.cap-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 24px 0;
}
.cap-block-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* ---- 主卡片 ---- */
.cap-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.cap-chrono {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 84px;
}
.cap-chrono-icon {
  font-size: 30px;
  line-height: 1.2;
}
.cap-chrono-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}
.cap-chrono-conf {
  font-size: 10px;
  color: var(--text-muted);
}
.cap-hero-main {
  flex: 1;
  min-width: 0;
}
.cap-hero-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 4px 0 0;
}

/* ---- 指标 ---- */
.cap-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.cap-metric {
  padding: 10px 8px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}
.cap-metric-label {
  font-size: 10px;
  color: var(--text-muted);
}
.cap-metric-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.cap-metric-value small {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.6;
}

/* ---- 建议 ---- */
.cap-rec {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cap-rec-item {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.cap-rec-pri {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 8px;
  height: fit-content;
}
.cap-rec-pri.pri-high {
  background: rgba(196, 106, 90, 0.15);
  color: #c46a5a;
}
.cap-rec-pri.pri-medium {
  background: rgba(240, 192, 64, 0.15);
  color: #f0c040;
}
.cap-rec-pri.pri-low {
  background: rgba(107, 159, 196, 0.15);
  color: #6b9fc4;
}
.cap-rec-main {
  flex: 1;
  min-width: 0;
}
.cap-rec-title {
  display: block;
  font-size: 13px;
  color: var(--text-primary);
}
.cap-rec-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 2px 0 0;
}

@media (max-width: 480px) {
  .cap-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
