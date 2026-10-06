<template>
  <section class="fap" aria-label="财务分析">
    <div class="fap-head">
      <div class="fap-title-wrap">
        <span class="fap-title">财务分析</span>
        <span class="fap-sub">筛选 · 周期 · 图表，把每一笔酬劳看透</span>
      </div>
    </div>

    <div class="fap-tabs" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        class="fap-tab"
        :class="{ 'is-active': tab === t.key }"
        role="tab"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ============ 筛选 ============ -->
    <div v-show="tab === 'filter'" class="fap-body">
      <div class="fap-filter-form">
        <div class="fap-form-row">
          <input v-model="filter.keyword" type="text" class="fap-input" placeholder="搜索备注或类别…" />
          <select v-model="filterTypes" class="fap-select" @change="syncTypes">
            <option value="">全部类型</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </select>
        </div>
        <div class="fap-form-row">
          <select v-model="filter.incomeCategories" multiple class="fap-select fap-select--multi">
            <option v-for="(m, k) in INCOME_CATEGORY_META" :key="k" :value="k">{{ m.icon }} {{ m.label }}</option>
          </select>
          <select v-model="filter.expenseCategories" multiple class="fap-select fap-select--multi">
            <option v-for="(m, k) in EXPENSE_CATEGORY_META" :key="k" :value="k">{{ m.icon }} {{ m.label }}</option>
          </select>
        </div>
        <div class="fap-form-row">
          <input v-model.number="amountMin" type="number" min="0" class="fap-input" placeholder="金额 ≥" />
          <input v-model.number="amountMax" type="number" min="0" class="fap-input" placeholder="金额 ≤" />
          <input v-model="dateStart" type="date" class="fap-input" />
          <input v-model="dateEnd" type="date" class="fap-input" />
        </div>
        <div class="fap-form-actions">
          <button type="button" class="fap-btn" @click="applyFilter">应用筛选</button>
          <button type="button" class="fap-btn fap-btn--ghost" @click="resetFilter">重置</button>
          <div class="fap-preset-save">
            <input v-model="presetName" type="text" class="fap-input" placeholder="预设名称" />
            <button type="button" class="fap-btn fap-btn--ghost" :disabled="!presetName.trim()" @click="savePreset">保存预设</button>
          </div>
        </div>
      </div>

      <div v-if="presets.length" class="fap-presets">
        <span class="fap-block-label">已存预设</span>
        <div v-for="p in presets" :key="p.id" class="fap-preset">
          <span class="fap-preset-name">{{ p.name }}</span>
          <div class="fap-preset-actions">
            <button type="button" class="fap-btn fap-btn--sm" @click="applyPreset(p.id)">应用</button>
            <button type="button" class="fap-btn fap-btn--sm fap-btn--ghost" @click="deletePreset(p.id)">删除</button>
          </div>
        </div>
      </div>

      <div class="fap-result-head">
        <span class="fap-block-label">筛选结果</span>
        <span class="fap-result-count">{{ result.total }} 条</span>
      </div>
      <p v-if="result.total === 0" class="fap-empty">没有符合筛选条件的记录。</p>
      <div v-else class="fap-results">
        <div v-for="r in result.records" :key="r.id" class="fap-result">
          <span class="fap-result-icon">{{ r.type === 'income' ? '📥' : '📤' }}</span>
          <div class="fap-result-info">
            <span class="fap-result-cat">{{ categoryLabel(r.category) }}</span>
            <span class="fap-result-desc">{{ r.description || '—' }}</span>
          </div>
          <span class="fap-result-amount" :class="r.type === 'income' ? 'pos' : 'neg'">
            {{ r.type === 'income' ? '+' : '-' }}{{ fmtMoney(r.amount) }}
          </span>
          <span class="fap-result-date">{{ fmtDate(r.recordedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- ============ 周期 ============ -->
    <div v-show="tab === 'period'" class="fap-body">
      <div class="fap-period-tabs">
        <button
          v-for="p in PERIOD_TYPES"
          :key="p.key"
          type="button"
          class="fap-period-tab"
          :class="{ 'is-active': periodType === p.key }"
          @click="setPeriod(p.key)"
        >
          {{ p.label }}
        </button>
      </div>

      <template v-if="periodic">
        <div class="fap-stats">
          <div class="fap-stat"><b>{{ fmtMoney(periodic.totalIncome) }}</b><span>总收入</span></div>
          <div class="fap-stat"><b>{{ fmtMoney(periodic.totalExpense) }}</b><span>总支出</span></div>
          <div class="fap-stat">
            <b :class="periodic.totalBalance >= 0 ? 'pos' : 'neg'">{{ fmtMoney(periodic.totalBalance) }}</b>
            <span>净结余</span>
          </div>
          <div class="fap-stat"><b>{{ trendLabel }}</b><span>趋势</span></div>
        </div>

        <div v-if="periodic.bestPeriod" class="fap-period-highlight">
          <div class="fap-highlight-item">
            <span class="fap-highlight-label">最佳周期</span>
            <b class="pos">{{ fmtMoney(periodic.bestPeriod.balance) }}</b>
            <span class="fap-highlight-period">{{ periodic.bestPeriod.period }}</span>
          </div>
          <div v-if="periodic.worstPeriod" class="fap-highlight-item">
            <span class="fap-highlight-label">最差周期</span>
            <b class="neg">{{ fmtMoney(periodic.worstPeriod.balance) }}</b>
            <span class="fap-highlight-period">{{ periodic.worstPeriod.period }}</span>
          </div>
        </div>

        <div v-if="periodic.periods.length" class="fap-periods">
          <div v-for="p in periodic.periods" :key="p.period" class="fap-period">
            <div class="fap-period-head">
              <span class="fap-period-name">{{ p.period }}</span>
              <span class="fap-period-balance" :class="p.balance >= 0 ? 'pos' : 'neg'">
                {{ p.balance >= 0 ? '+' : '' }}{{ fmtMoney(p.balance) }}
              </span>
            </div>
            <div class="fap-period-bar">
              <i
                class="fap-period-bar-income"
                :style="{ width: barPct(p.income, periodMax) + '%' }"
              ></i>
              <i
                class="fap-period-bar-expense"
                :style="{ width: barPct(p.expense, periodMax) + '%' }"
              ></i>
            </div>
            <div class="fap-period-meta">
              <span class="pos">收 {{ fmtMoney(p.income) }}</span>
              <span class="neg">支 {{ fmtMoney(p.expense) }}</span>
              <span>{{ p.recordCount }} 条</span>
            </div>
          </div>
        </div>
      </template>
      <p v-else class="fap-empty">暂无周期数据。</p>
    </div>

    <!-- ============ 图表 ============ -->
    <div v-show="tab === 'chart'" class="fap-body">
      <div class="fap-chart-block">
        <span class="fap-block-label">收入类别分布</span>
        <div v-if="incomeChart.categories.length" class="fap-chart-bars">
          <div v-for="c in incomeChart.categories" :key="c.label" class="fap-chart-row">
            <span class="fap-chart-label">{{ INCOME_CATEGORY_META[c.label as IncomeCategory]?.icon }} {{ INCOME_CATEGORY_META[c.label as IncomeCategory]?.label || c.label }}</span>
            <div class="fap-chart-bar"><i :style="{ width: pct(c.value, incomeChart.total) + '%', background: c.color }"></i></div>
            <span class="fap-chart-value">{{ fmtMoney(c.value) }}</span>
          </div>
        </div>
        <p v-else class="fap-empty">暂无收入记录。</p>
      </div>

      <div class="fap-chart-block">
        <span class="fap-block-label">支出类别分布</span>
        <div v-if="expenseChart.categories.length" class="fap-chart-bars">
          <div v-for="c in expenseChart.categories" :key="c.label" class="fap-chart-row">
            <span class="fap-chart-label">{{ EXPENSE_CATEGORY_META[c.label as ExpenseCategory]?.icon }} {{ EXPENSE_CATEGORY_META[c.label as ExpenseCategory]?.label || c.label }}</span>
            <div class="fap-chart-bar"><i :style="{ width: pct(c.value, expenseChart.total) + '%', background: c.color }"></i></div>
            <span class="fap-chart-value">{{ fmtMoney(c.value) }}</span>
          </div>
        </div>
        <p v-else class="fap-empty">暂无支出记录。</p>
      </div>

      <div class="fap-chart-block">
        <span class="fap-block-label">月度收支趋势</span>
        <div v-if="trendChart.series.length" class="fap-trend-chart">
          <div class="fap-trend-legend">
            <span class="fap-legend-item"><i style="background: #8a9a7a"></i>收入</span>
            <span class="fap-legend-item"><i style="background: #d98c7a"></i>支出</span>
          </div>
          <div class="fap-trend-bars">
            <div v-for="(label, i) in trendChart.xLabels" :key="label" class="fap-trend-col">
              <div class="fap-trend-bars-inner">
                <div class="fap-trend-bar income" :style="{ height: trendBarH(trendChart.series[0].data[i]?.value || 0) + '%' }"></div>
                <div class="fap-trend-bar expense" :style="{ height: trendBarH(trendChart.series[1].data[i]?.value || 0) + '%' }"></div>
              </div>
              <span class="fap-trend-label">{{ label }}</span>
            </div>
          </div>
        </div>
        <p v-else class="fap-empty">暂无趋势数据。</p>
      </div>

      <div class="fap-chart-block">
        <span class="fap-block-label">本月预算执行</span>
        <div v-if="budgetChart.categories.length" class="fap-budget">
          <div class="fap-budget-total">
            <span>预算 {{ fmtMoney(budgetChart.totalBudget) }} · 已用 {{ fmtMoney(budgetChart.totalSpent) }} · 剩余 {{ fmtMoney(budgetChart.totalRemaining) }}</span>
          </div>
          <div v-for="c in budgetChart.categories" :key="c.name" class="fap-budget-row">
            <span class="fap-budget-label">{{ EXPENSE_CATEGORY_META[c.name as ExpenseCategory]?.icon }} {{ EXPENSE_CATEGORY_META[c.name as ExpenseCategory]?.label || c.label }}</span>
            <div class="fap-chart-bar"><i :style="{ width: c.percentage + '%', background: c.color }"></i></div>
            <span class="fap-budget-value">{{ fmtMoney(c.spent) }} / {{ fmtMoney(c.budget) }}</span>
          </div>
        </div>
        <p v-else class="fap-empty">暂无预算数据。</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getLocalDateKey } from '../utils/time'
import {
  useFinanceFilter,
  usePeriodicAnalysis,
  useChartData,
  INCOME_CATEGORY_META,
  EXPENSE_CATEGORY_META,
} from '../modules/reward'
import type {
  IncomeCategory,
  ExpenseCategory,
  RewardRecord as TypeRecord,
} from '../modules/reward/types'
import type { PeriodType } from '../modules/reward'
import type { RewardRecord as ListRecord } from '../modules/reward/reward-list'

const props = defineProps<{ records: ListRecord[] }>()

const adaptedRecords = computed<TypeRecord[]>(() =>
  props.records.map(r => ({
    id: r.id,
    type: r.type,
    category: r.category as TypeRecord['category'],
    amount: r.amount,
    description: r.description,
    recordedAt: r.at,
  })),
)

const TABS = [
  { key: 'filter', label: '筛选' },
  { key: 'period', label: '周期' },
  { key: 'chart', label: '图表' },
] as const

type TabKey = (typeof TABS)[number]['key']
const tab = ref<TabKey>('filter')

const PERIOD_TYPES: { key: PeriodType; label: string }[] = [
  { key: 'daily', label: '日' },
  { key: 'weekly', label: '周' },
  { key: 'monthly', label: '月' },
  { key: 'quarterly', label: '季' },
  { key: 'yearly', label: '年' },
]

// ---- 筛选 ----
const filterStore = useFinanceFilter(() => adaptedRecords.value)
const filter = filterStore.filter
const presets = filterStore.presets
const filterTypes = ref('')
const amountMin = ref<number | null>(null)
const amountMax = ref<number | null>(null)
const dateStart = ref('')
const dateEnd = ref('')
const presetName = ref('')
const result = computed(() => filterStore.applyFilter())

function syncTypes() {
  filter.value.types = filterTypes.value ? [filterTypes.value as 'income' | 'expense'] : []
}

function applyFilter() {
  filter.value.amountRange = amountMin.value != null || amountMax.value != null
    ? { min: amountMin.value ?? 0, max: amountMax.value ?? Infinity }
    : null
  filter.value.dateRange = dateStart.value || dateEnd.value
    ? { start: dateStart.value || '1970-01-01', end: dateEnd.value || '2999-12-31' }
    : null
}

function resetFilter() {
  filterStore.resetFilter()
  filterTypes.value = ''
  amountMin.value = null
  amountMax.value = null
  dateStart.value = ''
  dateEnd.value = ''
}

function savePreset() {
  if (!presetName.value.trim()) return
  filterStore.savePreset(presetName.value.trim())
  presetName.value = ''
}

function applyPreset(id: string) {
  filterStore.applyPreset(id)
  filterTypes.value = filter.value.types.length ? filter.value.types[0] : ''
  amountMin.value = filter.value.amountRange?.min ?? null
  amountMax.value = filter.value.amountRange?.max ?? null
  dateStart.value = filter.value.dateRange?.start ?? ''
  dateEnd.value = filter.value.dateRange?.end ?? ''
}

function deletePreset(id: string) {
  filterStore.deletePreset(id)
}

// ---- 周期 ----
const periodStore = usePeriodicAnalysis(() => adaptedRecords.value)
const periodType = periodStore.periodType
const periodic = computed(() => periodStore.analysis.value)

function setPeriod(type: PeriodType) {
  periodStore.computeAnalysis(type)
}

const periodMax = computed(() => {
  const ps = periodic.value?.periods ?? []
  return Math.max(1, ...ps.map(p => Math.max(p.income, p.expense)))
})

const trendLabel = computed(() => {
  const t = periodic.value?.trend
  return t === 'up' ? '上升' : t === 'down' ? '下降' : '平稳'
})

function barPct(v: number, max: number): number {
  return max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0
}

// ---- 图表 ----
const chartStore = useChartData(() => adaptedRecords.value)
const incomeChart = computed(() => chartStore.getIncomeCategoryChart())
const expenseChart = computed(() => chartStore.getExpenseCategoryChart())
const trendChart = computed(() => chartStore.getMonthlyTrendChart(6))
const budgetChart = computed(() => chartStore.getBudgetChart())

const trendMax = computed(() => {
  const vals = (trendChart.value.series[0]?.data ?? []).map(d => d.value)
  const vals2 = (trendChart.value.series[1]?.data ?? []).map(d => d.value)
  return Math.max(1, ...vals, ...vals2)
})

function trendBarH(v: number): number {
  return trendMax.value > 0 ? Math.min(100, Math.round((v / trendMax.value) * 100)) : 0
}

function pct(v: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((v / total) * 100)) : 0
}

// ---- 工具 ----
function categoryLabel(cat: string): string {
  return INCOME_CATEGORY_META[cat as IncomeCategory]?.label
    || EXPENSE_CATEGORY_META[cat as ExpenseCategory]?.label
    || cat
}

function fmtMoney(v: number): string {
  return '¥' + Math.round(v).toLocaleString()
}

function fmtDate(iso: string): string {
  return getLocalDateKey(new Date(iso))
}

watch(adaptedRecords, () => {
  periodStore.computeAnalysis(periodType.value)
}, { immediate: true })
</script>

<style scoped>
.fap {
  position: relative;
  z-index: 1;
  width: 100%;
  background: rgba(10, 9, 6, 0.55);
  border: 1px solid rgba(232, 192, 96, 0.12);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(14px);
}
.fap-head { margin-bottom: 12px; }
.fap-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.fap-title { font-size: 15px; color: rgba(255, 246, 224, 0.92); letter-spacing: 2px; font-weight: 600; }
.fap-sub { font-size: 11px; color: rgba(232, 192, 96, 0.5); letter-spacing: 0.5px; }

.fap-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 14px; }
.fap-tab {
  border: 1px solid rgba(232, 192, 96, 0.15);
  background: transparent;
  color: rgba(255, 246, 224, 0.5);
  font-size: 11px;
  font-family: inherit;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.fap-tab:hover { color: rgba(255, 246, 224, 0.8); }
.fap-tab.is-active {
  background: rgba(232, 192, 96, 0.12);
  border-color: rgba(232, 192, 96, 0.3);
  color: #e8c060;
}

.fap-body { display: flex; flex-direction: column; gap: 14px; }

.fap-block-label { font-size: 10px; color: rgba(255, 246, 224, 0.45); letter-spacing: 1px; }

.fap-input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(232, 192, 96, 0.12);
  border-radius: 8px;
  padding: 8px 10px;
  color: rgba(255, 246, 224, 0.85);
  font-size: 12px;
  font-family: inherit;
}
.fap-input:focus { outline: none; border-color: rgba(232, 192, 96, 0.35); }
.fap-input::placeholder { color: rgba(255, 246, 224, 0.3); }
.fap-select {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(232, 192, 96, 0.12);
  border-radius: 8px;
  padding: 8px 10px;
  color: rgba(255, 246, 224, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.fap-select:focus { outline: none; border-color: rgba(232, 192, 96, 0.35); }
.fap-select option { background: #0a0906; color: rgba(255, 246, 224, 0.85); }
.fap-select--multi { min-height: 64px;
}

.fap-btn {
  border: 1px solid rgba(232, 192, 96, 0.3);
  background: rgba(232, 192, 96, 0.1);
  color: #e8c060;
  font-size: 12px;
  font-family: inherit;
  padding: 8px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.fap-btn:hover:not(:disabled) { background: rgba(232, 192, 96, 0.18); border-color: rgba(232, 192, 96, 0.45); }
.fap-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.fap-btn--sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 4px 10px; font-size: 11px; 
  min-height: 26px;
}
.fap-btn--ghost { background: transparent; border-color: rgba(232, 192, 96, 0.15); }

.fap-empty { margin: 8px 0; font-size: 12px; color: rgba(255, 246, 224, 0.45); text-align: center; padding: 18px 0; }

/* 筛选 */
.fap-filter-form { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: rgba(232, 192, 96, 0.04); border: 1px solid rgba(232, 192, 96, 0.08); }
.fap-form-row { display: flex; gap: 8px; flex-wrap: wrap; }
.fap-form-row > * { flex: 1; min-width: 90px;
}
.fap-form-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.fap-preset-save { display: flex; gap: 6px; margin-left: auto; }
.fap-preset-save .fap-input { flex: 1; min-width: 110px;
}

.fap-presets { display: flex; flex-direction: column; gap: 6px; }
.fap-preset { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(232, 192, 96, 0.08); }
.fap-preset-name { flex: 1; font-size: 12px; color: rgba(255, 246, 224, 0.85); }
.fap-preset-actions { display: flex; gap: 6px; }

.fap-result-head { display: flex; align-items: center; justify-content: space-between; }
.fap-result-count { font-size: 11px; color: rgba(232, 192, 96, 0.5); }
.fap-results { display: flex; flex-direction: column; gap: 6px; }
.fap-result { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(232, 192, 96, 0.06); }
.fap-result-icon { font-size: 14px; }
.fap-result-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.fap-result-cat { font-size: 12px; color: rgba(255, 246, 224, 0.85); }
.fap-result-desc { font-size: 10px; color: rgba(255, 246, 224, 0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fap-result-amount { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.fap-result-amount.pos { color: #8a9a7a; }
.fap-result-amount.neg { color: #c46a5a; }
.fap-result-date { font-size: 10px; color: rgba(255, 246, 224, 0.35); }

/* 周期 */
.fap-period-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.fap-period-tab {
  border: 1px solid rgba(232, 192, 96, 0.15);
  background: transparent;
  color: rgba(255, 246, 224, 0.5);
  font-size: 11px;
  font-family: inherit;
  padding: 5px 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.fap-period-tab.is-active { background: rgba(232, 192, 96, 0.12); border-color: rgba(232, 192, 96, 0.3); color: #e8c060; }

.fap-stats { display: flex; gap: 8px; }
.fap-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; background: rgba(232, 192, 96, 0.05); }
.fap-stat b { font-size: 15px; font-weight: 600; color: #e8c060; font-variant-numeric: tabular-nums; }
.fap-stat b.pos { color: #8a9a7a; }
.fap-stat b.neg { color: #c46a5a; }
.fap-stat span { font-size: 10px; color: rgba(255, 246, 224, 0.4); }

.fap-period-highlight { display: flex; gap: 8px; }
.fap-highlight-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(232, 192, 96, 0.08); }
.fap-highlight-label { font-size: 10px; color: rgba(255, 246, 224, 0.45); }
.fap-highlight-item b { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.fap-highlight-item b.pos { color: #8a9a7a; }
.fap-highlight-item b.neg { color: #c46a5a; }
.fap-highlight-period { font-size: 10px; color: rgba(255, 246, 224, 0.4); }

.fap-periods { display: flex; flex-direction: column; gap: 8px; }
.fap-period { display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(232, 192, 96, 0.06); }
.fap-period-head { display: flex; align-items: center; justify-content: space-between; }
.fap-period-name { font-size: 12px; color: rgba(255, 246, 224, 0.85); }
.fap-period-balance { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.fap-period-balance.pos { color: #8a9a7a; }
.fap-period-balance.neg { color: #c46a5a; }
.fap-period-bar { display: flex; gap: 2px; height: 6px; border-radius: 999px; background: rgba(232, 192, 96, 0.06); overflow: hidden; }
.fap-period-bar i { display: block; height: 100%; border-radius: 999px; }
.fap-period-bar-income { background: rgba(138, 154, 122, 0.7); }
.fap-period-bar-expense { background: rgba(217, 140, 122, 0.7); }
.fap-period-meta { display: flex; gap: 12px; font-size: 10px; }
.fap-period-meta .pos { color: #8a9a7a; }
.fap-period-meta .neg { color: #c46a5a; }
.fap-period-meta span { color: rgba(255, 246, 224, 0.4); }

/* 图表 */
.fap-chart-block { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: rgba(232, 192, 96, 0.04); border: 1px solid rgba(232, 192, 96, 0.08); }
.fap-chart-bars { display: flex; flex-direction: column; gap: 6px; }
.fap-chart-row { display: flex; align-items: center; gap: 8px; }
.fap-chart-label { width: 90px; font-size: 11px; color: rgba(255, 246, 224, 0.7); flex-shrink: 0; }
.fap-chart-bar { flex: 1; height: 6px; border-radius: 999px; background: rgba(232, 192, 96, 0.06); overflow: hidden; }
.fap-chart-bar i { display: block; height: 100%; border-radius: 999px; }
.fap-chart-value { width: 64px; text-align: right; font-size: 11px; color: rgba(255, 246, 224, 0.6); font-variant-numeric: tabular-nums; }

.fap-trend-chart { display: flex; flex-direction: column; gap: 8px; }
.fap-trend-legend { display: flex; gap: 12px; }
.fap-legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: rgba(255, 246, 224, 0.5); }
.fap-legend-item i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.fap-trend-bars { display: flex; gap: 8px; height: 110px; align-items: flex-end; }
.fap-trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
.fap-trend-bars-inner { display: flex; gap: 2px; align-items: flex-end; height: 100%; width: 100%; }
.fap-trend-bar { flex: 1; border-radius: 3px 3px 0 0; min-height: 2px; transition: height 0.4s ease; }
.fap-trend-bar.income { background: rgba(138, 154, 122, 0.8); }
.fap-trend-bar.expense { background: rgba(217, 140, 122, 0.8); }
.fap-trend-label { font-size: 9px; color: rgba(255, 246, 224, 0.4); }

.fap-budget { display: flex; flex-direction: column; gap: 8px; }
.fap-budget-total { font-size: 11px; color: rgba(232, 192, 96, 0.6); }
.fap-budget-row { display: flex; align-items: center; gap: 8px; }
.fap-budget-label { width: 90px; font-size: 11px; color: rgba(255, 246, 224, 0.7); flex-shrink: 0; }
.fap-budget-value { width: 120px; text-align: right; font-size: 10px; color: rgba(255, 246, 224, 0.5); font-variant-numeric: tabular-nums; }
</style>
