<template>
  <section v-if="records.length" class="prp-panel" aria-label="周期性收支分析">
    <header class="prp-head">
      <span class="prp-title">📊 周期性收支</span>
      <span class="prp-sub">按日·周·月·季·年看收支节奏</span>
    </header>

    <!-- 收支对比总览 -->
    <div class="prp-compare">
      <div class="prp-comp-card">
        <span class="prp-comp-label">收入</span>
        <span class="prp-comp-val prp-inc">¥{{ fmt(comparison.income) }}</span>
      </div>
      <div class="prp-comp-card">
        <span class="prp-comp-label">支出</span>
        <span class="prp-comp-val prp-exp">¥{{ fmt(comparison.expense) }}</span>
      </div>
      <div class="prp-comp-card">
        <span class="prp-comp-label">结余</span>
        <span class="prp-comp-val" :class="comparison.balance >= 0 ? 'prp-inc' : 'prp-exp'">{{ fmt(comparison.balance) }}</span>
      </div>
      <div class="prp-comp-card">
        <span class="prp-comp-label">收支比</span>
        <span class="prp-comp-val">{{ comparison.ratio >= 0 ? comparison.ratio : '∞' }}</span>
      </div>
    </div>

    <!-- 周期切换 -->
    <div class="prp-tabs">
      <button
        v-for="p in periodOptions"
        :key="p.key"
        :class="['prp-tab', { active: periodType === p.key }]"
        @click="periodType = p.key"
      >{{ p.label }}</button>
    </div>

    <!-- 周期总览 -->
    <div class="prp-total">
      <span class="prp-total-item">总收 <b>¥{{ fmt(analysis.totalIncome) }}</b></span>
      <span class="prp-total-item">总支 <b>¥{{ fmt(analysis.totalExpense) }}</b></span>
      <span class="prp-total-item" :class="{ pos: analysis.totalBalance >= 0, neg: analysis.totalBalance < 0 }">
        结余 <b>¥{{ fmt(analysis.totalBalance) }}</b>
      </span>
      <span class="prp-total-item">趋势 <b class="prp-trend" :class="'prp-trend--' + analysis.trend">{{ trendLabel(analysis.trend) }}</b></span>
    </div>

    <!-- 最佳 / 最差周期 -->
    <div v-if="analysis.bestPeriod || analysis.worstPeriod" class="prp-extreme">
      <p v-if="analysis.bestPeriod" class="prp-extreme-item">
        🏆 结余最好的 {{ periodName }}：<b>{{ analysis.bestPeriod.period }}</b>（¥{{ fmt(analysis.bestPeriod.balance) }}）
      </p>
      <p v-if="analysis.worstPeriod" class="prp-extreme-item">
        📉 结余最紧的 {{ periodName }}：<b>{{ analysis.worstPeriod.period }}</b>（¥{{ fmt(analysis.worstPeriod.balance) }}）
      </p>
    </div>

    <!-- 周期明细 -->
    <div class="prp-list">
      <div v-for="p in analysis.periods" :key="p.period" class="prp-row">
        <span class="prp-row-per">{{ p.period }}</span>
        <span class="prp-row-count">{{ p.recordCount }}笔</span>
        <span class="prp-row-inc">+¥{{ fmt(p.income) }}</span>
        <span class="prp-row-exp">-¥{{ fmt(p.expense) }}</span>
        <span class="prp-row-bal" :class="p.balance >= 0 ? 'pos' : 'neg'">{{ signed(p.balance) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePeriodicAnalysis, useChartData } from '../modules/reward/finance-analysis'
import type { PeriodType } from '../modules/reward/finance-analysis'
import type { RewardRecord } from '../modules/reward/types'

const props = defineProps<{ records: RewardRecord[] }>()

const periodOptions: { key: PeriodType; label: string }[] = [
  { key: 'daily', label: '日' },
  { key: 'weekly', label: '周' },
  { key: 'monthly', label: '月' },
  { key: 'quarterly', label: '季' },
  { key: 'yearly', label: '年' },
]

const pa = usePeriodicAnalysis(() => props.records)
const chart = useChartData(() => props.records)

const periodType = ref<PeriodType>('monthly')

const analysis = computed(() => pa.computeAnalysis(periodType.value))
const comparison = computed(() => chart.getIncomeExpenseComparison())

const periodName = computed(() => periodOptions.find(o => o.key === periodType.value)?.label ?? '周期')

function fmt(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString()
}

function signed(n: number): string {
  return (n >= 0 ? '+' : '') + '¥' + fmt(n)
}

function trendLabel(t: string): string {
  const map: Record<string, string> = { up: '上升', down: '下降', stable: '平稳' }
  return map[t] || t
}
</script>

<style scoped>
.prp-panel {
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 24px;
  border-radius: 14px;
  border: 1px solid rgba(232, 192, 96, 0.08);
  background: rgba(232, 192, 96, 0.03);
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}
.prp-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.prp-title { font-size: 13px; font-weight: 600; color: rgba(232, 192, 96, 0.85); }
.prp-sub { font-size: 11px; color: rgba(232, 192, 96, 0.4); }

.prp-compare {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.prp-comp-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
}
.prp-comp-label { font-size: 10px; color: rgba(232, 192, 96, 0.45); }
.prp-comp-val { font-size: 14px; font-weight: 600; }
.prp-inc { color: #80c080; }
.prp-exp { color: #c08080; }

.prp-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.prp-tab {
  flex: 1;
  padding: 5px 0;
  border-radius: 8px;
  border: 1px solid rgba(232, 192, 96, 0.1);
  background: transparent;
  color: rgba(232, 192, 96, 0.35);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.prp-tab.active {
  background: rgba(232, 192, 96, 0.12);
  color: #e8c060;
  border-color: rgba(232, 192, 96, 0.25);
}
.prp-tab:hover { border-color: rgba(232, 192, 96, 0.25); }

.prp-total {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  margin-bottom: 12px;
  font-size: 11px;
  color: rgba(232, 192, 96, 0.5);
}
.prp-total-item b { color: rgba(232, 192, 96, 0.9); font-weight: 600; }
.prp-total-item.pos b { color: #80c080; }
.prp-total-item.neg b { color: #c08080; }
.prp-trend--up { color: #80c080; }
.prp-trend--down { color: #c08080; }
.prp-trend--stable { color: rgba(232, 192, 96, 0.8); }

.prp-extreme {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(232, 192, 96, 0.04);
}
.prp-extreme-item {
  margin: 0;
  font-size: 11px;
  color: rgba(232, 192, 96, 0.5);
  line-height: 1.7;
}
.prp-extreme-item b { color: #e8c060; font-weight: 600; }

.prp-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
}
.prp-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto auto;
  gap: 8px;
  align-items: center;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 11px;
}
.prp-row:nth-child(odd) { background: rgba(255, 255, 255, 0.015); }
.prp-row-per { font-weight: 500; color: rgba(232, 192, 96, 0.85); }
.prp-row-count { color: rgba(232, 192, 96, 0.3); }
.prp-row-inc { color: #80c080; }
.prp-row-exp { color: #c08080; }
.prp-row-bal { font-weight: 600; color: rgba(232, 192, 96, 0.85); }
.prp-row-bal.pos { color: #80c080; }
.prp-row-bal.neg { color: #c08080; }

@media (max-width: 480px) {
  .prp-compare { grid-template-columns: repeat(2, 1fr); }
  .prp-row { grid-template-columns: 1fr auto; }
  .prp-row-inc, .prp-row-exp { display: none; }
}
</style>