<template>
  <section class="cu-panel" aria-label="多币种/汇率">
    <header class="cu-head">
      <span class="cu-title">💱 多币种/汇率</span>
      <span class="cu-sub">基准记账币种 · 汇率表 · 快速换算</span>
    </header>

    <!-- 基准币种 -->
    <div class="cu-row cu-base">
      <span class="cu-label">记账基准币种</span>
      <select v-model="baseSel" class="cu-input" @change="onBaseChange">
        <option v-for="c in CURRENCY_LIST" :key="c.code" :value="c.code">{{ c.symbol }} {{ c.label }} ({{ c.code }})</option>
      </select>
      <button class="cu-btn cu-btn--ghost" @click="resetRates">恢复默认汇率</button>
    </div>

    <!-- 汇率表 -->
    <div class="cu-table">
      <div v-for="c in rateRows" :key="c.code" class="cu-trow">
        <span class="cu-ccode">{{ c.symbol }} {{ c.label }}</span>
        <span class="cu-crate" :title="`1 ${c.code} = ${fmt(c.rate)} ${baseSel}`">
          {{ fmt(c.rate) }} <i>{{ baseSel }}</i>
        </span>
        <input :value="c.rate" type="number" step="0.0001" min="0" class="cu-input cu-edit"
          @change="onRateChange(c.code, ($event.target as HTMLInputElement).value)" />
      </div>
    </div>
    <p class="cu-note">汇率为参考值，可手动调整；不同币种持仓与换算将按此折算到基准币。</p>

    <!-- 快速换算 -->
    <div class="cu-convert">
      <span class="cu-label">快速换算</span>
      <div class="cu-row">
        <input v-model.number="convAmount" type="number" min="0" class="cu-input" placeholder="金额" />
        <select v-model="convFrom" class="cu-input"><option v-for="c in CURRENCY_LIST" :key="c.code" :value="c.code">{{ c.code }}</option></select>
        <span class="cu-eq">=</span>
        <strong class="cu-result">{{ converted }}</strong>
      </div>
      <p v-if="convAmount > 0" class="cu-subresult">{{ convFrom }} {{ fmt(convAmount) }} → 基准 {{ base }} {{ converted }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useMultiCurrency,
  CURRENCY_LIST,
  toBase,
  formatMoney,
} from '../modules/reward/multi-currency'

const mc = useMultiCurrency()
const config = mc.config
const rates = mc.rates

const baseSel = ref(config.value.base)
const convAmount = ref<number>(0)
const convFrom = ref('USD')

const base = computed(() => baseSel.value)

/** 可编辑汇率行：排除基准币本身 */
const rateRows = computed<{ code: string; symbol: string; label: string; rate: number }[]>(() =>
  CURRENCY_LIST.filter(c => c.code !== base.value).map(c => ({
    code: c.code,
    symbol: c.symbol,
    label: c.label,
    rate: rates.value[c.code] ?? 0,
  })),
)

const converted = computed(() => {
  if (!(convAmount.value > 0)) return '—'
  return formatMoney(toBase(convAmount.value, convFrom.value, rates.value, base.value), 2)
})

function onBaseChange(): void {
  mc.setBase(baseSel.value)
  if (convFrom.value === baseSel.value) convFrom.value = 'USD'
  convAmount.value = 0
}
function onRateChange(code: string, v: string): void {
  const n = parseFloat(v)
  if (isNaN(n) || n <= 0) return
  mc.setRate(code, n)
}
function resetRates(): void {
  mc.resetRates()
  convAmount.value = 0
}
function fmt(n: number): string {
  return formatMoney(n, n < 0.01 ? 6 : 4)
}
</script>

<style scoped>
.cu-panel { background: #20241f; border: 1px solid #333a33; border-radius: 12px; padding: 14px; margin-top: 14px; color: #d9decf; }
.cu-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.cu-title { font-weight: 600; }
.cu-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.cu-label { font-size: 12px; color: #8a9a7a; }
.cu-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.cu-base { margin-bottom: 12px; }
.cu-input { flex: 1; min-width: 120px; background: #101310; border: 1px solid #374136; border-radius: 8px; color: #d9decf; padding: 6px 9px; font-size: 12px; font-family: inherit; }
.cu-btn { border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-family: inherit; }
.cu-btn--ghost { background: transparent; border: 1px solid #4a5243; color: #d9decf; }
.cu-btn--ghost:hover { border-color: #6b9fc4; color: #6b9fc4; }

.cu-table { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.cu-trow { display: grid; grid-template-columns: 1fr 90px 120px; gap: 8px; align-items: center; background: #161a15; border-radius: 8px; padding: 6px 10px; }
.cu-ccode { font-size: 12px; color: #b7c0a8; }
.cu-crate { font-size: 12px; color: #e8c060; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cu-crate i { color: #6b7563; font-style: normal; font-size: 10px; }
.cu-edit { min-width: 0; text-align: right; }
.cu-note { font-size: 11px; color: #6b7563; margin: 0 0 10px; }

.cu-convert { background: #161a15; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.cu-eq { color: #6b7563; }
.cu-result { color: #e8c060; font-size: 16px; }
.cu-subresult { font-size: 11px; color: #8a9a7a; margin: 0; }
</style>