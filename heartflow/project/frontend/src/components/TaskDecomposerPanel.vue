<template>
  <section class="tdp-panel" aria-label="任务拆解">
    <!-- 面板头 -->
    <div class="tdp-head">
      <div class="tdp-head-left">
        <span class="tdp-title">🧩 任务拆解</span>
        <span class="tdp-sub">{{ plans.length }} 份计划</span>
      </div>
      <span class="tdp-badge">本地启发式</span>
    </div>

    <!-- 拆解输入 -->
    <div class="tdp-block">
      <h3 class="tdp-block-title">拆解一项任务</h3>
      <p class="tdp-hint">输入自然语言任务，自动陈列可执行的步骤（不替你做判断）。</p>
      <div class="tdp-input-row">
        <input
          v-model="taskInput"
          type="text"
          placeholder="如：准备下周的项目汇报"
          class="tdp-input"
          @keyup.enter="handleDecompose"
        />
        <button class="tdp-btn tdp-btn--primary" :disabled="!canDecompose" @click="handleDecompose">
          拆解
        </button>
      </div>
      <div v-if="preview" class="tdp-preview">
        <div class="tdp-preview-head">
          <span class="tdp-intent-chip">{{ INTENT_META[preview.intent].label }}</span>
          <span class="tdp-preview-task">{{ preview.task }}</span>
        </div>
        <ol class="tdp-steps">
          <li v-for="(s, i) in preview.steps" :key="s.id" class="tdp-step">
            <span class="tdp-step-idx">{{ i + 1 }}</span>
            <span class="tdp-step-title">{{ s.title }}</span>
            <span class="tdp-step-pri" :class="`tdp-pri--${s.priority}`">{{ priLabel(s.priority) }}</span>
            <span v-if="s.estimateMinutes" class="tdp-step-est">约 {{ s.estimateMinutes }} 分钟</span>
          </li>
        </ol>
        <button class="tdp-btn" @click="savePreview">保存计划</button>
      </div>
    </div>

    <!-- 计划列表 -->
    <div class="tdp-block">
      <h3 class="tdp-block-title">已保存计划</h3>
      <div v-if="plans.length > 0" class="tdp-list">
        <div v-for="p in plans" :key="p.id" class="tdp-card">
          <div class="tdp-card-head">
            <span class="tdp-card-task">{{ p.task }}</span>
            <span class="tdp-card-intent">{{ INTENT_META[p.intent].label }}</span>
            <button class="tdp-link" :aria-label="`删除 ${p.task}`" @click="removePlan(p.id)">删除</button>
          </div>
          <div class="tdp-card-progress">
            {{ doneCount(p) }}/{{ p.steps.length }} 步完成
          </div>
          <div class="tdp-card-steps">
            <button
              v-for="s in p.steps"
              :key="s.id"
              class="tdp-step-chip"
              :class="`tdp-step-chip--${s.status}`"
              @click="handleToggleStep(p.id, s.id)"
            >
              {{ s.status === 'done' ? '✓' : s.status === 'doing' ? '◐' : '○' }} {{ s.title }}
            </button>
          </div>
        </div>
      </div>
      <p v-else class="tdp-empty">还没有拆解计划，输入一项任务开始吧。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDecomposer, decompose, INTENT_META } from '../modules/decomposer'
import type { StepPriority, DecomposePlan } from '../modules/decomposer'

const { plans, decomposeAndSave, toggleStep, remove } = useDecomposer()

const PRI_LABEL: Record<StepPriority, string> = {
  high: '高优先',
  medium: '中优先',
  low: '低优先',
}

function priLabel(p: StepPriority): string {
  return PRI_LABEL[p] ?? p
}

function doneCount(p: DecomposePlan): number {
  return p.steps.filter(s => s.status === 'done').length
}

// ---- 拆解 ----
const taskInput = ref('')
const preview = ref<DecomposePlan | null>(null)

const canDecompose = computed(() => taskInput.value.trim().length > 0)

function handleDecompose() {
  if (!canDecompose.value) return
  preview.value = decompose(taskInput.value.trim())
}

function savePreview() {
  if (!preview.value) return
  decomposeAndSave(preview.value.task)
  preview.value = null
  taskInput.value = ''
}

// ---- 计划管理 ----
function handleToggleStep(planId: string, stepId: string) {
  toggleStep(planId, stepId)
}

function removePlan(planId: string) {
  remove(planId)
}
</script>

<style scoped>
.tdp-panel {
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.10), rgba(138, 154, 122, 0.03));
  border: 1px solid rgba(138, 154, 122, 0.28);
  border-radius: 16px;
  padding: 18px 20px;
  margin-top: 16px;
  color: var(--text-primary, #e8e4da);
}

.tdp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.tdp-head-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.tdp-title {
  font-size: 16px;
  font-weight: 700;
}

.tdp-sub {
  font-size: 12px;
  opacity: 0.65;
}

.tdp-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.22);
  color: #8a9a7a;
}

.tdp-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(138, 154, 122, 0.2);
}

.tdp-block-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.tdp-hint {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 10px;
}

.tdp-input-row {
  display: flex;
  gap: 10px;
}

.tdp-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(138, 154, 122, 0.3);
  border-radius: 8px;
  color: inherit;
  padding: 8px 12px;
  font-size: 13px;
}

.tdp-btn {
  background: rgba(138, 154, 122, 0.18);
  border: 1px solid rgba(138, 154, 122, 0.4);
  color: inherit;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.tdp-btn--primary {
  background: rgba(138, 154, 122, 0.35);
}

.tdp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tdp-preview {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(138, 154, 122, 0.2);
  border-radius: 10px;
  padding: 12px;
}

.tdp-preview-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.tdp-intent-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.22);
  color: #8a9a7a;
}

.tdp-preview-task {
  font-size: 13px;
  opacity: 0.85;
}

.tdp-steps {
  list-style: none;
  padding: 0;
  margin: 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tdp-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.tdp-step-idx {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(138, 154, 122, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
}

.tdp-step-title {
  flex: 1;
}

.tdp-step-pri {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 6px;
}

.tdp-pri--high {
  background: rgba(196, 106, 90, 0.2);
  color: #c46a5a;
}

.tdp-pri--medium {
  background: rgba(240, 192, 64, 0.18);
  color: #d8b04a;
}

.tdp-pri--low {
  background: rgba(138, 154, 122, 0.18);
  color: #8a9a7a;
}

.tdp-step-est {
  font-size: 11px;
  opacity: 0.55;
}

.tdp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tdp-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(138, 154, 122, 0.2);
  border-radius: 10px;
  padding: 12px;
}

.tdp-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tdp-card-task {
  font-weight: 600;
  font-size: 13px;
  flex: 1;
}

.tdp-card-intent {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.18);
  color: #8a9a7a;
}

.tdp-link {
  background: none;
  border: none;
  color: #c46a5a;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
}

.tdp-card-progress {
  font-size: 12px;
  opacity: 0.65;
  margin-bottom: 8px;
}

.tdp-card-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tdp-step-chip {
  background: rgba(138, 154, 122, 0.12);
  border: 1px solid rgba(138, 154, 122, 0.25);
  color: inherit;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.tdp-step-chip--doing {
  border-color: rgba(240, 192, 64, 0.5);
  color: #d8b04a;
}

.tdp-step-chip--done {
  border-color: rgba(138, 154, 122, 0.5);
  color: #8a9a7a;
  opacity: 0.7;
}

.tdp-empty {
  font-size: 13px;
  opacity: 0.6;
  padding: 10px 0;
}
</style>
