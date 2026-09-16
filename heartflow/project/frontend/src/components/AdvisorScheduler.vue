<template>
  <div class="advisor-scheduler">
    <h3 class="as-title">幕僚调度面板</h3>

    <!-- 任务感知概览 -->
    <div class="as-awareness-grid">
      <div class="as-awareness-card">
        <span class="as-card-icon">🎯</span>
        <span class="as-card-value">{{ awareness.focusCount }}</span>
        <span class="as-card-label">今日专注</span>
      </div>
      <div class="as-awareness-card">
        <span class="as-card-icon">📝</span>
        <span class="as-card-value">{{ awareness.noteCount }}</span>
        <span class="as-card-label">笔记</span>
      </div>
      <div class="as-awareness-card">
        <span class="as-card-icon">🌸</span>
        <span class="as-card-value">{{ awareness.emotionCount }}</span>
        <span class="as-card-label">情绪</span>
      </div>
      <div class="as-awareness-card">
        <span class="as-card-icon">⚓</span>
        <span class="as-card-value">{{ awareness.anchorCount }}</span>
        <span class="as-card-label">待锚点</span>
      </div>
    </div>

    <!-- 分身调度 -->
    <div class="as-dispatch-section">
      <h4 class="as-section-title">分身调度</h4>
      <div class="as-dispatch-grid">
        <button
          v-for="task in dispatchTasks"
          :key="task.type"
          class="as-dispatch-card"
          :class="{ 'as-dispatched': dispatchResult[task.type] }"
          @click="handleDispatch(task.type)"
        >
          <span class="as-dispatch-icon">{{ task.icon }}</span>
          <span class="as-dispatch-label">{{ task.label }}</span>
          <span v-if="dispatchResult[task.type]" class="as-dispatch-result">
            <span class="as-result-name">{{ dispatchResult[task.type]?.name }}</span>
            <span class="as-result-affinity">{{ dispatchResult[task.type]?.affinity }}%</span>
          </span>
          <span v-else class="as-dispatch-hint">点击调度</span>
        </button>
      </div>
    </div>

    <!-- 进度展示 -->
    <div class="as-progress-section">
      <h4 class="as-section-title">今日进度</h4>
      <div class="as-progress-list">
        <div
          v-for="item in progressItems"
          :key="item.key"
          class="as-progress-item"
        >
          <div class="as-progress-header">
            <span class="as-progress-label">{{ item.label }}</span>
            <span class="as-progress-count">{{ item.current }}/{{ item.total }}</span>
          </div>
          <div class="as-progress-track">
            <div
              class="as-progress-fill"
              :style="{ width: item.percent + '%' }"
              :class="'as-progress-' + item.key"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useAdvisor } from '../resonance/bridges/advisor'

const advisor = useAdvisor()

/** 任务感知数据 */
const awareness = computed(() => advisor.getTaskAwareness())

/** 任务进度 */
const progress = computed(() => advisor.getTaskProgress())

/** 进度展示列表 */
const progressItems = computed(() => [
  {
    key: 'focus',
    label: progress.value.focus.label,
    current: progress.value.focus.current,
    total: progress.value.focus.total,
    percent: Math.min(100, (progress.value.focus.current / progress.value.focus.total) * 100),
  },
  {
    key: 'notes',
    label: progress.value.notes.label,
    current: progress.value.notes.current,
    total: progress.value.notes.total,
    percent: Math.min(100, (progress.value.notes.current / progress.value.notes.total) * 100),
  },
  {
    key: 'emotions',
    label: progress.value.emotions.label,
    current: progress.value.emotions.current,
    total: progress.value.emotions.total,
    percent: Math.min(100, (progress.value.emotions.current / progress.value.emotions.total) * 100),
  },
  {
    key: 'anchors',
    label: progress.value.anchors.label,
    current: progress.value.anchors.current,
    total: progress.value.anchors.total,
    percent: Math.min(100, (progress.value.anchors.current / progress.value.anchors.total) * 100),
  },
])

/** 调度任务定义 */
const dispatchTasks = [
  { type: 'focus', icon: '🎯', label: '专注调度' },
  { type: 'note', icon: '📝', label: '笔记调度' },
  { type: 'emotion', icon: '🌸', label: '情绪调度' },
  { type: 'anchor', icon: '⚓', label: '锚点调度' },
]

/** 调度结果状态 */
interface DispatchResult {
  id: string
  name: string
  role: string
  affinity: number
}

const dispatchResult = reactive<Record<string, DispatchResult | null>>({
  focus: null,
  note: null,
  emotion: null,
  anchor: null,
})

/** 执行分身调度 */
function handleDispatch(taskType: string) {
  const result = advisor.dispatchAvatar(taskType)
  dispatchResult[taskType] = result
}
</script>

<style scoped>
.advisor-scheduler {
  background: rgba(14, 16, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(14px);
  min-width: 280px;
}

.as-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 12px;
  letter-spacing: 0.5px;
}

/* ========== 任务感知概览 ========== */
.as-awareness-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.as-awareness-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  background: var(--bg-surface);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.as-card-icon {
  font-size: 16px;
  line-height: 1;
}

.as-card-value {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.2;
}

.as-card-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.3px;
}

/* ========== 分身调度 ========== */
.as-section-title {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  margin: 0 0 8px;
  letter-spacing: 0.5px;
}

.as-dispatch-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.as-dispatch-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  color: inherit;
}

.as-dispatch-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.as-dispatch-card.as-dispatched {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.06);
}

.as-dispatch-icon {
  font-size: 20px;
  line-height: 1;
}

.as-dispatch-label {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.as-dispatch-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  margin-top: 2px;
}

.as-result-name {
  font-size: 10px;
  font-weight: 600;
  color: rgba(var(--accent-rgb), 0.8);
}

.as-result-affinity {
  font-size: 9px;
  color: rgba(var(--accent-rgb), 0.5);
}

.as-dispatch-hint {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

/* ========== 进度展示 ========== */
.as-progress-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.as-progress-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.as-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.as-progress-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.as-progress-count {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.as-progress-track {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.as-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.as-progress-focus {
  background: linear-gradient(90deg, rgba(240, 192, 64, 0.4), rgba(240, 192, 64, 0.7));
}

.as-progress-notes {
  background: linear-gradient(90deg, rgba(124, 196, 124, 0.4), rgba(124, 196, 124, 0.7));
}

.as-progress-emotions {
  background: linear-gradient(90deg, rgba(124, 197, 240, 0.4), rgba(124, 197, 240, 0.7));
}

.as-progress-anchors {
  background: linear-gradient(90deg, rgba(192, 124, 240, 0.4), rgba(192, 124, 240, 0.7));
}
</style>