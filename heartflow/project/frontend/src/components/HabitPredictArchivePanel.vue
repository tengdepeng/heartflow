<template>
  <section class="hpap-archive" aria-label="习惯预测档案">
    <!-- 空态（无习惯） -->
    <template v-if="!hasData">
      <div class="hpap-head">
        <span class="hpap-title">✨ 习惯预测档案</span>
        <span class="hpap-badge hpap-badge-neutral">工坊未启</span>
      </div>
      <p class="hpap-empty">
        工坊还空着。立下第一个习惯，每日打卡——预测引擎会为每份坚持把脉：连续、完成、中断风险，逐一显影。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="hpap-head">
        <span class="hpap-title">✨ 习惯预测档案</span>
        <span class="hpap-badge hpap-badge-gold">{{ healthGradeLabel(health?.grade) }}</span>
      </div>

      <!-- 健康度评分 -->
      <div class="hpap-block" v-if="health">
        <h3 class="hpap-block-title">健康度评分</h3>
        <div class="hpap-health">
          <div class="hpap-health-score">
            <span class="hpap-health-num">{{ health.overall }}</span>
            <span class="hpap-health-label">{{ healthGradeLabel(health.grade) }}</span>
          </div>
          <div class="hpap-health-bars">
            <div class="hpap-hbar">
              <span class="hpap-hbar-label">连续性</span>
              <div class="hpap-hbar-track"><div class="hpap-hbar-fill" :style="{ width: pct(health.consistency / 100) }"></div></div>
              <span class="hpap-hbar-num">{{ health.consistency }}</span>
            </div>
            <div class="hpap-hbar">
              <span class="hpap-hbar-label">完成率</span>
              <div class="hpap-hbar-track"><div class="hpap-hbar-fill hpap-hbar-fill--sage" :style="{ width: pct(health.completion / 100) }"></div></div>
              <span class="hpap-hbar-num">{{ health.completion }}</span>
            </div>
            <div class="hpap-hbar">
              <span class="hpap-hbar-label">多样性</span>
              <div class="hpap-hbar-track"><div class="hpap-hbar-fill hpap-hbar-fill--rust" :style="{ width: pct(health.diversity / 100) }"></div></div>
              <span class="hpap-hbar-num">{{ health.diversity }}</span>
            </div>
            <div class="hpap-hbar">
              <span class="hpap-hbar-label">成长性</span>
              <div class="hpap-hbar-track"><div class="hpap-hbar-fill" :style="{ width: pct(health.growth / 100) }"></div></div>
              <span class="hpap-hbar-num">{{ health.growth }}</span>
            </div>
            <div class="hpap-hbar">
              <span class="hpap-hbar-label">韧性</span>
              <div class="hpap-hbar-track"><div class="hpap-hbar-fill hpap-hbar-fill--sage" :style="{ width: pct(health.resilience / 100) }"></div></div>
              <span class="hpap-hbar-num">{{ health.resilience }}</span>
            </div>
          </div>
        </div>
        <ul v-if="health.improvements.length" class="hpap-improve">
          <li v-for="imp in health.improvements" :key="imp" class="hpap-improve-item">{{ imp }}</li>
        </ul>
      </div>

      <!-- 连续预测 -->
      <div class="hpap-block" v-if="streakRows.length">
        <h3 class="hpap-block-title">连续预测</h3>
        <div v-for="row in streakRows" :key="row.habit.id" class="hpap-streak">
          <div class="hpap-streak-head">
            <span class="hpap-streak-name">{{ row.habit.icon }} {{ row.habit.title }}</span>
            <span class="hpap-streak-prob">{{ Math.round(row.prediction.breakProbability * 100) }}% 中断概率</span>
          </div>
          <div class="hpap-g3">
            <div class="hpap-cell"><span class="hpap-cell-num">{{ row.prediction.currentStreak }}</span><span class="hpap-cell-label">当前连续</span></div>
            <div class="hpap-cell"><span class="hpap-cell-num">{{ row.prediction.predictedStreak7d }}</span><span class="hpap-cell-label">预测7天</span></div>
            <div class="hpap-cell"><span class="hpap-cell-num">{{ row.prediction.predictedStreak30d }}</span><span class="hpap-cell-label">预测30天</span></div>
          </div>
          <div class="hpap-streak-meta">
            下一里程碑 {{ row.prediction.nextMilestone }} 天 · 还需 {{ row.prediction.daysToNextMilestone }} 天
          </div>
          <div class="hpap-risk-chips" v-if="row.prediction.riskFactors.length">
            <span v-for="f in row.prediction.riskFactors" :key="f" class="hpap-risk-chip">{{ f }}</span>
          </div>
        </div>
      </div>

      <!-- 中断预警 -->
      <div class="hpap-block" v-if="warning">
        <h3 class="hpap-block-title">中断预警</h3>
        <div class="hpap-warn">
          <div class="hpap-warn-head">
            <span class="hpap-warn-name">{{ warning.habit.icon }} {{ warning.habit.title }}</span>
            <span :class="['hpap-warn-badge', `hpap-warn-badge--${warning.warning.riskLevel}`]">{{ riskLabel(warning.warning.riskLevel) }}</span>
          </div>
          <div class="hpap-warn-score">
            <span class="hpap-warn-num">{{ warning.warning.riskScore }}</span>
            <span class="hpap-warn-label">风险评分</span>
          </div>
          <div class="hpap-warn-factors" v-if="warning.warning.factors.length">
            <div v-for="f in warning.warning.factors" :key="f.factor" class="hpap-warn-factor">
              <span class="hpap-warn-factor-name">{{ f.factor }}</span>
              <span class="hpap-warn-factor-val">{{ f.currentValue }} / {{ f.threshold }}</span>
              <span :class="['hpap-warn-factor-state', { 'hpap-warn-factor-state--exceeded': f.exceeded }]">{{ f.exceeded ? '超标' : '正常' }}</span>
            </div>
          </div>
          <ul v-if="warning.warning.preventionTips.length" class="hpap-tips">
            <li v-for="tip in warning.warning.preventionTips" :key="tip" class="hpap-tip">{{ tip }}</li>
          </ul>
        </div>
      </div>

      <!-- 趋势预测 -->
      <div class="hpap-block" v-if="trendRows.length">
        <h3 class="hpap-block-title">趋势预测</h3>
        <div v-for="row in trendRows" :key="row.habit.id" class="hpap-trend">
          <div class="hpap-trend-head">
            <span class="hpap-trend-name">{{ row.habit.icon }} {{ row.habit.title }}</span>
            <span class="hpap-trend-stability">稳定性 {{ Math.round(row.trend.stability * 100) }}%</span>
          </div>
          <div class="hpap-g3">
            <div class="hpap-cell"><span class="hpap-cell-num">{{ trendLabel(row.trend.shortTerm) }}</span><span class="hpap-cell-label">短期</span></div>
            <div class="hpap-cell"><span class="hpap-cell-num">{{ trendLabel(row.trend.mediumTerm) }}</span><span class="hpap-cell-label">中期</span></div>
            <div class="hpap-cell"><span class="hpap-cell-num">{{ trendLabel(row.trend.longTerm) }}</span><span class="hpap-cell-label">长期</span></div>
          </div>
          <div class="hpap-trend-points" v-if="row.trend.turningPoints.length">
            <span v-for="tp in row.trend.turningPoints" :key="tp.type" class="hpap-trend-point">{{ tp.description }}</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="hpap-insights">
        <li v-for="ins in insights" :key="ins" class="hpap-insight">
          <span class="hpap-insight-mark">✦</span>
          <span class="hpap-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDisciplineBridge } from '../modules/discipline/workshop-bridge'
import { useHabitPredictor } from '../modules/discipline/habit-predictor'
import type { HealthScore, TrendDirection } from '../modules/discipline/habit-predictor'

const bridge = useDisciplineBridge()
const predictor = useHabitPredictor()

const habits = computed(() => bridge.habits.value.filter(h => h.enabled))
const hasData = computed(() => habits.value.length > 0)

const health = computed<HealthScore | null>(() =>
  hasData.value ? predictor.calculateHealthScore(habits.value) : null,
)

const streakRows = computed(() => {
  if (!hasData.value) return []
  return [...habits.value]
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3)
    .map(habit => ({ habit, prediction: predictor.predictStreak(habit) }))
})

const warning = computed(() => {
  if (!hasData.value) return null
  const ranked = habits.value
    .map(habit => ({ habit, warning: predictor.warnBreak(habit) }))
    .sort((a, b) => b.warning.riskScore - a.warning.riskScore)
  return ranked[0]
})

const trendRows = computed(() => {
  if (!hasData.value) return []
  return [...habits.value]
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3)
    .map(habit => ({ habit, trend: predictor.predictTrend(habit) }))
})

const insights = computed(() => {
  if (!hasData.value) return []
  const list: string[] = []
  if (health.value) {
    list.push(`健康度 ${health.value.grade} 级（${health.value.overall} 分），${health.value.improvements[0] ?? '整体平稳'}`)
  }
  if (warning.value && warning.value.warning.riskScore >= 30) {
    list.push(`「${warning.value.habit.title}」中断风险${riskLabel(warning.value.warning.riskLevel)}，${warning.value.warning.preventionTips[0] ?? '保持节奏'}`)
  }
  const milestone = streakRows.value.find(r => r.prediction.daysToNextMilestone <= 7)
  if (milestone) {
    list.push(`「${milestone.habit.title}」距下一里程碑（${milestone.prediction.nextMilestone} 天）还需 ${milestone.prediction.daysToNextMilestone} 天`)
  }
  const stable = trendRows.value.filter(r => r.trend.stability >= 0.6)
  if (stable.length > 0) {
    list.push(`${stable.length} 个习惯趋势稳定，保持现有节奏`)
  }
  return list.slice(0, 4)
})

function pct(v: number): string {
  return `${Math.max(0, Math.min(100, Math.round(v * 100)))}%`
}

function healthGradeLabel(grade: HealthScore['grade'] | undefined): string {
  const labels: Record<HealthScore['grade'], string> = {
    A: '优秀', B: '良好', C: '一般', D: '待提升', F: '需起步',
  }
  return grade ? labels[grade] : '—'
}

function riskLabel(level: string): string {
  const labels: Record<string, string> = {
    low: '低风险', medium: '中风险', high: '高风险', critical: '危急',
  }
  return labels[level] ?? level
}

function trendLabel(t: TrendDirection): string {
  const labels: Record<TrendDirection['direction'], string> = {
    improving: '改善', declining: '下降', stable: '稳定', volatile: '波动',
  }
  return labels[t.direction] ?? t.direction
}
</script>

<style scoped>
.hpap-archive {
  display: block;
  width: 100%;
  max-width: 640px;
}
.hpap-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.hpap-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #ede5d8);
  letter-spacing: 0.02em;
}
.hpap-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.hpap-badge-gold {
  color: var(--accent-warm, #f0c040);
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.hpap-badge-neutral {
  color: var(--text-secondary, #b5aa98);
  border-color: var(--border-light, #3a332a);
  background: transparent;
}
.hpap-empty {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #b5aa98);
}
.hpap-block {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light, #3a332a);
}
.hpap-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #b5aa98);
  margin-bottom: 10px;
  letter-spacing: 0.06em;
}
.hpap-g3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.hpap-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 55%, transparent);
}
.hpap-cell-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #ede5d8);
}
.hpap-cell-label {
  font-size: 11px;
  color: var(--text-secondary, #b5aa98);
  text-align: center;
}
.hpap-health {
  display: flex;
  gap: 20px;
  align-items: center;
}
.hpap-health-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 88px;
}
.hpap-health-num {
  font-size: 34px;
  font-weight: 700;
  color: var(--accent-warm, #f0c040);
  line-height: 1;
}
.hpap-health-label {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.hpap-health-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hpap-hbar {
  display: grid;
  grid-template-columns: 44px 1fr 36px;
  align-items: center;
  gap: 8px;
}
.hpap-hbar-label {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.hpap-hbar-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 70%, transparent);
  overflow: hidden;
}
.hpap-hbar-fill {
  width: 0;
  height: 100%;
  border-radius: 999px;
  background: #f0c040;
  transition: width 0.3s ease;
}
.hpap-hbar-fill--sage {
  background: #8a9a7a;
}
.hpap-hbar-fill--rust {
  background: #c46a5a;
}
.hpap-hbar-num {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
  text-align: right;
}
.hpap-improve {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
}
.hpap-improve-item {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, #b5aa98);
  padding-left: 12px;
  position: relative;
}
.hpap-improve-item::before {
  content: '·';
  position: absolute;
  left: 2px;
  color: #f0c040;
}
.hpap-streak {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 45%, transparent);
  border: 1px solid var(--border-light, #3a332a);
  margin-bottom: 10px;
}
.hpap-streak-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.hpap-streak-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #ede5d8);
}
.hpap-streak-prob {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.hpap-streak-meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.hpap-risk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.hpap-risk-chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-secondary, #b5aa98);
  background: color-mix(in srgb, var(--bg-card, #241f18) 60%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.hpap-warn {
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 45%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.hpap-warn-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.hpap-warn-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #ede5d8);
}
.hpap-warn-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.hpap-warn-badge--low {
  color: #8a9a7a;
  border-color: color-mix(in srgb, #8a9a7a 45%, transparent);
  background: color-mix(in srgb, #8a9a7a 12%, transparent);
}
.hpap-warn-badge--medium {
  color: #f0c040;
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.hpap-warn-badge--high {
  color: #c46a5a;
  border-color: color-mix(in srgb, #c46a5a 45%, transparent);
  background: color-mix(in srgb, #c46a5a 12%, transparent);
}
.hpap-warn-badge--critical {
  color: #e08a7a;
  border-color: color-mix(in srgb, #e08a7a 45%, transparent);
  background: color-mix(in srgb, #e08a7a 12%, transparent);
}
.hpap-warn-score {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.hpap-warn-num {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary, #ede5d8);
  line-height: 1;
}
.hpap-warn-label {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.hpap-warn-factors {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hpap-warn-factor {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}
.hpap-warn-factor-name {
  color: var(--text-primary, #ede5d8);
}
.hpap-warn-factor-val {
  color: var(--text-secondary, #b5aa98);
}
.hpap-warn-factor-state {
  color: #8a9a7a;
}
.hpap-warn-factor-state--exceeded {
  color: #c46a5a;
}
.hpap-tips {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
}
.hpap-tip {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, #b5aa98);
  padding-left: 12px;
  position: relative;
}
.hpap-tip::before {
  content: '›';
  position: absolute;
  left: 2px;
  color: #8a9a7a;
}
.hpap-trend {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 45%, transparent);
  border: 1px solid var(--border-light, #3a332a);
  margin-bottom: 10px;
}
.hpap-trend-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.hpap-trend-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #ede5d8);
}
.hpap-trend-stability {
  font-size: 12px;
  color: var(--text-secondary, #b5aa98);
}
.hpap-trend-points {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.hpap-trend-point {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-secondary, #b5aa98);
  background: color-mix(in srgb, var(--bg-card, #241f18) 60%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.hpap-insights {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.hpap-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #ede5d8);
}
.hpap-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}
</style>
