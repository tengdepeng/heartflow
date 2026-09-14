<template>
  <section class="etp" data-enter>
    <div class="etp-head">
      <span class="etp-title">📈 情绪趋势</span>
      <span v-if="summary" class="etp-trend" :class="`etp-trend--${summary.overallTrend}`">
        {{ trendLabel(summary.overallTrend) }}
      </span>
    </div>

    <!-- 概览指标 -->
    <div v-if="summary" class="etp-metrics">
      <div class="etp-metric">
        <b>{{ summary.totalRecords }}</b><span>近30天记录</span>
      </div>
      <div class="etp-metric">
        <b :style="{ color: emotionColor(summary.dominantEmotion) }">{{ emotionLabel(summary.dominantEmotion) }}</b><span>主导情绪</span>
      </div>
      <div class="etp-metric">
        <b>{{ summary.stabilityScore }}</b><span>稳定度</span>
      </div>
      <div class="etp-metric">
        <b>{{ pct(summary.positiveRatio) }}</b><span>积极占比</span>
      </div>
      <div class="etp-metric">
        <b>{{ pct(summary.negativeRatio) }}</b><span>消极占比</span>
      </div>
      <div class="etp-metric">
        <b>{{ Math.round(summary.diversityIndex * 100) }}%</b><span>情绪多样</span>
      </div>
    </div>

    <!-- 趋势折线 -->
    <div v-if="trendPoints.length > 1" class="etp-chart">
      <svg :viewBox="`0 0 ${W} ${H}`" class="etp-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="etp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(240,192,64,0.28)" />
            <stop offset="100%" stop-color="rgba(240,192,64,0)" />
          </linearGradient>
        </defs>
        <polygon :points="areaPoints" fill="url(#etp-fill)" />
        <polyline :points="linePoints" fill="none" stroke="rgba(240,192,64,0.7)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
      <div class="etp-chart-labels">
        <span>{{ trendPoints[0].label }}</span>
        <span>{{ trendPoints[trendPoints.length - 1].label }}</span>
      </div>
    </div>

    <!-- 情绪分布 -->
    <div v-if="distribution.length" class="etp-dist">
      <div v-for="d in distribution" :key="d.type" class="etp-dist-row">
        <span class="etp-dist-dot" :style="{ background: d.color }"></span>
        <span class="etp-dist-label">{{ d.label }}</span>
        <div class="etp-dist-bar"><i :style="{ width: d.pct + '%', background: d.color }"></i></div>
        <span class="etp-dist-count">{{ d.count }}</span>
      </div>
    </div>

    <!-- 情绪模式 -->
    <div v-if="patterns.length" class="etp-block">
      <div class="etp-block-title">识别到的情绪模式</div>
      <div v-for="p in patterns.slice(0, 4)" :key="p.id" class="etp-pattern">
        <span class="etp-pattern-name">{{ p.name }}</span>
        <span class="etp-pattern-conf">{{ Math.round(p.confidence * 100) }}%</span>
        <span class="etp-pattern-desc">{{ p.description }}</span>
      </div>
    </div>

    <!-- 未来预测 -->
    <div v-if="predictions.length" class="etp-block">
      <div class="etp-block-title">未来情绪预测</div>
      <div class="etp-pred-row">
        <div v-for="pred in predictions.slice(0, 5)" :key="pred.date" class="etp-pred">
          <span class="etp-pred-date">{{ pred.date.slice(5) }}</span>
          <span class="etp-pred-icon">{{ emotionIcon(pred.predictedDominant) }}</span>
          <span class="etp-pred-label">{{ emotionLabel(pred.predictedDominant) }}</span>
        </div>
      </div>
    </div>

    <p v-if="!summary || summary.totalRecords === 0" class="etp-empty">
      记录第一朵情绪之花，趋势分析会在这里展开。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEmotionTrends } from '../modules/emotion/emotion-trends'
import { EMOTION_FLOWERS } from '../modules/emotion/types'
import type { EmotionRecord, EmotionType } from '../modules/emotion/types'

const props = defineProps<{ records: EmotionRecord[] }>()

const { analyzeAll } = useEmotionTrends()

const analysis = computed(() => analyzeAll(props.records, 30))
const summary = computed(() => analysis.value.summary)
const patterns = computed(() => analysis.value.patterns)
const predictions = computed(() => analysis.value.predictions)

const W = 320
const H = 72

const trendPoints = computed(() => {
  const trends = analysis.value.trends
  if (trends.length <= 1) return []
  // 取最近 30 个点，避免过密
  return trends.slice(-30)
})

const linePoints = computed(() => {
  const pts = trendPoints.value
  if (pts.length < 2) return ''
  const max = Math.max(...pts.map(p => p.total), 1)
  return pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * W
      const y = H - (p.total / max) * (H - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const areaPoints = computed(() => {
  const pts = trendPoints.value
  if (pts.length < 2) return ''
  const max = Math.max(...pts.map(p => p.total), 1)
  const line = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * W
      const y = H - (p.total / max) * (H - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return `${line} ${W},${H} 0,${H}`
})

const distribution = computed(() => {
  const counts: Record<string, number> = {}
  for (const r of props.records) {
    counts[r.type] = (counts[r.type] ?? 0) + 1
  }
  const total = Math.max(1, props.records.length)
  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label: emotionLabel(type),
      color: emotionColor(type),
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
})

function emotionLabel(type: string): string {
  return EMOTION_FLOWERS[type as EmotionType]?.label ?? type
}

function emotionColor(type: string): string {
  return EMOTION_FLOWERS[type as EmotionType]?.color ?? '#8a9a7a'
}

function emotionIcon(type: string): string {
  const map: Record<string, string> = {
    happy: '🌼', calm: '🌿', sad: '🌧️', anxious: '⚡', angry: '🔥',
  }
  return map[type] ?? '🌸'
}

function trendLabel(t: string): string {
  const map: Record<string, string> = {
    improving: '回暖中', declining: '走低中', stable: '平稳', volatile: '波动',
  }
  return map[t] ?? t
}

function pct(r: number): string {
  return Math.round(r * 100) + '%'
}
</script>

<style scoped>
.etp {
  margin: 18px 0;
  padding: 18px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
}

.etp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.etp-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.92);
}

.etp-trend {
  font-size: 12px;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.etp-trend--improving { color: #8fe0b0; }
.etp-trend--declining { color: #e08a8a; }
.etp-trend--stable { color: #f0c040; }
.etp-trend--volatile { color: #e0a0c0; }

.etp-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.etp-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.etp-metric b {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.2;
}

.etp-metric span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}

.etp-chart {
  margin-bottom: 14px;
}

.etp-svg {
  width: 100%;
  height: 72px;
  display: block;
}

.etp-chart-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;
}

.etp-dist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.etp-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.etp-dist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.etp-dist-label { flex: 0 0 44px; }
.etp-dist-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
.etp-dist-bar i { display: block; height: 100%; border-radius: 3px; transition: width 0.4s; }
.etp-dist-count { flex: 0 0 24px; text-align: right; font-size: 11px; color: rgba(255, 255, 255, 0.5); }

.etp-block { margin-bottom: 14px; }

.etp-block-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.etp-pattern {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.etp-pattern-name { font-size: 13px; color: rgba(255, 255, 255, 0.9); font-weight: 500; }
.etp-pattern-conf { font-size: 11px; color: #f0c040; }
.etp-pattern-desc { flex: 1 1 100%; font-size: 11px; color: rgba(255, 255, 255, 0.5); line-height: 1.5; }

.etp-pred-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.etp-pred {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.etp-pred-date { font-size: 10px; color: rgba(255, 255, 255, 0.4); }
.etp-pred-icon { font-size: 16px; }
.etp-pred-label { font-size: 10px; color: rgba(255, 255, 255, 0.7); }

.etp-empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .etp-metrics { grid-template-columns: repeat(2, 1fr); }
  .etp-pred-row { grid-template-columns: repeat(5, 1fr); }
}
</style>
