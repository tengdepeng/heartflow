<template>
  <section class="sv-panel" aria-label="存钱计划">
    <header class="sv-head">
      <span class="sv-title">🏦 存钱计划</span>
      <span class="sv-sub">攒钱 · 52周挑战 · 心愿 · 每笔存款都有记录</span>
    </header>

    <!-- 概览 -->
    <div class="sv-stats">
      <div class="sv-stat"><b>{{ summary.active }}</b><span>进行中</span></div>
      <div class="sv-stat"><b>{{ summary.done }}</b><span>已完成</span></div>
      <div class="sv-stat"><b>¥{{ fmt(summary.total) }}</b><span>累计已存</span></div>
    </div>

    <!-- 页签 + 新建 -->
    <div class="sv-toolbar">
      <div class="sv-tabs" role="tablist">
        <button
          v-for="m in MODES"
          :key="m.value"
          :class="['sv-tab', { on: activeMode === m.value || (m.value === 'all' && allMode) }]"
          @click="setMode(m.value)"
          role="tab"
        >{{ m.label }}</button>
      </div>
      <button class="sv-add" @click="showCreate = !showCreate">＋ {{ showCreate ? '收起' : '新建' }}</button>
    </div>

    <!-- 新建表单 -->
    <form v-if="showCreate" class="sv-create" @submit.prevent="createPlan">
      <div class="sv-create-row">
        <select v-model="form.mode" class="sv-input">
          <option value="accumulate">攒钱</option>
          <option value="52week">52 周挑战</option>
          <option value="wish">心愿</option>
        </select>
        <input v-model="form.name" class="sv-input" placeholder="计划名 / 心愿" />
      </div>
      <div class="sv-create-row">
        <template v-if="form.mode === '52week'">
          <input v-model.number="form.baseAmount" type="number" min="1" class="sv-input" placeholder="第 1 周金额（元）" />
          <span class="sv-hint">全期合计 ¥{{ fmt(weekTotal) }}</span>
        </template>
        <template v-else>
          <input v-model.number="form.targetAmount" type="number" min="1" class="sv-input" placeholder="目标金额（元）" />
          <input v-if="form.mode === 'wish'" v-model="form.targetDate" type="date" class="sv-input sv-date" />
          <span v-else class="sv-hint">长期想攒的一笔钱</span>
        </template>
      </div>
      <button class="sv-btn" :disabled="!createValid">创建</button>
    </form>

    <!-- 计划卡片 -->
    <div v-if="filteredPlans.length" class="sv-list">
      <article v-for="p in filteredPlans" :key="p.id" class="sv-card" :class="{ done: p.done }">
        <div class="sv-card-head">
          <span class="sv-mode" :style="{ background: metaOf(p.mode).color + '22', color: metaOf(p.mode).color }">
            {{ metaOf(p.mode).icon }} {{ metaOf(p.mode).label }}
          </span>
          <span class="sv-name">{{ p.name }}</span>
          <span v-if="p.done" class="sv-done-badge">已达成 🎉</span>
          <button class="sv-del" @click="onRemove(p.id)" title="删除计划">✕</button>
        </div>

        <div class="sv-progress">
          <div class="sv-progress-row">
            <span>已存 <b>¥{{ fmt(prog(p).current) }}</b> / {{ fmt(prog(p).target) }}</span>
            <span>{{ prog(p).percent }}%</span>
          </div>
          <div class="sv-bar"><div class="sv-bar-fill" :style="{ width: prog(p).percent + '%', background: metaOf(p.mode).color }"></div></div>
          <span class="sv-remain" :class="prog(p).remaining > 0 ? '' : 'clear'">
            {{ prog(p).remaining > 0 ? '还差 ¥' + fmt(prog(p).remaining) : '已达成目标' }}
            <template v-if="p.mode === 'wish' && p.targetDate"> · 目标日 {{ p.targetDate }}</template>
          </span>
        </div>

        <!-- 52 周网格 -->
        <div v-if="p.mode === '52week'" class="sv-weeks">
          <div
            v-for="w in 52"
            :key="w"
            :class="['sv-week', { on: p.weeksDone.includes(w), next: w === nextWeekOf(p) }]"
            :title="`第${w}周 ¥${weekAmt(p.baseAmount, w)}${p.weeksDone.includes(w) ? ' · 已完成' : ''}`"
            @click="p.weeksDone.includes(w) ? null : onMarkWeek(p.id, w)"
          >{{ w }}</div>
        </div>

        <!-- 存款表单 -->
        <form class="sv-deposit" @submit.prevent="onDeposit(p.id)">
          <input v-model="depositAmount[p.id]" type="number" min="1" class="sv-input" placeholder="本次存入（元）" />
          <input v-model="depositNote[p.id]" class="sv-input" placeholder="备注（可选）" />
          <button class="sv-btn" :disabled="!(depositAmount[p.id] > 0)">存入</button>
        </form>

        <div v-if="p.deposits.length" class="sv-logs">
          <span class="sv-logs-t">存款明细</span>
          <button class="sv-log-toggle" @click="toggleLogs(p.id)">{{ logsOpen.has(p.id) ? '收起' : '展开' }}</button>
          <ul v-if="logsOpen.has(p.id)" class="sv-log-list">
            <li v-for="(d, i) in p.deposits" :key="i">
              <span>{{ d.at }}</span><b>¥{{ fmt(d.amount) }}</b><i>{{ d.note }}</i>
            </li>
          </ul>
        </div>
      </article>
    </div>

    <p v-else class="sv-empty">还没有{{ modeLabel }}计划，创建一个开始攒钱吧。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useSavingPlans,
  planProgress,
  weekDepositAmount,
  weekPlanTotal,
  nextWeek,
  SAVING_MODE_META,
  type SavingMode,
} from '../modules/reward/saving-plan'
import type { SavingPlan } from '../modules/reward/saving-plan'

const MODES: { value: 'all' | SavingMode; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'accumulate', label: '攒钱' },
  { value: '52week', label: '52周' },
  { value: 'wish', label: '心愿' },
]

const store = useSavingPlans()
const plans = store.plans
const activeMode = ref<'all' | SavingMode>('all')
const allMode = computed(() => activeMode.value === 'all')
const showCreate = ref(false)
const form = ref<{ mode: SavingMode; name: string; targetAmount: number; baseAmount: number; targetDate: string }>({
  mode: 'accumulate',
  name: '',
  targetAmount: 0,
  baseAmount: 10,
  targetDate: '',
})
const depositAmount = ref<Record<string, number>>({})
const depositNote = ref<Record<string, string>>({})
const logsOpen = ref<Set<string>>(new Set())

function metaOf(m: SavingMode) {
  return SAVING_MODE_META[m]
}
function modeLabel(): string {
  return activeMode.value === 'all' ? '存钱' : SAVING_MODE_META[activeMode.value].label
}
function setMode(v: 'all' | SavingMode): void {
  activeMode.value = v
}
function fmt(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString()
}
function prog(p: SavingPlan) {
  return planProgress(p)
}
function weekAmt(base: number, w: number): number {
  return weekDepositAmount(base, w)
}
function nextWeekOf(p: SavingPlan): number | null {
  return p.mode === '52week' ? nextWeek(p) : null
}

const weekTotal = computed(() => weekPlanTotal(form.value.baseAmount || 0))
const createValid = computed(() => {
  const f = form.value
  if (!f.name.trim()) return false
  if (f.mode === '52week') return (f.baseAmount || 0) > 0
  return (f.targetAmount || 0) > 0
})

const filteredPlans = computed(() =>
  activeMode.value === 'all'
    ? plans.value.slice().reverse()
    : plans.value.filter(p => p.mode === activeMode.value).reverse(),
)

const summary = computed(() => {
  const all = plans.value
  return {
    active: all.filter(p => !p.done).length,
    done: all.filter(p => p.done).length,
    total: all.reduce((s, p) => s + p.currentAmount, 0),
  }
})

function toggleLogs(id: string): void {
  const s = new Set(logsOpen.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  logsOpen.value = s
}

function createPlan(): void {
  const f = form.value
  store.create({
    mode: f.mode,
    name: f.name,
    targetAmount: f.mode === '52week' ? undefined : f.targetAmount,
    baseAmount: f.mode === '52week' ? f.baseAmount : undefined,
    targetDate: f.mode === 'wish' ? f.targetDate || undefined : undefined,
  })
  form.value.name = ''
  form.value.targetAmount = 0
  form.value.baseAmount = 10
  form.value.targetDate = ''
  showCreate.value = false
}

function onDeposit(id: string): void {
  const amt = depositAmount.value[id]
  if (!(amt > 0)) return
  store.deposit(id, amt, new Date().toISOString().slice(0, 10), (depositNote.value[id] || '').trim() || undefined)
  depositAmount.value[id] = 0
  depositNote.value[id] = ''
}
function onMarkWeek(id: string, w: number): void {
  store.markWeek(id, w)
}
function onRemove(id: string): void {
  if (window.confirm('删除该存钱计划？其存款记录一并清除。')) store.remove(id)
}
</script>

<style scoped>
.sv-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.sv-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.sv-title { font-weight: 600; }
.sv-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.sv-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.sv-stat { background: #161a15; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 2px; }
.sv-stat b { font-size: 17px; color: #e8c060; }
.sv-stat span { font-size: 11px; color: #8a9a7a; }

.sv-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.sv-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.sv-tab {
  border: 1px solid #333a33; background: transparent; color: #8a9a7a;
  border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer;
}
.sv-tab.on { background: #2b3129; color: #e8c060; border-color: #4a5243; }
.sv-add { margin-left: auto; background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 5px 12px; font-weight: 600; cursor: pointer; font-size: 12px; }

.sv-create { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
.sv-create-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sv-input {
  flex: 1; min-width: 90px; background: #101310; border: 1px solid #374136; border-radius: 8px;
  color: #d9decf; padding: 6px 9px; font-size: 12px; font-family: inherit;
}
.sv-date { width: 150px; flex: none; color-scheme: dark; }
.sv-hint { font-size: 11px; color: #8a9a7a; white-space: nowrap; }
.sv-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 6px 14px; font-weight: 600; font-size: 12px; cursor: pointer; white-space: nowrap; }
.sv-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.sv-list { display: flex; flex-direction: column; gap: 10px; }
.sv-card { background: #161a15; border-radius: 10px; padding: 12px; }
.sv-card.done { opacity: 0.75; }
.sv-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.sv-mode { font-size: 11px; border-radius: 6px; padding: 2px 8px; }
.sv-name { font-weight: 600; font-size: 14px; }
.sv-done-badge { font-size: 11px; color: #8a9a7a; }
.sv-del { margin-left: auto; background: transparent; border: none; color: #6b7563; cursor: pointer; font-size: 13px; }
.sv-del:hover { color: #c46a5a; }

.sv-progress-row { display: flex; justify-content: space-between; font-size: 12px; color: #8a9a7a; margin-bottom: 4px; }
.sv-progress-row b { color: #d9decf; }
.sv-bar { height: 6px; background: #262b24; border-radius: 3px; overflow: hidden; }
.sv-bar-fill { height: 100%; transition: width 0.3s; }
.sv-remain { font-size: 11px; color: #8a9a7a; margin-top: 4px; display: block; }
.sv-remain.clear { color: #8a9a7a; }

.sv-weeks {
  display: grid; grid-template-columns: repeat(13, 1fr); gap: 4px; margin: 10px 0;
}
.sv-week {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  background: #101310; border: 1px solid #2b3129; border-radius: 5px;
  font-size: 10px; color: #6b7563; cursor: pointer;
}
.sv-week.on { background: #6b9fc4; color: #0d1216; border-color: #6b9fc4; }
.sv-week.next { border-color: #e8c060; color: #e8c060; font-weight: 700; }
.sv-week:hover:not(.on) { border-color: #4a5243; }

.sv-deposit { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.sv-logs { margin-top: 8px; font-size: 12px; }
.sv-logs-t { color: #8a9a7a; margin-right: 6px; }
.sv-log-toggle { background: none; border: none; color: #6b9fc4; cursor: pointer; font-size: 11px; padding: 0; }
.sv-log-list { margin: 6px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
.sv-log-list li { display: flex; gap: 10px; font-size: 12px; color: #b7c0a8; }
.sv-log-list b { color: #e8c060; width: 90px; text-align: right; }
.sv-log-list i { color: #6b7563; font-style: normal; }

.sv-empty { font-size: 12px; color: #6b7563; }
</style>