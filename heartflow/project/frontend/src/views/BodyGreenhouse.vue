<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance greenhouse">
    <header data-enter class="gh-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="gh-kicker">身体也是需要被照顾的温室</p>
      <h1 class="gh-title">身体温室</h1>
    </header>

    <!-- 统计概览行 -->
    <section data-enter class="overview-section">
      <div class="overview-grid">
        <article class="overview-card">
          <span class="ov-label">总记录数</span>
          <strong class="ov-value">{{ totalRecords }}</strong>
          <span class="ov-note">累计 {{ logs.length }} 条</span>
        </article>
        <article class="overview-card">
          <span class="ov-label">本周运动</span>
          <strong class="ov-value">{{ thisWeekExercise }}<small> 分</small></strong>
          <span class="ov-note" :class="thisWeekExercise >= 150 ? 'ov-note-good' : 'ov-note-warn'">
            {{ thisWeekExercise >= 150 ? '达标' : '距150分还差' + (150 - thisWeekExercise) + '分' }}
          </span>
        </article>
        <article class="overview-card">
          <span class="ov-label">平均睡眠</span>
          <strong class="ov-value">{{ sleepAvg }}<small> h</small></strong>
          <span class="ov-note" :class="sleepAvgNum >= 7 ? 'ov-note-good' : sleepAvgNum >= 6 ? 'ov-note-mid' : 'ov-note-warn'">
            {{ sleepAvgNum >= 7 ? '充足' : sleepAvgNum >= 6 ? '尚可' : '不足' }}
          </span>
        </article>
        <article class="overview-card">
          <span class="ov-label">饮食记录</span>
          <strong class="ov-value">{{ mealCount }}</strong>
          <span class="ov-note">{{ mealHealthyCount > 0 ? mealHealthyCount + ' 次健康' : '未记录健康饮食' }}</span>
        </article>
      </div>
    </section>

    <!-- 健康仪表盘（来自 body 模块） -->
    <section data-enter class="gh-dashboard-section" v-if="dashboardSummary.overallScore > 0">
      <h3 class="section-title">📊 健康仪表盘</h3>
      <div class="gh-dashboard-grid">
        <div class="gh-dashboard-card">
          <span class="gh-dashboard-num" :style="{ color: dashboardSummary.overallScore >= 80 ? '#34d399' : dashboardSummary.overallScore >= 60 ? '#6b9fc4' : dashboardSummary.overallScore >= 40 ? '#f59e0b' : '#ef4444' }">{{ dashboardSummary.overallScore }}</span>
          <span class="gh-dashboard-label">综合评分</span>
        </div>
        <div class="gh-dashboard-card">
          <span class="gh-dashboard-num">{{ dashboardSummary.greenhouseHealth }}<small>%</small></span>
          <span class="gh-dashboard-label">温室健康</span>
        </div>
        <div class="gh-dashboard-card">
          <span class="gh-dashboard-num">{{ dashboardSummary.streak }}<small>天</small></span>
          <span class="gh-dashboard-label">连续记录</span>
        </div>
        <div class="gh-dashboard-card">
          <span class="gh-dashboard-num">{{ dashboardSummary.activeGoals }}</span>
          <span class="gh-dashboard-label">活跃目标</span>
        </div>
      </div>
    </section>

    <!-- P2 感知层：环境感知健康洞察（非侵入式，仅当有数据时展示） -->
    <section data-enter class="perception-context" v-if="hasPerceptionContext">
      <div class="pc-header">
        <span class="pc-icon">🌡</span>
        <span class="pc-label">环境感知</span>
      </div>
      <div class="pc-body">
        <p class="pc-hint" v-if="healthTrendHint">{{ healthTrendHint }}</p>
        <p class="pc-hint pc-time-hint">{{ timeOfDayHint }}</p>
      </div>
    </section>

    <!-- 身体↔情绪 互指（蓝图13:1106：两房间互相关联，非侵入） -->
    <transition name="bh-link-fade">
      <section v-if="showBodyEmotionLink" class="body-emotion-link" data-enter>
        <span class="bel-icon">🌿</span>
        <div class="bel-body">
          <p class="bel-line">身体和情绪常常一起起伏。今天身体有些疲惫，如果愿意，去花房放下一朵，不用解释。</p>
          <button class="bel-btn" @click="goEmotionGarden">去情绪花房</button>
        </div>
      </section>
    </transition>

    <!-- 快速记录 -->
    <section data-enter class="quick-log">
      <div class="log-row"><span>😴 睡眠</span><input v-model.number="sleepForm.hours" type="number" min="0" max="24" step="0.5" placeholder="小时" class="bh-input"/><button class="bh-btn" @click="logSleep">记录</button></div>
      <div class="log-row"><span>🏃 运动</span><input v-model.number="exerciseForm.minutes" type="number" min="0" step="5" placeholder="分钟" class="bh-input"/><input v-model="exerciseForm.type" placeholder="类型…" class="bh-input"/><button class="bh-btn" @click="logExercise">记录</button></div>
      <div class="log-row"><span>🍽 饮食</span><input v-model="mealForm.note" placeholder="吃了什么…" class="bh-input" style="flex:2"/><button class="bh-btn" @click="logMeal">记录</button></div>
    </section>

    <!-- 呼吸跟随引导（纯CSS动画，可关闭，尊重减弱动效） -->
    <section data-enter class="breath-guide" v-if="breathGuideVisible">
      <div class="bg-head">
        <span class="bg-title">🌬 呼吸跟随</span>
        <button class="bg-hide" @click="breathGuideVisible = false">关闭</button>
      </div>
      <div class="bg-stage">
        <div class="bg-circle">
          <span class="bg-phase bg-phase-in">吸气</span>
          <span class="bg-phase bg-phase-out">呼气</span>
        </div>
      </div>
      <p class="bg-hint">跟随圆圈的缩放，缓缓吸气 4 秒、呼气 4 秒。需要时再来。</p>
    </section>

    <!-- 周期记录 -->
    <div data-enter v-if="cycleShowForm" class="quick-log" style="margin-bottom:10px;margin-top:-8px">
      <div class="log-row">
        <span>🌸 开始日</span>
        <input v-model="cycleForm.start" type="date" class="bh-input" style="flex:1" />
        <span>持续</span>
        <input v-model.number="cycleForm.duration" type="number" min="1" max="10" class="bh-input" style="width:50px" />
        <span>天</span>
        <button class="bh-btn" @click="logCycle">记录</button>
      </div>
    </div>

    <!-- 搜索与筛选 -->
    <div data-enter class="gh-search-bar">
      <input v-model="searchQuery" class="gh-search-input" placeholder="搜索记录..." />
      <select v-model="filterType" class="gh-filter-select">
        <option value="">全部类型</option>
        <option value="sleep">睡眠</option>
        <option value="exercise">运动</option>
        <option value="meal">饮食</option>
      </select>
    </div>

    <!-- 植物卡片 -->
    <section data-enter class="plant-grid">
      <div class="plant-card" :style="sleepPlantStyle" @click="showDetail='sleep'">
        <div class="plant-visual">{{sleepPlantIcon}}</div><span class="plant-name">睡眠树</span><span class="plant-stat">{{sleepAvg}}h 均值</span>
        <div class="plant-effect" v-if="sleepEffect" :style="{color:sleepEffect.color}">{{sleepEffect.text}}</div>
      </div>
      <div class="plant-card" :style="exercisePlantStyle" @click="showDetail='exercise'">
        <div class="plant-visual">{{exercisePlantIcon}}</div><span class="plant-name">运动藤</span><span class="plant-stat">{{exerciseWeek}}分/周</span>
        <div class="plant-effect" v-if="exerciseEffect" :style="{color:exerciseEffect.color}">{{exerciseEffect.text}}</div>
      </div>
      <div class="plant-card" :style="mealPlantStyle" @click="showDetail='meal'">
        <div class="plant-visual">{{mealPlantIcon}}</div><span class="plant-name">饮食园</span><span class="plant-stat">{{mealCount}} 次记录</span>
        <div class="plant-effect" v-if="mealEffect" :style="{color:mealEffect.color}">{{mealEffect.text}}</div>
      </div>
      <div class="plant-card" :style="cyclePlantStyle" @click="cycleShowForm=!cycleShowForm">
        <div class="plant-visual">{{cyclePlantIcon}}</div><span class="plant-name">周期花</span><span class="plant-stat">{{cyclePhase}}</span>
        <div class="plant-effect" v-if="cycleEffect" :style="{color:cycleEffect.color}">{{cycleEffect.text}}</div>
      </div>
    </section>

    <!-- 植物关联提示 -->
    <section data-enter class="plant-connections" v-if="connectionText">
      <span>🔗 {{connectionText}}</span>
    </section>

    <!-- 周趋势总览 -->
    <section data-enter class="chart-section">
      <h3 class="section-title">周趋势总览</h3>
      <div class="chart-legend">
        <span class="legend-item">睡眠(h)</span>
        <span class="legend-item">运动(分)</span>
        <span class="legend-item">饮食(次)</span>
      </div>
    </section>

    <!-- 睡眠分析：近7天柱状图 -->
    <section data-enter class="chart-section" v-if="sleepChartData.length > 0">
      <h3 class="section-title">😴 近7天睡眠</h3>
      <div class="bar-chart">
        <div class="bar-chart-yaxis">
          <span>10h</span><span>8h</span><span>6h</span><span>4h</span><span>2h</span><span>0</span>
        </div>
        <div class="bar-chart-body">
          <div class="bar-chart-gridlines">
            <div class="grid-line" style="bottom:100%"></div>
            <div class="grid-line" style="bottom:80%"></div>
            <div class="grid-line" style="bottom:60%"></div>
            <div class="grid-line" style="bottom:40%"></div>
            <div class="grid-line" style="bottom:20%"></div>
            <div class="grid-line" style="bottom:0%"></div>
          </div>
          <div class="bar-group">
            <div v-for="(item, idx) in sleepChartData" :key="idx" class="bar-column">
              <div class="bar-wrapper">
                <div
                  class="bar-fill"
                  :class="{ 'bar-low': item.hours < 6 }"
                  :style="{ height: (item.hours / 10) * 100 + '%' }"
                  :title="item.label + ' ' + item.hours + 'h'"
                >
                  <span class="bar-value">{{ item.hours.toFixed(1) }}</span>
                </div>
              </div>
              <span class="bar-label">{{ item.dayLabel }}</span>
            </div>
          </div>
          <!-- 6小时警戒线 -->
          <div class="bar-threshold-line" style="bottom:60%">
            <span class="bar-threshold-label">6h 警戒线</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 运动分析：近4周趋势 -->
    <section class="chart-section" v-if="exerciseChartData.length > 0">
      <h3 class="section-title">🏃 近4周运动趋势</h3>
      <div class="bar-chart">
        <div class="bar-chart-yaxis">
          <span>200</span><span>150</span><span>100</span><span>50</span><span>0</span>
        </div>
        <div class="bar-chart-body">
          <div class="bar-chart-gridlines">
            <div class="grid-line" style="bottom:100%"></div>
            <div class="grid-line" style="bottom:75%"></div>
            <div class="grid-line" style="bottom:50%"></div>
            <div class="grid-line" style="bottom:25%"></div>
            <div class="grid-line" style="bottom:0%"></div>
          </div>
          <div class="bar-group">
            <div v-for="(item, idx) in exerciseChartData" :key="idx" class="bar-column">
              <div class="bar-wrapper">
                <div
                  class="bar-fill bar-fill-exercise"
                  :class="{ 'bar-achieved': item.minutes >= 150 }"
                  :style="{ height: Math.min((item.minutes / 200) * 100, 100) + '%' }"
                  :title="item.weekLabel + ' ' + item.minutes + '分'"
                >
                  <span class="bar-value">{{ item.minutes }}</span>
                </div>
              </div>
              <span class="bar-label">{{ item.weekLabel }}</span>
            </div>
          </div>
          <!-- WHO 150分钟推荐线 -->
          <div class="bar-threshold-line" style="bottom:75%">
            <span class="bar-threshold-label">WHO 150分</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 饮食记录分析 -->
    <section class="meal-section" v-if="mealLogs.length > 0">
      <h3 class="section-title">🍽 饮食记录</h3>
      <div class="meal-tags">
        <span class="meal-tag meal-tag-healthy">健康 {{ mealHealthyCount }}</span>
        <span class="meal-tag meal-tag-normal">普通 {{ mealNormalCount }}</span>
        <span class="meal-tag meal-tag-indulgent">放纵 {{ mealIndulgentCount }}</span>
      </div>
      <div class="meal-summary">
        <p class="meal-summary-text">
          最近饮食：
          <template v-for="(m, idx) in recentMeals" :key="idx">
            <span :class="'meal-type-badge meal-type-' + m.classify">{{ m.note }}</span>
            <template v-if="idx < recentMeals.length - 1"> · </template>
          </template>
        </p>
        <p class="meal-insight" v-if="mealInsightText">{{ mealInsightText }}</p>
      </div>
    </section>

    <!-- 周期历史记录 -->
    <section class="cycle-section" v-if="cycleRecord.history.length > 0">
      <h3 class="section-title">🌸 周期历史</h3>
      <div class="cycle-history-list">
        <div v-for="(c, idx) in sortedCycleHistory" :key="idx" class="cycle-history-item">
          <span class="cycle-h-date">{{ c.start }}</span>
          <span class="cycle-h-duration">{{ c.duration }} 天</span>
          <span class="cycle-h-interval" v-if="idx < sortedCycleHistory.length - 1">
            间隔 {{ cycleIntervals[idx] }} 天
          </span>
        </div>
      </div>
      <div class="cycle-insight" v-if="cycleInsightText">
        <span>{{ cycleInsightText }}</span>
      </div>
    </section>

    <!-- 身体三环（P2 收口面板） -->
    <BodyRingsPanel />

    <!-- 营养计算（body 模块，原已实现但未挂载） -->
    <NutritionPanel />

    <!-- 营养分析（body/meal-nutrition 模块，饮食记录 → 营养评分） -->
    <MealNutritionPanel :logs="logs" />

    <!-- 近期记录 -->
    <section class="recent-logs" v-if="recentLogs.length">
      <h3 class="section-title">📜 近期记录</h3>
      <div v-for="l in recentLogs" :key="l.id" class="log-item"><span>{{l.icon}}</span><span>{{l.text}}</span><span class="log-time">{{l.time}}</span></div>
    </section>
    <div v-if="recentLogs.length===0" class="empty-state"><span>🌱</span><p>温室还是空的</p></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storage } from '../engine/storage'
import { useHealth } from '../resonance/bridges/health'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useHealthDashboard } from '../modules/body'
import BodyRingsPanel from '../components/BodyRingsPanel.vue'
import NutritionPanel from '../components/NutritionPanel.vue'
import MealNutritionPanel from '../components/MealNutritionPanel.vue'
import { usePerceptionStore } from '../stores/perception'

const { entranceRef, entranceClass } = useViewEntrance()

// ---- F7 呼吸跟随引导：纯 CSS 动画，可关闭，尊重减弱动效 ----
const breathGuideVisible = ref(storage.getKV<boolean>('hf:greenhouse_guide', true))
watch(breathGuideVisible, (v) => storage.setKV('hf:greenhouse_guide', v))

// ---- 健康仪表盘模块集成 ----
const healthDashboard = useHealthDashboard()

const dashboardSummary = computed(() => {
  const d = healthDashboard.dashboard.value
  return {
    overallScore: d.overallScore,
    achievementRate: d.achievementRate,
    greenhouseHealth: d.greenhouseHealth,
    streak: d.streak,
    activeGoals: d.activeGoals.length,
  }
})

const health = useHealth()
const { bodyLogs: logs, thisWeekSleepAvg: sleepAvgNum } = health

// 蓝图13:1106 身体温室↔情绪花房 互指：身体疲惫（温室健康<60% 或连续记录中断）时，
// 以非侵入的温和卡片引向情绪花房，不评判、不催促。
const router = useRouter()
const showBodyEmotionLink = computed(
  () => dashboardSummary.value.greenhouseHealth < 60 || dashboardSummary.value.streak === 0,
)
function goEmotionGarden() { router.push('/garden') }

// ---- P2 感知层：环境感知健康洞察 ----
const perceptionStore = usePerceptionStore()
const perceptionEnv = computed(() => perceptionStore.environment)

/** 感知层健康趋势摘要（脱敏） */
const healthTrendHint = computed(() => {
  const hs = perceptionEnv.value.healthSummary
  if (!hs || !hs.lastSynced) return null
  const parts: string[] = []
  if (hs.stepsTrend === 'more') parts.push('今日步数多于昨日')
  else if (hs.stepsTrend === 'less') parts.push('今日步数少于昨日')
  if (hs.sleepTrend === 'longer') parts.push('睡眠时间比昨日长')
  else if (hs.sleepTrend === 'shorter') parts.push('睡眠时间比昨日短')
  if (hs.heartRateTrend === 'lower') parts.push('心率趋于平稳')
  else if (hs.heartRateTrend === 'higher') parts.push('心率略有升高')
  if (parts.length === 0) return null
  return parts.join('；')
})

/** 感知层时段上下文 */
const timeOfDayHint = computed(() => {
  const tod = perceptionEnv.value.timeOfDay
  switch (tod) {
    case 'morning': return '晨间是身体苏醒的黄金时间，一杯温水 + 轻柔拉伸'
    case 'afternoon': return '午后血糖波动，短暂散步有助于恢复精力'
    case 'evening': return '晚间运动应安排在睡前2小时以上'
    case 'night': return '深夜了，身体需要安静下来准备入睡'
    default: return null
  }
})

/** 是否有感知数据可展示 */
const hasPerceptionContext = computed(() =>
  healthTrendHint.value !== null || perceptionEnv.value.ambientLight !== null
)
function addLog(type: string, value: Record<string, any>) { health.addBodyLog(type as any, value) }

const sleepForm = ref({ hours: 7 })
const exerciseForm = ref({ minutes: 30, type: '' })
const mealForm = ref({ note: '' })
const showDetail = ref('')
const cycleShowForm = ref(false)
const cycleForm = ref({ start: new Date().toISOString().slice(0, 10), duration: 5 })

function logSleep() {
  if (sleepForm.value.hours > 0) { addLog('sleep', { hours: sleepForm.value.hours }); sleepForm.value.hours = 7 }
}
function logExercise() {
  if (exerciseForm.value.minutes > 0) { addLog('exercise', { minutes: exerciseForm.value.minutes, type: exerciseForm.value.type || '运动' }); exerciseForm.value.minutes = 30; exerciseForm.value.type = '' }
}
function logMeal() {
  if (mealForm.value.note.trim()) { addLog('meal', { note: mealForm.value.note }); mealForm.value.note = '' }
}

const cycleRecord = computed(() => health.cycleData.value)
function logCycle() {
  const v = cycleForm.value; if (!v.start) return
  health.logCycle(v.start, v.duration || 5)
  cycleShowForm.value = false
}

const searchQuery = ref('')
const filterType = ref('')

// ---- 统计概览 ----
const totalRecords = computed(() => logs.value.length)
const thisWeekExercise = health.thisWeekExerciseMinutes

// ---- 睡眠 ----
const sleepAvg = computed(() => {
  const v = sleepAvgNum.value; return v > 0 ? v.toFixed(1) : '--'
})

/** 睡眠柱状图：近7天，每天取平均值 */
const sleepChartData = computed(() => {
  const sleepLogs = logs.value.filter(l => l.type === 'sleep')
  if (!sleepLogs.length) return []
  const days: { label: string; dayLabel: string; hours: number; count: number }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayLogs = sleepLogs.filter(l => l.at.slice(0, 10) === dateStr)
    const total = dayLogs.reduce((a, l) => a + (l.value.hours || 0), 0)
    const avg = dayLogs.length > 0 ? total / dayLogs.length : 0
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六']
    days.push({
      label: dateStr,
      dayLabel: dayLabels[d.getDay()],
      hours: avg,
      count: dayLogs.length,
    })
  }
  return days
})

const sleepPlantIcon = computed(() => {
  const a = sleepAvgNum.value; if (a <= 0) return '🌱'
  if (a >= 7.5) return '🌳'; if (a >= 6) return '🌿'; return '🍂'
})
const sleepPlantStyle = computed(() => {
  const a = sleepAvgNum.value
  return { opacity: a <= 0 ? 0.5 : 0.6 + Math.min(a / 10, 0.4), filter: a > 0 && a < 5 ? 'saturate(0.5)' : 'none' }
})

// ---- 运动 ----
const recentExercise = computed(() => logs.value.filter(l => l.type === 'exercise').slice(0, 30))
const exerciseWeek = computed(() => recentExercise.value.reduce((a, l) => a + (l.value.minutes || 0), 0))

/** 近4周运动趋势：按 ISO 周分组 */
const exerciseChartData = computed(() => {
  const exLogs = logs.value.filter(l => l.type === 'exercise')
  if (!exLogs.length) return []
  function getWeekNumber(d: Date): number {
    const temp = new Date(d.valueOf())
    const dayNum = (d.getDay() + 6) % 7
    temp.setDate(temp.getDate() - dayNum + 3)
    const firstThursday = temp.valueOf()
    temp.setMonth(0, 1)
    if (temp.getDay() !== 4) { temp.setMonth(0, 1 + ((4 - temp.getDay()) + 7) % 7) }
    return 1 + Math.ceil((firstThursday - temp.valueOf()) / 604800000)
  }
  const now = new Date()
  const currentWeek = getWeekNumber(now)
  const currentYear = now.getFullYear()
  const weeks: { weekKey: string; weekLabel: string; minutes: number }[] = []
  for (let i = 3; i >= 0; i--) {
    const targetWeek = currentWeek - i
    const weekKey = `${currentYear}-W${String(targetWeek).padStart(2, '0')}`
    const weekLogs = exLogs.filter(l => {
      const d = new Date(l.at)
      return getWeekNumber(d) === targetWeek && d.getFullYear() === currentYear
    })
    const total = weekLogs.reduce((a, l) => a + (l.value.minutes || 0), 0)
    weeks.push({ weekKey, weekLabel: `W${targetWeek}`, minutes: total })
  }
  return weeks
})

const exercisePlantIcon = computed(() => {
  const w = exerciseWeek.value
  if (w >= 150) return '🌿'; if (w >= 60) return '🌱'; return '🪴'
})
const exercisePlantStyle = computed(() => ({ opacity: 0.5 + Math.min(exerciseWeek.value / 300, 0.5) }))

// ---- 饮食 ----
const mealLogs = computed(() => logs.value.filter(l => l.type === 'meal'))
const mealCount = computed(() => mealLogs.value.length)

/** 饮食类型分类 */
function classifyMeal(note: string): 'healthy' | 'normal' | 'indulgent' {
  const h = ['沙拉', '蔬菜', '水果', '鸡胸肉', '鱼', '全麦', '燕麦', '坚果', '牛油果', '藜麦', '羽衣甘蓝', '蛋白', '轻食', '水煮', '蒸', '清炒']
  const ind = ['炸鸡', '汉堡', '披萨', '奶茶', '蛋糕', '烧烤', '火锅', '油炸', '薯条', '可乐', '冰淇淋', '巧克力', '辣条', '泡面', '外卖']
  const lower = note.toLowerCase()
  for (const kw of ind) { if (lower.includes(kw)) return 'indulgent' }
  for (const kw of h) { if (lower.includes(kw)) return 'healthy' }
  return 'normal'
}

const mealHealthyCount = computed(() => mealLogs.value.filter(l => classifyMeal(l.value.note || '') === 'healthy').length)
const mealNormalCount = computed(() => mealLogs.value.filter(l => classifyMeal(l.value.note || '') === 'normal').length)
const mealIndulgentCount = computed(() => mealLogs.value.filter(l => classifyMeal(l.value.note || '') === 'indulgent').length)

const recentMeals = computed(() =>
  mealLogs.value.slice(0, 5).map(l => ({ note: l.value.note || '', classify: classifyMeal(l.value.note || '') }))
)

const mealInsightText = computed(() => {
  const h = mealHealthyCount.value; const ind = mealIndulgentCount.value; const total = mealCount.value
  if (total === 0) return ''
  const hPct = Math.round((h / total) * 100)
  const indPct = Math.round((ind / total) * 100)
  if (hPct >= 60) return '饮食结构以健康食材为主，继续保持'
  if (indPct >= 50) return '放纵饮食占比较高，可以尝试加入更多蔬果'
  if (hPct >= 30) return '饮食搭配比较均衡'
  return '可以多记录一些健康饮食选择'
})

const mealPlantIcon = computed(() => {
  const c = mealCount.value
  if (c > 20) return '🌻'; if (c > 5) return '🌱'; return '🪴'
})
const mealPlantStyle = computed(() => ({ opacity: 0.5 + Math.min(mealCount.value / 40, 0.5) }))

// ---- 周期 ----
const cyclePlantIcon = computed(() => {
  if (!cycleRecord.value.lastStart) return '🌸'
  const now = Date.now(); const start = new Date(cycleRecord.value.lastStart).getTime()
  const daysSince = Math.floor((now - start) / 86400000); const dur = cycleRecord.value.lastDuration
  if (daysSince < 0) return '🌸'; if (daysSince <= dur) return '🌺'
  if (daysSince <= dur + 7) return '🌷'; return '🌸'
})
const cyclePhase = computed(() => {
  if (!cycleRecord.value.lastStart) return '待记录'
  const now = Date.now(); const start = new Date(cycleRecord.value.lastStart).getTime()
  const daysSince = Math.floor((now - start) / 86400000); const dur = cycleRecord.value.lastDuration
  if (daysSince < 0) return '即将开始'
  if (daysSince <= dur) return `第${daysSince + 1}/${dur}天`
  if (daysSince <= dur + 7) return '休息期'
  return '待记录'
})
const cyclePlantStyle = computed(() => {
  if (!cycleRecord.value.lastStart) return { opacity: 0.5 }
  return { opacity: 0.7 }
})

const sortedCycleHistory = computed(() => {
  return [...cycleRecord.value.history].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
})

const cycleIntervals = computed(() => {
  const h = sortedCycleHistory.value
  const intervals: number[] = []
  for (let i = 0; i < h.length - 1; i++) {
    const curr = new Date(h[i].start).getTime()
    const next = new Date(h[i + 1].start).getTime()
    const diff = Math.round((curr - next) / 86400000)
    intervals.push(diff)
  }
  return intervals
})

const cycleInsightText = computed(() => {
  const intervals = cycleIntervals.value
  if (intervals.length === 0) return ''
  const avg = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
  if (avg >= 25 && avg <= 35) return `周期规律，平均间隔 ${avg} 天`
  if (avg > 35) return `周期偏长，平均间隔 ${avg} 天`
  return `周期平均间隔 ${avg} 天`
})

const cycleEffect = computed(() => {
  if (!cycleRecord.value.lastStart) return null
  const intervals = cycleIntervals.value
  if (intervals.length >= 2) {
    const avg = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    if (avg >= 25 && avg <= 35) return { text: '🌸 周期规律', color: '#34d399' }
  }
  return null
})

// ---- 植物关联分析 ----
const sleepEffect = computed(() => {
  const a = sleepAvgNum.value
  if (a <= 0) return null
  if (a < 5) return { text: '🍂 睡眠不足', color: '#c05050' }
  if (a < 6.5) return { text: '🌿 需要更多休息', color: '#f0c040' }
  return { text: '🌳 状态良好', color: '#34d399' }
})
const exerciseEffect = computed(() => {
  const w = exerciseWeek.value
  if (w < 30) return { text: '🪴 运动偏少', color: '#f0c040' }
  if (w >= 150) return { text: '🌿 活力充沛', color: '#34d399' }
  return null
})
const mealEffect = computed(() => {
  const h = mealHealthyCount.value; const total = mealCount.value
  if (total === 0) return null
  const pct = Math.round((h / total) * 100)
  if (pct >= 60) return { text: '🥗 饮食健康', color: '#34d399' }
  if (pct <= 20 && total > 3) return { text: '🍕 偏重口味', color: '#f0c040' }
  return null
})

const connectionText = computed(() => {
  const parts: string[] = []
  const s = sleepAvgNum.value; const e = exerciseWeek.value
  const mHealthy = mealHealthyCount.value; const mTotal = mealCount.value
  if (!isNaN(s) && s < 6 && e < 30) parts.push('睡眠不足可能影响了运动意愿')
  if (!isNaN(s) && s < 5 && mTotal < 5) parts.push('睡眠和饮食都需要关注')
  if (!isNaN(s) && s >= 7 && e >= 100) parts.push('睡眠充足，运动活跃——身体在良性循环')
  if (!isNaN(s) && s >= 7 && mHealthy > 0 && mHealthy >= mTotal * 0.5) parts.push('良好睡眠 + 健康饮食，身体状态正在改善')
  if (e >= 100 && mTotal > 0 && mHealthy >= mTotal * 0.4) parts.push('运动配合健康饮食，效果最佳')
  if (!isNaN(s) && s >= 7 && e >= 150) parts.push('运动量达标且睡眠充足——这是理想的身体节奏')
  if (e >= 60 && !isNaN(s) && s >= 6.5) parts.push('运动后睡眠质量有所提升，身心在正向循环')
  if (mTotal > 0 && mHealthy >= mTotal * 0.6 && !isNaN(s) && s >= 7) parts.push('饮食和睡眠都很好，身体能量管理优秀')
  return parts[0] || ''
})

// ---- 近期记录 ----
const recentLogs = computed(() =>
  logs.value
    .filter(l => {
      if (filterType.value && l.type !== filterType.value) return false
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        if (l.type === 'sleep' && !String(l.value.hours).includes(q)) return false
        if (l.type === 'exercise' && !(l.value.type || '').toLowerCase().includes(q) && !String(l.value.minutes).includes(q)) return false
        if (l.type === 'meal' && !(l.value.note || '').toLowerCase().includes(q)) return false
      }
      return true
    })
    .slice(0, 10).map(l => {
      const d = new Date(l.at)
      const time = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      if (l.type === 'sleep') return { id: l.id, icon: '😴', text: `睡眠 ${l.value.hours}h`, time }
      if (l.type === 'exercise') return { id: l.id, icon: '🏃', text: `${l.value.type || '运动'} ${l.value.minutes}分钟`, time }
      return { id: l.id, icon: '🍽', text: l.value.note, time }
    })
)
</script>

<style scoped>
/* ===== 深夜食堂 · 暖琥珀主题 ===== */
:root {
  --amber-accent: var(--accent);
  --amber-text: var(--text-high);
  --amber-text-secondary: var(--text-secondary);
  --amber-text-muted: var(--text-secondary);
  --amber-border: rgba(var(--accent-rgb), 0.12);
  --amber-card-bg: var(--bg-card);
  --amber-card-hover: rgba(55, 48, 40, 0.7);
  --amber-bg-start: var(--bg-primary);
  --amber-bg-mid1: var(--bg-deep);
  --amber-bg-mid2: var(--bg-surface-alt);
  --amber-bg-end: var(--bg-deepest);
}

.greenhouse {
  max-width: 500px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100%;
  overflow-y: auto;
  background: transparent;
  color: var(--amber-text);
}

/* ===== 装饰性头部 ===== */
.gh-header {
  text-align: center;
  margin-bottom: 28px;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.orn-line {
  display: block;
  width: 50px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);
}
.orn-diamond {
  font-size: 8px;
  color: var(--accent);
  opacity: 0.35;
}
.gh-kicker {
  font-size: 11px;
  color: var(--amber-text-secondary);
  letter-spacing: 3px;
  margin: 0 0 8px 0;
  font-weight: 400;
}
.gh-title {
  font-size: 26px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 4px;
  margin: 0;
  color: var(--amber-text);
}

.section-title {
  font-size: 14px;
  color: var(--amber-text-secondary);
  margin-bottom: 10px;
}

/* ===== 统计概览 ===== */
.overview-section { margin-bottom: 20px; }
.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.overview-card {
  padding: 14px 10px;
  border-radius: 14px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
  transition: background 0.3s, border-color 0.3s;
}
.overview-card:hover {
  background: var(--amber-card-hover);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.ov-label { font-size: 10px; color: var(--amber-text-muted); }
.ov-value { font-size: 20px; font-weight: 500; color: var(--amber-text); }
.ov-value small { font-size: 12px; font-weight: 400; opacity: 0.6; }
.ov-note { font-size: 10px; color: var(--amber-text-muted); }
.ov-note-good { color: var(--success); }
.ov-note-mid { color: var(--warning); }
.ov-note-warn { color: #c05050; }

/* ===== 快速记录 (bh- 前缀) ===== */
.quick-log {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 14px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
}
.log-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--amber-text-secondary);
}
.log-row span { min-width: 60px; }
.bh-input {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid var(--amber-border);
  border-radius: 6px;
  background: rgba(var(--text-primary-rgb), 0.03);
  color: var(--amber-text);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.25s;
}
.bh-input:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}
.bh-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.25s, border-color 0.25s;
}
.bh-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.45);
}

/* ===== 植物卡片 ===== */
.plant-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.plant-card {
  text-align: center;
  padding: 18px;
  border-radius: 14px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}
.plant-card:hover {
  background: var(--amber-card-hover);
  border-color: rgba(var(--accent-rgb), 0.25);
  box-shadow: 0 2px 16px rgba(var(--accent-rgb), 0.06);
}
.plant-visual { font-size: 32px; }
.plant-name { font-size: 13px; font-weight: 500; color: var(--amber-text); }
.plant-stat { font-size: 11px; color: var(--amber-text-muted); }
.plant-effect { font-size: 10px; margin-top: 2px; }

/* ===== 植物关联 ===== */
.plant-connections {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  font-size: 12px;
  color: var(--amber-text-secondary);
  margin-bottom: 16px;
}

/* ===== 图表通用 ===== */
.chart-section {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 14px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
}
.bar-chart { display: flex; gap: 6px; height: 160px; position: relative; }
.bar-chart-yaxis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 28px;
  flex-shrink: 0;
  font-size: 9px;
  color: var(--amber-text-muted);
  text-align: right;
  padding-right: 4px;
  padding-bottom: 20px;
}
.bar-chart-body { flex: 1; position: relative; display: flex; align-items: flex-end; }
.bar-chart-gridlines { position: absolute; inset: 0; bottom: 20px; }
.grid-line { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.05); }
.bar-group { display: flex; align-items: flex-end; gap: 6px; height: 100%; width: 100%; padding-bottom: 20px; position: relative; z-index: 2; }
.bar-column { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.bar-wrapper { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.bar-fill {
  width: 60%;
  max-width: 28px;
  min-height: 2px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.7), rgba(var(--accent-rgb), 0.3));
  transition: height 0.4s;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.bar-fill.bar-low {
  background: linear-gradient(180deg, rgba(192,80,80,0.7), rgba(192,80,80,0.3));
}
.bar-fill-exercise {
  background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.7), rgba(var(--accent-rgb), 0.3));
}
.bar-fill-exercise.bar-achieved {
  background: linear-gradient(180deg, rgba(52,211,153,0.9), rgba(52,211,153,0.5));
}
.bar-value { position: absolute; top: -16px; font-size: 9px; color: var(--amber-text-muted); white-space: nowrap; }
.bar-label { font-size: 10px; color: var(--amber-text-muted); margin-top: 4px; }
.bar-threshold-line { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed rgba(240,192,64,0.4); z-index: 1; }
.bar-threshold-label { position: absolute; right: 0; top: -14px; font-size: 8px; color: rgba(240,192,64,0.4); white-space: nowrap; }

/* ===== 饮食记录 ===== */
.meal-section {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 14px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
}
.meal-tags { display: flex; gap: 8px; margin-bottom: 10px; }
.meal-tag { padding: 4px 10px; border-radius: 20px; font-size: 11px; }
.meal-tag-healthy { background: rgba(52,211,153,0.12); color: var(--success); border: 1px solid rgba(52,211,153,0.2); }
.meal-tag-normal { background: rgba(var(--text-primary-rgb), 0.04); color: var(--amber-text-secondary); border: 1px solid var(--amber-border); }
.meal-tag-indulgent { background: rgba(240,192,64,0.12); color: var(--warning); border: 1px solid rgba(240,192,64,0.2); }
.meal-summary-text { font-size: 12px; line-height: 1.7; color: var(--amber-text-secondary); }
.meal-type-badge { display: inline; }
.meal-type-healthy { color: var(--success); }
.meal-type-normal { color: var(--amber-text-secondary); }
.meal-type-indulgent { color: var(--warning); }
.meal-insight { font-size: 11px; color: var(--amber-text-muted); margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(var(--accent-rgb), 0.06); }

/* ===== 周期历史 ===== */
.cycle-section {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 14px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
}
.cycle-history-list { display: flex; flex-direction: column; gap: 6px; }
.cycle-history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--amber-border);
  font-size: 12px;
}
.cycle-history-item:last-child { border-bottom: none; }
.cycle-h-date { color: var(--amber-text-secondary); min-width: 80px; }
.cycle-h-duration { color: var(--amber-text-muted); }
.cycle-h-interval { margin-left: auto; font-size: 11px; color: rgba(var(--accent-rgb), 0.5); }
.cycle-insight { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(var(--accent-rgb), 0.06); font-size: 11px; color: rgba(52,211,153,0.6); }

/* ===== 近期记录 ===== */
.recent-logs { margin-bottom: 16px; }
.recent-logs h3 { font-size: 14px; margin-bottom: 10px; color: var(--amber-text-secondary); }
.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
  font-size: 13px;
  color: var(--amber-text-secondary);
}
.log-item span:first-child { font-size: 16px; }
.log-time { margin-left: auto; font-size: 11px; opacity: 0.4; }
.empty-state { text-align: center; padding: 60px 0; color: var(--amber-text-muted); }
.empty-state span { font-size: 40px; display: block; margin-bottom: 8px; }

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .greenhouse {
    padding: 28px 16px 80px;
  }

  .gh-title {
    font-size: 22px;
    letter-spacing: 3px;
  }

  .gh-kicker {
    font-size: 10px;
    letter-spacing: 2px;
  }

  .header-ornament {
    gap: 8px;
    margin-bottom: 10px;
  }

  .orn-line {
    width: 36px;
  }

  .section-title {
    font-size: 13px;
  }

  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .overview-card {
    padding: 10px 8px;
    border-radius: 12px;
  }

  .ov-value {
    font-size: 18px;
  }

  .ov-label {
    font-size: 9px;
  }

  .ov-note {
    display: none;
  }

  .quick-log {
    padding: 12px;
  }

  .log-row {
    flex-wrap: wrap;
    gap: 6px;
  }

  .log-row span {
    min-width: 50px;
    font-size: 12px;
  }

  .bh-input {
    width: 56px;
    padding: 4px 6px;
    font-size: 11px;
  }

  .bh-btn {
    padding: 5px 10px;
    font-size: 11px;
  }

  .plant-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .plant-card {
    padding: 14px;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    text-align: left;
    min-height: 48px;
  }

  .plant-visual {
    font-size: 24px;
    flex-shrink: 0;
  }

  .plant-name {
    font-size: 12px;
  }

  .plant-stat {
    font-size: 10px;
    margin-left: auto;
  }

  .plant-effect {
    display: none;
  }

  .chart-section {
    padding: 12px;
  }

  .bar-chart {
    height: 120px;
  }

  .bar-chart-yaxis {
    width: 20px;
    font-size: 8px;
  }

  .bar-label {
    font-size: 9px;
  }

  .bar-value {
    font-size: 8px;
    top: -12px;
  }

  .meal-section {
    padding: 12px;
  }

  .meal-tags {
    gap: 6px;
    flex-wrap: wrap;
  }

  .meal-tag {
    font-size: 10px;
  }

  .meal-summary-text {
    font-size: 11px;
  }

  .meal-insight {
    font-size: 10px;
  }

  .cycle-section {
    padding: 12px;
  }

  .cycle-history-item {
    gap: 6px;
    font-size: 11px;
  }

  .cycle-h-date {
    min-width: 64px;
  }

  .cycle-h-interval {
    display: none;
  }
}

@media (max-width: 480px) {
  .greenhouse {
    padding: 24px 12px 80px;
  }

  .gh-title {
    font-size: 20px;
  }

  .header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 24px;
  }

  .orn-diamond {
    font-size: 6px;
  }

  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
  }

  .overview-card {
    padding: 8px 6px;
    min-height: 56px;
  }

  .ov-value {
    font-size: 16px;
  }

  .ov-label {
    font-size: 8px;
  }

  .log-row {
    gap: 4px;
  }

  .log-row span {
    min-width: 40px;
    font-size: 11px;
  }

  .bh-input {
    width: 48px;
    padding: 3px 5px;
    font-size: 10px;
  }

  .plant-card {
    padding: 10px;
    min-height: 40px;
  }

  .plant-visual {
    font-size: 20px;
  }

  .plant-name {
    font-size: 11px;
  }

  .plant-stat {
    font-size: 9px;
  }

  .chart-section {
    padding: 8px;
  }

  .bar-chart {
    height: 100px;
  }

  .bar-label {
    font-size: 8px;
  }
}

/* ===== F7 呼吸跟随引导 ===== */
.breath-guide {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 14px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
  text-align: center;
}
.bg-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.bg-title {
  font-size: 13px;
  color: var(--amber-text-secondary);
}
.bg-hide {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.bg-hide:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.4);
}
.bg-stage {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
}
.bg-circle {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 30%, rgba(var(--accent-rgb), 0.38), rgba(var(--accent-rgb), 0.12));
  border: 1px solid rgba(var(--accent-rgb), 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: breathe 8s ease-in-out infinite;
}
.bg-phase {
  position: absolute;
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 2px;
  opacity: 0;
}
.bg-phase-in { animation: phase-in 8s ease-in-out infinite; }
.bg-phase-out { animation: phase-out 8s ease-in-out infinite; }
.bg-hint {
  font-size: 11px;
  color: var(--amber-text-muted);
  margin: 10px 0 0;
  line-height: 1.6;
}
@keyframes breathe {
  0%   { transform: scale(0.62); }
  50%  { transform: scale(1); }
  100% { transform: scale(0.62); }
}
@keyframes phase-in {
  0%   { opacity: 1; }
  45%  { opacity: 1; }
  50%  { opacity: 0; }
  95%  { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes phase-out {
  0%   { opacity: 0; }
  50%  { opacity: 0; }
  55%  { opacity: 1; }
  95%  { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .bg-circle, .bg-phase-in, .bg-phase-out { animation: none; }
  .bg-phase-in { opacity: 1; }
  .bg-phase-out { opacity: 0; }
  .bg-circle { transform: scale(0.85); }
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .greenhouse { padding: 32px 20px 64px; }
  .overview-grid { gap: 8px; }
  .overview-card { padding: 12px 8px; }
  .plant-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .greenhouse { padding: 24px 14px 56px; }
  .overview-grid { flex-direction: column; }
  .section-title { font-size: 12px; }
}

.gh-search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.gh-search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--amber-border);
  border-radius: 8px;
  background: rgba(var(--text-primary-rgb), 0.03);
  color: var(--amber-text);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.gh-search-input:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}
.gh-filter-select {
  padding: 8px 12px;
  border: 1px solid var(--amber-border);
  border-radius: 8px;
  background: rgba(var(--text-primary-rgb), 0.03);
  color: var(--amber-text);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.gh-filter-select:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}
.chart-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}
.legend-item {
  font-size: 11px;
  color: var(--amber-text-muted);
}

/* ===== 健康仪表盘（模块集成） ===== */
.gh-dashboard-section { margin-bottom: 24px; position: relative; z-index: 1; }
.gh-dashboard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.gh-dashboard-card { padding: 12px 8px; border-radius: 10px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); text-align: center; }
.gh-dashboard-num { font-size: 18px; font-weight: 500; color: var(--accent); display: block; }
.gh-dashboard-num small { font-size: 11px; font-weight: 400; opacity: 0.6; margin-left: 2px; }
.gh-dashboard-label { font-size: 10px; color: rgba(var(--accent-rgb), 0.5); margin-top: 2px; display: block; }

@media (max-width: 640px) {
  .gh-dashboard-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ===== P2 感知层：环境感知卡片 ===== */
.perception-context {
  margin-bottom: 20px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: all 0.3s ease;
}

.perception-context:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.14);
}

/* ---- 身体↔情绪 互指（蓝图13:1106，非侵入） ---- */
.body-emotion-link {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(52, 211, 153, 0.06), rgba(52, 211, 153, 0.02));
  border: 1px solid rgba(52, 211, 153, 0.16);
}
.bel-icon { font-size: 20px; line-height: 1.4; }
.bel-body { flex: 1; }
.bel-line {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.7);
  margin: 0 0 10px;
}
.bel-btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid rgba(52, 211, 153, 0.3);
  background: rgba(52, 211, 153, 0.12);
  color: rgba(52, 211, 153, 0.92);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.bel-btn:hover { background: rgba(52, 211, 153, 0.2); }
.bh-link-fade-enter-active, .bh-link-fade-leave-active { transition: opacity 0.6s ease; }
.bh-link-fade-enter-from, .bh-link-fade-leave-to { opacity: 0; }

.pc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pc-icon {
  font-size: 14px;
  opacity: 0.6;
}

.pc-label {
  font-size: 11px;
  color: var(--amber-text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.pc-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pc-hint {
  font-size: 12px;
  color: var(--amber-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.pc-time-hint {
  font-size: 11px;
  color: var(--amber-text-muted);
  font-style: italic;
}
</style>