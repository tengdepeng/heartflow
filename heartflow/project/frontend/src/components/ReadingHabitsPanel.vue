<template>
  <section class="rhp-panel" aria-label="阅读习惯分析">
    <div class="rhp-panel-head">
      <span class="rhp-panel-title">📚 阅读习惯</span>
      <span class="rhp-panel-sub">模式 · 一致性 · 洞察</span>
    </div>

    <!-- 习惯管理 -->
    <div class="rhp-block">
      <span class="rhp-block-label">🎯 阅读习惯 · {{ habitSummary.total }}</span>
      <div class="rhp-form">
        <input v-model="habitForm.name" class="rhp-input" placeholder="习惯名称" />
        <select v-model="habitForm.type" class="rhp-select">
          <option v-for="(meta, key) in HABIT_TYPE_META" :key="key" :value="key">{{ meta.icon }} {{ meta.label }}</option>
        </select>
        <button class="rhp-btn rhp-btn-primary" @click="createHabit">创建</button>
      </div>
      <ul v-if="habits.length" class="rhp-list">
        <li v-for="h in habits" :key="h.id" class="rhp-habit">
          <div class="rhp-habit-head">
            <span class="rhp-habit-name">{{ habitMeta(h.type).icon }} {{ h.name }}</span>
            <span class="rhp-habit-meta">🔥{{ h.streak }}天</span>
            <button class="rhp-btn rhp-btn-sm rhp-btn-del" @click="removeHabit(h.id)">删除</button>
          </div>
          <div class="rhp-habit-bar">
            <div class="rhp-habit-bar-fill" :style="{ width: Math.round(h.strength * 100) + '%' }"></div>
          </div>
          <div class="rhp-habit-foot">
            <input :value="strengthInputs[h.id] ?? h.strength" @input="strengthInputs[h.id] = ($event.target as HTMLInputElement).value" type="range" min="0" max="1" step="0.05" class="rhp-range" />
            <button class="rhp-btn rhp-btn-sm" @click="updateStrength(h.id)">设强度</button>
            <span class="rhp-hint">{{ Math.round(h.strength * 100) }}%</span>
          </div>
        </li>
      </ul>
      <p v-else class="rhp-empty">还没有阅读习惯，创建一个开始追踪吧。</p>
    </div>

    <!-- 阅读模式分析 -->
    <div class="rhp-block">
      <div class="rhp-block-head">
        <span class="rhp-block-label">📊 阅读模式 · {{ sessions.length }} 次会话</span>
        <button class="rhp-btn rhp-btn-sm" @click="runPattern">分析</button>
      </div>
      <template v-if="pattern">
        <div class="rhp-ov">
          <span>平均 {{ pattern.averageDuration }} 分钟</span>
          <span>最佳时段 {{ pattern.bestTimeSlot.label }}</span>
          <span>常读日 {{ pattern.favoriteDayOfWeek }}</span>
          <span>一致性 {{ pattern.consistency }}%</span>
        </div>
        <div class="rhp-slots">
          <div v-for="s in pattern.timeSlotDistribution.slice(0, 4)" :key="s.timeSlot" class="rhp-slot">
            <span class="rhp-slot-label">{{ s.timeSlot }}</span>
            <div class="rhp-slot-bar">
              <div class="rhp-slot-bar-fill" :style="{ width: s.frequencyPercent + '%' }"></div>
            </div>
            <span class="rhp-slot-val">{{ s.frequencyPercent }}%</span>
          </div>
        </div>
      </template>
      <p v-else class="rhp-empty">点击「分析」从阅读会话中提取模式。</p>
    </div>

    <!-- 习惯洞察 -->
    <div class="rhp-block">
      <div class="rhp-block-head">
        <span class="rhp-block-label">💡 习惯洞察 · {{ insights.length }}</span>
        <button class="rhp-btn rhp-btn-sm" @click="runInsights">生成洞察</button>
      </div>
      <ul v-if="insights.length" class="rhp-list">
        <li v-for="ins in insights" :key="ins.id" class="rhp-insight" :class="`rhp-iv-${ins.type}`">
          <div class="rhp-insight-head">
            <span class="rhp-insight-title">{{ ins.title }}</span>
            <span class="rhp-insight-pri">{{ priorityLabel(ins.priority) }}</span>
          </div>
          <p class="rhp-insight-desc">{{ ins.description }}</p>
          <span v-if="ins.suggestedAction" class="rhp-insight-action">→ {{ ins.suggestedAction }}</span>
        </li>
      </ul>
      <p v-else class="rhp-empty">基于藏书与阅读会话生成个性化洞察。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useReadingHabits, HABIT_TYPE_META } from '../modules/reading/reading-habits'
import { useReadingHall } from '../modules/reading/hall'
import type { HabitType, ReadingSessionPattern } from '../modules/reading/reading-habits'

const habitsApi = useReadingHabits()
const hall = useReadingHall()

const habits = habitsApi.habits
const insights = habitsApi.insights
const habitSummary = habitsApi.habitSummary
const sessions = hall.sessions
const books = hall.books

const habitForm = ref({ name: '', type: 'daily_reading' as HabitType })
const pattern = ref<ReadingSessionPattern | null>(null)
const strengthInputs = reactive<Record<string, string>>({})

function habitMeta(t: HabitType) { return HABIT_TYPE_META[t] ?? HABIT_TYPE_META.custom }

function createHabit() {
  const name = habitForm.value.name.trim()
  if (!name) return
  habitsApi.createHabit(name, '', habitForm.value.type)
  habitForm.value = { name: '', type: 'daily_reading' as HabitType }
}

function removeHabit(id: string) {
  habitsApi.deleteHabit(id)
}

function updateStrength(id: string) {
  const raw = strengthInputs[id]
  const v = raw === undefined || raw === '' ? NaN : Number(raw)
  if (Number.isFinite(v)) habitsApi.updateHabitStrength(id, v)
}

function runPattern() {
  pattern.value = habitsApi.analyzeReadingPatterns(sessions.value)
}

function runInsights() {
  habitsApi.generateHabitInsights(books.value, sessions.value)
}

function priorityLabel(p: string) {
  const map: Record<string, string> = { high: '高', medium: '中', low: '低' }
  return map[p] ?? p
}
</script>

<style scoped>
.rhp-panel {
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
.rhp-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.rhp-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.rhp-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.rhp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.rhp-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rhp-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.rhp-form {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.rhp-select,
.rhp-input {
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.rhp-input { width: 150px; }
.rhp-select option { background: #14161d; color: rgba(240, 242, 255, 0.85); }
.rhp-btn {
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
.rhp-btn:hover { background: rgba(255, 255, 255, 0.09); }
.rhp-btn-primary {
  background: rgba(138, 154, 122, 0.18);
  border-color: rgba(138, 154, 122, 0.35);
  color: #b8c4a0;
}
.rhp-btn-sm { padding: 4px 10px; font-size: 11px; }
.rhp-btn-del:hover { border-color: rgba(196, 106, 90, 0.35); color: #e0a090; }
.rhp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rhp-habit {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.rhp-habit-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.rhp-habit-name { flex: 1; color: rgba(240, 242, 255, 0.9); }
.rhp-habit-meta { font-size: 11px; color: var(--text-low); }
.rhp-habit-bar {
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.rhp-habit-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.6), #b8c4a0);
  transition: width 0.4s ease;
}
.rhp-habit-foot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rhp-range { flex: 1; min-width: 100px; accent-color: #8a9a7a; }
.rhp-hint { font-size: 11px; color: var(--text-low); }
.rhp-ov {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-medium);
}
.rhp-slots {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.rhp-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.rhp-slot-label { width: 84px; flex: none; color: var(--text-medium); }
.rhp-slot-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.rhp-slot-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: rgba(138, 154, 122, 0.7);
}
.rhp-slot-val { width: 34px; text-align: right; color: var(--text-low); }
.rhp-insight {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 3px solid rgba(138, 154, 122, 0.6);
}
.rhp-insight-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rhp-insight-title { font-size: 12px; font-weight: 600; color: rgba(240, 242, 255, 0.9); }
.rhp-insight-pri {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-low);
}
.rhp-insight-desc { margin: 0; font-size: 12px; color: var(--text-medium); line-height: 1.5; }
.rhp-insight-action { font-size: 11px; color: #b8c4a0; }
.rhp-iv-warning { border-left-color: #f0c040; }
.rhp-iv-achievement { border-left-color: #8a9a7a; }
.rhp-iv-opportunity { border-left-color: #6b9fc4; }
.rhp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-low);
}
</style>
