<template>
  <section class="kanban">
    <h4 class="kb-title">🗂 四象限看板</h4>
    <p class="kb-hint">紧急 × 重要 矩阵 · 进行中优先 · 专注次数越多越靠前（滴答清单 / Things3 式）</p>

    <!-- 新增任务 -->
    <div class="kb-add">
      <input v-model="newTitle" class="kb-input" placeholder="输入任务，回车加入 Q1 要事" @keydown.enter.prevent="quickAdd" />
      <div class="kb-quick">
        <label><input type="checkbox" v-model="newUrgency" /> 紧急</label>
        <label><input type="checkbox" v-model="newImportance" /> 重要</label>
      </div>
      <button class="kb-btn" @click="quickAdd">添加</button>
    </div>

    <!-- 四象限列 -->
    <div class="kb-board">
      <div v-for="col in board" :key="col.quadrant" class="kb-col" :style="{ '--kb-accent': col.color }">
        <div class="kb-col-head">
          <span class="kb-col-dot"></span>
          <span class="kb-col-label">{{ col.label }}</span>
          <span class="kb-col-count">{{ col.stats.active }}<template v-if="col.stats.done">/{{ col.stats.total }}</template></span>
        </div>
        <div class="kb-col-desc">{{ col.desc }}</div>
        <div class="kb-col-body">
          <div
            v-for="t in col.tasks"
            :key="t.id"
            class="kb-card"
            :class="{ 'is-done': t.status === 'done' }"
            @click="toggleStatus(t.id)"
            :title="t.title"
          >
            <div class="kb-card-top">
              <span class="kb-card-status">{{ STATUS_LABEL[t.status] }}</span>
              <span class="kb-card-focus" v-if="t.focusCount">⏱ {{ t.focusCount }}</span>
            </div>
            <div class="kb-card-title">{{ t.title }}</div>
            <div class="kb-card-foot">
              <button class="kb-del" @click.stop="removeTask(t.id)" title="删除">✕</button>
            </div>
          </div>
          <div v-if="col.tasks.length === 0" class="kb-empty">空</div>
        </div>
        <div class="kb-col-stat">
          完成率 {{ pct(col.stats) }}% · 专注 {{ col.stats.totalFocus }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTaskManager } from '../modules/tasks/task'
import {
  buildQuadrantBoard,
  type QuadrantBoard,
} from '../modules/tasks/quadrant-board'

const { tasks, load, addTask, toggleStatus, removeTask } = useTaskManager()

const board = computed<QuadrantBoard>(() => buildQuadrantBoard(tasks.value))

const STATUS_LABEL: Record<string, string> = { todo: '待办', doing: '进行中', done: '已完成' }

const newTitle = ref('')
const newUrgency = ref(false)
const newImportance = ref(true)

function quickAdd() {
  const title = newTitle.value.trim()
  if (!title) return
  addTask({
    title,
    urgency: newUrgency.value,
    importance: newImportance.value,
  })
  newTitle.value = ''
}

function pct(stats: QuadrantBoard[number]['stats']): number {
  return Math.round(stats.completionRate * 100)
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.kanban {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
}
.kb-title { margin: 0; }
.kb-hint { margin: 4px 0 12px; font-size: 12px; opacity: 0.62; }

.kb-add { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.kb-input {
  flex: 1; min-width: 200px; padding: 8px 10px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: inherit; font-size: 13px;
}
.kb-quick { display: inline-flex; gap: 12px; font-size: 12px; opacity: 0.85; }
.kb-btn {
  padding: 8px 14px; border-radius: 8px; border: none; background: rgba(107,159,196,0.2);
  color: #cfe0ff; font-size: 13px; cursor: pointer;
}
.kb-btn:hover { background: rgba(107,159,196,0.32); }

.kb-board {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;
}
@media (max-width: 900px) { .kb-board { grid-template-columns: repeat(2, 1fr); } }

.kb-col {
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px;
  border-top: 3px solid var(--kb-accent);
}
.kb-col-head { display: flex; align-items: center; gap: 7px; }
.kb-col-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--kb-accent); }
.kb-col-label { font-size: 13px; font-weight: 700; }
.kb-col-count {
  margin-left: auto; font-size: 11px; padding: 1px 7px; border-radius: 999px;
  background: rgba(255,255,255,0.07); opacity: 0.9;
}
.kb-col-desc { font-size: 11px; opacity: 0.55; }
.kb-col-body { display: flex; flex-direction: column; gap: 7px; min-height: 60px; }

.kb-card {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px; padding: 8px 10px; cursor: pointer; transition: background 0.15s;
}
.kb-card:hover { background: rgba(255,255,255,0.09); }
.kb-card.is-done { opacity: 0.5; }
.kb-card.is-done .kb-card-title { text-decoration: line-through; }
.kb-card-top { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.7; margin-bottom: 4px; }
.kb-card-title { font-size: 13px; line-height: 1.4; word-break: break-word; }
.kb-card-foot { display: flex; justify-content: flex-end; margin-top: 4px; }
.kb-del { border: none; background: transparent; color: inherit; opacity: 0.4; cursor: pointer; font-size: 12px; }
.kb-del:hover { opacity: 1; color: #ff9a9a; }

.kb-empty { font-size: 12px; opacity: 0.4; text-align: center; padding: 14px 0; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; }
.kb-col-stat { font-size: 10px; opacity: 0.55; text-align: right; }
</style>