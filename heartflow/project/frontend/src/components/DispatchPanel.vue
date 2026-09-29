<template>
  <section class="dsp-panel" aria-label="幕僚调度">
    <!-- 面板头 -->
    <div class="dsp-head">
      <div class="dsp-head-left">
        <span class="dsp-title">🎯 幕僚调度</span>
        <span class="dsp-sub">{{ records.length }} 次调令</span>
      </div>
      <span class="dsp-badge">单一 · 并行 · 串行</span>
    </div>

    <!-- 下达调令 -->
    <div class="dsp-block">
      <h3 class="dsp-block-title">下达调令</h3>
      <p class="dsp-hint">输入调令并选择幕僚，自动判定调度策略（含先后词则串行）。</p>
      <div class="dsp-issue">
        <input
          v-model="orderInput"
          type="text"
          placeholder="如：先整理素材，再撰写初稿"
          class="dsp-input"
          @keyup.enter="handleIssue"
        />
        <button class="dsp-btn dsp-btn--primary" :disabled="!canIssue" @click="handleIssue">
          下达
        </button>
      </div>
      <div class="dsp-advisors">
        <button
          v-for="a in advisors"
          :key="a.id"
          class="dsp-advisor-chip"
          :class="{ 'dsp-advisor-chip--on': selectedIds.includes(a.id) }"
          @click="toggleAdvisor(a.id)"
        >
          {{ a.name }}
        </button>
      </div>
      <p v-if="issuedMsg" class="dsp-issued">{{ issuedMsg }}</p>
    </div>

    <!-- 调令列表 -->
    <div class="dsp-block">
      <h3 class="dsp-block-title">调令记录</h3>
      <div v-if="records.length > 0" class="dsp-list">
        <div v-for="r in records" :key="r.id" class="dsp-card">
          <div class="dsp-card-head">
            <span class="dsp-card-order">{{ r.order }}</span>
            <span class="dsp-chip dsp-chip--strategy">{{ strategyLabel(r.strategy) }}</span>
            <span class="dsp-chip" :class="`dsp-chip--${r.status}`">{{ statusLabel(r.status) }}</span>
            <button class="dsp-link" :aria-label="`删除 ${r.order}`" @click="removeRecord(r.id)">删除</button>
          </div>
          <div class="dsp-card-progress">
            {{ doneCount(r) }}/{{ r.steps.length }} 步完成
          </div>
          <div class="dsp-card-steps">
            <div v-for="s in r.steps" :key="s.advisorId" class="dsp-step">
              <span class="dsp-step-adv">{{ advisorName(s.advisorId) }}</span>
              <span class="dsp-step-status" :class="`dsp-step-status--${s.status}`">
                {{ stepStatusLabel(s.status) }}
              </span>
              <span v-if="r.result[s.advisorId]" class="dsp-step-result">{{ r.result[s.advisorId] }}</span>
              <input
                v-if="s.status === 'working'"
                v-model="stepResults[r.id + ':' + s.advisorId]"
                type="text"
                placeholder="填入该幕僚的产出"
                class="dsp-step-input"
                @keyup.enter="finish(r.id, s.advisorId)"
              />
            </div>
          </div>
          <div class="dsp-card-actions">
            <button v-if="r.status === 'queued'" class="dsp-btn dsp-btn--small" @click="handleBegin(r.id)">
              开始执行
            </button>
            <button
              v-if="r.status === 'running' || r.status === 'collecting'"
              class="dsp-btn dsp-btn--small"
              @click="handleHalt(r.id)"
            >
              中止
            </button>
          </div>
        </div>
      </div>
      <p v-else class="dsp-empty">还没有调令，下达一项任务开始调度吧。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDispatch } from '../modules/dispatch'
import type { DispatchStrategy, DispatchRecord, DispatchStep } from '../modules/dispatch'
import { DEFAULT_ADVISOR_PRESETS } from '../modules/advisor/presets'

const { records, issue, begin, finishStep, halt, remove } = useDispatch()

const advisors = DEFAULT_ADVISOR_PRESETS

const STRATEGY_LABEL: Record<DispatchStrategy, string> = {
  single: '单一',
  parallel: '并行',
  serial: '串行',
}

const STATUS_LABEL: Record<DispatchRecord['status'], string> = {
  queued: '排队中',
  running: '执行中',
  collecting: '收集结果',
  done: '已完成',
  halted: '已中止',
}

const STEP_STATUS_LABEL: Record<DispatchStep['status'], string> = {
  pending: '待执行',
  working: '执行中',
  done: '已完成',
  skipped: '已跳过',
}

function strategyLabel(s: DispatchStrategy): string {
  return STRATEGY_LABEL[s] ?? s
}

function statusLabel(s: DispatchRecord['status']): string {
  return STATUS_LABEL[s] ?? s
}

function stepStatusLabel(s: DispatchStep['status']): string {
  return STEP_STATUS_LABEL[s] ?? s
}

function advisorName(id: string): string {
  return advisors.find(a => a.id === id)?.name ?? id
}

function doneCount(r: DispatchRecord): number {
  return r.steps.filter(s => s.status === 'done').length
}

// ---- 下达调令 ----
const orderInput = ref('')
const selectedIds = ref<string[]>([])
const issuedMsg = ref('')

const canIssue = computed(() => orderInput.value.trim().length > 0 && selectedIds.value.length > 0)

function toggleAdvisor(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function handleIssue() {
  if (!canIssue.value) return
  const rec = issue(orderInput.value.trim(), [...selectedIds.value])
  issuedMsg.value = `已下达「${rec.order}」，策略：${strategyLabel(rec.strategy)}`
  orderInput.value = ''
  selectedIds.value = []
}

// ---- 调令管理 ----
const stepResults = ref<Record<string, string>>({})

function handleBegin(id: string) {
  begin(id)
}

function finish(recId: string, advisorId: string) {
  const key = recId + ':' + advisorId
  const result = stepResults.value[key] ?? ''
  if (finishStep(recId, result)) {
    stepResults.value[key] = ''
  }
}

function handleHalt(id: string) {
  halt(id, '用户中止')
}

function removeRecord(id: string) {
  remove(id)
}
</script>

<style scoped>
.dsp-panel {
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.10), rgba(138, 154, 122, 0.03));
  border: 1px solid rgba(138, 154, 122, 0.28);
  border-radius: 16px;
  padding: 18px 20px;
  margin-top: 16px;
  color: var(--text-primary, #e8e0d8);
}

.dsp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.dsp-head-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.dsp-title {
  font-size: 16px;
  font-weight: 700;
}

.dsp-sub {
  font-size: 12px;
  opacity: 0.65;
}

.dsp-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.22);
  color: #8a9a7a;
}

.dsp-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(138, 154, 122, 0.2);
}

.dsp-block-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.dsp-hint {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 10px;
}

.dsp-issue {
  display: flex;
  gap: 10px;
}

.dsp-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(138, 154, 122, 0.3);
  border-radius: 8px;
  color: inherit;
  padding: 8px 12px;
  font-size: 13px;
}

.dsp-btn {
  background: rgba(138, 154, 122, 0.18);
  border: 1px solid rgba(138, 154, 122, 0.4);
  color: inherit;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.dsp-btn--primary {
  background: rgba(138, 154, 122, 0.35);
}

.dsp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dsp-btn--small {
  padding: 5px 12px;
  font-size: 12px;
}

.dsp-advisors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.dsp-advisor-chip {
  background: rgba(138, 154, 122, 0.12);
  border: 1px solid rgba(138, 154, 122, 0.25);
  color: inherit;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.dsp-advisor-chip--on {
  background: rgba(138, 154, 122, 0.35);
  border-color: rgba(138, 154, 122, 0.6);
}

.dsp-issued {
  margin-top: 8px;
  font-size: 12px;
  color: #8a9a7a;
}

.dsp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dsp-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(138, 154, 122, 0.2);
  border-radius: 10px;
  padding: 12px;
}

.dsp-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.dsp-card-order {
  font-weight: 600;
  font-size: 13px;
  flex: 1;
}

.dsp-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.18);
  color: #8a9a7a;
}

.dsp-chip--strategy {
  background: rgba(240, 192, 64, 0.18);
  color: #d8b04a;
}

.dsp-chip--done {
  background: rgba(138, 154, 122, 0.25);
  color: #8a9a7a;
}

.dsp-chip--running,
.dsp-chip--collecting {
  background: rgba(240, 192, 64, 0.2);
  color: #d8b04a;
}

.dsp-chip--halted {
  background: rgba(196, 106, 90, 0.2);
  color: #c46a5a;
}

.dsp-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  background: none;
  border: none;
  color: #c46a5a;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;

  min-height: 26px;
}

.dsp-card-progress {
  font-size: 12px;
  opacity: 0.65;
  margin-bottom: 8px;
}

.dsp-card-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.dsp-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.dsp-step-adv {
  font-weight: 600;
  min-width: 48px;
}

.dsp-step-status {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(138, 154, 122, 0.15);
  color: #8a9a7a;
}

.dsp-step-status--working {
  background: rgba(240, 192, 64, 0.18);
  color: #d8b04a;
}

.dsp-step-status--done {
  background: rgba(138, 154, 122, 0.25);
  color: #8a9a7a;
}

.dsp-step-result {
  opacity: 0.75;
  flex: 1;
}

.dsp-step-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(138, 154, 122, 0.3);
  border-radius: 6px;
  color: inherit;
  padding: 4px 8px;
  font-size: 12px;
}

.dsp-card-actions {
  display: flex;
  gap: 8px;
}

.dsp-empty {
  font-size: 13px;
  opacity: 0.6;
  padding: 10px 0;
}
</style>
