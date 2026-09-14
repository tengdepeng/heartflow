<template>
  <div class="hpp">
    <!-- 健康度评分 -->
    <section class="hpp-health">
      <div class="hpp-health-head">
        <span class="hpp-health-icon">💠</span>
        <div class="hpp-health-title">
          <span class="hpp-name">习惯健康度</span>
          <span class="hpp-sub">连续性 · 完成率 · 多样性 · 成长 · 韧性</span>
        </div>
        <div class="hpp-health-score" :class="'grade-' + health.grade">
          <span class="hpp-score-num">{{ health.overall }}</span>
          <span class="hpp-score-grade">{{ GRADE_META[health.grade].label }}</span>
        </div>
      </div>
      <div class="hpp-dims">
        <div v-for="d in dims" :key="d.key" class="hpp-dim">
          <div class="hpp-dim-head">
            <span class="hpp-dim-label">{{ d.label }}</span>
            <span class="hpp-dim-value">{{ health[d.key] }}</span>
          </div>
          <div class="hpp-dim-bar">
            <div class="hpp-dim-fill" :style="{ width: health[d.key] + '%' }"></div>
          </div>
        </div>
      </div>
      <ul class="hpp-improve" v-if="health.improvements.length">
        <li v-for="(imp, i) in health.improvements" :key="i">{{ imp }}</li>
      </ul>
    </section>

    <!-- 空态 -->
    <div v-if="predictions.length === 0" class="hpp-empty">
      <p>还没有可预测的习惯，先创建并启用一个习惯吧</p>
    </div>

    <!-- 习惯预测列表 -->
    <div v-else class="hpp-list">
      <article v-for="p in predictions" :key="p.habit.id" class="hpp-card">
        <div class="hpp-card-head">
          <span class="hpp-card-icon">{{ p.habit.icon }}</span>
          <div class="hpp-card-main">
            <span class="hpp-card-title">{{ p.habit.title }}</span>
            <span class="hpp-card-diff" :style="{ color: DIFF_META[p.habit.difficulty]?.color }">
              {{ DIFF_META[p.habit.difficulty]?.label }}
            </span>
          </div>
          <span class="hpp-risk" :class="'risk-' + p.warning.riskLevel">
            {{ RISK_META[p.warning.riskLevel].label }}
          </span>
        </div>

        <!-- 连续预测 -->
        <div class="hpp-block">
          <span class="hpp-block-label">🔥 连续预测</span>
          <div class="hpp-streak">
            <span class="hpp-streak-cur">{{ p.streak.currentStreak }} <small>天</small></span>
            <span class="hpp-arrow">→</span>
            <span class="hpp-streak-pred">{{ p.streak.predictedStreak7d }} <small>7天</small></span>
            <span class="hpp-arrow">→</span>
            <span class="hpp-streak-pred">{{ p.streak.predictedStreak30d }} <small>30天</small></span>
          </div>
          <div class="hpp-streak-meta">
            <span>下一里程碑 <b>{{ p.streak.nextMilestone }}</b> 天（约 {{ p.streak.daysToNextMilestone }} 天）</span>
            <span>中断概率 <b>{{ Math.round(p.streak.breakProbability * 100) }}%</b></span>
          </div>
          <div class="hpp-tags" v-if="p.streak.riskFactors.length">
            <span v-for="(f, i) in p.streak.riskFactors" :key="i" class="hpp-tag">{{ f }}</span>
          </div>
        </div>

        <!-- 完成率预测 -->
        <div class="hpp-block">
          <span class="hpp-block-label">✅ 完成率预测</span>
          <div class="hpp-rate">
            <span class="hpp-rate-cur">{{ pct(p.completion.currentRate) }}</span>
            <span class="hpp-arrow">→</span>
            <span class="hpp-rate-pred">{{ pct(p.completion.predictedRate7d) }} <small>7天</small></span>
            <span class="hpp-arrow">→</span>
            <span class="hpp-rate-pred">{{ pct(p.completion.predictedRate30d) }} <small>30天</small></span>
          </div>
          <div class="hpp-rate-meta" v-if="p.completion.currentRate > 0">
            <span>置信区间 {{ pct(p.completion.confidenceInterval.lower) }}–{{ pct(p.completion.confidenceInterval.upper) }}</span>
          </div>
          <div class="hpp-tags" v-if="p.completion.seasonalFactors.length">
            <span v-for="(f, i) in p.completion.seasonalFactors" :key="i" class="hpp-tag">{{ f }}</span>
          </div>
        </div>

        <!-- 中断预警 -->
        <div class="hpp-block" v-if="p.warning.riskScore > 0">
          <span class="hpp-block-label">⚠️ 中断预警</span>
          <div class="hpp-warn">
            <span class="hpp-warn-score">风险 {{ p.warning.riskScore }} 分</span>
            <span class="hpp-warn-urgency" :class="'urg-' + p.warning.urgency">{{ URGENCY_META[p.warning.urgency].label }}</span>
            <span class="hpp-warn-date" v-if="p.warning.estimatedBreakDate">预计中断 {{ p.warning.estimatedBreakDate }}</span>
          </div>
          <div class="hpp-factors">
            <div v-for="(f, i) in p.warning.factors" :key="i" class="hpp-factor" :class="{ over: f.exceeded }">
              <span class="hpp-factor-name">{{ f.factor }}</span>
              <span class="hpp-factor-val">{{ f.currentValue }} <small>/ {{ f.threshold }}</small></span>
              <span class="hpp-factor-mark">{{ f.exceeded ? '⚠️' : '✓' }}</span>
            </div>
          </div>
          <ul class="hpp-tips">
            <li v-for="(t, i) in p.warning.preventionTips" :key="i">{{ t }}</li>
          </ul>
        </div>

        <!-- 趋势预测 -->
        <div class="hpp-block">
          <span class="hpp-block-label">📈 趋势预测</span>
          <div class="hpp-trends">
            <div v-for="t in trendRows" :key="t.key" class="hpp-trend">
              <span class="hpp-trend-key">{{ t.label }}</span>
              <span class="hpp-trend-dir" :class="'dir-' + p.trend[t.key].direction">
                {{ DIR_META[p.trend[t.key].direction].icon }} {{ DIR_META[p.trend[t.key].direction].label }}
              </span>
              <span class="hpp-trend-desc">{{ p.trend[t.key].description }}</span>
            </div>
          </div>
          <div class="hpp-trend-meta">
            <span>稳定性 <b>{{ Math.round(p.trend.stability * 100) }}%</b></span>
          </div>
          <div class="hpp-turning" v-if="p.trend.turningPoints.length">
            <div v-for="(tp, i) in p.trend.turningPoints" :key="i" class="hpp-turning-item">
              <span class="hpp-turning-type">{{ TURN_META[tp.type].icon }} {{ TURN_META[tp.type].label }}</span>
              <span class="hpp-turning-desc">{{ tp.description }}</span>
              <span class="hpp-turning-prob">{{ Math.round(tp.probability * 100) }}%</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHabitPredictor } from '../modules/discipline/habit-predictor'
import type { Habit, HabitDifficulty } from '../modules/discipline/types'
import { HABIT_DIFFICULTY_META } from '../modules/discipline/types'
import type { HealthScore, BreakWarning } from '../modules/discipline/habit-predictor'

const props = defineProps<{ habits: Habit[] }>()

const predictor = useHabitPredictor()

const GRADE_META: Record<HealthScore['grade'], { label: string }> = {
  A: { label: '优秀' }, B: { label: '良好' }, C: { label: '一般' }, D: { label: '需关注' }, F: { label: '需改善' },
}

const RISK_META: Record<BreakWarning['riskLevel'], { label: string }> = {
  low: { label: '低风险' }, medium: { label: '中风险' }, high: { label: '高风险' }, critical: { label: '极高风险' },
}

const URGENCY_META: Record<BreakWarning['urgency'], { label: string }> = {
  ok: { label: '状态良好' }, monitor: { label: '需观察' }, soon: { label: '尽快行动' }, immediate: { label: '立即行动' },
}

const DIR_META: Record<string, { icon: string; label: string }> = {
  improving: { icon: '↑', label: '改善' }, declining: { icon: '↓', label: '下降' },
  stable: { icon: '→', label: '稳定' }, volatile: { icon: '∿', label: '波动' },
}

const TURN_META: Record<string, { icon: string; label: string }> = {
  breakthrough: { icon: '🚀', label: '突破' }, decline: { icon: '📉', label: '下降' },
  recovery: { icon: '💫', label: '恢复' }, plateau: { icon: '🏔️', label: '平台期' },
}

const DIFF_META = HABIT_DIFFICULTY_META as Record<HabitDifficulty, { label: string; color: string; basePoints: number }>

const dims = [
  { key: 'consistency', label: '连续性' },
  { key: 'completion', label: '完成率' },
  { key: 'diversity', label: '多样性' },
  { key: 'growth', label: '成长性' },
  { key: 'resilience', label: '韧性' },
] as const

const trendRows = [
  { key: 'shortTerm', label: '短期' },
  { key: 'mediumTerm', label: '中期' },
  { key: 'longTerm', label: '长期' },
] as const

const health = computed<HealthScore>(() => predictor.calculateHealthScore(props.habits))

const predictions = computed(() =>
  props.habits
    .filter((h) => h.enabled)
    .map((habit) => ({
      habit,
      streak: predictor.predictStreak(habit),
      completion: predictor.predictCompletion(habit),
      warning: predictor.warnBreak(habit),
      trend: predictor.predictTrend(habit),
    })),
)

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}
</script>

<style scoped>
.hpp {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 健康度 */
.hpp-health {
  background: linear-gradient(135deg, #f7f4ec, #efe9dc);
  border: 1px solid #e2d9c6;
  border-radius: 14px;
  padding: 14px 16px;
}
.hpp-health-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hpp-health-icon {
  font-size: 22px;
}
.hpp-health-title {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.hpp-name {
  font-weight: 700;
  color: #4a4234;
}
.hpp-sub {
  font-size: 11px;
  color: #8a8170;
}
.hpp-health-score {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.hpp-score-num {
  font-size: 30px;
  font-weight: 800;
}
.hpp-score-grade {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
}
.grade-A .hpp-score-num { color: #4c8a5a; }
.grade-A .hpp-score-grade { background: #4c8a5a; color: #fff; }
.grade-B .hpp-score-num { color: #5a9a6a; }
.grade-B .hpp-score-grade { background: #5a9a6a; color: #fff; }
.grade-C .hpp-score-num { color: #c49a3a; }
.grade-C .hpp-score-grade { background: #c49a3a; color: #fff; }
.grade-D .hpp-score-num { color: #c46a5a; }
.grade-D .hpp-score-grade { background: #c46a5a; color: #fff; }
.grade-F .hpp-score-num { color: #a05040; }
.grade-F .hpp-score-grade { background: #a05040; color: #fff; }

.hpp-dims {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 12px;
}
.hpp-dim {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hpp-dim-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #6b6353;
}
.hpp-dim-value {
  font-weight: 700;
  color: #4a4234;
}
.hpp-dim-bar {
  height: 6px;
  background: #e5dccb;
  border-radius: 3px;
  overflow: hidden;
}
.hpp-dim-fill {
  height: 100%;
  background: linear-gradient(90deg, #8a9a7a, #6b9fc4);
  border-radius: 3px;
}
.hpp-improve {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: #6b6353;
  line-height: 1.8;
}

/* 空态 */
.hpp-empty {
  border: 1px dashed #d8cfbd;
  border-radius: 12px;
  padding: 28px;
  text-align: center;
  color: #8a8170;
  font-size: 13px;
}

/* 列表 */
.hpp-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hpp-card {
  background: #fffdf7;
  border: 1px solid #e6ddca;
  border-radius: 14px;
  padding: 14px 16px;
}
.hpp-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.hpp-card-icon {
  font-size: 22px;
}
.hpp-card-main {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.hpp-card-title {
  font-weight: 700;
  color: #4a4234;
}
.hpp-card-diff {
  font-size: 11px;
}
.hpp-risk {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 10px;
}
.risk-low { background: #e3efe4; color: #4c8a5a; }
.risk-medium { background: #f5ecd6; color: #b08020; }
.risk-high { background: #f7e0d8; color: #c46a5a; }
.risk-critical { background: #f2d4cc; color: #a03a2a; }

.hpp-block {
  border-top: 1px dashed #e8e0d0;
  padding-top: 10px;
  margin-top: 10px;
}
.hpp-block-label {
  font-size: 11px;
  font-weight: 700;
  color: #8a8170;
  letter-spacing: 0.5px;
}
.hpp-streak,
.hpp-rate {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 6px;
}
.hpp-streak-cur,
.hpp-rate-cur {
  font-size: 22px;
  font-weight: 800;
  color: #4a4234;
}
.hpp-streak-pred,
.hpp-rate-pred {
  font-size: 16px;
  font-weight: 700;
  color: #6b9fc4;
}
.hpp-arrow {
  color: #b5ab97;
}
small {
  font-size: 10px;
  font-weight: 400;
  color: #8a8170;
}
.hpp-streak-meta,
.hpp-rate-meta,
.hpp-trend-meta {
  display: flex;
  gap: 14px;
  margin-top: 6px;
  font-size: 11px;
  color: #6b6353;
}
.hpp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.hpp-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  background: #f1ece1;
  color: #6b6353;
}
.hpp-warn {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
}
.hpp-warn-score {
  font-weight: 700;
  color: #c46a5a;
}
.hpp-warn-urgency {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
}
.urg-ok { background: #e3efe4; color: #4c8a5a; }
.urg-monitor { background: #f5ecd6; color: #b08020; }
.urg-soon { background: #f7e0d8; color: #c46a5a; }
.urg-immediate { background: #f2d4cc; color: #a03a2a; }
.hpp-warn-date {
  color: #8a8170;
}
.hpp-factors {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
.hpp-factor {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 8px;
  background: #f7f4ec;
  color: #6b6353;
}
.hpp-factor.over {
  background: #fbeae4;
  color: #a03a2a;
}
.hpp-factor-name {
  flex: 1;
}
.hpp-factor-val {
  font-size: 11px;
}
.hpp-factor-mark {
  font-size: 12px;
}
.hpp-tips {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: #6b6353;
  line-height: 1.8;
}
.hpp-trends {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.hpp-trend {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.hpp-trend-key {
  width: 32px;
  color: #8a8170;
}
.hpp-trend-dir {
  width: 64px;
  font-weight: 700;
}
.dir-improving { color: #4c8a5a; }
.dir-declining { color: #c46a5a; }
.dir-stable { color: #6b9fc4; }
.dir-volatile { color: #b08020; }
.hpp-trend-desc {
  color: #6b6353;
}
.hpp-turning {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
.hpp-turning-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 8px;
  background: #f7f4ec;
}
.hpp-turning-type {
  font-weight: 700;
  color: #4a4234;
}
.hpp-turning-desc {
  flex: 1;
  color: #6b6353;
}
.hpp-turning-prob {
  font-weight: 700;
  color: #6b9fc4;
}
</style>
