<template>
  <section class="ba2-panel" aria-label="预算进阶">
    <header class="ba2-head">
      <span class="ba2-title">📊 预算进阶</span>
      <span class="ba2-sub">总 / 年度预算 · 日均动态 · 滚动结余</span>
      <label class="ba2-mode">
        <select v-model="mode">
          <option value="expense">仅支出</option>
          <option value="withTransfer">含转账</option>
        </select>
      </label>
    </header>

    <!-- 本月总预算 -->
    <div class="ba2-card">
      <div class="ba2-card-head">
        <span class="ba2-card-title">本月总预算</span>
        <span class="ba2-rule" :class="month.status">{{ statusLabel(month.status) }}</span>
        <label class="ba2-toggle" :title="'未用结余滚动到下月'">
          <input type="checkbox" v-model="rollover" /> 结余结转
        </label>
      </div>
      <div class="ba2-big">
        <span class="ba2-big-val" :class="{ neg: month.remaining < 0 }">{{ fmtSigned(month.remaining) }}</span>
        <span class="ba2-big-label">本月剩余</span>
      </div>
      <div class="ba2-row">
        <span>已支出 <b>¥{{ fmt(month.spent) }}</b></span>
        <span class="ba2-muted">预算 ¥{{ fmt(month.baseLimit) }}<template v-if="month.rolledIn > 0"> + 结转 ¥{{ fmt(month.rolledIn) }}</template></span>
      </div>
      <div class="ba2-bar"><i class="ba2-fill" :class="month.status" :style="{ width: pct(month.ratio) + '%' }"></i></div>
      <div class="ba2-hint" v-if="month.rolledIn > 0">↳ 上月未用结余 <b>¥{{ fmt(month.rolledIn) }}</b> 已滚动计入本月</div>

      <!-- 日均动态 -->
      <div class="ba2-daily">
        <div class="ba2-daily-item">
          <span class="ba2-daily-label">剩余日均可用</span>
          <span class="ba2-daily-val">¥{{ fmt(month.dailyAvailable) }}</span>
          <span class="ba2-daily-sub">剩 {{ month.daysRemaining }} 天</span>
        </div>
        <div class="ba2-daily-item">
          <span class="ba2-daily-label">本月日均已花</span>
          <span class="ba2-daily-val">¥{{ fmt(month.dailySpentSoFar) }}</span>
          <span class="ba2-daily-sub">已 {{ month.daysElapsed }} 天</span>
        </div>
      </div>

      <form class="ba2-form" @submit.prevent="saveMonthly">
        <input v-model.number="monthlyInput" type="number" min="0" class="ba2-input" placeholder="月度总预算" />
        <button class="ba2-btn" :disabled="!(monthlyInput > 0)">{{ month.baseLimit > 0 ? '更新月度' : '设定月度' }}</button>
      </form>
    </div>

    <!-- 年度总预算 -->
    <div class="ba2-card">
      <div class="ba2-card-head">
        <span class="ba2-card-title">本年度预算</span>
        <span class="ba2-rule" :class="year.status">{{ statusLabel(year.status) }}</span>
      </div>
      <div class="ba2-big">
        <span class="ba2-big-val" :class="{ neg: year.remaining < 0 }">{{ fmtSigned(year.remaining) }}</span>
        <span class="ba2-big-label">全年剩余</span>
      </div>
      <div class="ba2-row">
        <span>已支出 <b>¥{{ fmt(year.spent) }}</b></span>
        <span class="ba2-muted">年度 ¥{{ fmt(year.limit) }} · 月均 ¥{{ fmt(year.monthlyAvg) }}</span>
      </div>
      <div class="ba2-bar"><i class="ba2-fill" :class="year.status" :style="{ width: pct(year.ratio) + '%' }"></i></div>

      <form class="ba2-form" @submit.prevent="saveAnnual">
        <input v-model.number="annualInput" type="number" min="0" class="ba2-input" placeholder="年度总预算" />
        <button class="ba2-btn" :disabled="!(annualInput > 0)">{{ config.annualLimit > 0 ? '更新年度' : '设定年度' }}</button>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  monthBudgetAdvance,
  yearBudgetAdvance,
  useBudgetAdvance,
} from '../modules/reward/budget-advance'
import type { OutflowMode, BudgetStatus } from '../modules/reward/budget-alert'
import type { RewardRecord } from '../modules/reward/reward-list'
import type { Transfer } from '../modules/reward/accounts'
import { getLocalMonthKey, getLocalDateKey } from '../utils/time'

const props = defineProps<{ records: RewardRecord[]; transfers: Transfer[]; month?: string; today?: string }>()

const advance = useBudgetAdvance()
const config = ref(advance.load())
const mode = ref<OutflowMode>('expense')
const monthlyInput = ref(0)
const annualInput = ref(0)

const monthKey = computed(() => props.month ?? getLocalMonthKey())
const today = computed(() => props.today ?? getLocalDateKey())
const yearKey = computed(() => monthKey.value.slice(0, 4))

const rollover = computed<boolean>({
  get: () => config.value.rollover,
  set: (v: boolean) => {
    config.value = { ...config.value, rollover: v }
    advance.save(config.value)
  },
})

const month = computed(() => monthBudgetAdvance(props.records, props.transfers, monthKey.value, today.value, config.value, mode.value))
const year = computed(() => yearBudgetAdvance(props.records, props.transfers, yearKey.value, config.value, mode.value))

function saveMonthly(): void {
  if (!(monthlyInput.value > 0)) return
  config.value = { ...config.value, monthlyLimit: monthlyInput.value }
  advance.save(config.value)
  monthlyInput.value = 0
}
function saveAnnual(): void {
  if (!(annualInput.value > 0)) return
  config.value = { ...config.value, annualLimit: annualInput.value }
  advance.save(config.value)
  annualInput.value = 0
}

function pct(ratio: number): number {
  return Math.min(100, Math.round(ratio * 100))
}
function statusLabel(s: BudgetStatus): string {
  return s === 'over' ? '超支' : s === 'warn' ? '接近' : '达标'
}
function fmt(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString()
}
function fmtSigned(n: number): string {
  return (n < 0 ? '-¥' : '¥') + Math.round(Math.abs(n)).toLocaleString()
}
</script>

<style scoped>
.ba2-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.ba2-head { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.ba2-title { font-weight: 600; }
.ba2-sub { font-size: 12px; color: #8a9a7a; flex: 1; }
.ba2-mode select {
  background: #161a15; border: 1px solid #374136; border-radius: 8px;
  color: #d9decf; padding: 4px 8px; font-size: 12px; color-scheme: dark;
}
.ba2-card { background: #161a15; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.ba2-card:last-child { margin-bottom: 0; }
.ba2-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ba2-card-title { font-size: 13px; color: #b7c0a8; font-weight: 600; }
.ba2-rule { font-size: 11px; padding: 1px 6px; border-radius: 6px; }
.ba2-rule.ok { background: #8a9a7a; color: #171a15; }
.ba2-rule.warn { background: #f0c040; color: #171a15; }
.ba2-rule.over { background: #c46a5a; color: #171a15; }
.ba2-toggle { margin-left: auto; font-size: 11px; color: #8a9a7a; display: flex; align-items: center; gap: 4px; }
.ba2-toggle input { accent-color: #8a9a7a; }
.ba2-big { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.ba2-big-val { font-size: 28px; font-weight: 700; color: #8a9a7a; }
.ba2-big-val.neg { color: #c46a5a; }
.ba2-big-label { font-size: 12px; color: #8a9a7a; }
.ba2-row { display: flex; justify-content: space-between; font-size: 12px; color: #8a9a7a; margin-bottom: 6px; }
.ba2-row b { color: #d9decf; }
.ba2-muted { color: #8a9a7a; }
.ba2-bar { background: #11140f; border-radius: 6px; height: 10px; overflow: hidden; margin-bottom: 6px; }
.ba2-fill { display: block; height: 100%; border-radius: 6px; }
.ba2-fill.ok { background: #8a9a7a; }
.ba2-fill.warn { background: #f0c040; }
.ba2-fill.over { background: #c46a5a; }
.ba2-hint { font-size: 11px; color: #f0c040; margin-bottom: 8px; }
.ba2-hint b { color: #f0c040; }
.ba2-daily { display: flex; gap: 12px; margin-bottom: 10px; }
.ba2-daily-item { flex: 1; background: #11140f; border-radius: 8px; padding: 8px 10px; }
.ba2-daily-label { display: block; font-size: 11px; color: #8a9a7a; }
.ba2-daily-val { display: block; font-size: 18px; font-weight: 700; color: #d9decf; }
.ba2-daily-sub { font-size: 10px; color: #6b7563; }
.ba2-form { display: flex; gap: 6px; align-items: center; }
.ba2-input {
  background: #11140f; border: 1px solid #374136; border-radius: 8px;
  color: #d9decf; padding: 6px 8px; font-size: 13px; flex: 1; min-width: 0;
}
.ba2-btn {
  background: #8a9a7a; color: #171a15; border: none; border-radius: 8px;
  padding: 6px 12px; cursor: pointer; font-weight: 600; flex-shrink: 0;
}
.ba2-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>