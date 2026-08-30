<template>
  <section class="ba-panel" aria-label="预算预警">
    <header class="ba-head">
      <span class="ba-title">🎯 预算预警</span>
      <span class="ba-sub">按类别看本月预算达成</span>
      <label class="ba-mode">
        <select v-model="mode">
          <option value="expense">仅支出</option>
          <option value="withTransfer">含转账</option>
        </select>
      </label>
    </header>

    <div class="ba-outflow">
      <span>本月支出 <b>¥{{ fmt(outflow.expense) }}</b></span>
      <span>账户转出 <b>¥{{ fmt(outflow.turnedOver) }}</b></span>
      <span class="ba-outflow-total">总流出 <b>¥{{ fmt(outflow.total) }}</b></span>
    </div>

    <div v-if="progressRows.length" class="ba-rows">
      <div v-for="p in progressRows" :key="p.budget.id" class="ba-row">
        <span class="ba-name">{{ p.label }}</span>
        <span class="ba-bar"><i class="ba-fill" :class="p.status" :style="{ width: pct(p) + '%' }"></i></span>
        <span class="ba-val">¥{{ fmt(p.spent) }}/¥{{ fmt(p.limit) }}</span>
        <span class="ba-status" :class="p.status">{{ statusLabel(p.status) }}</span>
      </div>
    </div>
    <p v-else class="ba-empty">本月还没有预算 —— 在下方为支出类别设置一个预算吧。</p>

    <form class="ba-form" @submit.prevent="saveBudget">
      <select v-model="form.category" class="ba-cat">
        <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.icon }} {{ c.label }}</option>
      </select>
      <input v-model.number="form.limit" type="number" min="0" class="ba-limit" placeholder="月度预算金额" />
      <button class="ba-btn" :disabled="!(form.limit > 0)">{{ hasBudget(form.category) ? '更新预算' : '设置预算' }}</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storage } from '../engine/storage'
import {
  categorizeExpense,
  computeBudgetProgress,
  monthOutflow,
  budgetsForMonth,
  type OutflowMode,
  type BudgetProgress,
  type MonthOutflow,
} from '../modules/reward/budget-alert'
import { REWARD_STORAGE_KEYS } from '../modules/reward/types'
import type { Budget } from '../modules/reward/types'
import { categoryOptionsFor, categoryLabelAny } from '../modules/reward/custom-category'
import type { RewardRecord } from '../modules/reward/reward-list'
import type { Transfer } from '../modules/reward/accounts'

const props = defineProps<{ records: RewardRecord[]; transfers: Transfer[]; month?: string }>()

const BUDGETS_KEY = REWARD_STORAGE_KEYS.BUDGETS

const budgets = ref<Budget[]>(storage.getKV<Budget[]>(BUDGETS_KEY, []))
const mode = ref<OutflowMode>('expense')

const month = computed(() => props.month ?? new Date().toISOString().slice(0, 7))

const categories = computed(() => categoryOptionsFor('expense'))

const form = ref({ category: 'tools', limit: 0 })

const catSpent = computed(() => categorizeExpense(props.records, month.value))
const outflow = computed<MonthOutflow>(() => monthOutflow(props.records, props.transfers, month.value, mode.value))

interface ProgressRow extends BudgetProgress {
  budget: Budget
  label: string
}
const progressRows = computed<ProgressRow[]>(() =>
  budgetsForMonth(budgets.value, month.value).map(b => ({
    budget: b,
    label: categoryLabelAny(b.category),
    ...computeBudgetProgress(b, catSpent.value),
  })),
)

function hasBudget(category: string): boolean {
  return budgetsForMonth(budgets.value, month.value).some(b => b.category === category)
}

function saveBudget(): void {
  const { category, limit } = form.value
  if (!(limit > 0)) return
  const existing = budgetsForMonth(budgets.value, month.value).find(b => b.category === category)
  if (existing) {
    existing.monthlyLimit = limit
  } else {
    budgets.value.push({
      id: `b${Date.now().toString(36)}`,
      category,
      monthlyLimit: limit,
      currentSpent: 0,
      month: month.value,
    })
  }
  storage.setKV(BUDGETS_KEY, budgets.value)
  form.value.limit = 0
}

function pct(p: ProgressRow): number {
  return Math.min(100, Math.round(p.ratio * 100))
}
function statusLabel(s: BudgetProgress['status']): string {
  return s === 'over' ? '超支' : s === 'warn' ? '接近' : '达标'
}
function fmt(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString()
}
</script>

<style scoped>
.ba-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.ba-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.ba-title { font-weight: 600; }
.ba-sub { font-size: 12px; color: #8a9a7a; flex: 1; }
.ba-mode select {
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #d9decf;
  padding: 4px 8px;
  font-size: 12px;
  color-scheme: dark;
}
.ba-outflow {
  display: flex;
  gap: 16px;
  font-size: 13px;
  background: #161a15;
  border-radius: 10px;
  padding: 8px 12px;
  margin-bottom: 10px;
  color: #8a9a7a;
}
.ba-outflow b { color: #d9decf; }
.ba-outflow-total b { color: #f0c040; }
.ba-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.ba-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.ba-name { width: 56px; color: #b7c0a8; }
.ba-bar { flex: 1; background: #161a15; border-radius: 6px; height: 10px; overflow: hidden; }
.ba-fill { display: block; height: 100%; border-radius: 6px; }
.ba-fill.ok { background: #8a9a7a; }
.ba-fill.warn { background: #f0c040; }
.ba-fill.over { background: #c46a5a; }
.ba-val { width: 110px; text-align: right; color: #8a9a7a; }
.ba-status { width: 40px; text-align: center; font-size: 11px; }
.ba-status.ok { color: #8a9a7a; }
.ba-status.warn { color: #f0c040; }
.ba-status.over { color: #c46a5a; }
.ba-empty { font-size: 12px; color: #8a9a7a; }
.ba-form {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}
.ba-cat, .ba-limit {
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #d9decf;
  padding: 6px 8px;
  font-size: 13px;
}
.ba-limit { width: 140px; }
.ba-btn {
  background: #8a9a7a;
  color: #171a15;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: 600;
}
.ba-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>