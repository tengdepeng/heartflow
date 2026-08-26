<template>
  <section class="map2" aria-label="运动计划与成就">
    <div class="map2-head">
      <span class="map2-title">🏅 运动计划与成就</span>
      <span class="map2-sub">训练计划 · 成就系统 · 节奏分析</span>
    </div>

    <!-- 运动计划 -->
    <div class="map2-block">
      <span class="map2-block-label">运动计划</span>
      <template v-if="activePlan">
        <div class="map2-active">
          <div class="map2-active-head">
            <strong class="map2-active-name">{{ activePlan.name }}</strong>
            <span class="map2-chip">{{ PLAN_TYPE_META[activePlan.planType].icon }} {{ PLAN_TYPE_META[activePlan.planType].label }}</span>
            <button class="map2-btn" @click="deactivate">停用</button>
          </div>
          <span class="map2-active-meta">第 {{ activePlan.currentWeek }} / {{ activePlan.durationWeeks }} 周 · 每周目标 {{ activePlan.weeklyTarget }} 分钟 · {{ difficultyLabel(activePlan.difficulty) }}</span>
          <div v-if="todayWorkout" class="map2-today">
            <span class="map2-today-label">今日训练</span>
            <div v-for="a in todayWorkout.activities" :key="a.type + a.duration" class="map2-today-item">
              <span class="map2-today-icon">{{ MOVEMENT_TYPE_META[a.type].icon }}</span>
              <span class="map2-today-text">{{ MOVEMENT_TYPE_META[a.type].label }} · {{ a.duration }} 分钟</span>
              <span class="map2-today-intensity">{{ MOVEMENT_INTENSITY_META[a.intensity].label }}</span>
            </div>
          </div>
          <p v-else class="map2-empty">今天没有安排训练，休息也是训练的一部分。</p>
        </div>
      </template>
      <p v-else class="map2-empty">尚未激活计划，从下方选择一个开始。</p>

      <div class="map2-plan-list">
        <div v-for="p in plans" :key="p.id" class="map2-plan" :class="{ active: p.active }">
          <span class="map2-plan-icon">{{ PLAN_TYPE_META[p.planType].icon }}</span>
          <div class="map2-plan-body">
            <strong class="map2-plan-name">{{ p.name }}</strong>
            <span class="map2-plan-meta">{{ PLAN_TYPE_META[p.planType].label }} · {{ p.durationWeeks }} 周 · {{ p.weeklyTarget }} 分/周</span>
          </div>
          <button v-if="!p.active" class="map2-btn" @click="activate(p.id)">启用</button>
          <span v-else class="map2-plan-active">✓ 进行中</span>
        </div>
      </div>

      <div class="map2-create">
        <input v-model="newPlan.name" class="map2-input" placeholder="计划名称" />
        <select v-model="newPlan.planType" class="map2-select">
          <option v-for="(meta, key) in PLAN_TYPE_META" :key="key" :value="key">{{ meta.icon }} {{ meta.label }}</option>
        </select>
        <input v-model.number="newPlan.weeklyTarget" type="number" min="30" step="30" class="map2-input map2-num" placeholder="周目标分" />
        <select v-model="newPlan.difficulty" class="map2-select">
          <option value="easy">轻松</option>
          <option value="moderate">适中</option>
          <option value="hard">困难</option>
        </select>
        <input v-model.number="newPlan.durationWeeks" type="number" min="1" max="16" class="map2-input map2-num" placeholder="周数" />
        <button class="map2-btn" @click="createPlan">创建</button>
      </div>
    </div>

    <!-- 成就系统 -->
    <div class="map2-block">
      <span class="map2-block-label">成就系统</span>
      <div class="map2-ach-stats">
        <div class="map2-ach-stat"><span class="map2-ach-num">{{ achStats.unlocked }}</span><span class="map2-ach-label">已解锁</span></div>
        <div class="map2-ach-stat"><span class="map2-ach-num">{{ achStats.total }}</span><span class="map2-ach-label">总数</span></div>
        <div class="map2-ach-stat"><span class="map2-ach-num">{{ achStats.completionRate }}%</span><span class="map2-ach-label">完成率</span></div>
      </div>
      <div v-if="unlocked.length" class="map2-ach-list">
        <div v-for="a in unlocked.slice(0, 8)" :key="a.id" class="map2-ach unlocked">
          <span class="map2-ach-icon">{{ a.icon }}</span>
          <div class="map2-ach-body">
            <strong class="map2-ach-name">{{ a.name }}</strong>
            <span class="map2-ach-desc">{{ a.description }}</span>
          </div>
          <span class="map2-ach-tier" :style="{ color: ACHIEVEMENT_TIER_META[a.tier].color }">{{ ACHIEVEMENT_TIER_META[a.tier].label }}</span>
        </div>
      </div>
      <div v-if="locked.length" class="map2-ach-list">
        <div v-for="a in locked.slice(0, 5)" :key="a.id" class="map2-ach locked">
          <span class="map2-ach-icon">🔒</span>
          <div class="map2-ach-body">
            <strong class="map2-ach-name">{{ a.name }}</strong>
            <span class="map2-ach-desc">{{ a.description }}</span>
            <div class="map2-ach-progress">
              <div class="map2-ach-progress-bg">
                <div class="map2-ach-progress-fill" :style="{ width: achProgress(a) + '%' }"></div>
              </div>
              <span class="map2-ach-progress-text">{{ Math.min(a.condition.progress, a.condition.threshold) }} / {{ a.condition.threshold }}</span>
            </div>
          </div>
        </div>
      </div>
      <p v-if="!unlocked.length && !locked.length" class="map2-empty">暂无成就数据。</p>
    </div>

    <!-- 节奏分析 -->
    <div class="map2-block">
      <span class="map2-block-label">节奏分析</span>
      <template v-if="rhythmAnalysis">
        <div class="map2-score-row">
          <div class="map2-score">
            <span class="map2-score-num">{{ rhythmAnalysis.frequencyScore }}</span>
            <span class="map2-score-label">频率</span>
          </div>
          <div class="map2-score">
            <span class="map2-score-num">{{ rhythmAnalysis.varietyScore }}</span>
            <span class="map2-score-label">多样性</span>
          </div>
          <div class="map2-score">
            <span class="map2-score-num">{{ rhythm.streak }}</span>
            <span class="map2-score-label">连续天数</span>
          </div>
          <div class="map2-score">
            <span class="map2-score-num">{{ rhythm.weeklyCompleted }}</span>
            <span class="map2-score-label">本周分钟</span>
          </div>
        </div>
        <div class="map2-insight-row">
          <span class="map2-insight">最佳运动日：{{ rhythmAnalysis.bestDayOfWeek }}</span>
          <span class="map2-insight">最佳时段：{{ rhythmAnalysis.bestTimeOfDay }}</span>
        </div>
        <div class="map2-suggest">
          <span class="map2-suggest-icon">💡</span>
          <span class="map2-suggest-text">{{ rhythmAnalysis.recoverySuggestion }}</span>
        </div>
        <div class="map2-suggest">
          <span class="map2-suggest-icon">🎯</span>
          <span class="map2-suggest-text">{{ rhythmAnalysis.nextGoalSuggestion }}</span>
        </div>
        <div v-if="rhythmAnalysis.typeDistribution.length" class="map2-type-dist">
          <div v-for="d in rhythmAnalysis.typeDistribution.slice(0, 5)" :key="d.type" class="map2-type-row">
            <span class="map2-type-label">{{ MOVEMENT_TYPE_META[d.type].icon }} {{ MOVEMENT_TYPE_META[d.type].label }}</span>
            <div class="map2-type-bar"><div class="map2-type-fill" :style="{ width: d.percentage + '%' }"></div></div>
            <span class="map2-type-pct">{{ d.minutes }} 分</span>
          </div>
        </div>
      </template>
      <p v-else class="map2-empty">暂无运动记录，记录运动后自动生成节奏分析。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useWorkoutPlans, useMovementAchievements, useRhythmAnalysis } from '../../modules/movement'
import { useMovementRhythm } from '../../modules/movement'
import { PLAN_TYPE_META, ACHIEVEMENT_TIER_META } from '../../modules/movement'
import { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META } from '../../modules/movement'
import type { PlanType, MovementAchievement } from '../../modules/movement'

const plansApi = useWorkoutPlans()
const achApi = useMovementAchievements()
const rhythmApi = useRhythmAnalysis()
const movement = useMovementRhythm()

const plans = computed(() => plansApi.plans.value)
const activePlan = computed(() => plansApi.getActivePlan())
const todayWorkout = computed(() => plansApi.getTodayWorkout())
const unlocked = computed(() => achApi.getUnlockedAchievements())
const locked = computed(() => achApi.getLockedAchievements())
const achStats = computed(() => achApi.getAchievementStats())
const records = computed(() => movement.records.value)
const rhythm = computed(() => movement.rhythm.value)
const rhythmAnalysis = computed(() => rhythmApi.analyzeRhythm(records.value, rhythm.value))

const newPlan = reactive({
  name: '',
  planType: 'general_health' as PlanType,
  weeklyTarget: 150,
  difficulty: 'moderate' as 'easy' | 'moderate' | 'hard',
  durationWeeks: 4,
})

function difficultyLabel(d: string): string {
  return { easy: '轻松', moderate: '适中', hard: '困难', extreme: '极限' }[d] ?? d
}
function achProgress(a: MovementAchievement): number {
  if (a.condition.threshold <= 0) return 0
  return Math.min(100, Math.round((a.condition.progress / a.condition.threshold) * 100))
}
function activate(id: string) {
  plansApi.activatePlan(id)
}
function deactivate() {
  plansApi.deactivatePlan()
}
function createPlan() {
  if (!newPlan.name.trim()) return
  plansApi.createPlan(
    newPlan.name.trim(),
    newPlan.planType,
    newPlan.weeklyTarget,
    newPlan.difficulty,
    newPlan.durationWeeks,
    []
  )
  newPlan.name = ''
}
</script>

<style scoped>
.map2 {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.1);
}
.map2-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.map2-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent, #d4a574);
}
.map2-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.45);
}
.map2-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.04);
}
.map2-block-label {
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.55);
}
.map2-active {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.15);
}
.map2-active-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.map2-active-name {
  flex: 1;
  font-size: 13px;
  color: var(--accent, #d4a574);
}
.map2-active-meta {
  font-size: 11px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.map2-today {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px dashed rgba(var(--accent-rgb, 212, 165, 116), 0.12);
}
.map2-today-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.map2-today-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.map2-today-icon {
  font-size: 14px;
}
.map2-today-text {
  flex: 1;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.8);
}
.map2-today-intensity {
  font-size: 10px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.map2-plan-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.map2-plan {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
}
.map2-plan.active {
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.25);
}
.map2-plan-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.map2-plan-body {
  flex: 1;
  min-width: 0;
}
.map2-plan-name {
  display: block;
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.85);
}
.map2-plan-meta {
  font-size: 10px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.35);
}
.map2-plan-active {
  font-size: 11px;
  color: var(--accent, #d4a574);
  flex-shrink: 0;
}
.map2-create {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.map2-input {
  flex: 1;
  min-width: 90px;
  padding: 7px 10px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12);
  border-radius: 8px;
  background: var(--bg-card, rgba(13, 11, 9, 0.6));
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.map2-input::placeholder {
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.2);
}
.map2-input:focus {
  border-color: rgba(var(--accent-rgb, 212, 165, 116), 0.3);
}
.map2-num {
  max-width: 90px;
}
.map2-select {
  padding: 7px 8px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12);
  border-radius: 8px;
  background: var(--bg-card, rgba(13, 11, 9, 0.6));
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.map2-btn {
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.25);
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.1);
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.map2-btn:hover {
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.18);
  border-color: rgba(var(--accent-rgb, 212, 165, 116), 0.35);
}
.map2-chip {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.1);
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.6);
}
.map2-ach-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.map2-ach-stat {
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
}
.map2-ach-num {
  display: block;
  font-size: 18px;
  font-weight: 500;
  color: var(--accent, #d4a574);
}
.map2-ach-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.map2-ach-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.map2-ach {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
}
.map2-ach.unlocked {
  border-left: 3px solid rgba(var(--accent-rgb, 212, 165, 116), 0.3);
}
.map2-ach.locked {
  opacity: 0.7;
}
.map2-ach-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.map2-ach-body {
  flex: 1;
  min-width: 0;
}
.map2-ach-name {
  display: block;
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.85);
}
.map2-ach-desc {
  font-size: 10px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.map2-ach-tier {
  font-size: 10px;
  flex-shrink: 0;
}
.map2-ach-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.map2-ach-progress-bg {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.1);
  overflow: hidden;
}
.map2-ach-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.5);
}
.map2-ach-progress-text {
  font-size: 10px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
  flex-shrink: 0;
}
.map2-score-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.map2-score {
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
}
.map2-score-num {
  display: block;
  font-size: 18px;
  font-weight: 500;
  color: var(--accent, #d4a574);
}
.map2-score-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.map2-insight-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.map2-insight {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.08);
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.6);
}
.map2-suggest {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.75);
}
.map2-suggest-icon {
  font-size: 13px;
}
.map2-type-dist {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.map2-type-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.map2-type-label {
  width: 90px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.6);
  flex-shrink: 0;
}
.map2-type-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.08);
  overflow: hidden;
}
.map2-type-fill {
  height: 100%;
  border-radius: 3px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.5);
}
.map2-type-pct {
  width: 44px;
  text-align: right;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
  font-size: 10px;
  flex-shrink: 0;
}
.map2-empty {
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.3);
}
</style>
