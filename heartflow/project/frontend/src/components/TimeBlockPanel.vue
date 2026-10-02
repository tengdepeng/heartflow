<template>
  <section class="tbp" aria-label="更漏 · 时间块日规划">
    <div class="tbp-head">
      <span class="tbp-title">🗓 时间块日规划</span>
      <span class="tbp-sub">待办排入时间轴 · 轻量自动排程</span>
    </div>

    <!-- 视图模式切换：日 / 周 -->
    <div class="tbp-modebar">
      <button
        type="button"
        class="tbp-mode"
        :class="{ 'tbp-mode--active': viewMode === 'day' }"
        @click="viewMode = 'day'"
      >日</button>
      <button
        type="button"
        class="tbp-mode"
        :class="{ 'tbp-mode--active': viewMode === 'week' }"
        @click="viewMode = 'week'"
      >周</button>
    </div>

    <!-- 日期导航（日模式） -->
    <div v-if="viewMode === 'day'" class="tbp-datebar">
      <button type="button" class="tbp-nav" @click="shiftDate(-1)">‹</button>
      <button type="button" class="tbp-today" @click="goToday">{{ dateLabel }}</button>
      <button type="button" class="tbp-nav" @click="shiftDate(1)">›</button>
    </div>

    <!-- 周导航（周模式） -->
    <div v-else class="tbp-datebar">
      <button type="button" class="tbp-nav" @click="shiftWeek(-1)">‹</button>
      <button type="button" class="tbp-today" @click="goThisWeek">本周 · {{ weekRangeLabel }}</button>
      <button type="button" class="tbp-nav" @click="shiftWeek(1)">›</button>
    </div>

    <!-- 新增待办 -->
    <div class="tbp-add">
      <input v-model="newTitle" class="tbp-input" placeholder="今天要做什么？（如：写周报 40分钟）" @keyup.enter="addTask" />
      <select v-model="newCategory" class="tbp-select">
        <option v-for="c in categoryOptions" :key="c.key" :value="c.key">{{ c.icon }} {{ c.label }}</option>
      </select>
      <input v-model.number="newEst" type="number" min="5" step="5" class="tbp-input tbp-input--num" title="预估分钟" />
      <button type="button" class="tbp-btn tbp-btn--primary" :disabled="!newTitle.trim()" @click="addTask">添加</button>
    </div>

    <!-- 待规划池 -->
    <div class="tbp-pool">
      <div class="tbp-pool-head">
        <span>待规划 · {{ unscheduled.length }}</span>
        <button
          type="button"
          class="tbp-btn tbp-btn--auto"
          :disabled="unscheduled.length === 0"
          @click="runAutoSchedule"
        >⚡ 自动排程</button>
      </div>

      <div v-if="unscheduled.length" class="tbp-pool-list">
        <div v-for="t in unscheduled" :key="t.id" class="tbp-task" :class="{ 'tbp-task--done': t.done }">
          <span class="tbp-task-icon">{{ WORK_CATEGORY_META[t.category].icon }}</span>
          <span class="tbp-task-title">{{ t.title }}</span>
          <span class="tbp-task-est">{{ t.estimatedMinutes }}′</span>
          <button type="button" class="tbp-task-place" title="排入下一空档" @click="placeTask(t.id)">排入</button>
          <button type="button" class="tbp-task-del" title="删除" @click="tb.removeTask(t.id)">✕</button>
        </div>
      </div>
      <p v-else class="tbp-empty">当天的待办都已排上时间轴，或暂无待办。</p>
      <p v-if="lastScheduled !== null" class="tbp-auto-note">自动排程已放入 {{ lastScheduled }} 个时间块。</p>
    </div>

    <!-- 当日时间轴（日模式） -->
    <div v-if="viewMode === 'day'" class="tbp-timeline-wrap">
      <div class="tbp-timeline-head">
        <span>当日时间轴</span>
        <span class="tbp-coverage">已排 {{ Math.round(scheduledMin / 60 * 10) / 10 }}h · 覆盖率 {{ Math.round(coverage * 100) }}%</span>
        <span v-if="overlapCount > 0" class="tbp-overlap-note">⚠ {{ overlapCount }} 个时间块重叠</span>
      </div>

      <div class="tbp-timeline" :style="{ height: timelineHeight + 'px' }">
        <!-- 小时网格 -->
        <div
          v-for="g in gridHours"
          :key="g.min"
          class="tbp-gridline"
          :style="{ top: ((g.min - DAY_START) * PX_PER_MIN) + 'px' }"
        >
          <span class="tbp-gridlabel">{{ g.label }}</span>
        </div>

        <!-- 时间块 -->
        <div
          v-for="b in dayBlocks"
          :key="b.id"
          class="tbp-block"
          :class="{ 'tbp-block--done': b.done, 'tbp-block--overlap': overlapIds.has(b.id) }"
          :style="blockStyle(b)"
        >
          <div class="tbp-block-bar" :style="{ background: WORK_CATEGORY_META[b.category].color }"></div>
          <div class="tbp-block-body">
            <div class="tbp-block-row">
              <span class="tbp-block-time">{{ blockTimeLabel(b) }}</span>
              <span v-if="overlapIds.has(b.id)" class="tbp-block-warn" title="与其他时间块重叠">⚠</span>
              <span class="tbp-block-cat">{{ WORK_CATEGORY_META[b.category].icon }}</span>
            </div>
            <span class="tbp-block-title">{{ b.title }}</span>
          </div>
          <div class="tbp-block-actions">
            <button type="button" class="tbp-block-btn" :title="b.done ? '标记未完成（已移出更漏光仪）' : '标记完成并汇入更漏光仪'" @click="tb.toggleBlock(b.id)">
              {{ b.done ? '↺' : '✓' }}
            </button>
            <button type="button" class="tbp-block-btn" title="前移 15 分钟" @click="tb.moveBlock(b.id, b.startMin - 15)">−</button>
            <button type="button" class="tbp-block-btn" title="后移 15 分钟" @click="tb.moveBlock(b.id, b.startMin + 15)">+</button>
            <button type="button" class="tbp-block-btn tbp-block-btn--del" title="移除" @click="tb.removeBlock(b.id)">✕</button>
          </div>
        </div>

        <p v-if="dayBlocks.length === 0" class="tbp-timeline-empty">时间轴还空着。添加待办后点「自动排程」，或下方手动建块。</p>
      </div>
    </div>

    <!-- 周视图（周模式） -->
    <div v-else class="tbp-week-wrap">
      <div class="tbp-week-head">
        <span>周视图 · 拖拽块改起止 · 跨列改日期 · 底部手柄拉时长</span>
        <span class="tbp-coverage">本周已排 {{ Math.round(weekScheduledMin / 60 * 10) / 10 }}h · 覆盖率 {{ weekCoveragePct }}%</span>
        <span v-if="overlapCount > 0" class="tbp-overlap-note">⚠ {{ overlapCount }} 个时间块重叠</span>
      </div>

      <!-- 周列头：点击切到该日，高亮今天 / 当前选中 -->
      <div class="tbp-week-colheads">
        <button
          v-for="day in weekDays"
          :key="day"
          type="button"
          class="tbp-week-colhead"
          :class="{ 'tbp-week-colhead--today': isToday(day), 'tbp-week-colhead--active': activeDate === day }"
          @click="selectDay(day)"
        >
          <span class="tbp-week-colhead-dow">周{{ weekdayLabel(day) }}</span>
          <span class="tbp-week-colhead-date">{{ day.slice(5) }}</span>
        </button>
      </div>

      <!-- 周网格：7 列，块可拖动改起止 / 跨列改日期 / 底部手柄拉时长 -->
      <div class="tbp-week-grid" ref="weekGridEl" :style="{ height: timelineHeight + 'px' }">
        <div
          v-for="day in weekDays"
          :key="day"
          class="tbp-week-col"
          :class="{ 'tbp-week-col--today': isToday(day), 'tbp-week-col--active': activeDate === day }"
        >
          <div
            v-for="g in gridHours"
            :key="g.min"
            class="tbp-gridline"
            :style="{ top: ((g.min - DAY_START) * PX_PER_MIN) + 'px' }"
          >
            <span class="tbp-gridlabel">{{ g.label }}</span>
          </div>

          <div
            v-for="b in dayBlocksInWeek(day)"
            :key="b.id"
            class="tbp-block tbp-block--week"
            :class="{ 'tbp-block--done': b.done, 'tbp-block--overlap': overlapIds.has(b.id) }"
            :style="blockStyle(b)"
            @pointerdown="onBlockPointerDown($event, b)"
          >
            <div class="tbp-block-bar" :style="{ background: WORK_CATEGORY_META[b.category].color }"></div>
            <div class="tbp-block-body">
              <div class="tbp-block-row">
                <span class="tbp-block-time">{{ blockTimeLabel(b) }}</span>
                <span v-if="overlapIds.has(b.id)" class="tbp-block-warn" title="与其他时间块重叠">⚠</span>
                <span class="tbp-block-cat">{{ WORK_CATEGORY_META[b.category].icon }}</span>
              </div>
              <span class="tbp-block-title">{{ b.title }}</span>
            </div>
            <div class="tbp-block-resize" title="拖拽改变时长" @pointerdown="onResizePointerDown($event, b)"></div>
            <div class="tbp-block-actions">
              <button type="button" class="tbp-block-btn" :title="b.done ? '标记未完成（已移出更漏光仪）' : '标记完成并汇入更漏光仪'" @click="tb.toggleBlock(b.id)">{{ b.done ? '↺' : '✓' }}</button>
              <button type="button" class="tbp-block-btn tbp-block-btn--del" title="移除" @click="tb.removeBlock(b.id)">✕</button>
            </div>
            <div v-if="dragPreview && dragPreview.id === b.id" class="tbp-block-preview">
              周{{ weekdayLabel(dragPreview.date) }} {{ minutesToLabel(dragPreview.startMin) }}·{{ dragPreview.durationMin }}′
            </div>
          </div>

          <p v-if="dayBlocksInWeek(day).length === 0" class="tbp-week-col-empty">·</p>
        </div>
      </div>
    </div>

    <!-- 手动建块 -->
    <div class="tbp-manual">
      <div class="tbp-manual-head">手动建块</div>
      <div class="tbp-manual-row">
        <input v-model="mbStart" class="tbp-input tbp-input--time" placeholder="09:00" />
        <input v-model.number="mbDur" type="number" min="5" step="5" class="tbp-input tbp-input--num" title="时长(分钟)" />
        <select v-model="mbCategory" class="tbp-select">
          <option v-for="c in categoryOptions" :key="c.key" :value="c.key">{{ c.icon }} {{ c.label }}</option>
        </select>
        <input v-model="mbTitle" class="tbp-input" placeholder="标题" @keyup.enter="addManualBlock" />
        <button type="button" class="tbp-btn tbp-btn--primary" :disabled="!mbTitle.trim()" @click="addManualBlock">建块</button>
      </div>
      <p v-if="mbError" class="tbp-form-error">{{ mbError }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useTimeBlock,
  WORK_CATEGORY_META,
  minutesToLabel,
  labelToMinutes,
  freeGaps,
  weekDaysOf,
  weekCoverage,
  detectOverlapIds,
  type WorkCategory,
  type TimeBlock,
} from '../modules/clepsydra'

const DAY_START = 7 * 60
const DAY_END = 23 * 60
const PX_PER_MIN = 0.7
const WINDOW_MIN = DAY_END - DAY_START

const tb = useTimeBlock()
const activeDate = ref(tb.todayKey())

// ---- 视图模式（日 / 周） ----
const viewMode = ref<'day' | 'week'>('day')
const SNAP_MIN = 5
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function snap(v: number): number {
  return Math.max(0, Math.round(v / SNAP_MIN) * SNAP_MIN)
}

const weekDays = computed(() => weekDaysOf(new Date(activeDate.value + 'T00:00:00')))
const weekCoveragePct = computed(() => Math.round(weekCoverage(tb.blocks.value, weekDays.value) * 100))
const weekScheduledMin = computed(() =>
  weekDays.value.reduce(
    (s, day) => s + tb.blocks.value.filter(b => b.date === day).reduce((x, b) => x + b.durationMin, 0),
    0,
  ),
)
const weekRangeLabel = computed(() => {
  const days = weekDays.value
  if (!days.length) return ''
  return `${days[0].slice(5)} – ${days[6].slice(5)}`
})

function shiftWeek(delta: number): void {
  const d = new Date(activeDate.value + 'T00:00:00')
  d.setDate(d.getDate() + delta * 7)
  activeDate.value = tb.localDateKey(d)
}
function goThisWeek(): void {
  activeDate.value = tb.todayKey()
}
function selectDay(dateKey: string): void {
  activeDate.value = dateKey
}
function weekdayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  return WEEKDAY_LABELS[(d.getDay() + 6) % 7]
}
function isToday(dateKey: string): boolean {
  return dateKey === tb.todayKey()
}
function dayBlocksInWeek(dateKey: string): TimeBlock[] {
  return tb.blocks.value
    .filter(b => b.date === dateKey)
    .sort((a, b) => a.startMin - b.startMin)
}

// ---- 拖拽：移动 / 拉伸（指针事件统一鼠标 + 触摸） ----
interface DragState {
  id: string
  mode: 'move' | 'resize'
  pointerId: number
  startY: number
  startX: number
  origStartMin: number
  origDuration: number
  origDate: string
  gridRect?: DOMRect
  colWidth?: number
}
const drag = ref<DragState | null>(null)
const dragPreview = ref<{ id: string; startMin: number; durationMin: number; date: string } | null>(null)
const weekGridEl = ref<HTMLElement | null>(null)

function onBlockPointerDown(e: PointerEvent, b: TimeBlock): void {
  if (e.button !== 0) return
  e.preventDefault()
  const rect = viewMode.value === 'week' && weekGridEl.value ? weekGridEl.value.getBoundingClientRect() : undefined
  drag.value = {
    id: b.id,
    mode: 'move',
    pointerId: e.pointerId,
    startY: e.clientY,
    startX: e.clientX,
    origStartMin: b.startMin,
    origDuration: b.durationMin,
    origDate: b.date,
    gridRect: rect,
    colWidth: rect ? rect.width / 7 : undefined,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}
function onResizePointerDown(e: PointerEvent, b: TimeBlock): void {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  drag.value = {
    id: b.id,
    mode: 'resize',
    pointerId: e.pointerId,
    startY: e.clientY,
    startX: e.clientX,
    origStartMin: b.startMin,
    origDuration: b.durationMin,
    origDate: b.date,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}
function onPointerMove(e: PointerEvent): void {
  const d = drag.value
  if (!d) return
  const dy = e.clientY - d.startY
  if (d.mode === 'move') {
    const newStart = snap(d.origStartMin + dy / PX_PER_MIN)
    let newDate = d.origDate
    if (d.gridRect && d.colWidth) {
      const idx = Math.max(0, Math.min(6, Math.floor((e.clientX - d.gridRect.left) / d.colWidth)))
      newDate = weekDays.value[idx] ?? d.origDate
    }
    dragPreview.value = { id: d.id, startMin: newStart, durationMin: d.origDuration, date: newDate }
  } else {
    const newDur = snap(d.origDuration + dy / PX_PER_MIN)
    dragPreview.value = { id: d.id, startMin: d.origStartMin, durationMin: newDur, date: d.origDate }
  }
}
function onPointerUp(): void {
  const d = drag.value
  const p = dragPreview.value
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  if (d && p) {
    if (d.mode === 'move') tb.setBlockPlacement(d.id, p.date, p.startMin)
    else tb.resizeBlock(d.id, p.durationMin)
  }
  drag.value = null
  dragPreview.value = null
}

const categoryOptions = (Object.keys(WORK_CATEGORY_META) as WorkCategory[]).map(k => ({
  key: k,
  label: WORK_CATEGORY_META[k].label,
  icon: WORK_CATEGORY_META[k].icon,
  color: WORK_CATEGORY_META[k].color,
}))

const dayTasks = computed(() => tb.tasksForDate(activeDate.value))
const dayBlocks = computed(() => tb.blocksForDate(activeDate.value))
const unscheduled = computed(() => tb.unscheduledTasksForDate(activeDate.value))
const scheduledMin = computed(() => dayBlocks.value.reduce((s, b) => s + b.durationMin, 0))
const coverage = computed(() => Math.min(1, scheduledMin.value / WINDOW_MIN))

// ---- 重叠冲突检测（跨天不重叠，全量检测即可服务日 / 周两种视图）----
const overlapIds = computed(() => detectOverlapIds(tb.blocks.value))
const overlapCount = computed(() => overlapIds.value.size)

const dateLabel = computed(() => {
  const d = new Date(activeDate.value + 'T00:00:00')
  const today = tb.todayKey()
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${activeDate.value} 周${wd}${activeDate.value === today ? ' · 今天' : ''}`
})

function shiftDate(delta: number): void {
  const d = new Date(activeDate.value + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  activeDate.value = tb.localDateKey(d)
}
function goToday(): void {
  activeDate.value = tb.todayKey()
}

// ---- 新增待办 ----
const newTitle = ref('')
const newCategory = ref<WorkCategory>('project')
const newEst = ref(30)

function addTask(): void {
  const t = newTitle.value.trim()
  if (!t) return
  tb.addTask({
    title: t,
    category: newCategory.value,
    estimatedMinutes: newEst.value,
    date: activeDate.value,
  })
  newTitle.value = ''
}

// ---- 自动排程 ----
const lastScheduled = ref<number | null>(null)
function runAutoSchedule(): void {
  const n = tb.autoScheduleForDate(activeDate.value)
  lastScheduled.value = n
}

// ---- 把单个待办排入下一空档 ----
const mbError = ref('')
function placeTask(taskId: string): void {
  const task = dayTasks.value.find(t => t.id === taskId)
  if (!task) return
  const occupied = dayBlocks.value.map(b => ({ startMin: b.startMin, endMin: b.startMin + b.durationMin }))
  occupied.push({ startMin: 12 * 60, endMin: 13 * 60 }) // 午休永久占用
  const gaps = freeGaps(occupied, DAY_START, DAY_END)
  const need = task.estimatedMinutes
  const slot = gaps.find(g => g.endMin - g.startMin >= need)
  if (!slot) {
    mbError.value = '当日已无足够空隙放下该任务'
    return
  }
  mbError.value = ''
  tb.addBlock({
    date: activeDate.value,
    startMin: slot.startMin,
    durationMin: need,
    category: task.category,
    title: task.title,
    taskId: task.id,
  })
}

// ---- 手动建块 ----
const mbStart = ref('09:00')
const mbDur = ref(60)
const mbCategory = ref<WorkCategory>('project')
const mbTitle = ref('')

function addManualBlock(): void {
  const s = labelToMinutes(mbStart.value)
  if (s === null) {
    mbError.value = '时间格式应为 HH:MM'
    return
  }
  if (mbDur.value < 5) {
    mbError.value = '时长至少 5 分钟'
    return
  }
  if (!mbTitle.value.trim()) {
    mbError.value = '请填写标题'
    return
  }
  mbError.value = ''
  tb.addBlock({
    date: activeDate.value,
    startMin: s,
    durationMin: mbDur.value,
    category: mbCategory.value,
    title: mbTitle.value.trim(),
  })
  mbTitle.value = ''
}

// ---- 时间轴渲染 ----
const timelineHeight = Math.round(WINDOW_MIN * PX_PER_MIN)

const gridHours = computed(() => {
  const arr: { min: number; label: string }[] = []
  for (let m = DAY_START; m <= DAY_END; m += 120) {
    arr.push({ min: m, label: minutesToLabel(m) })
  }
  return arr
})

function blockStyle(b: { startMin: number; durationMin: number; category: WorkCategory; done: boolean }) {
  const top = Math.max(0, (b.startMin - DAY_START) * PX_PER_MIN)
  const height = Math.max(22, b.durationMin * PX_PER_MIN)
  return {
    top: `${top}px`,
    height: `${height}px`,
    opacity: b.done ? 0.55 : 1,
  }
}

function blockTimeLabel(b: { startMin: number; durationMin: number }): string {
  return `${minutesToLabel(b.startMin)}–${minutesToLabel(b.startMin + b.durationMin)}`
}
</script>

<style scoped>
.tbp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.tbp-head { display: flex; flex-direction: column; gap: 2px; }
.tbp-title { font-size: 16px; font-weight: 600; letter-spacing: 1px; color: var(--text-primary); }
.tbp-sub { font-size: 11px; color: var(--text-secondary); }

.tbp-datebar { display: flex; align-items: center; justify-content: center; gap: 10px; }
.tbp-nav {
  width: 30px; height: 30px; border-radius: 8px; cursor: pointer; font-size: 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.15); background: rgba(255, 255, 255, 0.04); color: var(--text-secondary);
}
.tbp-nav:hover { background: rgba(var(--accent-rgb), 0.12); color: var(--text-primary); }
.tbp-today {
  padding: 6px 14px; border-radius: 999px; cursor: pointer; font-size: 13px;
  border: 1px solid rgba(var(--accent-rgb), 0.15); background: rgba(var(--accent-rgb), 0.08); color: var(--accent);
}
.tbp-today:hover { background: rgba(var(--accent-rgb), 0.16); }

.tbp-add { display: flex; gap: 6px; flex-wrap: wrap; }
.tbp-input, .tbp-select {
  padding: 8px 10px; border-radius: 8px; font-size: 12px; color: var(--text-primary);
  border: 1px solid rgba(var(--accent-rgb), 0.12); background: rgba(255, 255, 255, 0.04); outline: none;
}
.tbp-input { flex: 1; min-width: 140px; }
.tbp-input--num { flex: 0 0 64px; }
.tbp-input--time { flex: 0 0 72px; }
.tbp-select { flex: 0 0 auto; cursor: pointer; }

.tbp-pool { display: flex; flex-direction: column; gap: 8px; }
.tbp-pool-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-secondary); letter-spacing: 1px; }
.tbp-pool-list { display: flex; flex-direction: column; gap: 6px; }
.tbp-task {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05);
}
.tbp-task--done { opacity: 0.5; }
.tbp-task-icon { font-size: 16px; }
.tbp-task-title { flex: 1; font-size: 13px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tbp-task-est { font-size: 11px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.tbp-task-place {
  padding: 4px 10px; border-radius: 7px; font-size: 11px; cursor: pointer;
  border: 1px solid rgba(var(--accent-rgb), 0.25); background: rgba(var(--accent-rgb), 0.1); color: var(--accent);
}
.tbp-task-place:hover { background: rgba(var(--accent-rgb), 0.2); }
.tbp-task-del {
  width: 22px; height: 22px; border-radius: 6px; border: none; background: transparent;
  color: rgba(196, 106, 90, 0.6); cursor: pointer; font-size: 13px;
}
.tbp-task-del:hover { color: #c46a5a; }

.tbp-empty, .tbp-timeline-empty { font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px 0; }
.tbp-auto-note { font-size: 11px; color: var(--accent); text-align: center; }

.tbp-btn {
  padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer;
  border: 1px solid rgba(var(--accent-rgb), 0.15); background: rgba(255, 255, 255, 0.04); color: var(--text-secondary);
}
.tbp-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.12); color: var(--text-primary); }
.tbp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tbp-btn--primary { background: rgba(var(--accent-rgb), 0.14); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.3); }
.tbp-btn--auto { color: var(--accent); border-color: rgba(var(--accent-rgb), 0.3); }

.tbp-timeline-wrap { display: flex; flex-direction: column; gap: 8px; }
.tbp-timeline-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 12px; color: var(--text-secondary); letter-spacing: 1px; }
.tbp-coverage { color: var(--accent); font-variant-numeric: tabular-nums; }
.tbp-overlap-note { color: #c46a5a; font-size: 11px; font-weight: 500; font-variant-numeric: tabular-nums; }

.tbp-timeline {
  position: relative; width: 100%;
  border-radius: 12px; overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.tbp-gridline {
  position: absolute; left: 0; right: 0; height: 0;
  border-top: 1px dashed rgba(var(--accent-rgb), 0.08);
}
.tbp-gridlabel {
  position: absolute; left: 6px; top: 1px; font-size: 9px; color: rgba(var(--accent-rgb), 0.35);
  font-variant-numeric: tabular-nums;
}
.tbp-block {
  position: absolute; left: 46px; right: 8px; display: flex; align-items: stretch; gap: 6px;
  border-radius: 8px; padding: 2px 6px 2px 0; overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.tbp-block-bar { width: 4px; border-radius: 4px; flex-shrink: 0; }
.tbp-block-body { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.tbp-block-row { display: flex; align-items: center; gap: 6px; }
.tbp-block-time { font-size: 10px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.tbp-block-cat { font-size: 12px; }
.tbp-block-title {
  font-size: 12px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tbp-block-actions { display: flex; flex-direction: column; gap: 1px; justify-content: center; }
.tbp-block-btn {
  width: 20px; height: 18px; border-radius: 4px; border: none; cursor: pointer; font-size: 11px;
  background: rgba(255, 255, 255, 0.05); color: var(--text-secondary);
}
.tbp-block-btn:hover { background: rgba(var(--accent-rgb), 0.18); color: var(--text-primary); }
.tbp-block-btn--del:hover { background: rgba(196, 106, 90, 0.25); color: #c46a5a; }

.tbp-manual { display: flex; flex-direction: column; gap: 8px; }
.tbp-manual-head { font-size: 12px; color: var(--text-secondary); letter-spacing: 1px; }
.tbp-manual-row { display: flex; gap: 6px; flex-wrap: wrap; }
.tbp-form-error { font-size: 11px; color: #c46a5a; }

.tbp-modebar { display: flex; gap: 6px; justify-content: center; }
.tbp-mode {
  padding: 5px 20px; border-radius: 999px; cursor: pointer; font-size: 13px; letter-spacing: 1px;
  border: 1px solid rgba(var(--accent-rgb), 0.15); background: rgba(255, 255, 255, 0.04); color: var(--text-secondary);
}
.tbp-mode--active { background: rgba(var(--accent-rgb), 0.16); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.35); }

.tbp-week-wrap { display: flex; flex-direction: column; gap: 8px; }
.tbp-week-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 12px; color: var(--text-secondary); letter-spacing: 1px; }
.tbp-week-colheads { display: flex; }
.tbp-week-colhead {
  flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 6px 0; cursor: pointer; font-size: 11px; color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.05); border-right: none; background: rgba(255, 255, 255, 0.02);
}
.tbp-week-colhead:last-child { border-right: 1px solid rgba(255, 255, 255, 0.05); }
.tbp-week-colhead--today { color: var(--accent); }
.tbp-week-colhead--active { background: rgba(var(--accent-rgb), 0.14); color: var(--text-primary); }
.tbp-week-colhead-dow { font-weight: 600; }
.tbp-week-colhead-date { font-size: 10px; font-variant-numeric: tabular-nums; opacity: 0.8; }

.tbp-week-grid {
  display: flex; width: 100%; border-radius: 12px; overflow: hidden;
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05);
}
.tbp-week-col { position: relative; flex: 1; min-width: 0; border-right: 1px solid rgba(255, 255, 255, 0.04); }
.tbp-week-col:last-child { border-right: none; }
.tbp-week-col--today { background: rgba(var(--accent-rgb), 0.04); }

.tbp-block--week { left: 3px; right: 3px; cursor: grab; touch-action: none; }
.tbp-block--week:active { cursor: grabbing; }
.tbp-block--overlap {
  border-color: rgba(196, 106, 90, 0.85);
  box-shadow: 0 0 0 1px rgba(196, 106, 90, 0.45), 0 0 10px rgba(196, 106, 90, 0.25);
}
.tbp-block-warn { font-size: 10px; color: #c46a5a; margin-left: 2px; flex-shrink: 0; }
.tbp-block-resize {
  position: absolute; left: 0; right: 0; bottom: 0; height: 9px; cursor: ns-resize; touch-action: none;
  border-radius: 0 0 8px 8px; background: linear-gradient(to top, rgba(var(--accent-rgb), 0.45), transparent);
}
.tbp-block-preview {
  position: absolute; top: -16px; left: 0; right: 0; font-size: 9px; text-align: center;
  color: var(--accent); background: rgba(0, 0, 0, 0.65); border-radius: 4px; padding: 1px 0;
  font-variant-numeric: tabular-nums; pointer-events: none; white-space: nowrap; overflow: hidden;
}
.tbp-week-col-empty { position: absolute; top: 50%; left: 0; right: 0; text-align: center; color: rgba(var(--accent-rgb), 0.22); font-size: 10px; transform: translateY(-50%); }
</style>
