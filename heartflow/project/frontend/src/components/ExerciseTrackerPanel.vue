<template>
  <section data-enter class="ex-panel">
    <header class="ex-head">
      <span class="ex-title">🏃 身体数据接入 · 运动手记</span>
      <span class="ex-hint">手动录入，聚合回望</span>
    </header>

    <!-- 统计速览 -->
    <div class="ex-stats">
      <div class="ex-stat">
        <span class="ex-stat-n">{{ stats.totalWorkouts }}</span>
        <span class="ex-stat-l">累计运动</span>
      </div>
      <div class="ex-stat">
        <span class="ex-stat-n">{{ fmtMin(stats.totalDuration) }}</span>
        <span class="ex-stat-l">总时长</span>
      </div>
      <div class="ex-stat">
        <span class="ex-stat-n">{{ stats.totalCalories }}</span>
        <span class="ex-stat-l">消耗(千卡)</span>
      </div>
      <div class="ex-stat">
        <span class="ex-stat-n">{{ stats.streak }}</span>
        <span class="ex-stat-l">连续天数</span>
      </div>
    </div>

    <!-- 录入表单 -->
    <div class="ex-form">
      <input v-model="form.name" class="ex-input ex-name" type="text" placeholder="运动名称，如 晨跑 / 瑜伽" />
      <select v-model="form.type" class="ex-input ex-select">
        <option v-for="(m, t) in TYPE_META" :key="t" :value="t">{{ m.icon }} {{ m.label }}</option>
      </select>
      <input v-model.number="form.duration" class="ex-input ex-min" type="number" min="1" placeholder="分钟" />
      <select v-model="form.intensity" class="ex-input ex-select">
        <option value="light">轻度</option>
        <option value="moderate">中等</option>
        <option value="vigorous">高强</option>
        <option value="extreme">极限</option>
      </select>
      <button class="ex-submit" :disabled="!form.name.trim() || !form.duration" @click="submit">记录</button>
    </div>

    <!-- 本周小结 -->
    <div v-if="summary.totalWorkouts > 0" class="ex-summary">
      <p class="ex-summary-text">{{ summary.summary }}</p>
      <div class="ex-summary-meta">
        <span>最佳日 <b>{{ summary.bestDay ? shortDate(summary.bestDay.date) : '—' }}</b></span>
        <span>休息 <b>{{ summary.restDays }}</b> 天</span>
        <span>情绪 <b>{{ moodLabel(summary.moodTrend) }}</b></span>
      </div>
      <ul class="ex-tips" v-if="summary.nextWeekTips.length">
        <li v-for="(tip, i) in summary.nextWeekTips" :key="i">{{ tip }}</li>
      </ul>
    </div>
    <p v-else-if="records.length === 0" class="ex-empty">从记录一次运动开始，聚合你的身体数据。</p>

    <!-- 近期记录 -->
    <ul class="ex-list" v-if="records.length">
      <li v-for="r in records" :key="r.id" class="ex-item">
        <span class="ex-item-icon">{{ TYPE_META[r.type]?.icon ?? '·' }}</span>
        <div class="ex-item-info">
          <span class="ex-item-name">{{ r.name }}</span>
          <span class="ex-item-meta">{{ r.duration }} 分钟 · {{ intensityLabel(r.intensity) }} · {{ r.date }}</span>
        </div>
        <button class="ex-del" title="删除" @click="remove(r.id)">×</button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useExerciseTracker } from '../modules/body/exercise-tracker'
import type { ExerciseIntensity, ExerciseType } from '../modules/body/exercise-tracker'

const tracker = useExerciseTracker()
const TYPE_META = tracker.EXERCISE_TYPE_META
const records = tracker.records

const INTENSITY_LABEL: Record<ExerciseIntensity, string> = {
  light: '轻度', moderate: '中等', vigorous: '高强', extreme: '极限',
}
const MOOD_LABEL: Record<string, string> = {
  improving: '向好', declining: '走低', stable: '平稳',
}
const intensityLabel = (i: ExerciseIntensity) => INTENSITY_LABEL[i] ?? i
const moodLabel = (m: string) => MOOD_LABEL[m] ?? '平稳'

function fmtMin(min: number): string {
  if (min >= 60) return `${Math.round(min / 60 * 10) / 10}时`
  return `${min}分`
}
function shortDate(d: string): string {
  return d.slice(5)
}

const stats = computed(() => tracker.getExerciseStats('all'))
const summary = computed(() => tracker.getWeeklySummary())

const form = reactive({
  name: '',
  type: 'walking' as ExerciseType,
  duration: 30,
  intensity: 'moderate' as ExerciseIntensity,
})

function submit() {
  tracker.logExercise({
    type: form.type,
    name: form.name.trim(),
    duration: form.duration,
    intensity: form.intensity,
  })
  form.name = ''
}
function remove(id: string) {
  tracker.removeRecord(id)
}
</script>

<style scoped>
.ex-panel {
  max-width: 640px;
  margin: 18px auto 0;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--bg-card);
  color: var(--text-high);
}
.ex-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}
.ex-title { font-size: 14px; font-weight: 600; }
.ex-hint { font-size: 11px; color: var(--text-secondary); }

.ex-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.ex-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.16);
}
.ex-stat-n { font-size: 16px; font-weight: 600; color: var(--accent); }
.ex-stat-l { font-size: 10px; color: var(--text-secondary); }

.ex-form {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.ex-input {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.ex-name { flex: 1; min-width: 150px;
}
.ex-min { width: 72px; }
.ex-select { width: auto; }
.ex-submit {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.ex-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.ex-summary {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.16);
  margin-bottom: 12px;
}
.ex-summary-text { font-size: 12px; color: var(--text-high); margin: 0 0 6px; }
.ex-summary-meta { display: flex; gap: 12px; font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; }
.ex-summary-meta b { color: var(--accent); }
.ex-tips { margin: 0; padding-left: 16px; }
.ex-tips li { font-size: 11px; color: var(--text-secondary); line-height: 1.6; }

.ex-empty { font-size: 12px; color: var(--text-secondary); text-align: center; padding: 12px 0; }

.ex-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.ex-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.12);
}
.ex-item-icon { font-size: 16px; }
.ex-item-info { flex: 1; display: flex; flex-direction: column; }
.ex-item-name { font-size: 12px; color: var(--text-high); }
.ex-item-meta { font-size: 10px; color: var(--text-secondary); }
.ex-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  width: 20px; height: 20px;
  border: none; border-radius: 50%;
  background: transparent; color: var(--text-faint);
  cursor: pointer; font-size: 13px;

  min-height: 24px;
  min-width: 24px;
}
.ex-del:hover { color: var(--danger); background: rgba(255, 107, 107, 0.1); }
</style>