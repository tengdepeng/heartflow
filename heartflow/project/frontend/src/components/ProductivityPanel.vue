<template>
  <section class="pp" aria-label="生产力洞察">
    <div class="pp-head">
      <span class="pp-title">⚡ 生产力洞察</span>
      <span class="pp-sub">效率评分 · 趋势预测 · 智能建议，看见工作韵律</span>
    </div>

    <div v-if="entries.length === 0" class="pp-empty">
      <span>📈</span>
      <p>还没有工作日志，记录后这里会生成效率评分与趋势预测。</p>
    </div>

    <template v-else>
      <!-- 效率评分 -->
      <div class="pp-score">
        <div class="pp-score-ring" :style="{ '--ring-pct': overallRing + '%' }">
          <b>{{ efficiency.overall }}</b>
          <span>效率评分</span>
        </div>
        <div class="pp-score-main">
          <div class="pp-score-head">
            <span class="pp-trend" :class="'tr-' + efficiency.trend">{{ trendLabel }}</span>
            <span class="pp-wow" :class="{ pos: efficiency.weekOverWeek >= 0 }">
              {{ efficiency.weekOverWeek >= 0 ? '▲' : '▼' }} {{ Math.abs(efficiency.weekOverWeek) }}%
            </span>
            <span class="pp-percentile">超越 {{ efficiency.percentile }}% 的自己</span>
          </div>
          <p class="pp-comment">{{ efficiency.comment }}</p>
          <div class="pp-dims">
            <div v-for="d in efficiency.dimensions" :key="d.name" class="pp-dim">
              <div class="pp-dim-head">
                <span class="pp-dim-label">{{ d.label }}</span>
                <span class="pp-dim-score">{{ d.score }}</span>
              </div>
              <div class="pp-dim-bar"><i :style="{ width: d.score + '%' }"></i></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 生产力趋势 -->
      <div class="pp-block">
        <div class="pp-block-head">
          <span class="pp-block-label">近 30 日生产力趋势</span>
          <span class="pp-dir" :class="'dir-' + trend.direction">
            {{ trend.direction === 'up' ? '上升' : trend.direction === 'down' ? '回落' : '平稳' }}
            <small>强度 {{ Math.round(trend.strength * 100) }}%</small>
          </span>
        </div>
        <div class="pp-chart">
          <svg class="pp-svg" viewBox="0 0 300 96" preserveAspectRatio="none">
            <polyline
              v-if="trend.movingAverage.length > 1"
              class="pp-ma-line"
              :points="maPoints"
            />
            <circle
              v-for="(p, i) in maPath"
              :key="i"
              class="pp-ma-dot"
              :cx="p.x" :cy="p.y" r="1.6"
            />
          </svg>
          <div class="pp-bars">
            <div v-for="(d, i) in dailyScores" :key="i" class="pp-bar-wrap" :title="`${d.date}: ${d.score}`">
              <div class="pp-bar" :style="{ height: barHeight(d.score) }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 未来一周预测 -->
      <div class="pp-block" v-if="predictions.length > 0">
        <span class="pp-block-label">未来一周预测</span>
        <div class="pp-predictions">
          <div v-for="p in predictions" :key="p.date" class="pp-pred">
            <div class="pp-pred-head">
              <b>{{ p.predictedScore }}</b>
              <span class="pp-pred-date">{{ p.date.slice(5).replace('-', '/') }}</span>
            </div>
            <span class="pp-pred-label" :style="{ color: LABEL_META[p.label].color }">
              {{ LABEL_META[p.label].label }}
            </span>
            <div class="pp-conf"><i :style="{ width: p.confidence * 100 + '%' }"></i></div>
          </div>
        </div>
      </div>

      <!-- 智能建议 -->
      <div class="pp-block" v-if="suggestions.length > 0">
        <span class="pp-block-label">智能建议</span>
        <div class="pp-sugs">
          <div v-for="s in suggestions" :key="s.id" class="pp-sug" :class="'pr-' + s.priority">
            <div class="pp-sug-head">
              <span class="pp-sug-cat">{{ CATEGORY_META[s.category].label }}</span>
              <b class="pp-sug-title">{{ s.title }}</b>
              <span class="pp-sug-impact">+{{ s.expectedImpact }}%</span>
            </div>
            <p class="pp-sug-desc">{{ s.description }}</p>
            <ul class="pp-sug-actions">
              <li v-for="(a, i) in s.actionables" :key="i">{{ a }}</li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWorklog } from '../modules/worklog/entries'
import { useProductivityPrediction } from '../modules/worklog/productivity-prediction'
import type { ProductivityPrediction } from '../modules/worklog/productivity-prediction'

const worklog = useWorklog()
const predict = useProductivityPrediction()

const entries = computed(() => worklog.entries.value)

const efficiency = computed(() => predict.scoreEfficiency(entries.value, 30))
const trend = computed(() => predict.computeTrend(entries.value, 30))
const predictions = computed<ProductivityPrediction[]>(() => trend.value.nextWeekPrediction)
const suggestions = computed(() => predict.generateSuggestions(entries.value, efficiency.value, trend.value))

const dailyScores = computed(() => trend.value.dailyScores)
const overallRing = computed(() => efficiency.value.overall)

const trendLabel = computed(() =>
  efficiency.value.trend === 'improving' ? '持续提升' : efficiency.value.trend === 'declining' ? '有所回落' : '保持稳定',
)

const LABEL_META: Record<ProductivityPrediction['label'], { label: string; color: string }> = {
  peak: { label: '巅峰', color: '#f0c040' },
  high: { label: '高效', color: '#8a9a7a' },
  normal: { label: '正常', color: '#6b9fc4' },
  low: { label: '低效', color: '#cf8b6b' },
  rest: { label: '休息', color: '#c46a5a' },
}

const CATEGORY_META: Record<string, { label: string }> = {
  time: { label: '时间' },
  mood: { label: '情绪' },
  focus: { label: '专注' },
  balance: { label: '平衡' },
  growth: { label: '成长' },
}

const maxScore = computed(() => Math.max(...dailyScores.value.map(d => d.score), 1))

function barHeight(score: number): string {
  return Math.max(3, (score / maxScore.value) * 100) + '%'
}

// 7 日移动平均折线：映射到 300x96 SVG 坐标系
const maPath = computed(() => {
  const pts = trend.value.movingAverage
  const max = Math.max(...dailyScores.value.map(d => d.score), 1)
  return pts.map((v, i) => ({
    x: pts.length > 1 ? (i / (pts.length - 1)) * 280 + 10 : 10,
    y: max > 0 ? 84 - (v / max) * 78 : 84,
  }))
})

const maPoints = computed(() => maPath.value.map(p => `${p.x},${p.y}`).join(' '))

onMounted(() => worklog.load())
</script>

<style scoped>
.pp {
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(240, 192, 64, 0.14);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pp-title {
  font-size: 14px;
  font-weight: 600;
  color: #e8b64c;
  letter-spacing: 1px;
}
.pp-sub {
  font-size: 11px;
  color: rgba(232, 182, 76, 0.5);
}

.pp-empty {
  text-align: center;
  padding: 36px 16px;
  color: rgba(232, 182, 76, 0.35);
}
.pp-empty span { font-size: 30px; display: block; margin-bottom: 8px; }
.pp-empty p { font-size: 12px; }

/* ---- 效率评分 ---- */
.pp-score {
  display: flex;
  gap: 16px;
  align-items: stretch;
}
.pp-score-ring {
  --ring-pct: 0%;
  flex: 0 0 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(closest-side, var(--bg-card, #1c2026) 79%, transparent 80% 100%),
    conic-gradient(#e8b64c var(--ring-pct), rgba(232, 182, 76, 0.15) 0);
}
.pp-score-ring b { font-size: 24px; color: #e8b64c; line-height: 1.1; }
.pp-score-ring span { font-size: 9px; color: rgba(232, 182, 76, 0.55); }
.pp-score-main { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pp-score-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pp-trend { font-size: 11px; padding: 2px 8px; border-radius: 8px; background: rgba(138, 154, 122, 0.15); color: #8a9a7a; }
.pp-trend.tr-declining { background: rgba(196, 106, 90, 0.15); color: #c46a5a; }
.pp-wow { font-size: 11px; color: #c46a5a; }
.pp-wow.pos { color: #8a9a7a; }
.pp-percentile { font-size: 11px; color: rgba(232, 182, 76, 0.5); }
.pp-comment { font-size: 12px; color: rgba(240, 210, 150, 0.75); line-height: 1.5; margin: 0; }
.pp-dims { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; }
.pp-dim-head { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }
.pp-dim-label { color: rgba(232, 182, 76, 0.55); }
.pp-dim-score { color: #e8b64c; font-weight: 600; }
.pp-dim-bar { height: 4px; border-radius: 2px; background: rgba(232, 182, 76, 0.12); overflow: hidden; }
.pp-dim-bar i { display: block; height: 100%; background: linear-gradient(90deg, rgba(232, 182, 76, 0.6), #e8b64c); border-radius: 2px; }

/* ---- 趋势 ---- */
.pp-block { display: flex; flex-direction: column; gap: 10px; }
.pp-block-head { display: flex; align-items: center; justify-content: space-between; }
.pp-block-label { font-size: 12px; font-weight: 600; color: rgba(232, 182, 76, 0.7); letter-spacing: 1px; }
.pp-dir { font-size: 10px; color: #8a9a7a; }
.pp-dir.dir-down { color: #c46a5a; }
.pp-dir small { opacity: 0.6; }
.pp-chart {
  position: relative;
  height: 110px;
  padding: 6px 10px 0;
  border-radius: 10px;
  background: rgba(232, 182, 76, 0.04);
  border: 1px solid rgba(232, 182, 76, 0.08);
  overflow: hidden;
}
.pp-svg { position: absolute; inset: 6px 10px 22px; width: calc(100% - 20px); height: calc(100% - 28px); }
.pp-ma-line { fill: none; stroke: #e8b64c; stroke-width: 1.4; stroke-linejoin: round; stroke-linecap: round; opacity: 0.85; }
.pp-ma-dot { fill: #e8b64c; opacity: 0.7; }
.pp-bars {
  position: absolute;
  inset: 6px 10px 0;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}
.pp-bar-wrap { flex: 1; display: flex; align-items: flex-end; min-width: 2px; position: relative; }
.pp-bar {
  width: 100%;
  border-radius: 1.5px 1.5px 0 0;
  background: linear-gradient(to top, rgba(232, 182, 76, 0.45), rgba(232, 182, 76, 0.16));
  min-height: 2px;
}

/* ---- 预测 ---- */
.pp-predictions { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.pp-pred {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(232, 182, 76, 0.05);
  border: 1px solid rgba(232, 182, 76, 0.08);
}
.pp-pred-head { display: flex; flex-direction: column; align-items: center; }
.pp-pred-head b { font-size: 16px; color: #e8b64c; }
.pp-pred-date { font-size: 9px; color: rgba(232, 182, 76, 0.45); }
.pp-pred-label { text-align: center; font-size: 10px; }
.pp-conf { height: 3px; border-radius: 2px; background: rgba(232, 182, 76, 0.12); overflow: hidden; }
.pp-conf i { display: block; height: 100%; background: #e8b64c; }

/* ---- 建议 ---- */
.pp-sugs { display: flex; flex-direction: column; gap: 8px; }
.pp-sug {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(232, 182, 76, 0.05);
  border: 1px solid rgba(232, 182, 76, 0.08);
  border-left: 3px solid #8a9a7a;
}
.pp-sug.pr-high { border-left-color: #e8b64c; }
.pp-sug.pr-low { border-left-color: rgba(232, 182, 76, 0.25); }
.pp-sug-head { display: flex; align-items: center; gap: 8px; }
.pp-sug-cat { font-size: 9px; padding: 1px 6px; border-radius: 6px; background: rgba(232, 182, 76, 0.12); color: #e8b64c; }
.pp-sug-title { font-size: 12px; font-weight: 600; color: rgba(240, 210, 150, 0.9); flex: 1; }
.pp-sug-impact { font-size: 10px; color: #8a9a7a; }
.pp-sug-desc { font-size: 11px; color: rgba(232, 182, 76, 0.6); margin: 6px 0; }
.pp-sug-actions { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 2px; }
.pp-sug-actions li { font-size: 10px; color: rgba(232, 182, 76, 0.45); }
</style>