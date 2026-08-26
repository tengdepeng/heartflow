<template>
  <div class="entrance-hall">
    <!-- 氛围背景 -->
    <div class="entrance-atmos">
      <div class="atmos-warm-glow"></div>
      <div class="atmos-door-light"></div>
    </div>

    <header class="entrance-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="entrance-title">玄关</h1>
      <p class="entrance-subtitle">一日之计 · 由此启程</p>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
    </header>

    <!-- 时间信息 -->
    <section class="time-section">
      <div class="time-display">{{ timeStr }}</div>
      <div class="date-display">{{ dateStr }}</div>
      <div class="greeting">{{ greeting }}</div>
    </section>

    <!-- 今日心情快速入口 -->
    <section class="mood-section spatial-section">
      <h3 class="section-label">今日心情</h3>
      <div class="mood-grid">
        <button
          v-for="mood in moodOptions"
          :key="mood.type"
          class="mood-btn"
          :class="{ active: todayMood === mood.type }"
          :style="{ '--mood-color': mood.color }"
          @click="recordMood(mood.type)"
        >
          <span class="mood-icon">{{ mood.icon }}</span>
          <span class="mood-label">{{ mood.label }}</span>
        </button>
      </div>
      <div v-if="todayMood" class="today-mood-status">
        已记录 · {{ getMoodLabel(todayMood) }}
      </div>
      <div v-else class="today-mood-hint">
        轻触上方图标，记录此刻心情
      </div>
    </section>

    <!-- 近 7 日心情趋势 -->
    <section v-if="weekMoodTrend.some(t => t.count > 0)" class="mood-trend spatial-section">
      <h3 class="section-label">近 7 日心情</h3>
      <div class="trend-bars">
        <div
          v-for="t in weekMoodTrend"
          :key="t.type"
          class="trend-bar"
          :title="`${t.label} · ${t.count} 次`"
        >
          <div class="trend-bar-fill" :style="{ height: t.pct + '%', background: t.color }"></div>
          <span class="trend-bar-label">{{ t.label }}</span>
        </div>
      </div>
    </section>

    <!-- 出门提醒 -->
    <section v-if="leaveReminder" class="reminder-section spatial-section">
      <h3 class="section-label">出门提醒</h3>
      <div class="reminder-card">
        <span class="reminder-icon">⏰</span>
        <span class="reminder-text">{{ leaveReminder }}</span>
      </div>
    </section>

    <!-- 今日一瞥（真实数据联动） -->
    <section class="glimpse-section spatial-section">
      <h3 class="section-label">今日一瞥</h3>
      <div class="glimpse-grid">
        <div class="glimpse-card">
          <span class="glimpse-value">{{ todayNoteCount }}</span>
          <span class="glimpse-unit">篇</span>
          <span class="glimpse-label">今日笔记</span>
        </div>
        <div class="glimpse-card">
          <span class="glimpse-value">{{ todayFocusMinutes }}</span>
          <span class="glimpse-unit">分</span>
          <span class="glimpse-label">今日专注</span>
        </div>
        <div class="glimpse-card">
          <span class="glimpse-value">{{ todayEmotionCount }}</span>
          <span class="glimpse-unit">次</span>
          <span class="glimpse-label">今日心绪</span>
        </div>
      </div>
    </section>

    <!-- 导航 -->
    <section class="nav-section spatial-section">
      <h3 class="section-label">前往</h3>
      <div class="nav-grid">
        <button class="nav-btn" @click="navigateTo('living-room')">
          <span class="nav-icon">🛋</span>
          <span class="nav-label">走向客厅</span>
        </button>
        <button class="nav-btn" @click="navigateTo('kitchen')">
          <span class="nav-icon">🍳</span>
          <span class="nav-label">走向厨房</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storage } from '../../engine/storage'

const emit = defineEmits<{
  navigate: [roomId: string]
}>()

// ---- 情绪选项 ----
const moodOptions = [
  { type: 'happy', label: '轻快', icon: '☀️', color: '#f0c040' },
  { type: 'calm', label: '平静', icon: '🌙', color: '#80b8d0' },
  { type: 'sad', label: '低落', icon: '🌧', color: '#9080b8' },
  { type: 'anxious', label: '紧绷', icon: '🌪', color: '#c05050' },
  { type: 'angry', label: '烦躁', icon: '⚡', color: '#e87030' },
] as const

type MoodType = (typeof moodOptions)[number]['type']

// ---- KV key 前缀 ----
const KV_PREFIX = 'hf:home:entrance'
const MOOD_KEY = `${KV_PREFIX}:todayMood`

// ---- 今日心情 ----
const todayMood = ref<MoodType | null>(null)

function getMoodLabel(type: MoodType): string {
  return moodOptions.find((m) => m.type === type)?.label ?? type
}

function recordMood(type: MoodType) {
  todayMood.value = type
  const today = new Date().toISOString().slice(0, 10)
  storage.setKV(MOOD_KEY, { type, date: today })

  // 同步写入真实情绪时间线（供庭院等跨房间汇聚）
  const emotions = storage.getEmotions()
  emotions.push({
    id: `hf-mood-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    note: '玄关心情打卡',
    createdAt: new Date().toISOString(),
  })
  storage.setEmotions(emotions)
}

function loadTodayMood() {
  const saved = storage.getKV<{ type: MoodType; date: string } | null>(MOOD_KEY, null)
  if (saved && saved.date === new Date().toISOString().slice(0, 10)) {
    todayMood.value = saved.type
  } else {
    todayMood.value = null
  }
}

// ---- 近 7 日心情趋势（接通真实情绪时间线）----
const weekMoodTrend = computed(() => {
  const emotions = storage.getEmotions()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  weekAgo.setHours(0, 0, 0, 0)
  const byType: Record<string, number> = {}
  for (const e of emotions) {
    if (new Date(e.createdAt) >= weekAgo) byType[e.type] = (byType[e.type] ?? 0) + 1
  }
  const max = Math.max(1, ...Object.values(byType))
  return moodOptions
    .map((m) => ({
      type: m.type,
      label: m.label,
      color: m.color,
      count: byType[m.type] ?? 0,
      pct: Math.round(((byType[m.type] ?? 0) / max) * 100),
    }))
    .sort((a, b) => b.count - a.count)
})

// ---- 时间信息 ----
const now = ref(new Date())

const timeStr = computed(() => {
  const h = String(now.value.getHours()).padStart(2, '0')
  const m = String(now.value.getMinutes()).padStart(2, '0')
  const s = String(now.value.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
})

const dateStr = computed(() => {
  const y = now.value.getFullYear()
  const mo = String(now.value.getMonth() + 1).padStart(2, '0')
  const d = String(now.value.getDate()).padStart(2, '0')
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const wd = weekdays[now.value.getDay()]
  return `${y} 年 ${mo} 月 ${d} 日 · 星期${wd}`
})

const greeting = computed(() => {
  const h = now.value.getHours()
  if (h < 6) return '夜深了，早些休息'
  if (h < 9) return '早安 · 新的一天开始了'
  if (h < 12) return '上午好 · 保持专注'
  if (h < 14) return '午间 · 稍作歇息'
  if (h < 18) return '下午 · 继续前行'
  if (h < 21) return '傍晚 · 回顾今日'
  return '夜晚 · 沉淀思绪'
})

let timerInterval: ReturnType<typeof setInterval> | null = null

// ---- 出门提醒 ----
const leaveReminder = computed(() => {
  const sessions = storage.getSessions()
  const activeSession = sessions.find(
    (s) => s.status === 'focusing' || s.status === 'paused',
  )
  if (activeSession) {
    return '当前有进行中的专注，别忘了回来继续'
  }

  // 检查是否有未完成的目标
  const goals = storage.getGoals?.() ?? []
  const todayTasks = goals.filter((g: any) => {
    const deadline = g.deadline ? new Date(g.deadline) : null
    if (!deadline) return false
    const today = new Date()
    return (
      deadline.getFullYear() === today.getFullYear() &&
      deadline.getMonth() === today.getMonth() &&
      deadline.getDate() === today.getDate() &&
      g.status !== 'completed'
    )
  })
  if (todayTasks.length > 0) {
    return `今日有 ${todayTasks.length} 项待办未完成，出门前记得检查`
  }

  return null
})

// ---- 今日一瞥（真实数据联动）----
function isToday(iso?: string | null): boolean {
  if (!iso) return false
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10)
}

const todayNoteCount = computed(() => {
  const notes = storage.getNotes()
  return notes.filter((n) => isToday(n.createdAt)).length
})

const todayFocusMinutes = computed(() => {
  const sessions = storage.getSessions()
  return sessions
    .filter((s) => isToday(s.startedAt))
    .reduce((acc, s) => acc + Math.round((s.elapsed || s.plannedDuration || 0) / 60), 0)
})

const todayEmotionCount = computed(() => {
  const emotions = storage.getEmotions()
  return emotions.filter((e) => isToday(e.createdAt)).length
})

// ---- 导航 ----
function navigateTo(roomId: string) {
  emit('navigate', roomId)
}

// ---- 生命周期 ----
onMounted(() => {
  loadTodayMood()

  now.value = new Date()
  timerInterval = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval !== null) {
    clearInterval(timerInterval)
    timerInterval = null
  }
})
</script>

<style scoped>
/* ============================================================
   深夜食堂暖琥珀主题 · 玄关
   ============================================================ */

/* ---- 布局 ---- */
.entrance-hall {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 32px 100px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* ---- 内部区块入场错位动画 ---- */
.entrance-hall > section {
  animation: entrance-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.entrance-hall > section:nth-of-type(1) { animation-delay: 0.04s; }
.entrance-hall > section:nth-of-type(2) { animation-delay: 0.10s; }
.entrance-hall > section:nth-of-type(3) { animation-delay: 0.16s; }
.entrance-hall > section:nth-of-type(4) { animation-delay: 0.22s; }
.entrance-hall > section:nth-of-type(5) { animation-delay: 0.28s; }
.entrance-hall > section:nth-of-type(6) { animation-delay: 0.34s; }

@keyframes entrance-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .entrance-hall > section { animation: none; }
}

/* ---- 氛围背景 ---- */
.entrance-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.atmos-warm-glow {
  position: absolute;
  top: -8%;
  left: 5%;
  width: 90%;
  height: 55%;
  background: radial-gradient(
    ellipse at 40% 30%,
    rgba(252, 228, 179, 0.08) 0%,
    rgba(var(--accent-rgb), 0.04) 30%,
    transparent 65%
  );
  animation: entrance-breathe 7s ease-in-out infinite;
}

.atmos-door-light {
  position: absolute;
  bottom: -12%;
  right: 8%;
  width: 55%;
  height: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(252, 228, 179, 0.03) 0%,
    transparent 55%
  );
  animation: entrance-breathe 9s ease-in-out infinite 2s;
}

@keyframes entrance-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---- 头部 ---- */
.entrance-header {
  text-align: center;
  position: relative;
  z-index: 1;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.25),
    transparent
  );
}

.orn-diamond {
  font-size: 9px;
  color: var(--accent);
  opacity: 0.4;
}

.entrance-title {
  font-size: 28px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-high);
  margin: 0;
}

.entrance-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 8px 0 0;
  letter-spacing: 1px;
}

/* ---- 通用 section ---- */
.section-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 16px;
  letter-spacing: 0.5px;
}

.spatial-section {
  position: relative;
  z-index: 1;
}

/* ---- 时间信息 ---- */
.time-section {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 32px 24px;
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.time-display {
  font-size: 48px;
  font-weight: 300;
  font-family: 'Noto Sans Mono', 'Courier New', monospace;
  color: var(--amber-50);
  letter-spacing: 4px;
  line-height: 1.2;
  text-shadow: 0 0 40px rgba(252, 228, 179, 0.15);
}

.date-display {
  font-size: 13px;
  color: var(--text-dim);
  margin-top: 8px;
  letter-spacing: 0.5px;
}

.greeting {
  font-size: 15px;
  color: var(--text-secondary);
  margin-top: 12px;
  letter-spacing: 0.5px;
}

/* ---- 今日心情 ---- */
.mood-section {
  text-align: center;
}

.mood-grid {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.mood-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.25s ease;
  min-width: 72px;
  font-family: inherit;
}

.mood-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.2);
  transform: translateY(-2px);
}

.mood-btn.active {
  border-color: var(--mood-color, #d4a574);
  background: color-mix(in srgb, var(--mood-color, #d4a574) 12%, var(--bg-card));
  box-shadow: 0 0 20px color-mix(in srgb, var(--mood-color, #d4a574) 10%, transparent);
}

.mood-icon {
  font-size: 28px;
  line-height: 1;
}

.mood-label {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.mood-btn.active .mood-label {
  color: var(--mood-color, #d4a574);
}

.today-mood-status {
  font-size: 13px;
  color: var(--accent);
  margin-top: 14px;
  letter-spacing: 0.3px;
}

.today-mood-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 14px;
  letter-spacing: 0.3px;
}

/* ---- 近 7 日心情趋势 ---- */
.mood-trend {
  text-align: center;
}

.trend-bars {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 14px;
  height: 96px;
  padding: 8px 4px 0;
}

.trend-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  height: 100%;
  flex: 0 0 auto;
}

.trend-bar-fill {
  width: 22px;
  min-height: 4px;
  border-radius: 6px 6px 2px 2px;
  opacity: 0.85;
  transition: height 0.4s ease;
}

.trend-bar-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

/* ---- 出门提醒 ---- */
.reminder-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.reminder-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.reminder-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ---- 今日一瞥 ---- */
.glimpse-section {
  text-align: center;
}

.glimpse-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.glimpse-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 16px 8px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
              border-color 0.3s ease, background 0.3s ease;
}

.glimpse-card:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.18);
  transform: translateY(-2px);
}

.glimpse-value {
  font-size: 26px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.glimpse-unit {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  margin-top: -2px;
}

.glimpse-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  margin-top: 2px;
}

/* ---- 导航 ---- */
.nav-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  border-radius: 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

.nav-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.2);
  transform: translateY(-2px);
}

.nav-icon {
  font-size: 32px;
  line-height: 1;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.5px;
}

/* ---- 响应式 ---- */
@media (max-width: 860px) {
  .entrance-hall {
    padding: 28px 20px 100px;
    gap: 32px;
  }

  .time-display {
    font-size: 40px;
  }

  .time-section {
    padding: 24px 20px;
  }

  .mood-btn {
    padding: 14px 14px;
    min-width: 64px;
  }

  .mood-icon {
    font-size: 24px;
  }

  .entrance-title {
    font-size: 24px;
  }

  .header-ornament {
    gap: 8px;
  }

  .orn-line {
    width: 40px;
  }
}

@media (max-width: 640px) {
  .entrance-hall {
    padding: 20px 14px 90px;
    gap: 24px;
  }

  .entrance-header {
    padding-top: 40px;
  }

  .entrance-title {
    font-size: 20px;
    letter-spacing: 2px;
  }

  .entrance-subtitle {
    font-size: 11px;
  }

  .header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 28px;
  }

  .orn-diamond {
    font-size: 7px;
  }

  .time-display {
    font-size: 32px;
  }

  .time-section {
    padding: 20px 16px;
  }

  .date-display {
    font-size: 12px;
  }

  .greeting {
    font-size: 13px;
  }

  .mood-grid {
    gap: 8px;
  }

  .mood-btn {
    padding: 12px 10px;
    min-width: 56px;
    border-radius: 12px;
  }

  .mood-icon {
    font-size: 22px;
  }

  .mood-label {
    font-size: 11px;
  }

  .nav-grid {
    gap: 8px;
  }

  .nav-btn {
    padding: 18px 12px;
  }

  .nav-icon {
    font-size: 26px;
  }

  .nav-label {
    font-size: 13px;
  }

  .reminder-card {
    padding: 12px 16px;
  }

  .reminder-text {
    font-size: 12px;
  }
}
</style>