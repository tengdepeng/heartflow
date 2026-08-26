<template>
  <section class="np" aria-label="营养计算">
    <div class="np-head">
      <span class="np-title">🥗 营养计算</span>
      <span class="np-sub">BMR / TDEE · 个性化宏量目标 · 餐次分布</span>
    </div>

    <!-- 身体档案 -->
    <div class="np-block">
      <span class="np-block-label">身体档案</span>
      <div class="np-grid">
        <label class="np-field">
          <span class="np-field-name">性别</span>
          <select v-model="gender" class="np-select">
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </label>
        <label class="np-field">
          <span class="np-field-name">年龄</span>
          <input v-model.number="age" type="number" min="10" max="100" class="np-input" />
        </label>
        <label class="np-field">
          <span class="np-field-name">体重 kg</span>
          <input v-model.number="weight" type="number" min="30" max="200" class="np-input" />
        </label>
        <label class="np-field">
          <span class="np-field-name">身高 cm</span>
          <input v-model.number="height" type="number" min="120" max="220" class="np-input" />
        </label>
        <label class="np-field">
          <span class="np-field-name">活动水平</span>
          <select v-model="activityLevel" class="np-select">
            <option v-for="a in activityOptions" :key="a.key" :value="a.key">{{ a.label }}</option>
          </select>
        </label>
        <label class="np-field">
          <span class="np-field-name">目标</span>
          <select v-model="goal" class="np-select">
            <option v-for="g in goalOptions" :key="g.key" :value="g.key">{{ g.label }}</option>
          </select>
        </label>
      </div>
    </div>

    <!-- 能量目标 -->
    <div class="np-block">
      <span class="np-block-label">能量目标</span>
      <div class="np-energy">
        <div class="np-energy-card">
          <span class="np-energy-label">BMR</span>
          <strong class="np-energy-val">{{ targets?.bmr ?? '—' }}</strong>
          <span class="np-energy-unit">kcal/天</span>
        </div>
        <div class="np-energy-card">
          <span class="np-energy-label">TDEE</span>
          <strong class="np-energy-val">{{ targets?.tdee ?? '—' }}</strong>
          <span class="np-energy-unit">kcal/天</span>
        </div>
        <div class="np-energy-card np-energy-card--main">
          <span class="np-energy-label">目标摄入</span>
          <strong class="np-energy-val">{{ targets?.targetCalories ?? '—' }}</strong>
          <span class="np-energy-unit">kcal/天</span>
        </div>
      </div>
      <p v-if="targets" class="np-range">建议范围 {{ targets.calorieRange[0] }} – {{ targets.calorieRange[1] }} kcal · 饮水 {{ targets.waterTarget }} ml</p>
    </div>

    <!-- 宏量营养素 -->
    <div v-if="targets" class="np-block">
      <span class="np-block-label">宏量营养素目标</span>
      <div class="np-macros">
        <div v-for="m in macroRows" :key="m.key" class="np-macro">
          <div class="np-macro-head">
            <span class="np-macro-name">{{ m.label }}</span>
            <span class="np-macro-val">{{ m.target.recommended }}g</span>
          </div>
          <div class="np-macro-bar">
            <i class="np-macro-fill" :style="{ width: m.pct + '%' }" />
          </div>
          <span class="np-macro-meta">范围 {{ m.target.min }}–{{ m.target.max }}g · 供能 {{ Math.round(m.target.energyRatio * 100) }}%</span>
        </div>
      </div>
    </div>

    <!-- 餐次分布 -->
    <div v-if="targets" class="np-block">
      <span class="np-block-label">餐次分布</span>
      <div class="np-meals">
        <div v-for="m in mealRows" :key="m.key" class="np-meal">
          <span class="np-meal-name">{{ m.label }}</span>
          <div class="np-meal-bar"><i class="np-meal-fill" :style="{ width: m.pct + '%' }" /></div>
          <span class="np-meal-val">{{ m.calories }} kcal</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  useNutritionEngine,
  type UserProfile,
} from '../modules/body'

const engine = useNutritionEngine()

const gender = ref<UserProfile['gender']>('male')
const age = ref(30)
const weight = ref(70)
const height = ref(175)
const activityLevel = ref<UserProfile['activityLevel']>('moderate')
const goal = ref<UserProfile['goal']>('maintain')

const activityOptions: { key: UserProfile['activityLevel']; label: string }[] = [
  { key: 'sedentary', label: '久坐不动' },
  { key: 'light', label: '轻度活动' },
  { key: 'moderate', label: '中度活动' },
  { key: 'active', label: '高度活动' },
  { key: 'very_active', label: '极高活动' },
]

const goalOptions: { key: UserProfile['goal']; label: string }[] = [
  { key: 'lose_weight', label: '减重' },
  { key: 'maintain', label: '维持' },
  { key: 'gain_muscle', label: '增肌' },
  { key: 'improve_health', label: '改善健康' },
]

const targets = computed(() => engine.targets.value)

const macroRows = computed(() => {
  if (!targets.value) return []
  return [
    { key: 'protein', label: '蛋白质', target: targets.value.macros.protein, pct: Math.min(100, targets.value.macros.protein.recommended / 200 * 100) },
    { key: 'carbs', label: '碳水', target: targets.value.macros.carbs, pct: Math.min(100, targets.value.macros.carbs.recommended / 400 * 100) },
    { key: 'fat', label: '脂肪', target: targets.value.macros.fat, pct: Math.min(100, targets.value.macros.fat.recommended / 100 * 100) },
  ]
})

const mealRows = computed(() => {
  if (!targets.value) return []
  const d = targets.value.mealDistribution
  return [
    { key: 'breakfast', label: '早餐', calories: d.breakfast.calories, pct: d.breakfast.ratio * 100 },
    { key: 'lunch', label: '午餐', calories: d.lunch.calories, pct: d.lunch.ratio * 100 },
    { key: 'dinner', label: '晚餐', calories: d.dinner.calories, pct: d.dinner.ratio * 100 },
    { key: 'snack', label: '加餐', calories: d.snack.calories, pct: d.snack.ratio * 100 },
  ]
})

function recalc() {
  engine.updateProfile({
    gender: gender.value,
    age: age.value,
    weight: weight.value,
    height: height.value,
    activityLevel: activityLevel.value,
    goal: goal.value,
  })
}

watch([gender, age, weight, height, activityLevel, goal], recalc, { immediate: true })
</script>

<style scoped>
.np {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.np-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.np-title {
  font-size: 16px;
  font-weight: 700;
}
.np-sub {
  font-size: 12px;
  opacity: 0.6;
}
.np-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
}
.np-block-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}
.np-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.np-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.np-field-name {
  font-size: 11px;
  opacity: 0.6;
}
.np-input,
.np-select {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: transparent;
  color: inherit;
  font-size: 12px;
}
.np-energy {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
}
.np-energy-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}
.np-energy-card--main {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
}
.np-energy-label {
  font-size: 11px;
  opacity: 0.6;
}
.np-energy-val {
  font-size: 22px;
}
.np-energy-unit {
  font-size: 11px;
  opacity: 0.6;
}
.np-range {
  font-size: 12px;
  opacity: 0.7;
  margin: 0;
}
.np-macros {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.np-macro {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.np-macro-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.np-macro-name {
  font-weight: 600;
}
.np-macro-val {
  opacity: 0.8;
}
.np-macro-bar,
.np-meal-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
}
.np-macro-fill,
.np-meal-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}
.np-macro-meta {
  font-size: 11px;
  opacity: 0.55;
}
.np-meals {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.np-meal {
  display: flex;
  align-items: center;
  gap: 10px;
}
.np-meal-name {
  flex: 0 0 44px;
  font-size: 12px;
}
.np-meal-bar {
  flex: 1;
}
.np-meal-val {
  flex: 0 0 64px;
  font-size: 12px;
  text-align: right;
  opacity: 0.8;
}
</style>
