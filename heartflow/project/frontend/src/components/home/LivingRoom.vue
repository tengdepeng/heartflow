<template>
  <div class="living-room">
    <!-- 氛围光层 -->
    <div class="ambient-light">
      <div class="ambient-glow" />
      <div class="ambient-ceiling" />
    </div>

    <div class="living-room__inner">
      <!-- ===== 标题区 ===== -->
      <header class="header">
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-star">&#x2734;</span>
          <span class="orn-line"></span>
        </div>
        <h1 class="header__title">客厅</h1>
        <p class="header__subtitle">心安之处 · 自在如归</p>
      </header>

      <!-- ===== 访客模式开关 ===== -->
      <section class="visitor-section">
        <div class="visitor-toggle">
          <div class="visitor-toggle__info">
            <span class="visitor-toggle__icon">&#x1F6AA;</span>
            <div class="visitor-toggle__text">
              <span class="visitor-toggle__label">访客模式</span>
              <span class="visitor-toggle__desc">{{ visitorMode ? '个人内容已隐藏' : '个人内容可见' }}</span>
            </div>
          </div>
          <button
            class="visitor-toggle__switch"
            :class="{ active: visitorMode }"
            role="switch"
            :aria-checked="visitorMode"
            @click="toggleVisitorMode"
          >
            <span class="switch-knob"></span>
          </button>
        </div>
      </section>

      <!-- ===== 日常活动概览 ===== -->
      <section class="activity-section">
        <h2 class="section-title">今日活动</h2>
        <div class="activity-grid">
          <div class="activity-card">
            <span class="activity-card__value">{{ todayStats.focusSessions }}</span>
            <span class="activity-card__unit">次</span>
            <span class="activity-card__label">专注</span>
          </div>
          <div class="activity-card">
            <span class="activity-card__value">{{ todayStats.focusMinutes }}</span>
            <span class="activity-card__unit">分</span>
            <span class="activity-card__label">专注时长</span>
          </div>
          <div class="activity-card">
            <span class="activity-card__value">{{ visitorMode ? '—' : todayStats.notesCreated }}</span>
            <span class="activity-card__unit">条</span>
            <span class="activity-card__label">笔记</span>
          </div>
          <div class="activity-card">
            <span class="activity-card__value">{{ visitorMode ? '—' : todayStats.goalsCompleted }}</span>
            <span class="activity-card__unit">项</span>
            <span class="activity-card__label">目标完成</span>
          </div>
        </div>
      </section>

      <!-- ===== 最近活动 ===== -->
      <section class="recent-section">
        <h2 class="section-title">最近活动</h2>
        <div class="recent-list">
          <div
            v-for="(activity, idx) in displayActivities"
            :key="idx"
            class="recent-item"
          >
            <span class="recent-item__icon" v-html="activity.icon"></span>
            <div class="recent-item__info">
              <span class="recent-item__title">{{ activity.title }}</span>
              <span class="recent-item__meta">{{ activity.meta }}</span>
            </div>
            <span class="recent-item__time">{{ activity.time }}</span>
          </div>
          <div v-if="recentActivities.length === 0" class="recent-empty">
            暂无最近活动
          </div>
        </div>
      </section>

      <!-- ===== 导航 ===== -->
      <section class="nav-section">
        <button class="nav-btn" @click="emit('navigate', 'study')">
          <span class="nav-btn__icon">&#x1F4DA;</span>
          <span class="nav-btn__label">走向书房</span>
        </button>
        <button class="nav-btn" @click="emit('navigate', 'dining')">
          <span class="nav-btn__icon">&#x1F37D;</span>
          <span class="nav-btn__label">走向餐厅</span>
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../../engine/storage'

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()

// ---- KV key 前缀 ----
const KV_PREFIX = 'hf:home:livingroom'
const VISITOR_MODE_KEY = `${KV_PREFIX}:visitorMode`

// ---- 访客模式 ----
const visitorMode = ref(false)

function toggleVisitorMode() {
  visitorMode.value = !visitorMode.value
  storage.setKV(VISITOR_MODE_KEY, visitorMode.value)
}

function loadVisitorMode() {
  const saved = storage.getKV<boolean | null>(VISITOR_MODE_KEY, null)
  if (saved !== null) visitorMode.value = saved
}

// ---- 今日活动统计 ----
interface TodayStats {
  focusSessions: number
  focusMinutes: number
  notesCreated: number
  goalsCompleted: number
}

const todayStats = ref<TodayStats>({
  focusSessions: 0,
  focusMinutes: 0,
  notesCreated: 0,
  goalsCompleted: 0,
})

function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function computeTodayStats() {
  const today = getTodayDateStr()

  // 专注会话统计
  const sessions = storage.getSessions()
  const todaySessions = sessions.filter((s) => {
    const sDate = s.startedAt ? s.startedAt.slice(0, 10) : ''
    return sDate === today
  })
  const focusSessions = todaySessions.length
  const focusMinutes = todaySessions.reduce((acc, s) => {
    const dur = s.elapsed || s.plannedDuration || 0
    return acc + Math.round(dur / 60)
  }, 0)

  // 笔记统计
  const notes = storage.getNotes()
  const todayNotes = notes.filter((n) => {
    const nDate = n.createdAt ? n.createdAt.slice(0, 10) : ''
    return nDate === today
  })

  // 目标完成统计
  const goals = storage.getGoals()
  const todayGoals = goals.filter((g) => {
    const completedDate = g.completedAt ? g.completedAt.slice(0, 10) : ''
    return completedDate === today && g.status === 'bloom'
  })

  todayStats.value = {
    focusSessions,
    focusMinutes,
    notesCreated: todayNotes.length,
    goalsCompleted: todayGoals.length,
  }
}

// ---- 最近活动 ----
type ActivityKind = 'focus' | 'note' | 'advisor'
interface RecentActivity {
  icon: string
  title: string
  meta: string
  time: string
  kind: ActivityKind
}

const recentActivities = ref<RecentActivity[]>([])

function loadRecentActivities() {
  const activities: RecentActivity[] = []

  // 最近专注会话（公开：仅时长，不含内容）
  const sessions = storage.getSessions()
  const recentSessions = sessions.slice(-3).reverse()
  for (const s of recentSessions) {
    activities.push({
      icon: '&#x23F0;',
      title: '专注会话',
      meta: `${Math.round((s.elapsed || 0) / 60)} 分钟`,
      time: s.startedAt ? s.startedAt.slice(11, 16) : '',
      kind: 'focus',
    })
  }

  // 最近笔记
  const notes = storage.getNotes()
  const recentNotes = notes.slice(-2).reverse()
  for (const n of recentNotes) {
    activities.push({
      icon: '&#x1F4DD;',
      title: '笔记',
      meta: n.title?.slice(0, 20) ?? '',
      time: n.createdAt ? n.createdAt.slice(11, 16) : '',
      kind: 'note',
    })
  }

  // 最近幕僚寄语（接通真实 advisor 数据）
  const msgs = storage.getAdvisorMessages()
  const recentMsgs = msgs.slice(-2).reverse()
  for (const m of recentMsgs) {
    activities.push({
      icon: '&#x1F4AC;',
      title: '幕僚寄语',
      meta: m.text?.slice(0, 20) ?? '',
      time: m.at ? m.at.slice(11, 16) : '',
      kind: 'advisor',
    })
  }

  recentActivities.value = activities.slice(-6)
}

// ---- 访客模式下的隐私遮蔽（真实权限隔离）----
const displayActivities = computed<RecentActivity[]>(() =>
  visitorMode.value
    ? recentActivities.value.map((a) =>
        a.kind === 'note'
          ? { ...a, title: '已隐藏', meta: '访客模式下不展示个人笔记' }
          : a,
      )
    : recentActivities.value,
)

// ---- 初始化 ----
onMounted(() => {
  loadVisitorMode()
  computeTodayStats()
  loadRecentActivities()
})
</script>

<style scoped>
/* ============================================================
   客厅 · 深夜食堂暖琥珀主题
   深色背景 · 暖白 3500K (var(--amber-50)) 氛围光
   ============================================================ */

.living-room {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-body-zh);
  overflow: hidden;
}

/* ---- 氛围光 ---- */
.ambient-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.ambient-glow {
  position: absolute;
  top: -8%;
  left: 0;
  width: 100%;
  height: 60%;
  background: radial-gradient(
    ellipse at 40% 30%,
    rgba(253, 232, 200, 0.08) 0%,
    rgba(var(--accent-rgb), 0.04) 30%,
    transparent 65%
  );
  animation: living-breathe 8s ease-in-out infinite;
}

.ambient-ceiling {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(
    180deg,
    rgba(253, 232, 200, 0.03) 0%,
    transparent 100%
  );
}

@keyframes living-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---- 主内容区 ---- */
.living-room__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 40px 24px 48px;
  max-width: 600px;
  margin: 0 auto;
}

/* ---- 内部区块入场错位动画 ---- */
.living-room__inner > * {
  animation: living-room-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.living-room__inner > *:nth-child(1) { animation-delay: 0.04s; }
.living-room__inner > *:nth-child(2) { animation-delay: 0.10s; }
.living-room__inner > *:nth-child(3) { animation-delay: 0.16s; }
.living-room__inner > *:nth-child(4) { animation-delay: 0.22s; }
.living-room__inner > *:nth-child(5) { animation-delay: 0.28s; }

@keyframes living-room-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .living-room__inner > * { animation: none; }
}

/* ---- 头部 ---- */
.header {
  text-align: center;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}

.orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.25),
    transparent
  );
}

.orn-star {
  font-size: 12px;
  color: rgba(253, 232, 200, 0.4);
  animation: star-twinkle 3s ease-in-out infinite;
}

@keyframes star-twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

.header__title {
  font-size: 26px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.header__subtitle {
  font-size: 13px;
  color: var(--text-low);
  margin: 0;
  letter-spacing: 1.5px;
}

/* ---- 通用标题 ---- */
.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-dim);
  margin: 0 0 14px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

/* ---- 访客模式 ---- */
.visitor-section {
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.visitor-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.visitor-toggle__info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.visitor-toggle__icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.visitor-toggle__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.visitor-toggle__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.visitor-toggle__desc {
  font-size: 11px;
  color: var(--text-secondary);
}

.visitor-toggle__switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--bg-card-rgb), 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
  flex-shrink: 0;
}

.visitor-toggle__switch.active {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-medium);
  transition: all 0.3s ease;
}

.visitor-toggle__switch.active .switch-knob {
  left: 22px;
  background: var(--amber-50);
}

/* ---- 活动概览 ---- */
.activity-section {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.activity-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.04);
  transition: all 0.3s ease;
}

.activity-card:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(var(--accent-rgb), 0.08);
}

.activity-card__value {
  font-size: 28px;
  font-weight: 500;
  color: var(--amber-50);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.activity-card__unit {
  font-size: 11px;
  color: var(--text-faint);
  line-height: 1;
}

.activity-card__label {
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.3px;
}

/* ---- 最近活动 ---- */
.recent-section {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.04);
  transition: all 0.3s ease;
}

.recent-item:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(var(--accent-rgb), 0.08);
}

.recent-item__icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.recent-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.recent-item__title {
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.recent-item__meta {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-item__time {
  font-size: 11px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.recent-empty {
  padding: 20px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
  letter-spacing: 0.5px;
}

/* ---- 导航 ---- */
.nav-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.nav-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.nav-btn:active {
  transform: translateY(0);
}

.nav-btn__icon {
  font-size: 18px;
  line-height: 1;
}

.nav-btn__label {
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .living-room__inner {
    padding: 32px 16px 40px;
    gap: 20px;
  }

  .header__title {
    font-size: 22px;
  }

  .header__subtitle {
    font-size: 12px;
  }

  .orn-line {
    width: 32px;
  }

  .activity-grid {
    gap: 8px;
  }

  .activity-card {
    padding: 12px 10px;
  }

  .activity-card__value {
    font-size: 22px;
  }

  .nav-section {
    grid-template-columns: 1fr;
  }
}
</style>