<template>
  <section class="mtp">
    <header class="mtp-head">
      <h3 class="mtp-title">📈 指标趋势档案</h3>
      <p class="mtp-sub">趋势 · 关联 · 预警 · 持续记录，让身体数据慢慢显影</p>
    </header>

    <!-- 温和洞察 -->
    <div class="mtp-insights" v-if="insights.length">
      <p v-for="(ins, i) in insights" :key="i" class="mtp-insight">{{ ins }}</p>
    </div>

    <!-- 空态 / 数据不足 -->
    <div class="mtp-empty" v-if="!analysis || analysis.metricTrends.length === 0">
      <span>🌱</span>
      <p>趋势还没生成。持续记录健康数据，趋势会在这里慢慢显影——上升、回落、起伏，皆是身体的回响。</p>
    </div>

    <template v-else>
      <!-- 整体评估 -->
      <div class="mtp-overall">
        <p class="mtp-assessment">{{ analysis.overallAssessment }}</p>
        <span class="mtp-trend-badge" :class="'dir-' + analysis.overallTrend">
          {{ DIRECTION_META[analysis.overallTrend].icon }} 整体{{ DIRECTION_META[analysis.overallTrend].label }}
        </span>
      </div>

      <!-- 最佳 / 最需关注 -->
      <div class="mtp-best-worst" v-if="analysis.bestMetric || analysis.worstMetric">
        <span class="mtp-bw best" v-if="analysis.bestMetric">🌟 最佳：{{ analysis.bestMetric.label }}（{{ analysis.bestMetric.score }} 分）</span>
        <span class="mtp-bw worst" v-if="analysis.worstMetric && analysis.worstMetric.type !== analysis.bestMetric?.type">🧡 关注：{{ analysis.worstMetric.label }}（{{ analysis.worstMetric.score }} 分）</span>
      </div>

      <!-- 指标趋势卡片 -->
      <div class="mtp-trends">
        <div v-for="t in analysis.metricTrends" :key="t.metricType" class="mtp-trend">
          <div class="mtp-trend-head">
            <span class="mtp-trend-label">{{ t.label }}</span>
            <span class="mtp-trend-dir" :class="'dir-' + t.direction">{{ DIRECTION_META[t.direction].icon }} {{ DIRECTION_META[t.direction].label }}</span>
          </div>
          <div class="mtp-trend-body">
            <span class="mtp-trend-value">{{ t.currentValue }} <small>{{ t.unit }}</small></span>
            <span class="mtp-trend-status" :class="'st-' + t.targetStatus">{{ TARGET_STATUS_META[t.targetStatus].label }}</span>
          </div>
          <div class="mtp-trend-meta">
            <span>均值 {{ t.periodAverage }} {{ t.unit }}</span>
            <span>斜率 {{ t.slope }}</span>
            <span>波动 {{ Math.round(t.volatility * 100) }}%</span>
          </div>
        </div>
      </div>

      <!-- 关联分析 -->
      <div class="mtp-corr" v-if="correlations.length">
        <h4 class="mtp-sec-title">🔗 指标关联</h4>
        <div v-for="(c, i) in correlations.slice(0, 5)" :key="i" class="mtp-corr-item">
          <span class="mtp-corr-pair">{{ c.metricALabel }} ↔ {{ c.metricBLabel }}</span>
          <span class="mtp-corr-coef" :class="{ sig: c.isSignificant }">r = {{ c.coefficient }}</span>
          <span class="mtp-corr-strength">{{ STRENGTH_LABEL[c.strength] }}</span>
        </div>
      </div>

      <!-- 趋势预警 -->
      <div class="mtp-alerts" v-if="alerts.length">
        <h4 class="mtp-sec-title">🚨 趋势预警</h4>
        <div v-for="a in alerts" :key="a.id" class="mtp-alert" :class="'sev-' + a.severity">
          <div class="mtp-alert-head">
            <span class="mtp-alert-sev">{{ SEVERITY_META[a.severity].icon }} {{ SEVERITY_META[a.severity].label }}</span>
            <span class="mtp-alert-title">{{ a.title }}</span>
            <button class="mtp-alert-ack" v-if="!a.acknowledged" @click="acknowledge(a.id)">确认</button>
          </div>
          <p class="mtp-alert-desc">{{ a.description }}</p>
          <p class="mtp-alert-sug">💡 {{ a.suggestion }}</p>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { getLocalDateKey } from '../utils/time'
import { computed, watch } from 'vue'
import { useMetricTrends, metricTrendsInsights } from '../modules/body/metric-trends'
import type { TrendDirection, MetricTrendData, TrendAlert } from '../modules/body/metric-trends'
import type { BodyMetric } from '../modules/body/types'
import type { BodyLog } from '../stores/health'

const props = defineProps<{ logs: BodyLog[] }>()

const {
  analysis,
  correlations,
  alerts,
  computeTrend,
  findCorrelations,
  generateTrendAlerts,
  acknowledgeAlert,
} = useMetricTrends()

const DIRECTION_META: Record<TrendDirection, { label: string; icon: string }> = {
  up: { label: '上升', icon: '↑' },
  down: { label: '下降', icon: '↓' },
  stable: { label: '平稳', icon: '→' },
  fluctuating: { label: '波动', icon: '↕' },
}
const TARGET_STATUS_META: Record<MetricTrendData['targetStatus'], { label: string }> = {
  on_target: { label: '达标' },
  below_target: { label: '低于目标' },
  above_target: { label: '高于目标' },
}
const SEVERITY_META: Record<TrendAlert['severity'], { label: string; icon: string }> = {
  critical: { label: '严重', icon: '🔴' },
  warning: { label: '警告', icon: '🟡' },
  info: { label: '提示', icon: '🔵' },
}
const STRENGTH_LABEL: Record<string, string> = {
  strong_positive: '强正相关', moderate_positive: '中等正相关', weak_positive: '弱正相关',
  none: '无明显相关', weak_negative: '弱负相关', moderate_negative: '中等负相关', strong_negative: '强负相关',
}

function logsToMetrics(logs: BodyLog[]): BodyMetric[] {
  const out: BodyMetric[] = []
  for (const l of logs) {
    const date = getLocalDateKey(new Date(l.at))
    if (l.type === 'sleep' && typeof l.value.hours === 'number') {
      out.push({ id: `m_${l.id}`, type: 'sleep', value: l.value.hours, unit: '小时', timestamp: l.at, date })
    } else if (l.type === 'exercise' && typeof l.value.minutes === 'number') {
      out.push({ id: `m_${l.id}`, type: 'exercise', value: l.value.minutes, unit: '分钟', timestamp: l.at, date })
    }
  }
  return out
}

const metrics = computed(() => logsToMetrics(props.logs))
const insights = computed(() => metricTrendsInsights(analysis.value, correlations.value, alerts.value))

watch(metrics, (m) => {
  if (m.length === 0) return
  computeTrend(m, { days: 30 })
  findCorrelations(m)
  generateTrendAlerts(m)
}, { immediate: true })

function acknowledge(id: string) { acknowledgeAlert(id) }
</script>

<style scoped>
.mtp {
  margin: 14px 0;
  padding: 14px 16px;
  background: linear-gradient(160deg, rgba(90, 184, 160, 0.08), rgba(107, 159, 196, 0.05));
  border: 1px solid rgba(90, 184, 160, 0.25);
  border-radius: 14px;
}
.mtp-head { margin-bottom: 10px; }
.mtp-title { margin: 0 0 4px; font-size: 15px; color: #1a1a2e; }
.mtp-sub { margin: 0; font-size: 12px; color: #7a8a9a; }
.mtp-insights { margin: 8px 0; }
.mtp-insight {
  margin: 4px 0; padding: 6px 10px; font-size: 12px; color: #4a5a6a;
  background: rgba(255, 255, 255, 0.6); border-radius: 8px; border-left: 3px solid #5ab8a0;
}
.mtp-empty { padding: 20px; text-align: center; color: #8a9a7a; font-size: 13px; }
.mtp-empty span { display: block; font-size: 28px; margin-bottom: 6px; }
.mtp-empty p { margin: 0; line-height: 1.6; }
.mtp-overall { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.mtp-assessment { margin: 0; font-size: 13px; color: #1a1a2e; flex: 1; min-width: 200px;
}
.mtp-trend-badge { font-size: 11px; padding: 3px 10px; border-radius: 999px; background: rgba(107, 159, 196, 0.12); color: #3d7ea6; }
.mtp-trend-badge.dir-up { background: rgba(90, 184, 160, 0.15); color: #2e8b6a; }
.mtp-trend-badge.dir-down { background: rgba(196, 106, 90, 0.15); color: #b04a3a; }
.mtp-best-worst { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.mtp-bw { font-size: 12px; padding: 3px 10px; border-radius: 8px; }
.mtp-bw.best { background: rgba(90, 184, 160, 0.12); color: #2e8b6a; }
.mtp-bw.worst { background: rgba(240, 192, 64, 0.15); color: #b08a2a; }
.mtp-trends { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-bottom: 10px; }
.mtp-trend { padding: 10px; background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(90, 184, 160, 0.2); border-radius: 10px; }
.mtp-trend-head { display: flex; justify-content: space-between; align-items: center; }
.mtp-trend-label { font-size: 12px; font-weight: 600; color: #1a1a2e; }
.mtp-trend-dir { font-size: 11px; color: #3d7ea6; }
.mtp-trend-dir.dir-up { color: #2e8b6a; }
.mtp-trend-dir.dir-down { color: #b04a3a; }
.mtp-trend-body { display: flex; align-items: baseline; gap: 8px; margin: 6px 0; }
.mtp-trend-value { font-size: 20px; font-weight: 700; color: #1a1a2e; }
.mtp-trend-value small { font-size: 11px; font-weight: 400; color: #8a9a7a; }
.mtp-trend-status { font-size: 11px; padding: 1px 8px; border-radius: 999px; }
.mtp-trend-status.st-on_target { background: rgba(90, 184, 160, 0.15); color: #2e8b6a; }
.mtp-trend-status.st-below_target { background: rgba(196, 106, 90, 0.15); color: #b04a3a; }
.mtp-trend-status.st-above_target { background: rgba(240, 192, 64, 0.18); color: #b08a2a; }
.mtp-trend-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 10px; color: #8a9a7a; }
.mtp-sec-title { margin: 10px 0 6px; font-size: 13px; color: #1a1a2e; }
.mtp-corr-item { display: flex; align-items: center; gap: 10px; padding: 6px 10px; margin: 4px 0; background: rgba(255, 255, 255, 0.6); border-radius: 8px; font-size: 12px; }
.mtp-corr-pair { color: #1a1a2e; font-weight: 600; }
.mtp-corr-coef { color: #3d7ea6; }
.mtp-corr-coef.sig { color: #2e8b6a; font-weight: 600; }
.mtp-corr-strength { font-size: 11px; color: #8a9a7a; }
.mtp-alert { padding: 8px 10px; margin: 6px 0; background: rgba(255, 255, 255, 0.7); border-radius: 8px; border-left: 3px solid #6b9fc4; }
.mtp-alert.sev-critical { border-left-color: #c46a5a; }
.mtp-alert.sev-warning { border-left-color: #f0c040; }
.mtp-alert.sev-info { border-left-color: #6b9fc4; }
.mtp-alert-head { display: flex; align-items: center; gap: 8px; }
.mtp-alert-sev { font-size: 11px; }
.mtp-alert-title { font-size: 12px; font-weight: 600; color: #1a1a2e; flex: 1; }
.mtp-alert-ack {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 2px 10px; font-size: 11px; border: 1px solid rgba(107, 159, 196, 0.4);
  border-radius: 999px; background: transparent; color: #3d7ea6; cursor: pointer;

  min-height: 26px;
}
.mtp-alert-ack:hover { background: rgba(107, 159, 196, 0.1); }
.mtp-alert-desc { margin: 4px 0 0; font-size: 12px; color: #4a5a6a; }
.mtp-alert-sug { margin: 3px 0 0; font-size: 11px; color: #8a9a7a; }
</style>
