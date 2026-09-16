<template>
  <section class="mirror-deep" aria-label="镜我深度能力">
    <div class="mdp-head">
      <h2 class="mdp-title">镜我深处</h2>
      <div class="mdp-tabs" role="tablist">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          class="mdp-tab"
          :class="{ 'is-active': tab === t.key }"
          role="tab"
          :aria-selected="tab === t.key"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- ============ 年度对话 ============ -->
    <div v-show="tab === 'annual'" class="mdp-body">
      <div class="mdp-annual-ctrl">
        <label class="mdp-field">
          <span class="mdp-field-label">年份</span>
          <input v-model.number="annualYear" type="number" class="mdp-input" min="2000" :max="currentYear" />
        </label>
        <button type="button" class="mdp-btn" @click="generateAnnual">展开这一年</button>
      </div>

      <div v-if="letter" class="mdp-letter">
        <p class="mdp-letter-open">{{ letter.opening }}</p>
        <div v-if="letter.tone === '静默'" class="mdp-letter-empty">
          这一年还没有留下任何痕迹。静默也是一种陈列。
        </div>
        <div v-else class="mdp-letter-months">
          <div v-for="m in letter.months" :key="m.month" class="mdp-letter-month">
            <span class="mdp-letter-month-label">{{ m.month }} 月</span>
            <ul class="mdp-letter-notes">
              <li v-for="(n, i) in m.notes" :key="i">{{ n }}</li>
            </ul>
          </div>
        </div>
        <div v-if="letter.milestones.length" class="mdp-letter-milestones">
          <span class="mdp-letter-milestone-tag" v-for="(m, i) in letter.milestones" :key="i">{{ m }}</span>
        </div>
        <p class="mdp-letter-close">{{ letter.closing }}</p>
      </div>
    </div>

    <!-- ============ 幕僚调度 ============ -->
    <div v-show="tab === 'dispatch'" class="mdp-body">
      <form class="mdp-dispatch-form" @submit.prevent="issueDispatch">
        <label class="mdp-field">
          <span class="mdp-field-label">调令</span>
          <input v-model="dispatchOrder" type="text" class="mdp-input" placeholder="例：先拟大纲，再成文" />
        </label>
        <span class="mdp-field-label mdp-select-label">幕僚</span>
        <div class="mdp-chips">
          <button
            v-for="a in ADVISOR_NAMES"
            :key="a"
            type="button"
            class="mdp-chip"
            :class="{ 'is-on': dispatchAdvisors.includes(a) }"
            @click="toggleAdvisor(a)"
          >
            {{ a }}
          </button>
        </div>
        <div class="mdp-dispatch-actions">
          <button type="submit" class="mdp-btn" :disabled="!dispatchOrder || dispatchAdvisors.length === 0">
            下达调令
          </button>
          <span v-if="dispatchAdvisors.length > 0" class="mdp-strategy">
            策略：{{ strategyLabel(detectStrategy(dispatchOrder, dispatchAdvisors)) }}
          </span>
        </div>
      </form>

      <div v-if="dispatchRecords.length === 0" class="mdp-empty">
        尚未下达调令。调度只在本地执行。
      </div>
      <ul v-else class="mdp-dispatch-list">
        <li v-for="rec in dispatchRecords" :key="rec.id" class="mdp-dispatch-item">
          <div class="mdp-dispatch-top">
            <span class="mdp-dispatch-order">{{ rec.order }}</span>
            <span class="mdp-dispatch-badge" :class="'st-' + rec.status">{{ statusLabel(rec.status) }}</span>
          </div>
          <div class="mdp-dispatch-steps">
            <span
              v-for="(s, i) in rec.steps"
              :key="i"
              class="mdp-step-pill"
              :class="'st-' + s.status"
              :title="s.detail || s.advisorId"
            >
              {{ advisorShort(s.advisorId) }}
            </span>
          </div>
          <div class="mdp-dispatch-ctrl">
            <button v-if="rec.status === 'queued'" type="button" class="mdp-btn mdp-btn-sm" @click="beginDispatch(rec.id)">
              开始
            </button>
            <button
              v-if="rec.status === 'running'"
              type="button"
              class="mdp-btn mdp-btn-sm"
              :disabled="!pendingWorkingId(rec)"
              @click="finishCurrent(rec.id)"
            >
              完成当前
            </button>
            <button v-if="rec.status === 'running' || rec.status === 'queued'" type="button" class="mdp-btn mdp-btn-sm mdp-btn-ghost" @click="haltDispatch(rec.id)">
              中止
            </button>
            <button v-if="rec.status === 'done'" type="button" class="mdp-btn mdp-btn-sm mdp-btn-ghost" @click="removeDispatch(rec.id)">
              收起
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- ============ 任务拆解 ============ -->
    <div v-show="tab === 'decompose'" class="mdp-body">
      <form class="mdp-decompose-form" @submit.prevent="runDecompose">
        <label class="mdp-field">
          <span class="mdp-field-label">任务一句话</span>
          <input v-model="decomposeInput" type="text" class="mdp-input" placeholder="例：整理房间 / 写一篇论文 / 背单词复习" />
        </label>
        <button type="submit" class="mdp-btn" :disabled="!decomposeInput.trim()">拆解</button>
      </form>

      <div v-if="plans.length === 0" class="mdp-empty">
        还没有拆解过的任务。
      </div>
      <ul v-else class="mdp-plan-list">
        <li v-for="plan in plans" :key="plan.id" class="mdp-plan-item">
          <div class="mdp-plan-top">
            <span class="mdp-plan-task">{{ plan.task }}</span>
            <span class="mdp-plan-intent">{{ intentLabel(plan.intent) }} · {{ plan.source === 'explicit' ? '分行拆解' : '模板补齐' }}</span>
            <button type="button" class="mdp-plan-remove" title="移除" @click="removePlan(plan.id)">×</button>
          </div>
          <ul class="mdp-plan-steps">
            <li v-for="s in plan.steps" :key="s.id" class="mdp-plan-step" :class="'st-' + s.status">
              <button type="button" class="mdp-step-check" :aria-label="'切换完成态：' + s.title" @click="toggleStep(plan.id, s.id)">
                {{ s.status === 'done' ? '✓' : s.status === 'doing' ? '◐' : '' }}
              </button>
              <span class="mdp-step-title">{{ s.title }}</span>
              <span v-if="s.estimateMinutes" class="mdp-step-est">{{ s.estimateMinutes }}′</span>
              <span v-if="s.priority === 'high'" class="mdp-step-prio">高</span>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storage } from '../engine/storage'
import { collectAnnual } from '../modules/annual-review'
import type { AnnualLetter, AnnualSource } from '../modules/annual-review'
import { detectStrategy, useDispatch } from '../modules/dispatch'
import type { DispatchStrategy } from '../modules/dispatch'
import { useDecomposer } from '../modules/decomposer'
import type { TaskIntent } from '../modules/decomposer'

const TABS = [
  { key: 'annual', label: '年度对话' },
  { key: 'dispatch', label: '幕僚调度' },
  { key: 'decompose', label: '任务拆解' },
] as const
type TabKey = (typeof TABS)[number]['key']
const tab = ref<TabKey>('annual')

const currentYear = new Date().getFullYear()
const annualYear = ref(currentYear)
const letter = ref<AnnualLetter | null>(null)

const sourceFor = (year: number): AnnualSource => {
  const emotions = storage
    .getEmotions()
    .map((e) => ({ at: e.createdAt, type: e.type }))
  const focus = storage
    .getSessions()
    .filter((s) => s.status === 'completed' && s.completedAt)
    .map((s) => ({ at: s.completedAt as string, totalSeconds: Math.round(s.elapsed / 1000) }))
  const anchors = storage
    .getAnchors()
    .map((a) => ({ at: a.doneAt ?? a.createdAt, text: a.text, done: a.done }))
  void year
  return { emotions, focus, anchors, milestones: [] }
}

function generateAnnual() {
  letter.value = collectAnnual(annualYear.value, sourceFor(annualYear.value))
}

// ---- 幕僚调度 ----
const ADVISOR_NAMES = ['镜我', '追风', '灵犀', '默渊', '时痕', '守钟人']
const dispatch = useDispatch()
const dispatchRecords = computed(() => dispatch.records.value)
const dispatchOrder = ref('')
const dispatchAdvisors = ref<string[]>([])

function toggleAdvisor(name: string) {
  const i = dispatchAdvisors.value.indexOf(name)
  if (i >= 0) dispatchAdvisors.value.splice(i, 1)
  else dispatchAdvisors.value.push(name)
}
function issueDispatch() {
  if (!dispatchOrder.value.trim() || dispatchAdvisors.value.length === 0) return
  dispatch.issue(dispatchOrder.value.trim(), [...dispatchAdvisors.value])
  dispatchOrder.value = ''
}
function beginDispatch(id: string) {
  dispatch.begin(id)
}
function pendingWorkingId(rec: { steps: { advisorId: string; status: string }[] }): boolean {
  return rec.steps.some((s) => s.status === 'working' || s.status === 'pending')
}
function advisorShort(id: string): string {
  return id.length > 3 ? id.slice(0, 3) : id
}
function finishCurrent(id: string) {
  // 以当前正在执行的步骤名作为产出陈列（调度结果交由用户后续补充）
  const rec = dispatchRecords.value.find((r) => r.id === id)
  const working = rec?.steps.find((s) => s.status === 'working') ?? rec?.steps.find((s) => s.status === 'pending')
  if (rec && working) dispatch.finishStep(id, working.advisorId + '：已完成')
}
function haltDispatch(id: string) {
  dispatch.halt(id)
}
function removeDispatch(id: string) {
  dispatch.remove(id)
}

const STRATEGY_LABELS: Record<DispatchStrategy, string> = {
  single: '单一',
  parallel: '并行',
  serial: '串行',
}
function strategyLabel(s: DispatchStrategy): string {
  return STRATEGY_LABELS[s]
}
const STATUS_LABELS: Record<string, string> = {
  queued: '待命',
  running: '执行中',
  collecting: '收集中',
  done: '汇毕',
  halted: '中止',
}
function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s
}

// ---- 任务拆解 ----
const decomposer = useDecomposer()
const plans = computed(() => decomposer.plans.value)
const decomposeInput = ref('')
function runDecompose() {
  if (!decomposeInput.value.trim()) return
  decomposer.decomposeAndSave(decomposeInput.value.trim())
  decomposeInput.value = ''
}
function toggleStep(planId: string, stepId: string) {
  decomposer.toggleStep(planId, stepId)
}
function removePlan(planId: string) {
  decomposer.remove(planId)
}
const INTENT_LABELS: Record<TaskIntent, string> = {
  output: '写作产出',
  study: '学习记忆',
  meeting: '会议沟通',
  coding: '编程实现',
  event: '活动出行',
  project: '项目推进',
  health: '健康锻炼',
  generic: '一般事务',
}
function intentLabel(i: TaskIntent): string {
  return INTENT_LABELS[i]
}
</script>

<style scoped>
.mirror-deep {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px;
  background: rgba(12, 14, 22, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  padding: 16px;
  backdrop-filter: blur(14px);
}
.mdp-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}
.mdp-title {
  margin: 0;
  font-size: 15px;
  color: rgba(240, 242, 255, 0.92);
  letter-spacing: 2px;
  font-weight: 600;
}
.mdp-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.mdp-tab {
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-family: inherit;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.mdp-tab:hover { color: rgba(255, 255, 255, 0.78); }
.mdp-tab.is-active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}
.mdp-body { display: flex; flex-direction: column; gap: 14px; }
.mdp-field { display: flex; flex-direction: column; gap: 6px; }
.mdp-field-label { font-size: 10px; color: rgba(255, 255, 255, 0.45); letter-spacing: 1px; }
.mdp-select-label { margin-top: 4px; }
.mdp-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 9px 12px;
  color: rgba(240, 242, 255, 0.9);
  font-size: 13px;
  font-family: inherit;
}
.mdp-input:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.4); }
.mdp-btn {
  align-self: flex-start;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  padding: 7px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
}
.mdp-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.16); }
.mdp-btn:disabled { opacity: 0.35; cursor: default; }
.mdp-btn-sm { padding: 5px 10px; font-size: 11px; }
.mdp-btn-ghost { background: transparent; border-color: rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.55); }
.mdp-empty { font-size: 12px; color: rgba(255, 255, 255, 0.4); }

/* ---- 年度对话 ---- */
.mdp-annual-ctrl { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.mdp-annual-ctrl .mdp-input { width: 90px; }
.mdp-letter {
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
  padding-top: 14px;
  font-size: 13px;
  color: rgba(235, 238, 252, 0.85);
  line-height: 1.7;
}
.mdp-letter-open, .mdp-letter-close { opacity: 0.75; font-style: italic; }
.mdp-letter-empty { text-align: center; padding: 18px 0; color: rgba(255, 255, 255, 0.4); }
.mdp-letter-months { margin: 12px 0; }
.mdp-letter-month { margin-bottom: 12px; }
.mdp-letter-month-label { font-size: 12px; font-weight: 600; color: var(--accent); display: block; margin-bottom: 4px; }
.mdp-letter-notes { margin: 0; padding-left: 4px; list-style: none; }
.mdp-letter-notes li { font-size: 12px; padding: 2px 0; border-left: 2px solid rgba(var(--accent-rgb), 0.2); padding-left: 10px; }
.mdp-letter-milestones { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.mdp-letter-milestone-tag { font-size: 11px; background: rgba(var(--accent-rgb), 0.1); border: 1px solid rgba(var(--accent-rgb), 0.2); border-radius: 12px; padding: 3px 9px; color: rgba(255, 255, 255, 0.75); }

/* ---- 幕僚调度 ---- */
.mdp-dispatch-form { display: flex; flex-direction: column; gap: 10px; }
.mdp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mdp-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  font-family: inherit;
  padding: 4px 10px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;

  min-height: 26px;
}
.mdp-chip.is-on { background: rgba(var(--accent-rgb), 0.14); border-color: rgba(var(--accent-rgb), 0.4); color: var(--accent); }
.mdp-dispatch-actions { display: flex; align-items: center; gap: 12px; }
.mdp-strategy { font-size: 11px; color: rgba(255, 255, 255, 0.5); }
.mdp-dispatch-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.mdp-dispatch-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 12px;
}
.mdp-dispatch-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.mdp-dispatch-order { font-size: 13px; color: rgba(240, 242, 255, 0.9); }
.mdp-dispatch-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; }
.st-queued { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.55); }
.st-running { background: rgba(var(--accent-rgb), 0.14); color: var(--accent); }
.st-done { background: rgba(120, 200, 150, 0.15); color: #8fdc9d; }
.st-halted { background: rgba(230, 130, 120, 0.15); color: #f0a288; }
.mdp-dispatch-steps { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 6px; }
.mdp-step-pill { font-size: 11px; padding: 3px 8px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.6); }
.mdp-step-pill.st-working { background: rgba(var(--accent-rgb), 0.14); color: var(--accent); }
.mdp-step-pill.st-done { background: rgba(120, 200, 150, 0.12); color: rgba(140, 220, 160, 0.9); }
.mdp-dispatch-ctrl { display: flex; gap: 6px; justify-content: flex-end; }

/* ---- 任务拆解 ---- */
.mdp-decompose-form { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.mdp-decompose-form .mdp-input { flex: 1; min-width: 160px;
}
.mdp-plan-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.mdp-plan-item { border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 10px 12px; background: rgba(255, 255, 255, 0.03); }
.mdp-plan-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.mdp-plan-task { font-size: 13px; color: rgba(240, 242, 255, 0.92); flex: 1; }
.mdp-plan-intent { font-size: 10px; color: rgba(255, 255, 255, 0.42); }
.mdp-plan-remove { border: none; background: none; color: rgba(255, 255, 255, 0.4); font-size: 16px; cursor: pointer; line-height: 1; }
.mdp-plan-remove:hover { color: rgba(255, 255, 255, 0.8); }
.mdp-plan-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.mdp-plan-step { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.mdp-step-check {
  width: 18px; height: 18px; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent; color: var(--accent);
  font-size: 11px; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;

  min-height: 24px;
  min-width: 24px;
}
.mdp-plan-step.st-done .mdp-step-title { opacity: 0.5; text-decoration: line-through; }
.mdp-plan-step.st-done .mdp-step-check { background: rgba(120, 200, 150, 0.16); border-color: rgba(120, 200, 150, 0.5); }
.mdp-step-title { flex: 1; font-size: 12px; color: rgba(240, 242, 255, 0.88); }
.mdp-step-est { font-size: 10px; color: rgba(255, 255, 255, 0.35); }
.mdp-step-prio { font-size: 9px; color: var(--accent); border: 1px solid rgba(var(--accent-rgb), 0.3); border-radius: 8px; padding: 0 5px; }
</style>