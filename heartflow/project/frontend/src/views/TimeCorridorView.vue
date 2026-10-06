<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance time-corridor-view">
    <!-- 氛围背景 -->
    <div data-enter class="tcv-ambient" aria-hidden="true">
      <div class="tcv-glow tcv-glow--top"></div>
      <div class="tcv-glow tcv-glow--bottom"></div>
    </div>

    <!-- 装饰性顶部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <div data-enter class="header-kicker">结晶为光点，在时间轴上铺展</div>
    <h1 class="tcv-title">时间长廊</h1>

    <!-- 导航栏 -->
    <div data-enter class="tcv-nav">
      <button class="tcv-nav-btn" @click="navTo('/timeline')">
        <span class="tcv-nav-icon">≋</span>
        <span>时间之河</span>
      </button>
      <button class="tcv-nav-btn" @click="navTo('/timeline-index')">
        <span class="tcv-nav-icon">◉</span>
        <span>时间线索引</span>
      </button>
      <button class="tcv-nav-btn" @click="navTo('/garden')">
        <span class="tcv-nav-icon">🌷</span>
        <span>情绪花房</span>
      </button>
      <button class="tcv-nav-btn" @click="navTo('/anchor')">
        <span class="tcv-nav-icon">⚓</span>
        <span>逐日心锚</span>
      </button>
    </div>

    <!-- 统计概览 -->
    <div data-enter class="tcv-stats" v-if="stats">
      <div class="tcv-stat-card">
        <span class="tcv-stat-value">{{ stats.totalCrystals }}</span>
        <span class="tcv-stat-label">总结晶</span>
      </div>
      <div class="tcv-stat-card">
        <span class="tcv-stat-value">{{ stats.uniqueDays }}</span>
        <span class="tcv-stat-label">活跃天数</span>
      </div>
      <div class="tcv-stat-card">
        <span class="tcv-stat-value">{{ stats.totalFocusHours }}h</span>
        <span class="tcv-stat-label">总专注</span>
      </div>
      <div class="tcv-stat-card">
        <span class="tcv-stat-value">{{ stats.avgCrystalsPerDay }}</span>
        <span class="tcv-stat-label">日均结晶</span>
      </div>
    </div>

    <!-- 专注节奏 · 接线 timer 统计孤儿 (INCR-436：今日/本周/本月专注 + 今日完成 + 连续天数) -->
    <div data-enter class="tcv-focus" v-if="focusStats">
      <div class="tcv-focus-head">专注节奏</div>
      <div class="tcv-focus-grid">
        <div class="tcv-focus-card">
          <span class="tcv-focus-value">{{ focusStats.todayMinutes }}<small>min</small></span>
          <span class="tcv-focus-label">今日专注</span>
        </div>
        <div class="tcv-focus-card">
          <span class="tcv-focus-value">{{ focusStats.weekHours }}<small>h</small></span>
          <span class="tcv-focus-label">本周专注</span>
        </div>
        <div class="tcv-focus-card">
          <span class="tcv-focus-value">{{ focusStats.monthHours }}<small>h</small></span>
          <span class="tcv-focus-label">本月专注</span>
        </div>
        <div class="tcv-focus-card">
          <span class="tcv-focus-value">{{ focusStats.todayCompleted }}</span>
          <span class="tcv-focus-label">今日完成</span>
        </div>
        <div class="tcv-focus-card">
          <span class="tcv-focus-value">{{ focusStats.streak }}</span>
          <span class="tcv-focus-label">连续天数</span>
        </div>
      </div>
      <p class="tcv-focus-tip" v-if="focusStats.longBreakDue">✦ 今日已完成 {{ focusStats.todayCompleted }} 个番茄，建议来一场长休息</p>
    </div>

    <!-- 天文日历 · 观星时节（INCR-05：让时间/星空看得见，纯本地计算） -->
    <div data-enter class="tcv-astro">
      <AstronomyPanel />
      <!-- 月相历 · 逐月观星（timeline/astronomy 引擎：逐日月相+流星雨峰值，INCR-193） -->
      <AstronomyCalendarPanel />
      <!-- 今夜观测计划（observing/observation-plan 引擎：月相/时段/深空/行星分时建议+观星指数，INCR-216） -->
      <ObservationPlanPanel />
    </div>

    <!-- 历史上的今天 · 公共历史事件库（on-this-day 引擎，INCR-510） -->
    <div data-enter class="tcv-otd">
      <OnThisDayPanel />
    </div>

    <!-- 时间星图 · 赤道→地平投影 / 四季回溯（sky 引擎，INCR-185） -->
    <div data-enter class="tcv-skygaze">
      <SkyGazePanel />
      <!-- 观星地点库 · 精选暗夜/观星地，设为观测地驱动上方星图（INCR-511） -->
      <StargazingSpotsPanel />
      <!-- 月面地名导览 · 月海/环形山正交投影（sky/moon-atlas 引擎，INCR-512） -->
      <MoonAtlasPanel />
    </div>

    <!-- 生命刻度 · 生之时/死之时/里程碑（life-epoch 引擎，INCR-211） -->
    <div data-enter class="tcv-lifeepoch">
      <LifeEpochPanel />
    </div>

    <!-- 时光胶囊 · 接入已存在的 modules/capsule（本地私有/沉默默认/允许未定义） -->
    <section data-enter class="tcv-capsule">
      <header class="tcv-capsule-head">
        <span class="tcv-capsule-title">🕰 时光胶囊</span>
        <span class="tcv-capsule-count">封存 {{ sealed.length }} · 今日可开启 {{ openableCapsules.length }}</span>
        <button class="tcv-capsule-go" @click="navTo('/capsule')">前往胶囊阁 →</button>
      </header>

      <div class="tcv-capsule-body">
        <ul class="tcv-capsule-list" v-if="openableCapsules.length">
          <li v-for="c in openableCapsules" :key="c.id" class="tcv-capsule-item">
            <span class="tcv-capsule-name">{{ c.title }}</span>
            <span class="tcv-capsule-hint">已到开启日</span>
            <button class="tcv-capsule-open" @click="openCapsule(c.id)">开启</button>
          </li>
        </ul>
        <p class="tcv-capsule-empty" v-else>暂无今日可开启的胶囊，写一封给未来的信并封存吧。</p>

        <form class="tcv-capsule-form" @submit.prevent="handleCreateCapsule">
          <input
            class="tcv-capsule-input"
            v-model="newCapsuleTitle"
            type="text"
            placeholder="给未来的自己写点什么…"
            maxlength="60"
          />
          <input class="tcv-capsule-date" v-model="newCapsuleDate" type="date" />
          <button
            class="tcv-capsule-submit"
            type="submit"
            :disabled="!newCapsuleTitle.trim() || !newCapsuleDate"
          >封存</button>
        </form>
      </div>
    </section>

    <!-- 时间长廊组件 -->
    <div data-enter class="tcv-corridor-container">
      <TimeCorridor :sessionMap="sessionMap" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useViewEntrance } from '../composables/useViewEntrance'
import { storage, storageVersion } from '../engine/storage'
import TimeCorridor from '../components/TimeCorridor.vue'
import AstronomyPanel from '../components/AstronomyPanel.vue'
import AstronomyCalendarPanel from '../components/AstronomyCalendarPanel.vue'
import SkyGazePanel from '../components/SkyGazePanel.vue'
import StargazingSpotsPanel from '../components/StargazingSpotsPanel.vue'
import MoonAtlasPanel from '../components/MoonAtlasPanel.vue'
import OnThisDayPanel from '../components/OnThisDayPanel.vue'
import LifeEpochPanel from '../components/LifeEpochPanel.vue'
import ObservationPlanPanel from '../components/ObservationPlanPanel.vue'
import type { FocusSession } from '../types'
import { useTimeCapsule } from '../modules/capsule'
import { getLocalDateKey } from '../utils/time'
// 接线 timer 统计孤儿（INCR-436）：今日/本周/本月专注、今日完成、连续天数、长休提醒
import {
  getTodayFocusTime,
  getWeekFocusTime,
  getMonthFocusTime,
  getTodayCompletedCount,
  getStreakDays,
  isLongBreakDue,
} from '../modules/timer'

const { entranceRef, entranceClass } = useViewEntrance()
const router = useRouter()

const sessionMap = computed<Map<string, FocusSession>>(() => {
  storageVersion.value
  return new Map(storage.getSessions().map(s => [s.id, s]))
})

interface CorridorStats {
  totalCrystals: number
  uniqueDays: number
  totalFocusHours: number
  avgCrystalsPerDay: number
}

// 专注节奏（INCR-436：接线 timer 模块统计孤儿）
interface FocusRhythm {
  todayMinutes: number
  weekHours: number
  monthHours: number
  todayCompleted: number
  streak: number
  longBreakDue: boolean
}

const stats = ref<CorridorStats | null>(null)
const focusStats = ref<FocusRhythm | null>(null)

onMounted(() => {
  const crystals = storage.getCrystals()
  const sessions = storage.getSessions()

  const days = new Set<string>()
  for (const c of crystals) {
    // ⚠️ 活跃天数按本地日历日（createdAt 是 UTC ISO 串）
    if (c.createdAt) days.add(getLocalDateKey(new Date(c.createdAt)))
  }

  const totalFocusMs = sessions.reduce((sum, s) => sum + (s.elapsed || 0), 0)

  stats.value = {
    totalCrystals: crystals.length,
    uniqueDays: days.size || 1,
    totalFocusHours: Math.round(totalFocusMs / 3600000),
    avgCrystalsPerDay: days.size > 0 ? Math.round((crystals.length / days.size) * 10) / 10 : 0,
  }

  // INCR-436：用模块统计函数替换/补足专注节奏展示，接线 timer 孤儿
  focusStats.value = {
    todayMinutes: Math.round(getTodayFocusTime() / 60000),
    weekHours: Math.round((getWeekFocusTime() / 3600000) * 10) / 10,
    monthHours: Math.round((getMonthFocusTime() / 3600000) * 10) / 10,
    todayCompleted: getTodayCompletedCount(),
    streak: getStreakDays(),
    longBreakDue: isLongBreakDue(),
  }
})

// ---- 时光胶囊：接入已存在的 modules/capsule ----
// 本地私有（hf:time_capsules，与笔记同源）、沉默默认（不主动提醒，仅走廊内联展示）、
// 允许未定义（旧胶囊缺 note/items 仍正常展示与开启）。
const { sealed, isOpenable, openCapsule, createCapsule } = useTimeCapsule()
const openableCapsules = computed(() =>
  sealed.value.filter(c => isOpenable(c)),
)
const newCapsuleTitle = ref('')
const newCapsuleDate = ref('')
function handleCreateCapsule() {
  if (!newCapsuleTitle.value.trim() || !newCapsuleDate.value) return
  createCapsule(newCapsuleTitle.value, newCapsuleDate.value)
  newCapsuleTitle.value = ''
  newCapsuleDate.value = ''
}

function navTo(path: string) {
  router.push(path)
}
</script>

<style scoped>
/* =============================================
   时间长廊 · 独立视图
   结晶为光点，在时间轴上铺展
   ============================================= */

.time-corridor-view {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

/* ---- 氛围背景 ---- */
.tcv-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.tcv-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.04;
}

.tcv-glow--top {
  top: -120px;
  right: -60px;
  background: var(--accent);
}

.tcv-glow--bottom {
  bottom: -100px;
  left: -50px;
  background: var(--accent);
}

/* ---- 装饰性顶部 ---- */
.header-ornament {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 32px 0;
  flex-shrink: 0;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent);
}

.orn-diamond {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

.header-kicker {
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.3);
  letter-spacing: 4px;
  margin-top: 8px;
  flex-shrink: 0;
}

.tcv-title {
  position: relative;
  z-index: 1;
  text-align: center;
  font-family: var(--font-heading-en);
  font-size: 28px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.75);
  letter-spacing: 6px;
  margin-top: 4px;
  flex-shrink: 0;
}

/* ---- 导航栏 ---- */
.tcv-nav {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px 32px 0;
  flex-shrink: 0;
}

.tcv-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.tcv-nav-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  color: rgba(var(--accent-rgb), 0.8);
}

.tcv-nav-icon {
  font-size: 16px;
}

/* ---- 统计卡片 ---- */
.tcv-stats {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 32px 0;
  flex-shrink: 0;
}

.tcv-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 18px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  min-width: 70px;
}

.tcv-stat-value {
  font-size: 16px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.tcv-stat-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

/* ---- 专注节奏（INCR-436） ---- */
.tcv-focus {
  position: relative;
  z-index: 1;
  margin: 16px 24px 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  flex-shrink: 0;
}

.tcv-focus-head {
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.6);
  letter-spacing: 2px;
  margin-bottom: 10px;
}

.tcv-focus-grid {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.tcv-focus-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  min-width: 64px;
}

.tcv-focus-value {
  font-size: 16px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.tcv-focus-value small {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
  margin-left: 2px;
}

.tcv-focus-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

.tcv-focus-tip {
  margin: 10px 0 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  text-align: center;
}

/* ---- 时间长廊容器 ---- */
.tcv-corridor-container {
  position: relative;
  z-index: 1;
  flex: 1;
  margin: 16px 24px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
  padding: 12px;
}

/* ---- 天文日历（INCR-05） ---- */
.tcv-astro {
  position: relative;
  z-index: 1;
  margin: 16px 24px 0;
}

/* ---- 生命刻度（INCR-211） ---- */
.tcv-lifeepoch {
  position: relative;
  z-index: 1;
  margin: 16px 24px 0;
}

/* ---- 时光胶囊面板 ---- */
.tcv-capsule {
  position: relative;
  z-index: 1;
  margin: 16px 24px 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  flex-shrink: 0;
}

.tcv-capsule-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tcv-capsule-title {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.7);
  letter-spacing: 2px;
}

.tcv-capsule-count {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
}

.tcv-capsule-go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  margin-left: auto;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}

.tcv-capsule-go:hover {
  color: rgba(var(--accent-rgb), 0.85);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.tcv-capsule-body {
  margin-top: 10px;
}

.tcv-capsule-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tcv-capsule-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.tcv-capsule-name {
  color: rgba(var(--accent-rgb), 0.7);
}

.tcv-capsule-hint {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

.tcv-capsule-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  margin-left: auto;
  font-size: 11px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;

  min-height: 26px;
}

.tcv-capsule-empty {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  margin: 0 0 10px;
}

.tcv-capsule-form {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.tcv-capsule-input {
  flex: 1;
  min-width: 140px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text, #e8e4dc);
}

.tcv-capsule-date {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  padding: 6px;
  font-size: 12px;
  color: var(--text, #e8e4dc);
}

.tcv-capsule-submit {
  font-size: 12px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
}

.tcv-capsule-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>