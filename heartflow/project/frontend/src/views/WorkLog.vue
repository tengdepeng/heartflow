<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance wl">
    <!-- 氛围背景层：更漏 · 时间织机 -->
    <div data-enter class="wl-ambient" aria-hidden="true">
      <div class="wl-glow wl-glow--top"></div>
      <div class="wl-glow wl-glow--bottom"></div>
      <!-- 时间齿轮 SVG 装饰 -->
      <div class="wl-gear-svg" aria-hidden="true">
        <svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="wlCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.06"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- 大齿轮 -->
          <g opacity="0.04" stroke="var(--accent)" stroke-width="0.8" fill="none" class="wl-gear wl-gear--big">
            <circle cx="480" cy="180" r="100"/>
            <circle cx="480" cy="180" r="80"/>
            <line x1="480" y1="80" x2="480" y2="280"/>
            <line x1="380" y1="180" x2="580" y2="180"/>
            <line x1="409" y1="109" x2="551" y2="251"/>
            <line x1="409" y1="251" x2="551" y2="109"/>
          </g>
          <!-- 小齿轮 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.6" fill="none" class="wl-gear wl-gear--small">
            <circle cx="120" cy="620" r="60"/>
            <circle cx="120" cy="620" r="45"/>
            <line x1="120" y1="560" x2="120" y2="680"/>
            <line x1="60" y1="620" x2="180" y2="620"/>
            <line x1="78" y1="578" x2="162" y2="662"/>
            <line x1="78" y1="662" x2="162" y2="578"/>
          </g>
          <!-- 中心光晕 -->
          <circle cx="300" cy="400" r="250" fill="url(#wlCoreGlow)"/>
          <!-- 漂浮时间粒子 -->
          <g fill="var(--accent)" opacity="0.06">
            <circle cx="200" cy="150" r="1.5" class="wl-particle wl-particle--1"/>
            <circle cx="450" cy="300" r="1" class="wl-particle wl-particle--2"/>
            <circle cx="100" cy="400" r="2" class="wl-particle wl-particle--3"/>
            <circle cx="500" cy="500" r="1.5" class="wl-particle wl-particle--4"/>
            <circle cx="300" cy="650" r="1" class="wl-particle wl-particle--5"/>
            <circle cx="80" cy="250" r="1.2" class="wl-particle wl-particle--6"/>
            <circle cx="520" cy="100" r="1.8" class="wl-particle wl-particle--7"/>
            <circle cx="350" cy="200" r="1" class="wl-particle wl-particle--8"/>
          </g>
        </svg>
      </div>
    </div>

    <header data-enter class="wl-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">记录工作的时间与价值</p>
      <h1 class="wl-title">更漏</h1>
    </header>

    <!-- 快速记录 -->
    <section data-enter class="wl-quick-section">
      <div class="wl-quick-record">
        <div class="wl-record-row">
          <input v-model="form.date" type="date" class="wl-date" />
          <select v-model="form.type" class="wl-select">
            <option value="regular">常规班次</option>
            <option value="night">夜班</option>
            <option value="overtime">加班</option>
          </select>
          <input v-model="form.start" type="time" class="wl-time" />
          <span>→</span>
          <input v-model="form.end" type="time" class="wl-time" />
          <button class="wl-btn" :disabled="!formValid" @click="addShift">记录</button>
        </div>
        <div class="wl-record-row">
          <input v-model="form.note" placeholder="备注（可选）" class="wl-note-input" maxlength="60" />
        </div>
        <div class="wl-rate-row">
          <span>时薪 ¥</span>
          <input v-model.number="hourlyRate" type="number" min="0" class="wl-rate-input" />
          <span class="wl-est-pay" v-if="hourlyRate > 0">估计月薪: ¥{{ estMonthly.toLocaleString() }}</span>
        </div>
        <div v-if="formError" class="wl-form-error">{{ formError }}</div>
      </div>
    </section>

    <!-- 统计概览 -->
    <section class="wl-stats-section">
      <div class="wl-stat-card">
        <span class="wl-stat-value">{{ statsOverview.totalShifts }}</span>
        <span class="wl-stat-label">总班次</span>
      </div>
      <div class="wl-stat-card">
        <span class="wl-stat-value">{{ statsOverview.totalHours }}h</span>
        <span class="wl-stat-label">总工时</span>
      </div>
      <div class="wl-stat-card">
        <span class="wl-stat-value">{{ statsOverview.monthHours }}h</span>
        <span class="wl-stat-label">本月工时</span>
      </div>
    </section>

    <!-- 搜索筛选栏 -->
    <section class="wl-filter-section" v-if="shifts.length > 0">
      <div class="wl-filter-bar">
        <div class="wl-filter-group">
          <label class="wl-filter-label">日期范围</label>
          <div class="wl-filter-date-range">
            <input v-model="filter.dateFrom" type="date" class="wl-filter-date" />
            <span>—</span>
            <input v-model="filter.dateTo" type="date" class="wl-filter-date" />
          </div>
        </div>
        <div class="wl-filter-group">
          <label class="wl-filter-label">班次类型</label>
          <div class="wl-filter-types">
            <button
              v-for="t in filterTypes"
              :key="t.value"
              :class="['wl-filter-type-btn', { active: filter.type === t.value }]"
              @click="filter.type = t.value"
            >{{ t.label }}</button>
          </div>
        </div>
        <button class="wl-filter-clear" @click="clearFilter" v-if="hasActiveFilter">清除筛选</button>
      </div>
      <div class="wl-filter-summary" v-if="hasActiveFilter">
        筛选结果: {{ filteredShifts.length }} 条记录
      </div>
    </section>

    <!-- 工时分布图 -->
    <section class="wl-chart-section" v-if="shifts.length > 0">
      <h3>近 30 日工时分布</h3>
      <div class="wl-chart-container">
        <div class="wl-chart-bars">
          <div
            v-for="d in dailyHours30"
            :key="d.date"
            class="wl-chart-bar-wrap"
            :title="`${d.date}: ${d.hours}h`"
          >
            <div
              class="wl-chart-bar"
              :style="{ height: maxDailyHours > 0 ? (d.hours / maxDailyHours) * 100 + '%' : '0%' }"
              :class="{ 'wl-bar-today': d.isToday }"
            ></div>
            <span class="wl-chart-label">{{ d.dayLabel }}</span>
          </div>
          <!-- 平均线 -->
          <div class="wl-avg-line" :style="{ bottom: avgHours30 > 0 && maxDailyHours > 0 ? (avgHours30 / maxDailyHours) * 100 + '%' : '0%' }">
            <span class="wl-avg-label">{{ avgHours30.toFixed(1) }}h</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 班次类型分析 -->
    <section class="wl-type-section" v-if="shifts.length > 0">
      <h3>班次类型分析</h3>
      <div class="wl-type-analysis">
        <div v-for="item in typeStats" :key="item.type" class="wl-type-row">
          <span class="wl-type-name">{{ item.label }}</span>
          <div class="wl-type-bar-bg">
            <div class="wl-type-bar-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
          </div>
          <span class="wl-type-count">{{ item.count }}次</span>
          <span class="wl-type-percent">{{ item.percent }}%</span>
        </div>
      </div>
    </section>

    <!-- 工时年轮 -->
    <section class="wl-ring-section" v-if="shifts.length > 0">
      <div class="wl-annual-ring">
        <h3>工时年轮</h3>
        <div class="wl-ring-visual">
          <div v-for="(m, idx) in monthlyRings" :key="m.month" class="wl-ring-circle"
            :style="{
              width: `${40 + idx * 28}px`, height: `${40 + idx * 28}px`,
              borderColor: m.color, opacity: 0.3 + (m.hours / Math.max(...monthlyRings.map(x=>x.hours), 1)) * 0.5,
              borderWidth: `${1 + (m.hours / Math.max(...monthlyRings.map(x=>x.hours), 1)) * 3}px`
            }">
            <span class="wl-ring-label">{{ m.month }}月</span>
            <span class="wl-ring-hours">{{ m.hours }}h</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 光仪编织 (Sundial Weaving) ===== -->
    <section class="wl-sundial-section" v-if="shifts.length > 0">
      <h3>光仪编织</h3>
      <div class="wl-sundial-wrap">
        <svg class="wl-sundial-svg" viewBox="0 0 240 240">
          <defs>
            <radialGradient id="sundialGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <filter id="trailGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- 背景光晕 -->
          <circle cx="120" cy="120" r="110" fill="url(#sundialGlow)"/>
          <!-- 外圈、中圈、内圈三个同心圆 -->
          <circle class="wl-sundial-circle" cx="120" cy="120" r="108" />
          <circle class="wl-sundial-circle" cx="120" cy="120" r="72" />
          <circle class="wl-sundial-circle" cx="120" cy="120" r="36" />
          <!-- 刻度标记（12个刻度点） -->
          <g opacity="0.08" stroke="var(--accent)" stroke-width="0.5">
            <line v-for="h in 12" :key="h"
              :x1="120 + 100 * Math.cos((h * 30 - 90) * Math.PI / 180)"
              :y1="120 + 100 * Math.sin((h * 30 - 90) * Math.PI / 180)"
              :x2="120 + 108 * Math.cos((h * 30 - 90) * Math.PI / 180)"
              :y2="120 + 108 * Math.sin((h * 30 - 90) * Math.PI / 180)"/>
          </g>
          <!-- 光轨连线（带发光） -->
          <polyline
            v-if="shiftSundialPoints.length > 1"
            class="wl-sundial-trail"
            :points="shiftSundialPoints.map(p => `${p.x},${p.y}`).join(' ')"
            filter="url(#trailGlow)"
          />
          <!-- 光点（带光晕） -->
          <circle
            v-for="(p, i) in shiftSundialPoints"
            :key="i"
            class="wl-sundial-point"
            :cx="p.x" :cy="p.y" :r="p.r"
            :fill="p.color"
            :style="{ animationDelay: `${i * 0.05}s` }"
          />
          <!-- 中心呼吸发光点 -->
          <circle class="wl-sundial-core" cx="120" cy="120" r="6" />
          <circle class="wl-sundial-core-ring" cx="120" cy="120" r="14" />
        </svg>
      </div>
    </section>

    <!-- ===== 周度呼吸 (Weekly Breath) ===== -->
    <section class="wl-breath-section" v-if="shifts.length > 0">
      <h3>周度呼吸</h3>
      <div class="wl-breath-chart">
        <div
          v-for="(w, i) in weeklyBreath"
          :key="i"
          class="wl-breath-bar-wrap"
          :title="`${w.label}: ${w.hours}h`"
        >
          <div
            class="wl-breath-bar"
            :style="{
              height: w.percent + '%',
              opacity: 0.3 + w.ratio * 0.5
            }"
          ></div>
          <span class="wl-breath-label">{{ w.shortLabel }}</span>
        </div>
      </div>
    </section>

    <!-- ===== 跨房间联动 (Cross-Room Linkage) ===== -->
    <section class="wl-cross-section">
      <h3>跨房间联动</h3>
      <div class="wl-cross-grid">
        <div
          v-for="room in crossRoomStats"
          :key="room.key"
          class="wl-cross-card"
          role="button"
          tabindex="0"
          :aria-label="'前往 ' + room.name"
          @click="navigateToRoom(room.key)"
          @keydown.enter.prevent="navigateToRoom(room.key)"
          @keydown.space.prevent="navigateToRoom(room.key)"
        >
          <span class="wl-cross-icon">{{ room.icon }}</span>
          <span class="wl-cross-value">{{ room.value }}</span>
          <span class="wl-cross-name">{{ room.name }}</span>
          <span class="wl-cross-label">{{ room.label }}</span>
        </div>
      </div>
    </section>

    <!-- 工作日志分析（来自 worklog 模块） -->
    <section class="wl-analytics-section" v-if="analyticsSummary.totalEntries > 0">
      <h3>📊 日志分析</h3>
      <div class="wl-analytics-grid">
        <div class="wl-analytics-card">
          <span class="wl-analytics-num">{{ analyticsSummary.totalEntries }}</span>
          <span class="wl-analytics-label">总日志</span>
        </div>
        <div class="wl-analytics-card">
          <span class="wl-analytics-num">{{ analyticsSummary.weeklyEntries }}</span>
          <span class="wl-analytics-label">本周日志</span>
        </div>
        <div class="wl-analytics-card">
          <span class="wl-analytics-num">{{ analyticsSummary.streak }}<small>天</small></span>
          <span class="wl-analytics-label">连续记录</span>
        </div>
        <div class="wl-analytics-card">
          <span class="wl-analytics-num">{{ analyticsSummary.bestStreak }}<small>天</small></span>
          <span class="wl-analytics-label">最长连续</span>
        </div>
      </div>
    </section>

    <!-- 导出留档（worklog-export 模块） -->
    <WorklogExportPanel />

    <!-- 月度汇总 -->
    <section class="wl-summary-section" v-if="shifts.length > 0">
      <h3>月度汇总</h3>
      <div class="wl-monthly-summary">
        <div class="wl-summary-header">
          <span class="wl-col-month">月份</span>
          <span class="wl-col-hours">总工时</span>
          <span class="wl-col-count">班次数</span>
          <span class="wl-col-avg">平均时长</span>
        </div>
        <div v-for="row in monthlySummary" :key="row.month" class="wl-summary-row">
          <span class="wl-col-month">{{ row.month }}</span>
          <span class="wl-col-hours">{{ row.totalHours }}h</span>
          <span class="wl-col-count">{{ row.count }}</span>
          <span class="wl-col-avg">{{ row.avgDuration }}h</span>
        </div>
      </div>
    </section>

    <!-- 劳酬联动（reward·worklog-bridge：工时日志一键变现为收入记录，INCR-167） -->
    <WorklogRewardPanel />

    <!-- 生产效率预测（worklog·productivity-prediction，INCR-174） -->
    <ProductivityPanel />

    <!-- 工时节奏分析（worklog·worklog-habits，INCR-174） -->
    <WorkRhythmPanel />

    <!-- 任务拆解（INCR-247 补挂载孤儿组件 TaskDecomposerPanel：自然语言任务 → 可执行步骤陈列/保存计划，引擎 useDecomposer 唯一、零 props 直驱，与更漏"时间织机"主题契合） -->
    <TaskDecomposerPanel />

    <!-- 记录列表 -->
    <section class="wl-shift-section" v-if="paginatedShifts.length > 0">
      <div class="wl-shift-list">
        <h3>记录列表 <span class="wl-shift-count" v-if="hasActiveFilter">({{ filteredShifts.length }} 条)</span></h3>
        <div v-for="s in paginatedShifts" :key="s.id" class="wl-shift-item" :class="`wl-${s.type}`">
          <!-- 编辑模式 -->
          <template v-if="editingId === s.id">
            <input v-model="editForm.date" type="date" class="wl-date wl-edit-date" />
            <select v-model="editForm.type" class="wl-select wl-edit-select">
              <option value="regular">常规</option>
              <option value="night">夜班</option>
              <option value="overtime">加班</option>
            </select>
            <input v-model="editForm.start" type="time" class="wl-time wl-edit-time" />
            <span class="wl-edit-sep">→</span>
            <input v-model="editForm.end" type="time" class="wl-time wl-edit-time" />
            <span class="wl-edit-hours">{{ calcHours(editForm.start, editForm.end) }}h</span>
            <button class="wl-btn-save" @click.stop="saveEdit(s.id)">保存</button>
            <button class="wl-btn-cancel" @click.stop="cancelEdit">取消</button>
          </template>
          <!-- 显示模式 -->
          <template v-else>
            <span class="wl-shift-type" role="button" tabindex="0" :aria-label="'编辑班次 ' + typeLabel(s.type)" @click="startEdit(s)" @keydown.enter.prevent="startEdit(s)" @keydown.space.prevent="startEdit(s)">{{ typeLabel(s.type) }}</span>
            <span class="wl-shift-time" role="button" tabindex="0" :aria-label="'编辑班次 ' + s.date + ' ' + s.start + '-' + s.end" @click="startEdit(s)" @keydown.enter.prevent="startEdit(s)" @keydown.space.prevent="startEdit(s)">{{ s.date }} {{ s.start }}-{{ s.end }}</span>
            <span class="wl-shift-hours">{{ s.hours }}h</span>
            <span v-if="hourlyRate > 0" class="wl-shift-pay">¥{{ (s.hours * hourlyRate * (s.type === 'overtime' ? 1.5 : s.type === 'night' ? 1.3 : 1)).toFixed(0) }}</span>
            <span v-if="s.note" class="wl-shift-note" :title="s.note">📝</span>
            <button class="wl-del" @click="removeShift(s.id)">&times;</button>
          </template>
        </div>
      </div>
      <!-- 加载更多 -->
      <div class="wl-load-more" v-if="hasMore">
        <button class="wl-btn wl-btn-more" @click="loadMoreCount += 15">显示更多 ({{ filteredShifts.length - paginatedShifts.length }} 条)</button>
      </div>
    </section>

    <div v-if="shifts.length === 0" class="wl-empty">
      <span>⏳</span><p>更漏尚未开始记录</p>
    </div>
    <div v-else-if="paginatedShifts.length === 0" class="wl-empty">
      <span>🔍</span><p>没有匹配的筛选结果</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useWorklogAnalytics, useWorkLog } from '../modules/worklog'
import type { WorkShift } from '../modules/worklog'
import WorklogExportPanel from '../components/WorklogExportPanel.vue'
import WorklogRewardPanel from '../components/WorklogRewardPanel.vue'
import ProductivityPanel from '../components/ProductivityPanel.vue'
import WorkRhythmPanel from '../components/WorkRhythmPanel.vue'
import TaskDecomposerPanel from '../components/TaskDecomposerPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()

// ---- 工作日志分析模块集成 ----
const worklogAnalytics = useWorklogAnalytics()

const analyticsSummary = computed(() => {
  const a = worklogAnalytics.analytics.value
  return {
    totalEntries: a.totalEntries,
    weeklyEntries: a.weeklyEntries,
    monthlyEntries: a.monthlyEntries,
    streak: a.streak,
    bestStreak: a.bestStreak,
    avgContentLength: a.avgContentLength,
  }
})

type Shift = WorkShift

// ---- 班次 / 时薪（下沉到 useWorkLog 数据层） ----
const { shifts, hourlyRate, load, save, saveHourlyRate } = useWorkLog()
onMounted(load)

const todayStr = new Date().toISOString().slice(0, 10)
const form = ref({ type: 'regular' as Shift['type'], date: todayStr, start: '09:00', end: '18:00', note: '' })
const formError = ref('')
const loadMoreCount = ref(15)

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let h = eh - sh + (em - sm) / 60
  if (h <= 0) h += 24 // 跨天（夜班）
  return Math.round(h * 10) / 10
}

const formValid = computed(() => {
  if (!form.value.date) return false
  if (!form.value.start || !form.value.end) return false
  const h = calcHours(form.value.start, form.value.end)
  return h > 0 && h <= 24
})

function addShift() {
  formError.value = ''
  const hours = calcHours(form.value.start, form.value.end)
  if (hours <= 0) { formError.value = '结束时间必须晚于开始时间'; return }
  if (hours > 24) { formError.value = '单次班次不能超过 24 小时'; return }
  shifts.value.unshift({ id: `shift_${Date.now()}`, type: form.value.type, date: form.value.date, start: form.value.start, end: form.value.end, hours, note: form.value.note || undefined })
  save(shifts.value)
  saveHourlyRate()
  form.value.note = ''
}

function removeShift(id: string) { shifts.value = shifts.value.filter(s => s.id !== id); save(shifts.value) }

// 搜索筛选
const filter = ref({ dateFrom: '', dateTo: '', type: 'all' as 'all' | Shift['type'] })
const filterTypes: { value: 'all' | 'regular' | 'night' | 'overtime'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'regular', label: '常规' },
  { value: 'night', label: '夜班' },
  { value: 'overtime', label: '加班' },
]

const hasActiveFilter = computed(() => filter.value.dateFrom !== '' || filter.value.dateTo !== '' || filter.value.type !== 'all')

function clearFilter() {
  filter.value = { dateFrom: '', dateTo: '', type: 'all' }
}

const filteredShifts = computed(() => {
  let result = shifts.value
  if (filter.value.dateFrom) result = result.filter(s => s.date >= filter.value.dateFrom)
  if (filter.value.dateTo) result = result.filter(s => s.date <= filter.value.dateTo)
  if (filter.value.type !== 'all') result = result.filter(s => s.type === filter.value.type)
  return result
})

const paginatedShifts = computed(() => filteredShifts.value.slice(0, loadMoreCount.value))
const hasMore = computed(() => filteredShifts.value.length > loadMoreCount.value)

const estMonthly = computed(() => {
  const totalH = filteredShifts.value.slice(0, 30).reduce((s, shift) => {
    const rate = shift.type === 'overtime' ? 1.5 : shift.type === 'night' ? 1.3 : 1
    return s + shift.hours * rate * hourlyRate.value
  }, 0)
  return Math.round(totalH)
})

// 统计概览
const statsOverview = computed(() => {
  const totalShifts = shifts.value.length
  const totalHours = Math.round(shifts.value.reduce((s, x) => s + x.hours, 0) * 10) / 10
  const now = new Date()
  const curMonth = now.toISOString().slice(0, 7)
  const monthShifts = shifts.value.filter(s => s.date.startsWith(curMonth))
  const monthHours = Math.round(monthShifts.reduce((s, x) => s + x.hours, 0) * 10) / 10
  const daysWithRecords = new Set(monthShifts.map(s => s.date)).size
  const avgDaily = daysWithRecords > 0 ? Math.round((monthHours / daysWithRecords) * 10) / 10 : 0
  return { totalShifts, totalHours, monthHours, avgDaily }
})

// 近 30 日工时分布
const dailyHours30 = computed(() => {
  const now = new Date()
  const map: Record<string, number> = {}
  for (const s of shifts.value) {
    map[s.date] = (map[s.date] || 0) + s.hours
  }
  const days: { date: string; hours: number; dayLabel: string; isToday: boolean }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const hours = map[dateStr] || 0
    days.push({
      date: dateStr,
      hours: Math.round(hours * 10) / 10,
      dayLabel: String(d.getDate()),
      isToday: i === 0,
    })
  }
  return days
})

const maxDailyHours = computed(() => Math.max(...dailyHours30.value.map(d => d.hours), 1))
const avgHours30 = computed(() => {
  const total = dailyHours30.value.reduce((s, d) => s + d.hours, 0)
  return Math.round((total / 30) * 10) / 10
})

// 班次类型分析
const typeStats = computed(() => {
  const typeMap: Record<string, { count: number; label: string; color: string }> = {
    regular: { count: 0, label: '常规班次', color: '#6b9fc4' },
    night: { count: 0, label: '夜班', color: '#a07c8c' },
    overtime: { count: 0, label: '加班', color: '#ef4444' },
  }
  for (const s of shifts.value) {
    if (typeMap[s.type]) typeMap[s.type].count++
  }
  const total = shifts.value.length
  return Object.entries(typeMap).map(([type, info]) => ({
    type,
    ...info,
    percent: total > 0 ? Math.round((info.count / total) * 100) : 0,
  }))
})

// 编辑模式
const editingId = ref<string | null>(null)
const editForm = ref({ type: 'regular' as Shift['type'], date: '', start: '', end: '' })

function startEdit(shift: Shift) {
  editingId.value = shift.id
  editForm.value = { type: shift.type, date: shift.date, start: shift.start, end: shift.end }
}

function saveEdit(id: string) {
  const idx = shifts.value.findIndex(s => s.id === id)
  if (idx === -1) return
  const hours = calcHours(editForm.value.start, editForm.value.end)
  shifts.value[idx] = { ...shifts.value[idx], type: editForm.value.type, date: editForm.value.date, start: editForm.value.start, end: editForm.value.end, hours }
  save(shifts.value)
  editingId.value = null
}

function cancelEdit() { editingId.value = null }

// 月度汇总
const monthlySummary = computed(() => {
  const map: Record<string, { totalHours: number; count: number }> = {}
  for (const s of shifts.value) {
    const m = s.date.slice(0, 7)
    if (!map[m]) map[m] = { totalHours: 0, count: 0 }
    map[m].totalHours += s.hours
    map[m].count++
  }
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, data]) => ({
      month,
      totalHours: Math.round(data.totalHours * 10) / 10,
      count: data.count,
      avgDuration: Math.round((data.totalHours / data.count) * 10) / 10,
    }))
})

// 月度工时统计（年轮用）
const monthlyRings = computed(() => {
  const map: Record<string, { regular: number; night: number; overtime: number }> = {}
  for (const s of shifts.value) {
    const m = s.date.slice(0, 7)
    if (!map[m]) map[m] = { regular: 0, night: 0, overtime: 0 }
    map[m][s.type] += s.hours
  }
  return Object.entries(map).sort().slice(-6).map(([month, d]) => {
    const total = d.regular + d.night + d.overtime
    const nightRatio = d.night / Math.max(total, 1)
    const hue = 40 - nightRatio * 30
    return {
      month: month.slice(5),
      hours: Math.round(total),
      color: `hsl(${hue}, 60%, ${50 + Math.min(total / 200, 30)}%)`,
    }
  })
})

function typeLabel(t: Shift['type']): string {
  return t === 'regular' ? '🔵 常规' : t === 'night' ? '🌙 夜班' : '🔴 加班'
}

// ===== 光仪编织 (Sundial Weaving) =====
const shiftSundialPoints = computed(() => {
  const sorted = [...shifts.value].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  const maxHours = Math.max(...sorted.map(s => s.hours), 1)
  const centerX = 120, centerY = 120, radius = 90
  const colorMap: Record<string, string> = { regular: '#d4a574', night: '#b8865a', overtime: '#e8a040' }
  return sorted.map((s, i) => {
    const angle = (i / Math.max(sorted.length, 1)) * Math.PI * 2 - Math.PI / 2
    const r = 3 + (s.hours / maxHours) * 8
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      r: Math.round(r * 10) / 10,
      color: colorMap[s.type] || '#d4a574',
    }
  })
})

// ===== 周度呼吸 (Weekly Breath) =====
const weeklyBreath = computed(() => {
  const now = new Date()
  const weeks: { label: string; shortLabel: string; hours: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startStr = weekStart.toISOString().slice(0, 10)
    const endStr = weekEnd.toISOString().slice(0, 10)
    let hours = 0
    for (const s of shifts.value) {
      if (s.date >= startStr && s.date <= endStr) {
        hours += s.hours
      }
    }
    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
    weeks.push({
      label: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
      shortLabel: label,
      hours: Math.round(hours * 10) / 10,
    })
  }
  const maxHours = Math.max(...weeks.map(w => w.hours), 1)
  return weeks.map(w => ({
    ...w,
    percent: Math.round((w.hours / maxHours) * 100),
    ratio: w.hours / maxHours,
  }))
})

// ===== 跨房间联动 (Cross-Room Linkage) =====
const router = useRouter()

const crossRoomStats = computed(() => {
  const scars = storage.getKV<any[]>('heartflow:scars', [])
  const rewards = storage.getKV<any[]>('heartflow:rewards', [])
  const craftWorks = storage.getKV<any[]>('heartflow:craft-works', [])
  const careerContacts = storage.getKV<any[]>('heartflow:career-contacts', [])
  const bagItems = storage.getKV<any[]>('heartflow:bag-items', [])
  const restRecords = storage.getKV<any[]>('heartflow:rest-records', [])

  const monthTotal = rewards.reduce((sum, r) => sum + (r.amount || 0), 0)

  return [
    { key: 'scar', icon: '🩸', name: '工痕', label: '工痕印记', value: scars.length },
    { key: 'reward', icon: '💰', name: '劳酬', label: '本月收入', value: `¥${monthTotal}` },
    { key: 'craft', icon: '🔨', name: '匠庐', label: '作品数', value: craftWorks.length },
    { key: 'career', icon: '📇', name: '业脉', label: '联系人', value: careerContacts.length },
    { key: 'bag', icon: '🎒', name: '行囊', label: '物品数', value: bagItems.length },
    { key: 'rest', icon: '🛌', name: '息壤', label: '休息天数', value: restRecords.length },
  ]
})

function navigateToRoom(key: string) {
  const routeMap: Record<string, string> = {
    scar: '/scar',
    reward: '/reward',
    craft: '/craft',
    career: '/career',
    bag: '/bag',
    rest: '/rest',
  }
  const path = routeMap[key]
  if (path) router.push(path)
}
</script>

<style scoped>
/* ===== 容器 ===== */
.wl {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  position: relative;
  background: transparent;
  overflow-y: auto;
}
.wl::before {
  content: '';
  position: fixed;
  top: -20%;
  right: -25%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.wl::after {
  content: '';
  position: fixed;
  bottom: -20%;
  left: -25%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ================================================================
   氛围背景层：更漏 · 时间织机
   ================================================================ */
.wl-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.wl-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.35;
}
.wl-glow--top {
  top: -100px;
  right: -100px;
  width: 400px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.06), transparent 70%);
}
.wl-glow--bottom {
  bottom: -80px;
  left: -80px;
  width: 350px;
  height: 250px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04), transparent 70%);
}
.wl-gear-svg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wl-gear-svg svg {
  width: 100%;
  height: 100%;
  max-width: 600px;
  opacity: 0.7;
}

/* 齿轮旋转动画 */
.wl-gear {
  transform-origin: center;
  animation: gearRotate 60s linear infinite;
}
.wl-gear--big { transform-origin: 480px 180px; }
.wl-gear--small { transform-origin: 120px 620px; animation-direction: reverse; animation-duration: 40s; }
@keyframes gearRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 时间粒子动画 */
.wl-particle {
  animation: wlParticleFloat 6s ease-in-out infinite;
}
.wl-particle--1 { animation-delay: 0s; animation-duration: 5.5s; }
.wl-particle--2 { animation-delay: 1s; animation-duration: 7s; }
.wl-particle--3 { animation-delay: 2s; animation-duration: 6s; }
.wl-particle--4 { animation-delay: 0.5s; animation-duration: 8s; }
.wl-particle--5 { animation-delay: 1.5s; animation-duration: 5.8s; }
.wl-particle--6 { animation-delay: 3s; animation-duration: 7.5s; }
.wl-particle--7 { animation-delay: 0.8s; animation-duration: 6.5s; }
.wl-particle--8 { animation-delay: 2.5s; animation-duration: 5.2s; }
@keyframes wlParticleFloat {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.06; }
  50% { transform: translateY(-15px) scale(1.6); opacity: 0.14; }
}

/* ===== 头部 ===== */
.wl-header { text-align: center; margin-bottom: 32px; position: relative; z-index: 1; }
.header-ornament { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; }
.orn-line { display: inline-block; width: 40px; height: 1px; background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent); }
.orn-diamond { color: var(--accent); font-size: 10px; opacity: 0.7; }
.header-kicker { font-size: 12px; color: rgba(var(--accent-rgb), 0.5); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; }
.wl-title { font-size: 26px; font-weight: 300; letter-spacing: 6px; color: var(--accent); margin: 0; }

/* ===== 快速记录 ===== */
.wl-quick-record {
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 1;
  transition: border-color 0.3s;
}
.wl-quick-record:focus-within {
  border-color: rgba(var(--accent-rgb), 0.18);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.04);
}
.wl-record-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.7);
}
.wl-date {
  padding: 6px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  background: var(--bg-card);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  color-scheme: dark;
}
.wl-date:focus { border-color: rgba(var(--accent-rgb), 0.35); }
.wl-select {
  padding: 6px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  background: var(--bg-card);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.wl-select:focus { border-color: rgba(var(--accent-rgb), 0.35); }
.wl-time {
  padding: 6px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  background: var(--bg-card);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  width: 90px;
}
.wl-time:focus { border-color: rgba(var(--accent-rgb), 0.35); }
.wl-note-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 6px;
  background: var(--card-bg);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.wl-note-input:focus { border-color: rgba(var(--accent-rgb), 0.25); }
.wl-note-input::placeholder { color: rgba(var(--accent-rgb), 0.25); }
.wl-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.wl-btn:hover { background: rgba(var(--accent-rgb), 0.18); }
.wl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.wl-rate-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
}
.wl-rate-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 6px;
  background: var(--bg-card);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.wl-rate-input:focus { border-color: rgba(var(--accent-rgb), 0.3); }
.wl-est-pay { color: var(--accent); font-weight: 500; }
.wl-form-error { font-size: 11px; color: var(--error); padding: 4px 0; }

/* ===== 统计概览 ===== */
.wl-stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}
.wl-stat-card { display: flex; flex-direction: column; align-items: center; padding: 16px 8px; border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); transition: all 0.3s ease; position: relative; overflow: hidden; }
.wl-stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.04), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}
.wl-stat-card:hover {
  border-color: rgba(var(--accent-rgb), 0.18);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.wl-stat-card:hover::before { opacity: 1; }
.wl-stat-value { font-size: 22px; font-weight: 500; color: var(--accent); line-height: 1.2; }
.wl-stat-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); margin-top: 4px; }

/* ===== 筛选栏 ===== */
.wl-filter-section { margin-bottom: 20px; position: relative; z-index: 1; }
.wl-filter-bar {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wl-filter-group { display: flex; align-items: center; gap: 8px; }
.wl-filter-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); min-width: 56px; }
.wl-filter-date-range { display: flex; align-items: center; gap: 6px; }
.wl-filter-date {
  padding: 4px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 6px;
  background: var(--bg-card);
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  color-scheme: dark;
}
.wl-filter-date-range span { font-size: 11px; color: rgba(var(--accent-rgb), 0.3); }
.wl-filter-types { display: flex; gap: 4px; flex-wrap: wrap; }
.wl-filter-type-btn {
  padding: 3px 10px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.wl-filter-type-btn.active { background: rgba(var(--accent-rgb), 0.15); border-color: rgba(var(--accent-rgb), 0.3); color: var(--accent); }
.wl-filter-clear {
  align-self: flex-end;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
.wl-filter-clear:hover { color: var(--accent); }
.wl-filter-summary { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); margin-top: 6px; }

/* ===== 工时分布图 ===== */
.wl-chart-section { margin-bottom: 24px; position: relative; z-index: 1; }
.wl-chart-section h3 { font-size: 14px; font-weight: 400; margin-bottom: 12px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-chart-container { padding: 12px 0; border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.wl-chart-bars { display: flex; align-items: flex-end; gap: 2px; height: 120px; padding: 0 12px 20px; position: relative; }
.wl-chart-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 4px; position: relative; }
.wl-chart-bar { width: 100%; max-width: 12px; border-radius: 2px 2px 0 0; background: linear-gradient(to top, rgba(var(--accent-rgb), 0.6), rgba(var(--accent-rgb), 0.25)); transition: height 0.3s; min-height: 0; }
.wl-chart-bar.wl-bar-today { background: linear-gradient(to top, rgba(var(--accent-rgb), 0.85), rgba(var(--accent-rgb), 0.4)); }
.wl-chart-label { font-size: 8px; color: rgba(var(--accent-rgb), 0.4); position: absolute; bottom: -16px; white-space: nowrap; }
.wl-avg-line { position: absolute; left: 8px; right: 8px; border-top: 1px dashed rgba(var(--accent-rgb), 0.25); pointer-events: none; }
.wl-avg-label { position: absolute; right: 0; top: -14px; font-size: 10px; color: rgba(var(--accent-rgb), 0.35); white-space: nowrap; }

/* ===== 班次类型分析 ===== */
.wl-type-section { margin-bottom: 24px; position: relative; z-index: 1; }
.wl-type-section h3 { font-size: 14px; font-weight: 400; margin-bottom: 10px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-type-analysis { padding: 14px 16px; border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); display: flex; flex-direction: column; gap: 10px; }
.wl-type-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.wl-type-name { min-width: 64px; color: rgba(var(--accent-rgb), 0.7); }
.wl-type-bar-bg { flex: 1; height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.wl-type-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.wl-type-count { min-width: 36px; text-align: right; color: rgba(255, 255, 255, 0.7); font-weight: 500; }
.wl-type-percent { min-width: 36px; text-align: right; color: rgba(var(--accent-rgb), 0.5); }

/* ===== 工时年轮 ===== */
.wl-ring-section { margin-bottom: 24px; position: relative; z-index: 1; }
.wl-annual-ring h3 { font-size: 14px; font-weight: 400; margin-bottom: 12px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-ring-visual { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 20px 0; border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.wl-ring-circle { border-radius: 50%; border: 1px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.5s; }
.wl-ring-label { font-size: 9px; color: rgba(var(--accent-rgb), 0.6); }
.wl-ring-hours { font-size: 10px; font-weight: 500; color: var(--accent); }

/* ===== 月度汇总 ===== */
.wl-summary-section { margin-bottom: 24px; position: relative; z-index: 1; }
.wl-summary-section h3 { font-size: 14px; font-weight: 400; margin-bottom: 10px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-monthly-summary { padding: 8px 16px; border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); font-size: 12px; }
.wl-summary-header, .wl-summary-row { display: grid; grid-template-columns: 1fr 60px 56px 60px; gap: 4px; padding: 8px 0; }
.wl-summary-header { border-bottom: 1px solid rgba(var(--accent-rgb), 0.08); color: rgba(var(--accent-rgb), 0.5); font-weight: 500; }
.wl-summary-row:not(:last-child) { border-bottom: 1px solid rgba(var(--accent-rgb), 0.04); }
.wl-col-month { color: rgba(var(--accent-rgb), 0.7); }
.wl-col-hours { text-align: right; color: var(--accent); font-weight: 500; }
.wl-col-count { text-align: right; color: rgba(255, 255, 255, 0.7); }
.wl-col-avg { text-align: right; color: rgba(var(--accent-rgb), 0.5); }

/* ===== 记录列表 ===== */
.wl-shift-section { position: relative; z-index: 1; }
.wl-shift-list h3 { font-size: 14px; font-weight: 400; margin-bottom: 10px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-shift-count { font-size: 11px; color: rgba(var(--accent-rgb), 0.35); }
.wl-shift-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border-left: 3px solid transparent;
  margin-bottom: 4px;
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.7);
  background: var(--card-bg);
  cursor: default;
}
.wl-regular { border-left-color: var(--accent); }
.wl-night { border-left-color: #b8865a; }
.wl-overtime { border-left-color: #e8a040; }
.wl-shift-type { font-size: 12px; min-width: 70px; cursor: pointer; color: rgba(var(--accent-rgb), 0.8); }
.wl-shift-time { flex: 1; cursor: pointer; color: rgba(var(--accent-rgb), 0.6); }
.wl-shift-type:focus-visible,
.wl-shift-time:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-radius: 4px;
}
.wl-shift-hours { font-weight: 500; color: var(--accent); }
.wl-shift-pay { font-size: 11px; color: var(--accent); opacity: 0.7; }
.wl-shift-note { font-size: 12px; cursor: help; }
.wl-del {
  width: 20px; height: 20px; border-radius: 50%; border: none; background: transparent;
  color: rgba(var(--accent-rgb), 0.2); cursor: pointer; font-size: 16px; line-height: 1;
  opacity: 0; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
}
.wl-shift-item:hover .wl-del { opacity: 1; }
.wl-del:hover { color: var(--accent); }

/* ===== 编辑模式 ===== */
.wl-edit-date { padding: 2px 6px; font-size: 11px; width: 120px; }
.wl-edit-select { padding: 2px 6px; font-size: 11px; width: 60px; }
.wl-edit-time { padding: 2px 6px; font-size: 11px; width: 72px; }
.wl-edit-sep { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); }
.wl-edit-hours { font-size: 11px; color: var(--accent); font-weight: 500; min-width: 30px; text-align: right; }
.wl-btn-save { padding: 2px 10px; border-radius: 4px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent); font-size: 11px; font-family: inherit; cursor: pointer; }
.wl-btn-save:hover { background: rgba(var(--accent-rgb), 0.2); }
.wl-btn-cancel { padding: 2px 10px; border-radius: 4px; border: 1px solid rgba(var(--accent-rgb), 0.1); background: transparent; color: rgba(var(--accent-rgb), 0.5); font-size: 11px; font-family: inherit; cursor: pointer; }
.wl-btn-cancel:hover { color: rgba(var(--accent-rgb), 0.8); }

/* ===== 加载更多 ===== */
.wl-load-more { text-align: center; padding: 12px 0; position: relative; z-index: 1; }
.wl-btn-more { font-size: 12px; padding: 8px 20px; }

/* ===== 空状态 ===== */
.wl-empty { text-align: center; padding: 80px 0; color: rgba(var(--accent-rgb), 0.2); position: relative; z-index: 1; }
.wl-empty span { font-size: 40px; display: block; margin-bottom: 8px; }

/* ===== 光仪编织 (Sundial Weaving) ===== */
.wl-sundial-section { margin-bottom: 24px; position: relative; z-index: 1; }
.wl-sundial-section h3 { font-size: 14px; font-weight: 400; margin-bottom: 12px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-sundial-wrap {
  padding: 16px; border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex; justify-content: center;
}
.wl-sundial-svg { width: 240px; height: 240px; }
.wl-sundial-circle { fill: none; stroke: rgba(var(--accent-rgb), 0.1); stroke-width: 0.6; }
.wl-sundial-trail { fill: none; stroke: rgba(var(--accent-rgb), 0.2); stroke-width: 1.2; stroke-linejoin: round; stroke-linecap: round; }
.wl-sundial-point {
  transition: r 0.3s;
  animation: pointPulse 2s ease-in-out infinite;
}
@keyframes pointPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.wl-sundial-core {
  fill: rgba(var(--accent-rgb), 0.6);
  animation: sundial-breathe 3s ease-in-out infinite;
}
.wl-sundial-core-ring {
  fill: none;
  stroke: rgba(var(--accent-rgb), 0.15);
  stroke-width: 1;
  animation: coreRingPulse 3s ease-in-out infinite;
}
@keyframes sundial-breathe {
  0%, 100% { opacity: 0.4; r: 5; }
  50% { opacity: 0.8; r: 8; }
}
@keyframes coreRingPulse {
  0%, 100% { opacity: 0.3; r: 14; stroke-width: 0.5; }
  50% { opacity: 0.7; r: 18; stroke-width: 1.5; }
}

/* ===== 周度呼吸 (Weekly Breath) ===== */
.wl-breath-section { margin-bottom: 24px; position: relative; z-index: 1; }
.wl-breath-section h3 { font-size: 14px; font-weight: 400; margin-bottom: 12px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-breath-chart {
  display: flex; align-items: flex-end; gap: 4px; height: 100px; padding: 12px 16px 20px;
  border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.wl-breath-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 12px; position: relative; }
.wl-breath-bar {
  width: 100%; max-width: 24px; border-radius: 3px 3px 0 0;
  background: linear-gradient(to top, rgba(var(--accent-rgb), 0.7), rgba(var(--accent-rgb), 0.3));
  transition: height 0.4s; min-height: 0;
}
.wl-breath-label { font-size: 9px; color: rgba(var(--accent-rgb), 0.4); position: absolute; bottom: -18px; white-space: nowrap; }

/* ===== 跨房间联动 (Cross-Room Linkage) ===== */
.wl-cross-section { margin-bottom: 24px; position: relative; z-index: 1; }
.wl-cross-section h3 { font-size: 14px; font-weight: 400; margin-bottom: 12px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-cross-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.wl-cross-card {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 14px 8px; border-radius: 12px;
  background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer; transition: all 0.3s ease; position: relative;
  overflow: hidden;
}
.wl-cross-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: radial-gradient(ellipse at 50% 30%, rgba(var(--accent-rgb), 0.04), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.wl-cross-card:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
.wl-cross-card:hover::before { opacity: 1; }
.wl-cross-card:active { transform: scale(0.96); }
.wl-cross-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: rgba(var(--accent-rgb), 0.3);
}
.wl-cross-icon { font-size: 18px; line-height: 1; margin-bottom: 4px; }
.wl-cross-value { font-size: 18px; font-weight: 600; color: var(--accent); }
.wl-cross-name { font-size: 11px; color: rgba(var(--accent-rgb), 0.7); font-weight: 500; }
.wl-cross-label { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }

/* === Entrance Animation === */
@keyframes fade-slide-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }

/* === Responsive === */
@media (max-width: 860px) { .wl { padding: 32px 20px 64px; } .wl-stats-section { gap: 8px; } .wl-stat-card { padding: 12px 8px; } }
@media (max-width: 640px) { .wl { padding: 24px 14px 56px; } .wl-stats-section { grid-template-columns: 1fr; } }
@media (max-width: 480px) { .wl-stats-section { grid-template-columns: repeat(2, 1fr); gap: 6px; } .wl-stat-card { padding: 8px; } .wl-summary-header, .wl-summary-row { font-size: 10px; } }
/* ===== 工作日志分析（模块集成） ===== */
.wl-analytics-section { margin-bottom: 24px; position: relative; z-index: 1; }
.wl-analytics-section h3 { font-size: 14px; font-weight: 400; margin-bottom: 10px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; }
.wl-analytics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.wl-analytics-card { padding: 12px 8px; border-radius: 10px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); text-align: center; }
.wl-analytics-num { font-size: 18px; font-weight: 500; color: var(--accent); display: block; }
.wl-analytics-num small { font-size: 11px; font-weight: 400; opacity: 0.6; margin-left: 2px; }
.wl-analytics-label { font-size: 10px; color: rgba(var(--accent-rgb), 0.5); margin-top: 2px; display: block; }

@media (max-width: 640px) {
  .wl-analytics-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>