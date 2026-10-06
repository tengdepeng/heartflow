<template>
  <section class="ma-panel" aria-label="运动分析">
    <div class="ma-panel-head">
      <span class="ma-panel-title">📊 运动分析</span>
      <span class="ma-panel-sub">统计 · 体能 · 恢复 · 建议</span>
    </div>

    <!-- 运动统计 -->
    <div class="ma-block">
      <div class="ma-block-head">
        <span class="ma-block-label">📈 运动统计</span>
        <button class="ma-btn ma-btn-sm" @click="refreshStats">刷新</button>
      </div>
      <div class="ma-ov-grid">
        <div class="ma-ov"><span class="ma-ov-num">{{ analytics.totalSessions }}</span><span class="ma-ov-label">总次数</span></div>
        <div class="ma-ov"><span class="ma-ov-num">{{ analytics.totalDuration }}</span><span class="ma-ov-label">总时长(分)</span></div>
        <div class="ma-ov"><span class="ma-ov-num">{{ analytics.totalCalories }}</span><span class="ma-ov-label">消耗(kcal)</span></div>
        <div class="ma-ov"><span class="ma-ov-num">{{ analytics.monthlyActiveDays }}</span><span class="ma-ov-label">本月天数</span></div>
        <div class="ma-ov"><span class="ma-ov-num">{{ analytics.weeklyDuration }}</span><span class="ma-ov-label">本周时长</span></div>
        <div class="ma-ov"><span class="ma-ov-num">{{ analytics.streak }}</span><span class="ma-ov-label">连续天数</span></div>
      </div>
      <p v-if="analytics.bestDay" class="ma-hint">最佳运动日：{{ analytics.bestDay.date }} · {{ typeLabel(analytics.bestDay.type) }} {{ analytics.bestDay.duration }} 分钟</p>
    </div>

    <!-- 体能评估 -->
    <div class="ma-block">
      <div class="ma-block-head">
        <span class="ma-block-label">💪 体能评估</span>
        <button class="ma-btn ma-btn-sm" @click="runAssess">评估</button>
      </div>
      <div class="ma-fitness">
        <div class="ma-fitness-score">
          <span class="ma-fitness-num">{{ fitness.overall }}</span>
          <span class="ma-fitness-label">综合体能</span>
          <span v-if="fitness.weeklyChange" class="ma-hint">{{ fitness.weeklyChange >= 0 ? '+' : '' }}{{ fitness.weeklyChange }} vs 上周</span>
        </div>
        <div class="ma-fitness-bars">
          <div class="ma-fbar"><span class="ma-fbar-label">心肺</span><div class="ma-fbar-track"><div class="ma-fbar-fill" :style="{ width: fitness.cardioEndurance + '%' }"></div></div><span class="ma-fbar-val">{{ fitness.cardioEndurance }}</span></div>
          <div class="ma-fbar"><span class="ma-fbar-label">力量</span><div class="ma-fbar-track"><div class="ma-fbar-fill" :style="{ width: fitness.strength + '%' }"></div></div><span class="ma-fbar-val">{{ fitness.strength }}</span></div>
          <div class="ma-fbar"><span class="ma-fbar-label">柔韧</span><div class="ma-fbar-track"><div class="ma-fbar-fill" :style="{ width: fitness.flexibility + '%' }"></div></div><span class="ma-fbar-val">{{ fitness.flexibility }}</span></div>
          <div class="ma-fbar"><span class="ma-fbar-label">平衡</span><div class="ma-fbar-track"><div class="ma-fbar-fill" :style="{ width: fitness.balance + '%' }"></div></div><span class="ma-fbar-val">{{ fitness.balance }}</span></div>
        </div>
      </div>
    </div>

    <!-- 恢复状态 -->
    <div class="ma-block">
      <span class="ma-block-label">🔋 恢复状态</span>
      <div v-if="recovery" class="ma-recovery">
        <div class="ma-recovery-head">
          <span class="ma-recovery-score">恢复度 {{ recovery.recoveryScore }}</span>
          <span :class="recovery.needsRest ? 'ma-rest-warn' : 'ma-rest-ok'">{{ recovery.needsRest ? '需要休息' : '状态良好' }}</span>
        </div>
        <p v-if="recovery.lastExerciseAt" class="ma-hint">距上次运动 {{ recovery.hoursSinceLastExercise }} 小时</p>
        <p v-if="recovery.suggestedActivity" class="ma-hint">{{ recovery.suggestedActivity }}</p>
      </div>
    </div>

    <!-- 运动建议 -->
    <div class="ma-block">
      <span class="ma-block-label">🧭 运动建议</span>
      <button class="ma-btn ma-btn-sm" @click="runRecommend">生成建议</button>
      <ul v-if="recommendations.length" class="ma-list">
        <li v-for="r in recommendations" :key="r.id" class="ma-rec" :class="`ma-pri-${r.priority}`">
          <span class="ma-rec-icon">{{ typeIcon(r.type) }}</span>
          <span class="ma-rec-reason">{{ r.reason }}</span>
          <span class="ma-rec-detail">{{ r.duration }} 分钟 · {{ intensityLabel(r.intensity) }}</span>
        </li>
      </ul>
      <p v-else class="ma-empty">点击生成基于运动数据的建议。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMovementAnalytics } from '../modules/movement/movement-analytics'
import { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META } from '../modules/movement/types'
import type { MovementRecord, MovementType, MovementIntensity, MovementRhythm } from '../modules/movement/types'
import type { RecoveryStatus } from '../modules/movement/movement-analytics'
import type { Move } from '../modules/movement/movement-log'
import { getLocalDateKey } from '../utils/time'

const props = defineProps<{
  moves: Move[]
}>()

const analyticsApi = useMovementAnalytics()

const analytics = analyticsApi.analytics
const fitness = analyticsApi.fitness
const recommendations = ref<ReturnType<typeof analyticsApi.generateRecommendations>>([])

const TYPE_MAP: Record<string, MovementType> = {
  run: 'running', swim: 'swimming', bike: 'cycling', yoga: 'yoga',
  hike: 'walking', gym: 'strength', dance: 'dance', climb: 'custom', other: 'custom',
}

const adaptedRecords = computed<MovementRecord[]>(() =>
  props.moves.map(m => ({
    id: m.id,
    type: TYPE_MAP[m.type] ?? 'custom',
    duration: m.duration,
    intensity: 'moderate' as MovementIntensity,
    note: m.note,
    // 日键用本地日历日：与 moveToRecord / today-room-stats 的读取口径一致。
    // 原写法用 toISOString 切 UTC 日期，凌晨记录会被归到前一天。
    date: getLocalDateKey(new Date(m.at)),
    timestamp: m.at,
  })),
)

const recovery = computed<RecoveryStatus>(() => analyticsApi.getRecoveryStatus(adaptedRecords.value))

function buildRhythm(records: MovementRecord[]): MovementRhythm {
  const now = new Date()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const weeklyCompleted = records
    .filter(r => new Date(r.date) >= weekStart)
    .reduce((sum, r) => sum + r.duration, 0)

  const dates = [...new Set(records.map(r => r.date))].sort()
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = dates.length - 1; i >= 0; i--) {
    // records[].date 已是本地日历日键，判据必须同口径（原来用 toISOString 会恒不匹配 → streak 恒0）。
    // 逐日回退用 setDate，不用 - 86400000 毫秒减法（DST 时区会落到前一天）。
    const expected = new Date(today)
    expected.setDate(today.getDate() - (dates.length - 1 - i))
    if (dates[i] === getLocalDateKey(expected)) streak++
    else break
  }
  let bestStreak = 0
  let cur = 1
  for (let i = 1; i < dates.length; i++) {
    // 日键差值按 UTC 天数算（纯日键相减，与本地时区/DST 无关）
    const diffDays = (
      Date.UTC(+dates[i].slice(0, 4), +dates[i].slice(5, 7) - 1, +dates[i].slice(8, 10)) -
      Date.UTC(+dates[i - 1].slice(0, 4), +dates[i - 1].slice(5, 7) - 1, +dates[i - 1].slice(8, 10))
    ) / 86400000
    if (diffDays === 1) cur++
    else { bestStreak = Math.max(bestStreak, cur); cur = 1 }
  }
  bestStreak = Math.max(bestStreak, cur)

  const typeCount = new Map<MovementType, number>()
  for (const r of records) typeCount.set(r.type, (typeCount.get(r.type) ?? 0) + 1)
  const favoriteTypes = [...typeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0])

  return { weeklyTarget: 150, weeklyCompleted, streak, bestStreak, favoriteTypes, bodyAwakening: 50 }
}

function refreshStats() {
  analyticsApi.updateAnalytics(adaptedRecords.value, buildRhythm(adaptedRecords.value))
}

function runAssess() {
  analyticsApi.assessFitness(adaptedRecords.value)
}

function runRecommend() {
  recommendations.value = analyticsApi.generateRecommendations(adaptedRecords.value)
}

function typeLabel(t: MovementType) { return MOVEMENT_TYPE_META[t]?.label ?? t }
function typeIcon(t: MovementType) { return MOVEMENT_TYPE_META[t]?.icon ?? '💪' }
function intensityLabel(i: MovementIntensity) { return MOVEMENT_INTENSITY_META[i]?.label ?? i }
</script>

<style scoped>
.ma-panel {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.ma-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.ma-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.ma-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.ma-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ma-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ma-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.ma-ov-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ma-ov {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.ma-ov-num { font-size: 18px; font-weight: 700; color: rgba(240, 242, 255, 0.92); }
.ma-ov-label { font-size: 10px; color: var(--text-low); }
.ma-hint { margin: 0; font-size: 11px; color: var(--text-low); line-height: 1.5; }
.ma-fitness {
  display: flex;
  gap: 16px;
  align-items: center;
}
.ma-fitness-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 80px;
}
.ma-fitness-num { font-size: 30px; font-weight: 700; color: #b8c4a0; }
.ma-fitness-label { font-size: 11px; color: var(--text-medium); }
.ma-fitness-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ma-fbar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.ma-fbar-label { width: 30px; flex: none; color: var(--text-medium); }
.ma-fbar-track {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.ma-fbar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.5), #b8c4a0);
}
.ma-fbar-val { width: 24px; text-align: right; color: var(--text-low); }
.ma-recovery {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ma-recovery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}
.ma-recovery-score { font-weight: 600; color: rgba(240, 242, 255, 0.9); }
.ma-rest-warn { font-size: 12px; color: #f0c040; }
.ma-rest-ok { font-size: 12px; color: #8a9a7a; }
.ma-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
}
.ma-btn:hover { background: rgba(255, 255, 255, 0.09); }
.ma-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 4px 10px; font-size: 11px; 
  min-height: 26px;
}
.ma-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ma-rec {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-left: 3px solid rgba(138, 154, 122, 0.6);
}
.ma-pri-high { border-left-color: #f0c040; }
.ma-rec-icon { flex: none; }
.ma-rec-reason { flex: 1; font-size: 12px; color: rgba(240, 242, 255, 0.85); }
.ma-rec-detail { font-size: 11px; color: var(--text-low); }
.ma-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-low);
}
</style>
