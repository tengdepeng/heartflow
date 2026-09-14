<template>
  <section class="qbp-archive" aria-label="四象限任务看板">
    <!-- 空态（无任务） -->
    <template v-if="!hasData">
      <div class="qbp-head">
        <span class="qbp-title">🗂️ 四象限看板</span>
        <span class="qbp-badge qbp-badge-neutral">任务池未启</span>
      </div>
      <p class="qbp-empty">
        任务池还空着。记下第一件要事，它会落进四象限的某一格——紧急与重要，是取舍的两把尺子。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="qbp-head">
        <span class="qbp-title">🗂️ 四象限看板</span>
        <span class="qbp-badge qbp-badge-gold">{{ totalStats.total }} 件任务</span>
      </div>

      <!-- 看板汇总 -->
      <div class="qbp-summary">
        <span v-for="col in board" :key="col.quadrant" class="qbp-sum-item" :style="{ '--qbp-c': col.color }">
          <i class="qbp-sum-dot"></i>{{ col.label }}<b>{{ col.tasks.length }}</b>
        </span>
      </div>

      <!-- 四列看板 -->
      <div class="qbp-board">
        <div
          v-for="col in board"
          :key="col.quadrant"
          class="qbp-col"
          :style="{ '--qbp-c': col.color }"
        >
          <div class="qbp-col-head">
            <span class="qbp-col-label">{{ col.label }}</span>
            <span class="qbp-col-count">{{ col.stats.total }} 件 · {{ Math.round(col.stats.completionRate * 100) }}%</span>
          </div>
          <p class="qbp-col-desc">{{ col.desc }}</p>
          <div v-if="col.tasks.length" class="qbp-task-list">
            <div v-for="t in col.tasks" :key="t.id" class="qbp-task">
              <span class="qbp-task-title">{{ t.title }}</span>
              <div class="qbp-task-meta">
                <span class="qbp-task-status" :class="`s-${t.status}`">{{ statusLabel(t.status) }}</span>
                <span v-if="t.focusCount > 0" class="qbp-task-focus">🔥 {{ t.focusCount }}</span>
                <span v-if="dueMeta(t).status !== 'none'" class="qbp-task-due" :class="dueClass(t)">{{ dueMeta(t).label }}</span>
              </div>
            </div>
          </div>
          <p v-else class="qbp-col-empty">这一格还空着</p>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="qbp-insights">
        <li v-for="ins in insights" :key="ins" class="qbp-insight">
          <span class="qbp-insight-mark">✦</span>
          <span class="qbp-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTaskManager, buildQuadrantBoard, computeQuadrantStats, dueMeta } from '../modules/tasks'
import type { Task, TaskStatus } from '../modules/tasks'
import type { QuadrantBoardColumn } from '../modules/tasks'

const taskManager = useTaskManager()

const tasks = computed(() => taskManager.tasks.value)
const hasData = computed(() => tasks.value.length > 0)

const board = computed(() => buildQuadrantBoard(tasks.value))
const totalStats = computed(() => computeQuadrantStats(tasks.value))

const insights = computed(() => {
  const list: string[] = []
  for (const col of board.value) {
    if (col.tasks.length > 0) list.push(insightFor(col))
  }
  if (totalStats.value.total > 0) {
    const rate = Math.round(totalStats.value.completionRate * 100)
    const assessment = rate >= 70 ? '节奏稳健' : rate >= 40 ? '渐入佳境' : '仍在起步'
    list.push(`整体完成率 ${rate}%——${assessment}。`)
  }
  return list.slice(0, 4)
})

function insightFor(col: QuadrantBoardColumn): string {
  const n = col.tasks.length
  switch (col.quadrant) {
    case 'q1':
      return `「${col.label}」有 ${n} 件——它们最该被优先安放。`
    case 'q2':
      return `「${col.label}」有 ${n} 件——重要的事值得提前规划，不必等到火烧眉毛。`
    case 'q3':
      return `「${col.label}」有 ${n} 件——试着委托或消解，别让琐碎占据要紧的时间。`
    case 'q4':
      return `「${col.label}」有 ${n} 件——它们可以稍后再看，或干脆放下。`
  }
}

function statusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = { todo: '待办', doing: '进行中', done: '已完成' }
  return map[status]
}

function dueClass(t: Task): string {
  const s = dueMeta(t).status
  return s === 'overdue' ? 'overdue' : s === 'today' ? 'today' : ''
}
</script>

<style scoped>
.qbp-archive {
  display: block;
  width: 100%;
  max-width: 900px;
}
.qbp-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.qbp-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #ede5d8);
  letter-spacing: 0.02em;
}
.qbp-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.qbp-badge-gold {
  color: #f0c040;
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.qbp-badge-neutral {
  color: var(--text-secondary, #b5aa98);
  border-color: var(--border-light, #3a332a);
  background: transparent;
}
.qbp-empty {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #b5aa98);
}
.qbp-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.qbp-sum-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-primary, #ede5d8);
  background: color-mix(in srgb, var(--bg-card, #241f18) 55%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.qbp-sum-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--qbp-c, #f0c040);
  flex-shrink: 0;
}
.qbp-sum-item b {
  color: var(--qbp-c, #f0c040);
  font-weight: 600;
}
.qbp-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}
.qbp-col {
  padding: 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 45%, transparent);
  border: 1px solid var(--border-light, #3a332a);
  border-top: 2px solid var(--qbp-c, #f0c040);
}
.qbp-col-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.qbp-col-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--qbp-c, #f0c040);
}
.qbp-col-count {
  font-size: 11px;
  color: var(--text-secondary, #b5aa98);
  white-space: nowrap;
}
.qbp-col-desc {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary, #b5aa98);
  margin: 0 0 8px;
}
.qbp-task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.qbp-task {
  padding: 7px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 60%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.qbp-task-title {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #ede5d8);
  margin-bottom: 4px;
  word-break: break-all;
}
.qbp-task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  align-items: center;
}
.qbp-task-status {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  border: 1px solid;
}
.qbp-task-status.s-todo {
  color: var(--text-secondary, #b5aa98);
  border-color: var(--border-light, #3a332a);
}
.qbp-task-status.s-doing {
  color: #f0c040;
  border-color: color-mix(in srgb, #f0c040 40%, transparent);
}
.qbp-task-status.s-done {
  color: #8a9a7a;
  border-color: color-mix(in srgb, #8a9a7a 40%, transparent);
}
.qbp-task-focus {
  font-size: 10px;
  color: #c46a5a;
}
.qbp-task-due {
  font-size: 10px;
  color: var(--text-secondary, #b5aa98);
}
.qbp-task-due.overdue {
  color: #c46a5a;
}
.qbp-task-due.today {
  color: #f0c040;
}
.qbp-col-empty {
  font-size: 11px;
  color: var(--text-secondary, #b5aa98);
  opacity: 0.7;
  margin: 0;
}
.qbp-insights {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.qbp-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #ede5d8);
}
.qbp-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}
</style>
