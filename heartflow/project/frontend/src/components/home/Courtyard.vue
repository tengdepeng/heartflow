<template>
  <div class="courtyard">
    <!-- 氛围背景 -->
    <div class="courtyard-atmos">
      <div class="atmos-sky-glow" :style="skyGlowStyle"></div>
      <div class="atmos-ground-mist"></div>
      <div class="atmos-starlight"></div>
    </div>

    <!-- 主内容区 -->
    <div class="courtyard-content">
      <!-- 头部 -->
      <header class="courtyard-header">
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-leaf">&#127807;</span>
          <span class="orn-line"></span>
        </div>
        <h1 class="courtyard-title">庭院</h1>
        <p class="courtyard-subtitle">根脉深植 · 心花自开</p>
      </header>

      <!-- 溯源树 — 根脉之庭 -->
      <section class="origin-tree-section">
        <div class="origin-tree-card" @click="goToRoots">
          <!-- SVG 树形 -->
          <div class="tree-svg-container">
            <svg
              class="tree-svg"
              viewBox="0 0 120 160"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="溯源树"
            >
              <!-- 树根 -->
              <path
                class="tree-root"
                d="M60 145 Q55 130 40 120 Q25 110 15 115 Q8 118 6 112"
                fill="none"
                stroke="#8b7355"
                stroke-width="2.5"
                stroke-linecap="round"
              />
              <path
                class="tree-root"
                d="M60 145 Q65 130 80 120 Q95 110 105 115 Q112 118 114 112"
                fill="none"
                stroke="#8b7355"
                stroke-width="2.5"
                stroke-linecap="round"
              />
              <path
                class="tree-root"
                d="M60 145 Q58 135 50 125 Q42 118 30 122"
                fill="none"
                stroke="#8b7355"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                class="tree-root"
                d="M60 145 Q62 135 70 125 Q78 118 90 122"
                fill="none"
                stroke="#8b7355"
                stroke-width="2"
                stroke-linecap="round"
              />
              <!-- 树干 -->
              <path
                class="tree-trunk"
                d="M60 140 Q58 120 56 100 Q54 80 55 60 Q56 45 58 35"
                fill="none"
                stroke="#a0845c"
                stroke-width="5"
                stroke-linecap="round"
              />
              <path
                class="tree-trunk"
                d="M60 140 Q62 120 64 100 Q66 80 65 60 Q64 45 62 35"
                fill="none"
                stroke="#a0845c"
                stroke-width="4"
                stroke-linecap="round"
              />
              <!-- 主枝干 -->
              <path
                class="tree-branch"
                d="M57 70 Q45 60 30 50 Q20 42 12 38"
                fill="none"
                stroke="#8b7355"
                stroke-width="3"
                stroke-linecap="round"
              />
              <path
                class="tree-branch"
                d="M63 70 Q75 60 90 50 Q100 42 108 38"
                fill="none"
                stroke="#8b7355"
                stroke-width="3"
                stroke-linecap="round"
              />
              <path
                class="tree-branch"
                d="M58 55 Q48 45 35 35"
                fill="none"
                stroke="#8b7355"
                stroke-width="2.5"
                stroke-linecap="round"
              />
              <path
                class="tree-branch"
                d="M62 55 Q72 45 85 35"
                fill="none"
                stroke="#8b7355"
                stroke-width="2.5"
                stroke-linecap="round"
              />
              <path
                class="tree-branch"
                d="M59 40 Q52 30 42 22"
                fill="none"
                stroke="#8b7355"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                class="tree-branch"
                d="M61 40 Q68 30 78 22"
                fill="none"
                stroke="#8b7355"
                stroke-width="2"
                stroke-linecap="round"
              />
              <!-- 树冠 — 叶子簇 -->
              <ellipse class="tree-canopy canopy-1" cx="55" cy="28" rx="18" ry="14" fill="#d8e8c8" opacity="0.25" />
              <ellipse class="tree-canopy canopy-2" cx="65" cy="22" rx="16" ry="12" fill="#d8e8c8" opacity="0.2" />
              <ellipse class="tree-canopy canopy-3" cx="42" cy="20" rx="14" ry="10" fill="#d8e8c8" opacity="0.2" />
              <ellipse class="tree-canopy canopy-4" cx="78" cy="20" rx="14" ry="10" fill="#d8e8c8" opacity="0.2" />
              <ellipse class="tree-canopy canopy-5" cx="60" cy="15" rx="20" ry="12" fill="#d8e8c8" opacity="0.15" />
              <ellipse class="tree-canopy canopy-6" cx="48" cy="14" rx="12" ry="8" fill="#d8e8c8" opacity="0.15" />
              <ellipse class="tree-canopy canopy-7" cx="72" cy="14" rx="12" ry="8" fill="#d8e8c8" opacity="0.15" />
              <!-- 光点 -->
              <circle class="tree-glow-dot" cx="60" cy="12" r="2" fill="#f0d5b0" opacity="0.6" />
              <circle class="tree-glow-dot" cx="50" cy="16" r="1.5" fill="#f0d5b0" opacity="0.4" />
              <circle class="tree-glow-dot" cx="70" cy="16" r="1.5" fill="#f0d5b0" opacity="0.4" />
            </svg>
          </div>
          <div class="origin-tree-info">
            <span class="origin-tree-label">溯源树</span>
            <span class="origin-tree-desc">根脉之庭 — 探索你的生命根基</span>
            <span class="origin-tree-counts">藏有 <b>{{ vaultNoteCount }}</b> 则笔记 · <b>{{ vaultCrystalCount }}</b> 颗结晶</span>
          </div>
          <span class="origin-tree-arrow">&rarr;</span>
        </div>
      </section>

      <!-- 四大功能入口网格 -->
      <div class="feature-grid">
        <!-- 习惯树 — 自律工坊 -->
        <section class="feature-card">
          <div class="feature-card-header" @click="goToHabitTree">
            <div class="feature-icon-wrapper">
              <svg class="feature-icon-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 28 L20 36 L36 16" fill="none" stroke="#f0d5b0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="#d4a574" stroke-width="1.5" opacity="0.3" />
              </svg>
            </div>
            <div class="feature-info">
              <span class="feature-label">习惯树</span>
              <span class="feature-desc">自律工坊</span>
            </div>
            <span class="feature-arrow">&rarr;</span>
          </div>
          <div class="feature-preview">
            <div class="preview-row">
              <span class="preview-label">进行中</span>
              <span class="preview-value">{{ habitStats.active }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">今日完成</span>
              <span class="preview-value">{{ habitStats.completedToday }}</span>
            </div>
            <div class="preview-bar">
              <div class="preview-bar-fill" :style="{ width: habitProgress + '%' }"></div>
            </div>
            <span class="preview-percent">{{ habitProgress }}% 完成率</span>
          </div>
        </section>

        <!-- 花园 — 情绪花房 -->
        <section class="feature-card">
          <div class="feature-card-header" @click="goToGarden">
            <div class="feature-icon-wrapper">
              <svg class="feature-icon-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="18" r="8" fill="none" stroke="#f0c040" stroke-width="2" />
                <path d="M24 10 L24 4" stroke="#8b7355" stroke-width="1.5" stroke-linecap="round" />
                <path d="M16 18 L10 14" stroke="#8b7355" stroke-width="1.5" stroke-linecap="round" />
                <path d="M32 18 L38 14" stroke="#8b7355" stroke-width="1.5" stroke-linecap="round" />
                <path d="M18 12 L14 6" stroke="#8b7355" stroke-width="1.5" stroke-linecap="round" />
                <path d="M30 12 L34 6" stroke="#8b7355" stroke-width="1.5" stroke-linecap="round" />
                <circle cx="24" cy="18" r="3" fill="#f0c040" opacity="0.4" />
              </svg>
            </div>
            <div class="feature-info">
              <span class="feature-label">花园</span>
              <span class="feature-desc">情绪花房</span>
            </div>
            <span class="feature-arrow">&rarr;</span>
          </div>
          <div class="feature-preview">
            <div class="preview-row">
              <span class="preview-label">本周记录</span>
              <span class="preview-value">{{ emotionStats.weekCount }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">最近心情</span>
              <span class="preview-value preview-mood">{{ emotionStats.latestMood }}</span>
            </div>
            <div class="emotion-dots">
              <span
                v-for="(mood, idx) in emotionStats.recentMoods"
                :key="idx"
                class="emotion-dot"
                :style="{ background: mood.color }"
                :title="mood.label"
              ></span>
            </div>
          </div>
        </section>

        <!-- 生命罗盘 — 身体温室 -->
        <section class="feature-card">
          <div class="feature-card-header" @click="goToLifeCompass">
            <div class="feature-icon-wrapper">
              <svg class="feature-icon-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#d4a574" stroke-width="1.5" opacity="0.3" />
                <circle cx="24" cy="24" r="14" fill="none" stroke="#d8e8c8" stroke-width="1.5" opacity="0.5" />
                <circle cx="24" cy="24" r="4" fill="#d8e8c8" opacity="0.4" />
                <line x1="24" y1="24" x2="24" y2="10" stroke="#f0d5b0" stroke-width="1.5" stroke-linecap="round" />
                <line x1="24" y1="24" x2="38" y2="24" stroke="#d4a574" stroke-width="1.5" stroke-linecap="round" />
                <line x1="24" y1="24" x2="14" y2="34" stroke="#8b7355" stroke-width="1.5" stroke-linecap="round" />
                <line x1="24" y1="24" x2="32" y2="14" stroke="#a0845c" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </div>
            <div class="feature-info">
              <span class="feature-label">生命罗盘</span>
              <span class="feature-desc">身体温室</span>
            </div>
            <span class="feature-arrow">&rarr;</span>
          </div>
          <div class="feature-preview">
            <div class="compass-grid">
              <div class="compass-item">
                <span class="compass-label">精力</span>
                <span class="compass-value" :class="compassLevel(compassData.energy)">{{ compassData.energy }}</span>
              </div>
              <div class="compass-item">
                <span class="compass-label">睡眠</span>
                <span class="compass-value" :class="compassLevel(compassData.sleep)">{{ compassData.sleep }}</span>
              </div>
              <div class="compass-item">
                <span class="compass-label">饮食</span>
                <span class="compass-value" :class="compassLevel(compassData.diet)">{{ compassData.diet }}</span>
              </div>
              <div class="compass-item">
                <span class="compass-label">运动</span>
                <span class="compass-value" :class="compassLevel(compassData.exercise)">{{ compassData.exercise }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 导航 -->
      <section class="navigation-panel">
        <button class="nav-btn" @click="emit('navigate', 'study')">
          <span class="nav-btn-icon">&#128218;</span>
          <span class="nav-btn-label">回到书房</span>
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../../engine/storage'
import { useBodyBridge } from '../../modules/body'
import { getLocalDateKey } from '../../utils/time'

const emit = defineEmits<{
  (e: 'navigate', roomId: string): void
}>()

// ---- 记忆藏量（真实数据联动）----
const vaultNoteCount = computed(
  () => (storage.getNotes?.() ?? []).filter((n: any) => !n.archived).length,
)
const vaultCrystalCount = computed(() => (storage.getCrystals?.() ?? []).length)

// ---- 氛围光色 ----
const AMBIENT_COLOR = '#d8e8c8' // 5000K 自然光
const AMBIENT_OPACITY = 0.35

const skyGlowStyle = computed(() => ({
  '--ambient-color': AMBIENT_COLOR,
  '--ambient-opacity': AMBIENT_OPACITY,
}))

// ---- 溯源树导航 ----
function goToRoots() {
  window.location.href = '/roots'
}

// ---- 习惯树数据 ----
const habitStats = ref({
  active: 0,
  completedToday: 0,
  total: 0,
})

const habitProgress = computed(() => {
  if (habitStats.value.total === 0) return 0
  return Math.round((habitStats.value.completedToday / habitStats.value.total) * 100)
})

function loadHabitStats() {
  const goals = storage.getGoals?.() ?? []
  const active = goals.filter((g: any) => g.status === 'active' || g.status === 'in_progress')
  const today = getLocalDateKey(new Date())
  const completedToday = goals.filter((g: any) => {
    if (g.status !== 'completed') return false
    const updatedAt = g.updatedAt ? getLocalDateKey(new Date(g.updatedAt)) : ''
    return updatedAt === today
  })

  habitStats.value = {
    active: active.length,
    completedToday: completedToday.length,
    total: goals.length || 1,
  }
}

function goToHabitTree() {
  emit('navigate', 'habit-tree')
}

// ---- 花园 / 情绪数据 ----
const emotionMoodMap: Record<string, { label: string; color: string }> = {
  happy: { label: '轻快', color: '#f0c040' },
  calm: { label: '平静', color: '#80b8d0' },
  sad: { label: '低落', color: '#9080b8' },
  anxious: { label: '紧绷', color: '#c05050' },
  angry: { label: '烦躁', color: '#e87030' },
}

const emotionStats = ref({
  weekCount: 0,
  latestMood: '--',
  recentMoods: [] as { label: string; color: string }[],
})

function loadEmotionStats() {
  const emotions = storage.getEmotions?.() ?? []
  const now = new Date()
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)

  const weekEmotions = emotions.filter((e: any) => {
    const d = new Date(e.createdAt)
    return d >= weekAgo
  })

  const recentMoods = emotions
    .slice(-5)
    .reverse()
    .map((e: any) => {
      const mood = emotionMoodMap[e.type] ?? { label: e.type, color: '#a0845c' }
      return { label: mood.label, color: mood.color }
    })

  const latest = emotions.length > 0 ? emotions[emotions.length - 1] : null
  const latestMood = latest
    ? (emotionMoodMap[latest.type]?.label ?? latest.type)
    : '--'

  emotionStats.value = {
    weekCount: weekEmotions.length,
    latestMood,
    recentMoods,
  }
}

function goToGarden() {
  emit('navigate', 'garden')
}

// ---- 生命罗盘数据（接通 Body 温室真实信号）----
const bodyBridge = useBodyBridge()

const ENERGY_SCORE: Record<string, number> = {
  depleted: 10,
  low: 35,
  moderate: 60,
  high: 80,
  peak: 95,
}

const compassData = computed(() => {
  const summary = bodyBridge.summary.value
  const state = bodyBridge.greenhouseState.value
  const diet = bodyBridge.nutrition.getMicronutrientScore()
  const exCount = bodyBridge.exercise.records.value.length
  return {
    energy: ENERGY_SCORE[state.energy] ?? 0,
    sleep: Math.min(100, Math.round(summary.sleepQualityAvg7d * 20)),
    diet: Math.min(100, Math.round(diet)),
    exercise: Math.min(100, exCount * 10),
  }
})

function compassLevel(val: number): string {
  if (val >= 80) return 'level-high'
  if (val >= 50) return 'level-mid'
  return 'level-low'
}

function goToLifeCompass() {
  emit('navigate', 'life-compass')
}

// ---- 初始化 ----
onMounted(() => {
  loadHabitStats()
  loadEmotionStats()
})
</script>

<style scoped>
/* ============================================================
   庭院 · 深夜食堂暖琥珀主题
   深色背景 + 暖琥珀强调色 + 5000K 自然光 (#d8e8c8)
   ============================================================ */

.courtyard {
  position: relative;
  min-height: 100vh;
  background: transparent;
  color: var(--text-primary);
  overflow: hidden;
  font-family: var(--font-body-zh);
}

/* ---- 氛围背景 ---- */
.courtyard-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.atmos-sky-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 50% 35% at 50% 20%,
      rgba(216, 232, 200, 0.12) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 40% 30% at 30% 50%,
      rgba(216, 232, 200, 0.06) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse 40% 30% at 70% 50%,
      rgba(216, 232, 200, 0.04) 0%,
      transparent 50%
    );
  animation: courtyard-breathe 8s ease-in-out infinite;
}

@keyframes courtyard-breathe {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.atmos-ground-mist {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(
    0deg,
    rgba(160, 132, 92, 0.04) 0%,
    transparent 100%
  );
}

.atmos-starlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: radial-gradient(
    2px 2px at 20% 15%,
    rgba(240, 213, 176, 0.3) 0%,
    transparent 100%
  ),
  radial-gradient(
    2px 2px at 50% 10%,
    rgba(240, 213, 176, 0.2) 0%,
    transparent 100%
  ),
  radial-gradient(
    2px 2px at 80% 20%,
    rgba(240, 213, 176, 0.25) 0%,
    transparent 100%
  ),
  radial-gradient(
    1px 1px at 35% 25%,
    rgba(240, 213, 176, 0.15) 0%,
    transparent 100%
  ),
  radial-gradient(
    1px 1px at 65% 18%,
    rgba(240, 213, 176, 0.15) 0%,
    transparent 100%
  );
}

/* ---- 主内容区 ---- */
.courtyard-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ---- 内部区块入场错位动画 ---- */
.courtyard-content > * {
  animation: courtyard-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.courtyard-content > *:nth-child(1) { animation-delay: 0.04s; }
.courtyard-content > *:nth-child(2) { animation-delay: 0.10s; }
.courtyard-content > *:nth-child(3) { animation-delay: 0.16s; }
.courtyard-content > *:nth-child(4) { animation-delay: 0.22s; }

@keyframes courtyard-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .courtyard-content > * { animation: none; }
}

/* ---- 头部 ---- */
.courtyard-header {
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
    rgba(216, 232, 200, 0.2),
    transparent
  );
}

.orn-leaf {
  font-size: 14px;
  color: rgba(216, 232, 200, 0.5);
  letter-spacing: 2px;
}

.courtyard-title {
  font-size: 26px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.courtyard-subtitle {
  font-size: 13px;
  color: var(--text-low);
  margin: 0;
  letter-spacing: 1px;
}

/* ---- 溯源树卡片 ---- */
.origin-tree-section {
  padding: 0;
}

.origin-tree-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border: 1px solid rgba(216, 232, 200, 0.1);
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(216, 232, 200, 0.06) 0%,
    rgba(216, 232, 200, 0.02) 100%
  );
  cursor: pointer;
  transition: all 0.3s ease;
}

.origin-tree-card:hover {
  background: linear-gradient(
    135deg,
    rgba(216, 232, 200, 0.1) 0%,
    rgba(216, 232, 200, 0.04) 100%
  );
  border-color: rgba(216, 232, 200, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(216, 232, 200, 0.04);
}

.origin-tree-card:active {
  transform: translateY(0);
}

.tree-svg-container {
  flex-shrink: 0;
  width: 64px;
  height: 80px;
}

.tree-svg {
  width: 100%;
  height: 100%;
}

.tree-canopy {
  transition: opacity 0.4s ease;
}

.origin-tree-card:hover .tree-canopy {
  opacity: 0.35 !important;
}

.tree-glow-dot {
  animation: tree-pulse 3s ease-in-out infinite;
}

@keyframes tree-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.origin-tree-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.origin-tree-label {
  font-size: 16px;
  font-weight: 500;
  color: #d8e8c8;
  letter-spacing: 0.5px;
}

.origin-tree-desc {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.origin-tree-counts {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.3);
  letter-spacing: 0.3px;
}

.origin-tree-counts b {
  color: #d8e8c8;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.origin-tree-arrow {
  font-size: 18px;
  color: rgba(216, 232, 200, 0.3);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.origin-tree-card:hover .origin-tree-arrow {
  color: rgba(216, 232, 200, 0.6);
  transform: translateX(3px);
}

/* ---- 功能网格 ---- */
.feature-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- 功能卡片 ---- */
.feature-card {
  padding: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(240, 213, 176, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
}

.feature-card:hover {
  background: var(--bg-surface);
  border-color: rgba(240, 213, 176, 0.1);
}

.feature-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.feature-card-header:hover {
  background: rgba(240, 213, 176, 0.03);
}

.feature-icon-wrapper {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(240, 213, 176, 0.06);
  border: 1px solid rgba(240, 213, 176, 0.08);
}

.feature-icon-svg {
  width: 24px;
  height: 24px;
}

.feature-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.feature-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--amber-100);
  letter-spacing: 0.5px;
}

.feature-desc {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.feature-arrow {
  font-size: 16px;
  color: rgba(240, 213, 176, 0.25);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.feature-card-header:hover .feature-arrow {
  color: rgba(240, 213, 176, 0.6);
  transform: translateX(3px);
}

/* ---- 预览区域 ---- */
.feature-preview {
  padding: 0 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.preview-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--amber-100);
  font-variant-numeric: tabular-nums;
}

.preview-mood {
  color: #d8e8c8;
}

/* 进度条 */
.preview-bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(240, 213, 176, 0.08);
  overflow: hidden;
}

.preview-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    rgba(240, 213, 176, 0.3) 0%,
    var(--amber-100) 100%
  );
  transition: width 0.6s ease;
}

.preview-percent {
  font-size: 10px;
  color: rgba(240, 213, 176, 0.35);
  letter-spacing: 0.3px;
  text-align: right;
}

/* 情绪点 */
.emotion-dots {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.emotion-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.2s ease;
}

.emotion-dot:hover {
  transform: scale(1.5);
}

/* ---- 罗盘网格 ---- */
.compass-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.compass-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(240, 213, 176, 0.04);
}

.compass-label {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.compass-value {
  font-size: 16px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.compass-value.level-high {
  color: #d8e8c8;
}

.compass-value.level-mid {
  color: var(--amber-100);
}

.compass-value.level-low {
  color: #c05050;
}

/* ---- 导航面板 ---- */
.navigation-panel {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  border-radius: 14px;
  border: 1px solid rgba(240, 213, 176, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  font-size: 14px;
}

.nav-btn:hover {
  background: rgba(240, 213, 176, 0.06);
  border-color: rgba(240, 213, 176, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(240, 213, 176, 0.03);
}

.nav-btn:active {
  transform: translateY(0);
}

.nav-btn-icon {
  font-size: 20px;
  line-height: 1;
}

.nav-btn-label {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.6);
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.nav-btn:hover .nav-btn-label {
  color: var(--amber-100);
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .courtyard-content {
    padding: 32px 16px 80px;
    gap: 24px;
  }

  .courtyard-title {
    font-size: 22px;
  }

  .origin-tree-card {
    padding: 16px 18px;
  }

  .tree-svg-container {
    width: 48px;
    height: 60px;
  }

  .origin-tree-label {
    font-size: 14px;
  }

  .feature-card-header {
    padding: 14px 16px;
  }

  .feature-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .feature-icon-svg {
    width: 20px;
    height: 20px;
  }

  .feature-preview {
    padding: 0 16px 14px;
  }

  .compass-grid {
    gap: 6px;
  }

  .compass-item {
    padding: 8px 2px;
  }

  .compass-value {
    font-size: 14px;
  }

  .nav-btn {
    padding: 12px 24px;
  }
}

@media (max-width: 400px) {
  .compass-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 32px;
  }
}
</style>