<template>
  <section class="wpp">
    <div class="wpp-head">
      <div class="wpp-title-wrap">
        <span class="wpp-title">🗓 运动计划</span>
        <span class="wpp-sub">预设计划 · 今日训练 · 自定义计划</span>
      </div>
      <span class="wpp-tag">{{ activePlan ? activePlan.name : '未激活' }}</span>
    </div>

    <!-- 今日训练 -->
    <div v-if="todayWorkout" class="wpp-today">
      <span class="wpp-block-label">今日训练 · {{ dayName }}</span>
      <div v-for="(a, i) in todayWorkout.activities" :key="i" class="wpp-today-item">
        <span class="wpp-today-icon">{{ typeIcon(a.type) }}</span>
        <span class="wpp-today-name">{{ typeLabel(a.type) }}</span>
        <span class="wpp-today-meta">{{ a.duration }} 分钟 · {{ intensityLabel(a.intensity) }}</span>
        <span v-if="a.description" class="wpp-today-desc">{{ a.description }}</span>
      </div>
      <p v-if="todayWorkout.note" class="wpp-today-note">{{ todayWorkout.note }}</p>
    </div>
    <p v-else-if="activePlan" class="wpp-hint">今天是休息日，好好恢复。</p>
    <p v-else class="wpp-hint">激活一个计划后，这里会显示今日训练安排。</p>

    <!-- 计划列表 -->
    <div class="wpp-list">
      <span class="wpp-block-label">计划列表</span>
      <div v-for="p in plans" :key="p.id" class="wpp-plan" :class="{ active: p.active }">
        <div class="wpp-plan-head">
          <span class="wpp-plan-icon">{{ planIcon(p.planType) }}</span>
          <div class="wpp-plan-info">
            <span class="wpp-plan-name">{{ p.name }}</span>
            <span class="wpp-plan-desc">{{ p.description || planDesc(p.planType) }}</span>
          </div>
          <span v-if="p.active" class="wpp-plan-badge">进行中</span>
        </div>
        <div class="wpp-plan-meta">
          <span>{{ planLabel(p.planType) }}</span>
          <span>每周 {{ p.weeklyTarget }} 分</span>
          <span>{{ difficultyLabel(p.difficulty) }}</span>
          <span>第 {{ p.currentWeek }}/{{ p.durationWeeks }} 周</span>
        </div>
        <div class="wpp-plan-actions">
          <button v-if="!p.active" class="wpp-btn" @click="activate(p.id)">激活</button>
          <template v-else>
            <button class="wpp-btn wpp-btn--ghost" @click="advance(p.id)" :disabled="p.currentWeek >= p.durationWeeks">推进一周</button>
            <button class="wpp-btn wpp-btn--ghost" @click="deactivate">停用</button>
          </template>
        </div>
      </div>
    </div>

    <!-- 自定义计划 -->
    <div class="wpp-custom">
      <span class="wpp-block-label">自定义计划</span>
      <form class="wpp-form" @submit.prevent="createCustom">
        <input v-model="custom.name" class="wpp-input" placeholder="计划名称" required />
        <div class="wpp-form-row">
          <select v-model="custom.planType" class="wpp-select">
            <option v-for="(m, k) in PLAN_TYPE_META" :key="k" :value="k">{{ m.label }}</option>
          </select>
          <select v-model="custom.difficulty" class="wpp-select">
            <option value="easy">轻松</option>
            <option value="moderate">适中</option>
            <option value="hard">困难</option>
            <option value="extreme">极限</option>
          </select>
        </div>
        <div class="wpp-form-row">
          <input v-model.number="custom.weeklyTarget" type="number" min="30" max="600" class="wpp-input" placeholder="每周目标(分)" />
          <input v-model.number="custom.durationWeeks" type="number" min="1" max="16" class="wpp-input" placeholder="持续周数" />
        </div>
        <button type="submit" class="wpp-btn wpp-btn--solid" :disabled="!custom.name || !custom.weeklyTarget">创建计划</button>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useWorkoutPlans, PLAN_TYPE_META, DAY_NAMES } from '../modules/movement'
import { MOVEMENT_TYPE_META } from '../modules/movement'
import type { PlanType, MovementType } from '../modules/movement'

const wp = useWorkoutPlans()
const plans = wp.plans

const activePlan = computed(() => wp.getActivePlan())
const todayWorkout = computed(() => wp.getTodayWorkout())
const dayName = computed(() => DAY_NAMES[new Date().getDay()])

const custom = reactive({
  name: '',
  planType: 'general_health' as PlanType,
  difficulty: 'moderate' as 'easy' | 'moderate' | 'hard' | 'extreme',
  weeklyTarget: 150,
  durationWeeks: 4,
})

const PLAN_TYPE_DEFAULT_ACTIVITY: Record<PlanType, string> = {
  weight_loss: 'hiit',
  muscle_build: 'strength',
  endurance: 'running',
  flexibility: 'yoga',
  general_health: 'walking',
  stress_relief: 'tai_chi',
  custom: 'custom',
}

function activate(id: string) { wp.activatePlan(id) }
function deactivate() { wp.deactivatePlan() }
function advance(id: string) { wp.advanceWeek(id) }

function createCustom() {
  const activityType = PLAN_TYPE_DEFAULT_ACTIVITY[custom.planType]
  wp.createPlan(
    custom.name.trim(),
    custom.planType,
    custom.weeklyTarget,
    custom.difficulty,
    custom.durationWeeks,
    [
      { dayOfWeek: 1, activities: [{ type: activityType as MovementType, duration: Math.round(custom.weeklyTarget / 3), intensity: 'moderate' }] },
      { dayOfWeek: 3, activities: [{ type: activityType as MovementType, duration: Math.round(custom.weeklyTarget / 3), intensity: 'moderate' }] },
      { dayOfWeek: 5, activities: [{ type: activityType as MovementType, duration: Math.round(custom.weeklyTarget / 3), intensity: 'moderate' }] },
    ],
    ['自定义'],
  )
  custom.name = ''
}

function planLabel(t: string) { return PLAN_TYPE_META[t as PlanType]?.label ?? t }
function planIcon(t: string) { return PLAN_TYPE_META[t as PlanType]?.icon ?? '🎯' }
function planDesc(t: string) { return PLAN_TYPE_META[t as PlanType]?.desc ?? '' }
function typeLabel(t: string) { return MOVEMENT_TYPE_META[t as keyof typeof MOVEMENT_TYPE_META]?.label ?? t }
function typeIcon(t: string) { return MOVEMENT_TYPE_META[t as keyof typeof MOVEMENT_TYPE_META]?.icon ?? '🎯' }
function intensityLabel(i: string) {
  const map: Record<string, string> = { light: '轻度', moderate: '中度', vigorous: '激烈', extreme: '极限' }
  return map[i] ?? i
}
function difficultyLabel(d: string) {
  const map: Record<string, string> = { easy: '轻松', moderate: '适中', hard: '困难', extreme: '极限' }
  return map[d] ?? d
}
</script>

<style scoped>
.wpp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.wpp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.wpp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.wpp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.wpp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.wpp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e3c08a; white-space: nowrap; }
.wpp-block-label { display: block; font-size: 11px; color: rgba(232, 221, 208, 0.5); letter-spacing: 1px; margin-bottom: 8px; }
.wpp-hint { font-size: 12px; color: rgba(232, 221, 208, 0.4); margin: 0 0 14px; line-height: 1.7; }

.wpp-today { padding: 12px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.06); margin-bottom: 14px; }
.wpp-today-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.wpp-today-icon { font-size: 15px; }
.wpp-today-name { font-size: 12px; color: rgba(232, 221, 208, 0.7); width: 44px; }
.wpp-today-meta { font-size: 11px; color: rgba(232, 221, 208, 0.45); }
.wpp-today-desc { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); margin-left: auto; }
.wpp-today-note { margin: 6px 0 0; font-size: 11px; color: rgba(232, 221, 208, 0.4); }

.wpp-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.wpp-plan { padding: 12px; border-radius: 12px; background: var(--bg-card, rgba(255,255,255,0.03)); border: 1px solid rgba(255, 255, 255, 0.06); }
.wpp-plan.active { border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.05); }
.wpp-plan-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
.wpp-plan-icon { font-size: 18px; flex-shrink: 0; }
.wpp-plan-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.wpp-plan-name { font-size: 13px; font-weight: 500; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.wpp-plan-desc { font-size: 11px; color: rgba(232, 221, 208, 0.4); line-height: 1.5; }
.wpp-plan-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.16); color: #e3c08a; white-space: nowrap; flex-shrink: 0; }
.wpp-plan-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11px; color: rgba(232, 221, 208, 0.45); margin-bottom: 8px; }
.wpp-plan-actions { display: flex; gap: 6px; }
.wpp-btn {
  padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.12); color: #e3c08a; font-size: 11px; font-family: inherit;
  cursor: pointer; transition: all 0.2s;
}
.wpp-btn:hover { background: rgba(var(--accent-rgb), 0.2); }
.wpp-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.wpp-btn--ghost { background: transparent; color: rgba(232, 221, 208, 0.5); }
.wpp-btn--ghost:hover { background: rgba(var(--accent-rgb), 0.08); color: #e3c08a; }
.wpp-btn--solid { width: 100%; padding: 8px; }

.wpp-form { display: flex; flex-direction: column; gap: 8px; }
.wpp-form-row { display: flex; gap: 8px; }
.wpp-input {
  flex: 1; padding: 8px 10px; border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: 8px;
  background: var(--bg-card, rgba(255,255,255,0.03)); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 12px; font-family: inherit; outline: none;
}
.wpp-input::placeholder { color: rgba(232, 221, 208, 0.3); }
.wpp-input:focus { border-color: rgba(var(--accent-rgb), 0.35); }
.wpp-select {
  flex: 1; padding: 8px 10px; border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: 8px;
  background: var(--bg-card, rgba(255,255,255,0.03)); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 12px; font-family: inherit; outline: none; cursor: pointer;
}
</style>
