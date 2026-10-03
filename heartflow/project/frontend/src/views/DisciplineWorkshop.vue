<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance dw">
    <!-- 统一房间头 + 统一内容区（RoomLayout） -->
    <RoomLayout title="自律工坊" kicker="习惯养成 · 挑战自我 · 成就收集" align="center" data-enter>

    <!-- 概览卡片 -->
    <div data-enter class="overview-cards">
      <div class="overview-card">
        <span class="ov-icon">🔥</span>
        <span class="ov-value">{{ stats?.activeHabits ?? 0 }}</span>
        <span class="ov-label">活跃习惯</span>
      </div>
      <div class="overview-card">
        <span class="ov-icon">🏆</span>
        <span class="ov-value">{{ stats?.unlockedBadges ?? 0 }}</span>
        <span class="ov-label">已解锁徽章</span>
      </div>
      <div class="overview-card">
        <span class="ov-icon">⚡</span>
        <span class="ov-value">{{ stats?.totalPoints ?? 0 }}</span>
        <span class="ov-label">工坊积分</span>
      </div>
      <div class="overview-card">
        <span class="ov-icon">💪</span>
        <span class="ov-value">{{ healthScore }}</span>
        <span class="ov-label">健康度</span>
      </div>
    </div>

    <!-- 标签导航 -->
    <div data-enter class="dw-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['dw-tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- 今日打卡 -->
    <section v-if="activeTab === 'checkin'" data-enter class="dw-section">
      <h3>📋 今日习惯</h3>
      <div v-if="todayHabits.length === 0" class="empty-state">
        <EmptyState title="还没有创建习惯，从预设模板开始吧" :glow="false" cta-label="" />
        <div class="quick-templates">
          <button
            v-for="tpl in quickTemplates"
            :key="tpl.title"
            class="quick-tpl-btn"
            @click="createFromTemplate(tpl)"
          >
            {{ tpl.icon }} {{ tpl.title }}
          </button>
        </div>
      </div>
      <div v-else class="habit-list">
        <div
          v-for="habit in todayHabits"
          :key="habit.id"
          :class="['habit-card', { completed: isHabitCompletedToday(habit) }]"
        >
          <div class="habit-info">
            <span class="habit-icon">{{ getHabitIcon(habit) }}</span>
            <div class="habit-detail">
              <span class="habit-name">{{ habit.title }}</span>
              <span class="habit-streak">
                🔥 {{ habit.streak }} 天连续
                <span v-if="habit.bestStreak > 0" class="best-streak">（最佳 {{ habit.bestStreak }} 天）</span>
              </span>
            </div>
          </div>
          <button
            :class="['habit-check-btn', { done: isHabitCompletedToday(habit) }]"
            @click="toggleHabit(habit)"
            :disabled="isHabitCompletedToday(habit)"
          >
            {{ isHabitCompletedToday(habit) ? '✓ 已完成' : '打卡' }}
          </button>
          <label class="habit-auto" :title="'完成一次专注（计时器）后自动打卡此习惯'">
            <input
              type="checkbox"
              :checked="!!habit.autoCheckInOnFocus"
              @change="toggleAutoCheckIn(habit)"
            />
            <span>专注自动打卡</span>
          </label>
        </div>
      </div>

      <!-- 习惯预测档案（discipline/habit-predictor 引擎：健康度评分/连续预测/中断预警/趋势预测，INCR-213） -->
      <div class="dw-predict">
        <HabitPredictArchivePanel />
      </div>

      <!-- 失败分析与习惯建议（discipline/workshop-bridge 引擎：中断复盘支持，INCR-214） -->
      <div class="dw-advice">
        <HabitFailurePanel :bridge="bridge" />
        <HabitSuggestionPanel :bridge="bridge" />
        <HabitBundlePanel :bridge="bridge" />
      </div>

      <!-- 习惯健康度预测（discipline/habit-predictor 引擎：健康度评分/连续/完成率/中断/趋势预测，INCR-215） -->
      <div class="dw-predict">
        <HabitPredictorPanel :habits="bridge.habits.value" />
      </div>
    </section>

    <!-- 挑战赛 -->
    <section v-if="activeTab === 'challenges'" data-enter class="dw-section">
      <h3>⚔️ 挑战赛</h3>
      <div v-if="activeChallenges.length === 0" class="empty-state">
        <EmptyState title="暂无进行中的挑战" :glow="false" cta-label="" />
        <div class="quick-templates">
          <button
            v-for="tpl in challengeTemplates"
            :key="tpl.title"
            class="quick-tpl-btn"
            @click="createChallengeFromTpl(tpl)"
          >
            {{ tpl.title }}
          </button>
        </div>
      </div>
      <div v-else class="challenge-list">
        <div
          v-for="ch in activeChallenges"
          :key="ch.id"
          class="challenge-card"
        >
          <div class="ch-header">
            <span class="ch-icon">{{ getChallengeIcon(ch) }}</span>
            <div class="ch-info">
              <span class="ch-name">{{ ch.title }}</span>
              <span class="ch-desc">{{ ch.description }}</span>
            </div>
            <span class="ch-difficulty" :class="getChallengeDifficulty(ch)">{{ getChallengeDifficulty(ch) }}</span>
          </div>
          <div class="ch-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: getChallengeProgress(ch) + '%' }"
              ></div>
            </div>
            <span class="progress-text">
              {{ ch.currentDay }} / {{ ch.duration }} 天
            </span>
          </div>
          <div class="ch-reward" v-if="ch.reward">
            <span class="reward-icon">🎁</span>
            <span>奖励：{{ ch.reward }}</span>
          </div>
        </div>
      </div>

      <!-- 挑战推荐面板（discipline/challenge-recommender + habit-correlation 引擎，INCR-231） -->
      <ChallengeAdvisorPanel
        :habits="bridge.habits.value"
        :challenges="activeChallenges"
        @adopt="createChallengeFromRecommendation"
      />

      <!-- 自适应挑战（generateAdaptiveChallenge 独有维度，INCR-360） -->
      <div v-if="adaptiveChallenge" class="dw-adaptive">
        <div class="dw-adaptive-head">
          <span class="dw-adaptive-label">🃏 自适应挑战</span>
          <button class="dw-adaptive-refresh" type="button" @click="refreshAdaptiveChallenge">换一个</button>
        </div>
        <p class="dw-adaptive-desc">{{ adaptiveChallenge.description }}</p>
        <div class="dw-adaptive-meta">
          <span class="dw-adaptive-chip">{{ diffLabel(adaptiveChallenge.difficulty) }}</span>
          <span class="dw-adaptive-chip">{{ adaptiveChallenge.duration }} 天</span>
          <span class="dw-adaptive-chip">{{ adaptiveChallenge.score }} 分</span>
        </div>
        <button class="dw-adaptive-adopt" type="button" @click="createChallengeFromRecommendation(adaptiveChallenge)">
          采纳自适应挑战
        </button>
      </div>
    </section>

    <!-- 徽章墙 -->
    <section v-if="activeTab === 'badges'" data-enter class="dw-section">
      <h3>🏅 徽章墙</h3>
      <div class="badge-stats">
        <span>已解锁 {{ unlockedBadges.length }} / {{ allBadges.length }} 个徽章</span>
        <div class="badge-category-filter">
          <button
            v-for="cat in badgeCategories"
            :key="cat.key"
            :class="['badge-filter-btn', { active: badgeFilter === cat.key }]"
            @click="badgeFilter = badgeFilter === cat.key ? 'all' : cat.key"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>
      <div class="badge-grid">
        <div
          v-for="badge in filteredBadges"
          :key="badge.id"
          :class="['badge-item', { locked: !badge.unlocked, unlocked: badge.unlocked }]"
        >
          <div class="badge-icon-wrap">
            <span class="badge-icon">{{ badge.icon }}</span>
            <span v-if="badge.unlocked" class="badge-glow"></span>
          </div>
          <span class="badge-name">{{ badge.name }}</span>
          <span class="badge-desc">{{ badge.description }}</span>
          <span v-if="badge.unlocked" class="badge-date">{{ formatDate(badge.unlockedAt) }}</span>
          <span v-else class="badge-locked-overlay">🔒</span>
        </div>
      </div>
    </section>

    <!-- 统计 -->
    <section v-if="activeTab === 'stats'" data-enter class="dw-section">
      <h3>📊 工坊统计</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">习惯健康度</span>
          <div class="health-score-ring">
            <svg viewBox="0 0 120 120" class="score-ring">
              <circle cx="60" cy="60" r="52" class="ring-bg" />
              <circle
                cx="60" cy="60" r="52"
                class="ring-fill"
                :style="{ strokeDashoffset: 327 - (327 * healthScore) / 100 }"
              />
            </svg>
            <span class="score-value">{{ healthScore }}</span>
          </div>
          <span class="health-label">{{ habitHealth.label }}</span>
          <ul class="health-suggestions">
            <li v-for="(s, i) in habitHealth.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>
        <div class="stat-card">
          <span class="stat-label">连续打卡</span>
          <div class="streak-display">
            <span class="streak-number">{{ topStreakCount }}</span>
            <span class="streak-unit">天</span>
          </div>
          <span class="streak-rank">{{ topStreakHabit }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">习惯分布</span>
          <div class="habit-distribution">
            <div v-for="cat in habitCategories" :key="cat.key" class="dist-row">
              <span class="dist-label">{{ cat.label }}</span>
              <div class="dist-bar-bg">
                <div
                  class="dist-bar-fill"
                  :style="{ width: getCategoryPercent(cat.key) + '%', backgroundColor: cat.color }"
                ></div>
              </div>
              <span class="dist-count">{{ getCategoryCount(cat.key) }}</span>
            </div>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-label">完成率趋势</span>
          <div class="completion-rate">
            <span class="rate-number">{{ completionRate }}%</span>
            <span class="rate-label">今日完成率</span>
          </div>
        </div>
      </div>

      <!-- 连击段位 · 排行榜（INCR-434） -->
      <div class="dw-streak-board" v-if="topStreaks.length > 0">
        <div class="dw-streak-board-head">
          <span class="dw-streak-board-title">🔥 连击排行榜</span>
          <span class="dw-streak-board-sub">按当前连续天数排序</span>
        </div>
        <div
          v-for="s in topStreaks"
          :key="s.habitId"
          class="dw-streak-row"
        >
          <span class="dw-streak-emoji">{{ streakLevelMeta(s.level).emoji }}</span>
          <div class="dw-streak-main">
            <div class="dw-streak-line">
              <span class="dw-streak-name">{{ s.habitName }}</span>
              <span
                class="dw-streak-level"
                :style="{
                  color: streakLevelMeta(s.level).color,
                  borderColor: streakLevelMeta(s.level).color + '55',
                  background: streakLevelMeta(s.level).color + '14',
                }"
              >{{ streakLevelMeta(s.level).label }}</span>
            </div>
            <div class="dw-streak-meta">
              <span>当前 <b>{{ s.currentStreak }}</b> 天</span>
              <span>最长 <b>{{ s.longestStreak }}</b> 天</span>
              <span>累计打卡 <b>{{ s.totalCheckins }}</b> 次</span>
              <span v-if="s.daysToNextLevel > 0">距下一级 <b>{{ s.daysToNextLevel }}</b> 天</span>
              <span v-else>已达最高段位</span>
            </div>
          </div>
          <span class="dw-streak-days">{{ s.currentStreak }}</span>
        </div>
        <div class="dw-streak-ladder">
          <span
            v-for="lv in streakLadder"
            :key="lv.key"
            class="dw-ladder-step"
            :class="{ 'dw-ladder--reached': maxStreakCount >= lv.minDays }"
            :style="{ color: lv.color, borderColor: lv.color + '55' }"
            :title="`${lv.label} · 连续 ${lv.minDays} 天`"
          >{{ lv.emoji }} {{ lv.label }} {{ lv.minDays }}天</span>
        </div>
      </div>
    </section>
    <!-- 番茄树园 -->
    <section v-if="activeTab === 'forest'" data-enter class="dw-section">
      <PomodoroForestPanel />
    </section>

    <!-- 冥想工坊（discipline·meditation，INCR-177） -->
    <section v-if="activeTab === 'meditation'" data-enter class="dw-section">
      <MeditationStudio />
    </section>

    <!-- 任务看板（tasks/quadrant-board 引擎：紧急×重要 四象限分桶 · 列统计 · 温和洞察，INCR-318） -->
    <section v-if="activeTab === 'tasks'" data-enter class="dw-section">
      <QuadrantBoardPanel />
    </section>

    <!-- 每日仪式（discipline/workshop 引擎：DailyRitual 模型 + RITUAL_TEMPLATES 预设 + completeRitual 累计，INCR-441） -->
    <section v-if="activeTab === 'rituals'" data-enter class="dw-section">
      <DailyRitualPanel />
    </section>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useDisciplineBridge } from '../modules/discipline/workshop-bridge'
import HabitPredictArchivePanel from '../components/HabitPredictArchivePanel.vue'
import HabitFailurePanel from '../components/HabitFailurePanel.vue'
import HabitSuggestionPanel from '../components/HabitSuggestionPanel.vue'
import HabitBundlePanel from '../components/HabitBundlePanel.vue'
import HabitPredictorPanel from '../components/HabitPredictorPanel.vue'
import type { Habit, DisciplineChallenge, HabitDifficulty } from '../modules/discipline/types'
import { STREAK_LEVELS } from '../modules/discipline'
import type { StreakLevel } from '../modules/discipline'
import { getHabitTemplatesByCategory, getChallengeTemplatesByDifficulty } from '../modules/discipline/workshop-bridge'
import type { HabitTemplate, ChallengeTemplate } from '../modules/discipline/preset-library'
import PomodoroForestPanel from '../components/discipline/PomodoroForestPanel.vue'
import DailyRitualPanel from '../components/discipline/DailyRitualPanel.vue'
import MeditationStudio from '../components/MeditationStudio.vue'
import ChallengeAdvisorPanel from '../components/ChallengeAdvisorPanel.vue'
import type { ChallengeRecommendation } from '../modules/discipline/challenge-recommender'
import { useChallengeRecommender } from '../modules/discipline/challenge-recommender'
import { HABIT_DIFFICULTY_META } from '../modules/discipline/types'
import QuadrantBoardPanel from '../components/QuadrantBoardPanel.vue'
import { useTaskManager } from '../modules/tasks'
import EmptyState from '../components/EmptyState.vue'
import RoomLayout from '../components/RoomLayout.vue'

const { entranceRef, entranceClass } = useViewEntrance()

const bridge = useDisciplineBridge()

const taskManager = useTaskManager()

// 标签状态
const tabs = [
  { key: 'checkin', icon: '📋', label: '今日打卡' },
  { key: 'challenges', icon: '⚔️', label: '挑战赛' },
  { key: 'badges', icon: '🏅', label: '徽章墙' },
  { key: 'stats', icon: '📊', label: '统计' },
  { key: 'forest', icon: '🌳', label: '番茄树园' },
  { key: 'meditation', icon: '🧘', label: '冥想工坊' },
  { key: 'tasks', icon: '🗂️', label: '任务看板' },
  { key: 'rituals', icon: '🕯️', label: '每日仪式' },
]
const activeTab = ref('checkin')

// 徽章筛选
const badgeFilter = ref('all')
const badgeCategories = [
  { key: 'all', label: '全部' },
  { key: 'streak', label: '连续' },
  { key: 'milestone', label: '里程碑' },
  { key: 'variety', label: '多样' },
  { key: 'challenge', label: '挑战' },
  { key: 'special', label: '特殊' },
]

// 习惯分类
const habitCategories = [
  { key: 'health', label: '健康', color: '#8a9a7a' },
  { key: 'learning', label: '学习', color: '#6b9fc4' },
  { key: 'productivity', label: '效率', color: '#f59e0b' },
  { key: 'mindfulness', label: '正念', color: '#a07c8c' },
  { key: 'social', label: '社交', color: '#b5707a' },
  { key: 'creative', label: '创造', color: '#5ab8a0' },
]

// 从模板库构建标题→分类映射
const habitCategoryMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const tpl of bridge.HABIT_TEMPLATES) {
    map[tpl.title] = tpl.category
  }
  return map
})

// 挑战标题→难度映射
const challengeDifficultyMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const tpl of bridge.CHALLENGE_TEMPLATES) {
    map[tpl.title] = tpl.difficulty
  }
  return map
})

// 快速模板
const quickTemplates = computed(() => {
  return getHabitTemplatesByCategory('productivity').slice(0, 4)
})

const challengeTemplates = computed(() => {
  return getChallengeTemplatesByDifficulty('easy').slice(0, 3)
})

// 数据
const stats = ref(bridge.getStats())
const healthScore = computed(() => bridge.getHabitHealthScore())
// 健康度评估（INCR-441）：以桥引擎单一真源（含 label + suggestions），替换原视图侧自算阈值文案
const habitHealth = computed(() => bridge.getHabitHealthAssessment())

const todayHabits = ref<Habit[]>([])
const activeChallenges = ref<DisciplineChallenge[]>([])
const allBadges = ref<any[]>([])
const unlockedBadges = computed(() => allBadges.value.filter(b => b.unlocked))

// 最长连续打卡
const topStreakCount = computed(() => {
  if (bridge.streaks.value.length === 0) return 0
  return Math.max(...bridge.streaks.value.map(s => s.currentStreak))
})

/**
 * 连击段位与排行榜（INCR-434）：把已在引擎算出、但从未上盘的
 * 「段位（STREAK_LEVELS）+ 距下一级天数 + 连击排行」挂到统计页。
 * 纯展示：不写存储、不发提醒。
 */
const topStreaks = computed(() => bridge.getTopStreaks(5))
function streakLevelMeta(level: StreakLevel) {
  return STREAK_LEVELS[level] ?? STREAK_LEVELS.bronze
}
const streakLadder = (Object.keys(STREAK_LEVELS) as StreakLevel[]).map(k => ({
  key: k,
  ...STREAK_LEVELS[k],
}))
const maxStreakCount = computed(() => topStreaks.value[0]?.currentStreak ?? 0)

const topStreakHabit = computed(() => {
  if (bridge.streaks.value.length === 0) return '—'
  const top = bridge.streaks.value.reduce((a, b) =>
    a.currentStreak > b.currentStreak ? a : b
  )
  return top.habitName || '—'
})

const completionRate = computed(() => {
  if (todayHabits.value.length === 0) return 0
  const completed = todayHabits.value.filter(h => isHabitCompletedToday(h)).length
  return Math.round((completed / todayHabits.value.length) * 100)
})

const filteredBadges = computed(() => {
  if (badgeFilter.value === 'all') return allBadges.value
  return allBadges.value.filter(b => b.category === badgeFilter.value)
})

// ---- 辅助函数 ----

function isHabitCompletedToday(habit: Habit): boolean {
  const today = new Date().toISOString().split('T')[0]
  return habit.completedDates.includes(today)
}

function getHabitCategory(habit: Habit): string {
  return habitCategoryMap.value[habit.title] || 'productivity'
}

function getHabitIcon(habit: Habit): string {
  const icons: Record<string, string> = {
    health: '💪', learning: '📚', productivity: '⚡',
    mindfulness: '🧘', social: '🤝', creative: '🎨',
  }
  return icons[getHabitCategory(habit)] || habit.icon || '📌'
}

function getChallengeDifficulty(ch: DisciplineChallenge): string {
  return challengeDifficultyMap.value[ch.title] || 'medium'
}

function getChallengeIcon(ch: DisciplineChallenge): string {
  const icons: Record<string, string> = {
    easy: '🌟', medium: '🔥', hard: '💎', extreme: '👑',
  }
  return icons[getChallengeDifficulty(ch)] || '⚔️'
}

function getChallengeProgress(ch: DisciplineChallenge): number {
  if (ch.duration === 0) return 0
  return Math.round((ch.currentDay / ch.duration) * 100)
}

function getCategoryCount(category: string): number {
  return todayHabits.value.filter(h => getHabitCategory(h) === category).length
}

function getCategoryPercent(category: string): number {
  if (todayHabits.value.length === 0) return 0
  return Math.round((getCategoryCount(category) / todayHabits.value.length) * 100)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ---- 数据加载与操作 ----

function loadData() {
  stats.value = bridge.getStats()
  todayHabits.value = bridge.getTodayHabits()
  activeChallenges.value = bridge.getActiveChallenges()
  allBadges.value = bridge.badges.value
  refreshAdaptiveChallenge()
}

// 自适应挑战（discipline/challenge-recommender · generateAdaptiveChallenge 独有维度）
const adaptiveRecEngine = useChallengeRecommender()
const adaptiveChallenge = ref<ChallengeRecommendation | null>(null)
function refreshAdaptiveChallenge() {
  if (bridge.habits.value.length === 0) {
    adaptiveChallenge.value = null
    return
  }
  const profile = adaptiveRecEngine.buildProfile(bridge.habits.value, activeChallenges.value)
  adaptiveChallenge.value = adaptiveRecEngine.generateAdaptiveChallenge(
    bridge.habits.value,
    activeChallenges.value,
    profile,
  )
}

function diffLabel(d: HabitDifficulty): string {
  return HABIT_DIFFICULTY_META[d]?.label ?? d
}

function toggleHabit(habit: Habit) {
  if (isHabitCompletedToday(habit)) return
  bridge.completeHabit(habit.id)
  loadData()
}

function toggleAutoCheckIn(habit: Habit) {
  bridge.updateHabit(habit.id, { autoCheckInOnFocus: !habit.autoCheckInOnFocus })
  loadData()
}

function createFromTemplate(template: HabitTemplate) {
  bridge.createHabitFromTemplate(template)
  loadData()
}

function createChallengeFromTpl(template: ChallengeTemplate) {
  bridge.createChallengeFromTemplate(template, todayHabits.value)
  loadData()
}

// 采纳挑战顾问推荐（INCR-231）
function createChallengeFromRecommendation(rec: ChallengeRecommendation) {
  bridge.createChallenge(rec.title, rec.description, rec.duration, rec.suggestedHabits, rec.suggestedReward)
  loadData()
}

onMounted(() => {
  bridge.init()
  taskManager.load()
  loadData()
})
</script>

<style scoped>
/* ============================================================
   自律工坊 - 视图样式
   ============================================================ */

.dw { padding: 0; max-width: 900px; margin: 0 auto; }

/* 概览卡片 */
.overview-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.overview-card {
  display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
  padding: 1rem; border-radius: 12px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, #334155);
}
.ov-icon { font-size: 1.5rem; }
.ov-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary, #e8e0d8); }
.ov-label { font-size: 0.75rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }

/* 标签导航 */
.dw-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border, #334155); padding-bottom: 0; }
.dw-tab {
  padding: 0.6rem 1.2rem; border: none; background: none; cursor: pointer;
  font-size: 0.9rem; color: var(--text-muted, rgba(232, 224, 216, 0.44));
  border-bottom: 2px solid transparent; transition: all 0.2s;
  display: flex; align-items: center; gap: 0.4rem;
}
.dw-tab:hover { color: var(--text-primary, #e8e0d8); }
.dw-tab.active { color: var(--accent, #d4a574); border-bottom-color: var(--accent, #d4a574); }
.tab-icon { font-size: 1rem; }

/* 区块 */
.dw-section { margin-bottom: 2rem; }
.dw-section h3 { font-size: 1.1rem; margin: 0 0 1rem; color: var(--text-primary, #e8e0d8); }
.dw-predict { margin-top: 1.4rem; }
.dw-advice {
  margin-top: 1.4rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  /* 为集成面板补齐 --hf-* 设计令牌 */
  --hf-primary: #f59e0b;
  --hf-surface: #1b1b21;
  --hf-border: #3a3f4d;
  --hf-text: #eef0f4;
  --hf-text-muted: #9aa3b2;
  --hf-bg: #141418;
  --hf-radius: 14px;
  --hf-shadow: none;
  --hf-bg-accent: rgba(245, 158, 11, 0.08);
}

/* 空状态 */
.empty-state { text-align: center; padding: 2rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }
.quick-templates { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem; }
.quick-tpl-btn {
  padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--bg-surface, rgba(255, 255, 255, 0.03)); cursor: pointer;
  color: var(--text-primary, #e8e0d8); font-size: 0.85rem; transition: all 0.2s;
}
.quick-tpl-btn:hover { border-color: var(--accent, #d4a574); background: rgba(245, 158, 11, 0.1); }

/* 习惯列表 */
.habit-list { display: flex; flex-direction: column; gap: 0.75rem; }
.habit-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem; border-radius: 10px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, #334155);
  transition: all 0.2s;
}
.habit-card.completed { opacity: 0.7; border-color: rgba(16, 185, 129, 0.3); }
.habit-info { display: flex; align-items: center; gap: 0.75rem; }
.habit-icon { font-size: 1.25rem; }
.habit-detail { display: flex; flex-direction: column; }
.habit-name { font-weight: 600; color: var(--text-primary, #e8e0d8); }
.habit-streak { font-size: 0.8rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }
.best-streak { color: var(--accent, #d4a574); }
.habit-check-btn {
  padding: 0.5rem 1.25rem; border-radius: 8px; border: 1px solid var(--accent, #d4a574);
  background: transparent; cursor: pointer; color: var(--accent, #d4a574);
  font-size: 0.85rem; font-weight: 600; transition: all 0.2s;
}
.habit-check-btn:hover:not(:disabled) { background: rgba(245, 158, 11, 0.15); }
.habit-check-btn.done { background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #10b981; cursor: default; }
.habit-check-btn:disabled { cursor: not-allowed; }

.habit-auto {
  display: inline-flex; align-items: center; gap: 0.35rem;
  margin-top: 0.5rem; padding: 0.25rem 0.5rem; border-radius: 6px;
  font-size: 0.7rem; color: var(--color-text-soft, #9aa0a6);
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.08);
  cursor: pointer; user-select: none; white-space: nowrap;
}
.habit-auto input { width: 0.85rem; height: 0.85rem; accent-color: var(--accent, #d4a574); cursor: pointer; }

/* 挑战赛 */
.challenge-list { display: flex; flex-direction: column; gap: 1rem; }
.challenge-card {
  padding: 1rem; border-radius: 10px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, #334155);
}
.ch-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.ch-icon { font-size: 1.5rem; }
.ch-info { flex: 1; display: flex; flex-direction: column; }
.ch-name { font-weight: 600; color: var(--text-primary, #e8e0d8); }
.ch-desc { font-size: 0.8rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }
.ch-difficulty {
  font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 4px; text-transform: uppercase;
  background: rgba(100, 116, 139, 0.2); color: var(--text-muted, rgba(232, 224, 216, 0.44));
}
.ch-difficulty.easy { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.ch-difficulty.medium { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.ch-difficulty.hard { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.ch-difficulty.extreme { background: rgba(160, 124, 140, 0.2); color: #a07c8c; }
.ch-progress { margin-bottom: 0.5rem; }
.progress-bar { height: 6px; background: rgba(100, 116, 139, 0.2); border-radius: 3px; overflow: hidden; margin-bottom: 0.35rem; }
.progress-fill { height: 100%; background: var(--accent, #d4a574); border-radius: 3px; transition: width 0.5s ease; }
.progress-text { font-size: 0.8rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }
.ch-reward { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--accent, #d4a574); }

/* 徽章墙 */
.badge-stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }
.badge-category-filter { display: flex; gap: 0.35rem; }
.badge-filter-btn {
  padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border, #334155);
  background: transparent; cursor: pointer; font-size: 0.75rem; color: var(--text-muted, rgba(232, 224, 216, 0.44));
  transition: all 0.2s;
}
.badge-filter-btn:hover, .badge-filter-btn.active { border-color: var(--accent, #d4a574); color: var(--accent, #d4a574); }
.badge-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.75rem;
}
.badge-item {
  position: relative; display: flex; flex-direction: column; align-items: center;
  padding: 1rem 0.5rem; border-radius: 10px; text-align: center;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, #334155);
  transition: all 0.3s;
}
.badge-item.locked { opacity: 0.5; filter: grayscale(0.8); }
.badge-item.unlocked { border-color: rgba(245, 158, 11, 0.3); }
.badge-icon-wrap { position: relative; font-size: 2rem; margin-bottom: 0.35rem; }
.badge-glow {
  position: absolute; inset: -4px; border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent);
  animation: badgeGlow 2s ease-in-out infinite;
}
@keyframes badgeGlow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}
.badge-name { font-size: 0.8rem; font-weight: 600; color: var(--text-primary, #e8e0d8); }
.badge-desc { font-size: 0.7rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); margin-top: 0.15rem; }
.badge-date { font-size: 0.65rem; color: var(--accent, #d4a574); margin-top: 0.25rem; }
.badge-locked-overlay { position: absolute; top: 0.35rem; right: 0.35rem; font-size: 0.8rem; }

/* 统计 */
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.stat-card {
  padding: 1.25rem; border-radius: 10px; text-align: center;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, #334155);
}
.stat-label { display: block; font-size: 0.8rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); margin-bottom: 0.75rem; }

/* 健康度圆环 */
.health-score-ring { position: relative; width: 100px; height: 100px; margin: 0 auto; }
.score-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgba(100, 116, 139, 0.2); stroke-width: 8; }
.ring-fill {
  fill: none; stroke: var(--accent, #d4a574); stroke-width: 8;
  stroke-dasharray: 327; stroke-dashoffset: 100; stroke-linecap: round;
  transition: stroke-dashoffset 1s ease;
}
.score-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.5rem; font-weight: 700; color: var(--text-primary, #e8e0d8); }
.health-label { display: block; font-size: 0.85rem; color: var(--accent, #d4a574); margin-top: 0.4rem; }
.health-suggestions {
  list-style: none; margin: 0.5rem 0 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.25rem; text-align: left;
}
.health-suggestions li {
  font-size: 0.76rem; color: var(--text-secondary, #9a9088);
  padding-left: 0.9rem; position: relative; line-height: 1.4;
}
.health-suggestions li::before {
  content: '💡'; position: absolute; left: 0; font-size: 0.7rem;
}

/* 连续打卡 */
.streak-display { margin: 0.5rem 0; }
.streak-number { font-size: 2.5rem; font-weight: 700; color: var(--text-primary, #e8e0d8); }
.streak-unit { font-size: 1rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }
.streak-rank { display: block; font-size: 0.85rem; color: var(--accent, #d4a574); }

/* 习惯分布 */
.habit-distribution { display: flex; flex-direction: column; gap: 0.5rem; }
.dist-row { display: flex; align-items: center; gap: 0.5rem; }
.dist-label { width: 40px; font-size: 0.75rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); text-align: right; }
.dist-bar-bg { flex: 1; height: 8px; background: rgba(100, 116, 139, 0.2); border-radius: 4px; overflow: hidden; }
.dist-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.dist-count { width: 20px; font-size: 0.75rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); text-align: left; }

/* 完成率 */
/* 连击段位 · 排行榜（INCR-434） */
.dw-streak-board { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.07); }
.dw-streak-board-head { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.6rem; }
.dw-streak-board-title { font-size: 0.98rem; font-weight: 600; color: var(--text-primary, #e8e0d8); }
.dw-streak-board-sub { font-size: 0.75rem; color: var(--text-secondary, #9a9088); }
.dw-streak-row {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.5rem 0.65rem; margin-bottom: 0.4rem;
  border-radius: 0.6rem; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
}
.dw-streak-emoji { font-size: 1.25rem; flex: 0 0 auto; }
.dw-streak-main { flex: 1; min-width: 0; }
.dw-streak-line { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; }
.dw-streak-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary, #e8e0d8); }
.dw-streak-level {
  font-size: 0.7rem; padding: 0.1rem 0.42rem; border-radius: 0.5rem;
  border: 1px solid transparent;
}
.dw-streak-meta { display: flex; flex-wrap: wrap; gap: 0.2rem 0.75rem; font-size: 0.72rem; color: var(--text-secondary, #9a9088); margin-top: 0.15rem; }
.dw-streak-meta b { color: var(--text-primary, #e8e0d8); font-weight: 600; }
.dw-streak-days {
  flex: 0 0 auto; font-size: 1.35rem; font-weight: 700;
  color: var(--accent, #d9a05b);
}
.dw-streak-ladder { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.6rem; }
.dw-ladder-step {
  font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 0.5rem;
  border: 1px solid transparent; opacity: 0.45;
  background: rgba(255,255,255,0.03);
}
.dw-ladder-step.dw-ladder--reached { opacity: 1; background: rgba(255,255,255,0.06); }

.completion-rate { margin: 0.5rem 0; }
.rate-number { font-size: 2.5rem; font-weight: 700; color: var(--text-primary, #e8e0d8); display: block; }
.rate-label { font-size: 0.8rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }

/* 自适应挑战（generateAdaptiveChallenge 独有维度，INCR-360） */
.dw-adaptive {
  margin-top: 1.4rem; padding: 1rem 1.25rem; border-radius: 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(160, 124, 140, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.dw-adaptive-head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;
}
.dw-adaptive-label { font-weight: 600; color: var(--accent, #d4a574); font-size: 0.9rem; }
.dw-adaptive-refresh {
  border: none; background: transparent; cursor: pointer;
  font-size: 0.75rem; color: var(--text-muted, rgba(232, 224, 216, 0.44));
  padding: 0.15rem 0.4rem; border-radius: 6px; transition: all 0.2s;
}
.dw-adaptive-refresh:hover { color: var(--accent, #d4a574); background: rgba(245, 158, 11, 0.1); }
.dw-adaptive-desc { font-size: 0.9rem; color: var(--text-primary, #e8e0d8); line-height: 1.5; margin: 0 0 0.6rem; }
.dw-adaptive-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
.dw-adaptive-chip {
  font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 999px;
  background: rgba(100, 116, 139, 0.25); color: var(--text-muted, rgba(232, 224, 216, 0.44));
}
.dw-adaptive-adopt {
  padding: 0.5rem 1.1rem; border-radius: 8px; border: 1px solid var(--accent, #d4a574);
  background: rgba(245, 158, 11, 0.15); cursor: pointer; color: var(--accent, #d4a574);
  font-size: 0.82rem; font-weight: 600; transition: all 0.2s;
}
.dw-adaptive-adopt:hover { background: rgba(245, 158, 11, 0.25); }

/* 响应式 */
@media (max-width: 640px) {
  .overview-cards { grid-template-columns: repeat(2, 1fr); }
  .stats-grid { grid-template-columns: 1fr; }
  .badge-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
  .dw-tabs { flex-wrap: wrap; }
}
</style>