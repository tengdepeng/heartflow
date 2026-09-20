<template>
  <section class="qbp-archive" aria-label="四象限任务看板">
    <!-- 新增任务（并入 QuadrantKanban 交互能力 INCR-399） -->
    <div class="qbp-add">
      <input
        v-model="newTitle"
        class="qbp-add-input"
        placeholder="输入任务，回车加入"
        @keydown.enter.prevent="quickAdd"
      />
      <label class="qbp-add-check"><input type="checkbox" v-model="newUrgency" /> 紧急</label>
      <label class="qbp-add-check"><input type="checkbox" v-model="newImportance" /> 重要</label>
      <button class="qbp-add-btn" :disabled="!newTitle.trim()" @click="quickAdd">添加</button>
    </div>

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
            <div
              v-for="t in col.tasks"
              :key="t.id"
              class="qbp-task"
              :class="{ done: t.status === 'done' }"
              @click="toggleTask(t.id)"
              :title="t.status === 'done' ? '点击恢复为待办' : '点击推进状态'"
            >
              <span class="qbp-task-title">{{ t.title }}</span>
              <div class="qbp-task-meta">
                <span class="qbp-task-status" :class="`s-${t.status}`">{{ statusLabel(t.status) }}</span>
                <span v-if="t.focusCount > 0" class="qbp-task-focus">🔥 {{ t.focusCount }}</span>
                <span v-if="dueMeta(t).status !== 'none'" class="qbp-task-due" :class="dueClass(t)">{{ dueMeta(t).label }}</span>
              </div>
              <button class="qbp-task-del" @click.stop="deleteTask(t.id)" title="删除">✕</button>
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
import { computed, ref } from 'vue'
import { useTaskManager, buildQuadrantBoard, computeQuadrantStats, dueMeta } from '../modules/tasks'
import type { Task, TaskStatus } from '../modules/tasks'
import type { QuadrantBoardColumn } from '../modules/tasks'

const taskManager = useTaskManager()

const tasks = computed(() => taskManager.tasks.value)
const hasData = computed(() => tasks.value.length > 0)

// ---- 交互任务管理（并入 QuadrantKanban 独有能力 INCR-399） ----
const newTitle = ref('')
const newUrgency = ref(false)
const newImportance = ref(true)

function quickAdd() {
  const title = newTitle.value.trim()
  if (!title) return
  taskManager.addTask({ title, urgency: newUrgency.value, importance: newImportance.value })
  newTitle.value = ''
  newUrgency.value = false
  newImportance.value = true
}

function toggleTask(id: string) {
  taskManager.toggleStatus(id)
}

function deleteTask(id: string) {
  taskManager.removeTask(id)
}

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
.qbp-add {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.qbp-add-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-light, #3a332a);
  background: color-mix(in srgb, var(--bg-card, #241f18) 55%, transparent);
  color: var(--text-primary, #ede5d8);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.qbp-add-input:focus {
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
}
.qbp-add-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0.85;
  cursor: pointer;
}
.qbp-add-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 14%, transparent);
  color: #f0c040;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}
.qbp-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  display: flex;
  flex-direction: column;
  padding: 7px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 60%, transparent);
  border: 1px solid var(--border-light, #3a332a);
  cursor: pointer;
  transition: background 0.15s;
}
.qbp-task:hover {
  background: color-mix(in srgb, var(--bg-card, #241f18) 78%, transparent);
}
.qbp-task-title {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #ede5d8);
  margin-bottom: 4px;
  word-break: break-all;
}
.qbp-task.done {
  opacity: 0.55;
}
.qbp-task.done .qbp-task-title {
  text-decoration: line-through;
}
.qbp-task-del {
  margin-top: 4px;
  align-self: flex-end;
  border: none;
  background: transparent;
  color: var(--text-secondary, #b5aa98);
  opacity: 0.45;
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
  min-height: 24px;
  min-width: 24px;
}
.qbp-task-del:hover {
  opacity: 1;
  color: #c46a5a;
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
