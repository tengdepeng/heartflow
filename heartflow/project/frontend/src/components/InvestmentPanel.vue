<template>
  <section class="iv-panel" aria-label="投资持仓收益">
    <header class="iv-head">
      <span class="iv-title">📈 投资持仓收益</span>
      <span class="iv-sub">股票 · 基金 · 加密 · 其他 → 市值盈亏 · 按 {{ base }} 计价</span>
    </header>

    <!-- 组合汇总 -->
    <div class="iv-stats">
      <div class="iv-stat"><span>总市值</span><b>{{ money(summary.totalValue) }}</b></div>
      <div class="iv-stat"><span>总成本</span><b>{{ money(summary.totalCost) }}</b></div>
      <div class="iv-stat" :class="pnlClass(summary.totalPnl)"><span>浮动盈亏</span><b>{{ signed(summary.totalPnl) }}</b></div>
      <div class="iv-stat" :class="pnlClass(summary.totalPnl)"><span>收益率</span><b>{{ summary.yield }}%</b></div>
    </div>
    <div class="iv-tally">
      <span>共 {{ summary.count }} 笔</span>
      <span class="iv-win">盈利 {{ summary.winCount }}</span>
      <span class="iv-loss">亏损 {{ summary.lossCount }}</span>
      <span class="iv-even">持平 {{ summary.evenCount }}</span>
    </div>

    <!-- 按种类 -->
    <div v-if="kindBreak.length" class="iv-kinds">
      <div v-for="k in kindBreak" :key="k.kind" class="iv-kind">
        <span class="iv-kind-ico">{{ k.icon }}</span>
        <span class="iv-kind-name">{{ k.label }}</span>
        <span class="iv-kind-mv">{{ money(k.value) }}</span>
        <span class="iv-kind-pnl" :class="pnlClass(k.pnl)">{{ signed(k.pnl) }}</span>
      </div>
    </div>

    <!-- 新增表单 -->
    <div class="iv-toolbar">
      <button class="iv-add" @click="showCreate = !showCreate">{{ showCreate ? '收起' : '＋ 新建持仓' }}</button>
    </div>
    <form v-if="showCreate" class="iv-create" @submit.prevent="createHolding">
      <div class="iv-row">
        <input v-model="form.name" class="iv-input" placeholder="名称（如 茅台/沪深300/比特币）" />
        <select v-model="form.kind" class="iv-input"><option v-for="k in KINDS" :key="k.value" :value="k.value">{{ k.label }}</option></select>
        <select v-model="form.currency" class="iv-input"><option v-for="c in CURRENCY_LIST" :key="c.code" :value="c.code">{{ c.code }}</option></select>
      </div>
      <div class="iv-row">
        <input v-model.number="form.quantity" type="number" min="0" step="any" class="iv-input" placeholder="数量" />
        <input v-model.number="form.costPrice" type="number" min="0" step="any" class="iv-input" placeholder="成本价" />
        <input v-model.number="form.currentPrice" type="number" min="0" step="any" class="iv-input" placeholder="最新价" />
      </div>
      <button class="iv-btn" :disabled="!createValid">添加</button>
    </form>

    <!-- 持仓列表 -->
    <div v-if="holdings.length" class="iv-list">
      <article v-for="h in holdings" :key="h.id" class="iv-card">
        <div class="iv-card-head">
          <span class="iv-kind-tag" :style="{ background: meta(h.kind).color + '22', color: meta(h.kind).color }">{{ meta(h.kind).icon }} {{ meta(h.kind).label }}</span>
          <span class="iv-name">{{ h.name }}</span>
          <span class="iv-cur">{{ h.currency || base }}</span>
          <button class="iv-del" @click="onRemove(h.id)" title="删除持仓">✕</button>
        </div>
        <div class="iv-rows">
          <div class="iv-rmeta"><span>数量</span><b>{{ fmt(h.quantity) }}</b></div>
          <div class="iv-rmeta"><span>成本价</span><b>{{ h.currency || base }} {{ fmt(h.costPrice) }}</b></div>
          <div class="iv-rmeta iv-price"><span>最新价</span><b>{{ h.currency || base }} {{ fmt(h.currentPrice) }}</b><button class="iv-edit-price" @click="promptPrice(h)">改</button></div>
        </div>
        <div class="iv-rows iv-rows--fn">
          <div class="iv-rmeta"><span>市值</span><b>{{ money(hld(h).valueBase) }}</b></div>
          <div class="iv-rmeta"><span>盈亏</span><b :class="pnlClass(hld(h).pnlBase)">{{ signed(hld(h).pnlBase) }}</b></div>
          <div class="iv-rmeta"><span>收益率</span><b :class="pnlClass(hld(h).pnl)">{{ hld(h).yield }}%</b></div>
        </div>
      </article>
    </div>
    <p v-else class="iv-empty">还没有持仓，添加一笔开始追踪投资收益。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useHoldings,
  HOLDING_KIND_META,
  holdingSummary,
  portfolioSummary,
  type Holding,
  type HoldingKind,
} from '../modules/reward/investment'
import { useMultiCurrency, CURRENCY_LIST } from '../modules/reward/multi-currency'

const KINDS: { value: HoldingKind; label: string }[] = [
  { value: 'stock', label: '股票' },
  { value: 'fund', label: '基金' },
  { value: 'crypto', label: '加密' },
  { value: 'other', label: '其他' },
]

const store = useHoldings()
const mc = useMultiCurrency()
const rates = mc.rates
const base = mc.config.value.base
const holdings = computed(() => store.holdings.value)

const showCreate = ref(false)
const form = ref<{ name: string; kind: HoldingKind; currency: string; quantity: number; costPrice: number; currentPrice: number }>({
  name: '',
  kind: 'stock',
  currency: base,
  quantity: 0,
  costPrice: 0,
  currentPrice: 0,
})

const summary = computed(() => portfolioSummary(holdings.value, rates.value, base))
const hld = (h: Holding) => holdingSummary(h, rates.value, base)

const kindBreak = computed(() =>
  (['stock', 'fund', 'crypto', 'other'] as HoldingKind[])
    .map(kind => ({
      kind,
      label: meta(kind).label,
      icon: meta(kind).icon,
      value: summary.value.byKind[kind].value,
      pnl: summary.value.byKind[kind].pnl,
    }))
    .filter(k => k.value > 0 || k.pnl !== 0),
)

const createValid = computed(() =>
  form.value.name.trim() && (form.value.quantity > 0) && (form.value.currentPrice >= 0),
)

function meta(k: HoldingKind) {
  return HOLDING_KIND_META[k]
}
function money(n: number): string {
  return `¥${fmt(n)}`
}
function fmt(n: number): string {
  return Math.round(Math.abs(n) * 100) / 100 % 1 === 0
    ? Math.round(n).toLocaleString()
    : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}
function signed(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}¥${fmt(n)}`
}
function pnlClass(n: number): string {
  return n > 0 ? 'iv-pos' : n < 0 ? 'iv-neg' : 'iv-even'
}
function createHolding(): void {
  store.create({
    name: form.value.name.trim(),
    kind: form.value.kind,
    currency: form.value.currency || base,
    quantity: form.value.quantity,
    costPrice: form.value.costPrice,
    currentPrice: form.value.currentPrice,
  })
  form.value = { name: '', kind: 'stock', currency: base, quantity: 0, costPrice: 0, currentPrice: 0 }
  showCreate.value = false
}
function promptPrice(h: Holding): void {
  const cur = h.currentPrice || h.costPrice || 0
  const input = window.prompt('更新最新价', String(cur))
  if (input === null) return
  const n = parseFloat(input)
  if (isNaN(n) || n < 0) return
  store.updatePrice(h.id, n)
}
function onRemove(id: string): void {
  if (window.confirm('删除该持仓？')) store.remove(id)
}
</script>

<style scoped>
.iv-panel { background: #20241f; border: 1px solid #333a33; border-radius: 12px; padding: 14px; margin-top: 14px; color: #d9decf; }
.iv-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.iv-title { font-weight: 600; }
.iv-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.iv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px; }
.iv-stat { background: #161a15; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 2px; }
.iv-stat span { font-size: 11px; color: #8a9a7a; }
.iv-stat b { font-size: 16px; color: #e8c060; }
.iv-stat.iv-pos b { color: #8aca70; }
.iv-stat.iv-neg b { color: #c46a5a; }
.iv-tally { display: flex; gap: 12px; font-size: 11px; color: #6b7563; margin-bottom: 10px; flex-wrap: wrap; }
.iv-win { color: #8aca70; }
.iv-loss { color: #c46a5a; }
.iv-even { color: #8a9a7a; }

.iv-kinds { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.iv-kind { display: grid; grid-template-columns: 24px 1fr 90px 90px; gap: 6px; align-items: center; background: #161a15; border-radius: 8px; padding: 6px 10px; font-size: 12px; }
.iv-kind-ico { }
.iv-kind-name { color: #b7c0a8; }
.iv-kind-mv { color: #e8c060; text-align: right; }
.iv-kind-pnl { text-align: right; }
.iv-kind-pnl.iv-pos { color: #8aca70; }
.iv-kind-pnl.iv-neg { color: #c46a5a; }

.iv-toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.iv-add { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 5px 12px; font-weight: 600; cursor: pointer; font-size: 12px; font-family: inherit; }
.iv-create { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
.iv-row { display: flex; gap: 8px; flex-wrap: wrap; }
.iv-input { flex: 1; min-width: 80px; background: #101310; border: 1px solid #374136; border-radius: 8px; color: #d9decf; padding: 6px 9px; font-size: 12px; font-family: inherit; }
.iv-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 6px 14px; font-weight: 600; font-size: 12px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.iv-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.iv-list { display: flex; flex-direction: column; gap: 8px; }
.iv-card { background: #161a15; border-radius: 10px; padding: 10px; }
.iv-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.iv-kind-tag { font-size: 11px; border-radius: 6px; padding: 2px 8px; }
.iv-name { font-weight: 600; font-size: 13px; }
.iv-cur { font-size: 11px; color: #6b7563; }
.iv-del { margin-left: auto; background: transparent; border: none; color: #6b7563; cursor: pointer; font-size: 13px; }
.iv-del:hover { color: #c46a5a; }
.iv-rows { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 6px; }
.iv-rows--fn { border-top: 1px solid #262b24; padding-top: 6px; }
.iv-rmeta { display: flex; flex-direction: column; gap: 2px; font-size: 11px; }
.iv-rmeta span { color: #6b7563; }
.iv-rmeta b { color: #b7c0a8; font-weight: 600; }
.iv-rmeta.iv-pos b { color: #8aca70; }
.iv-rmeta.iv-neg b { color: #c46a5a; }
.iv-edit-price { background: none; border: 1px solid #4a5243; color: #6b9fc4; border-radius: 5px; font-size: 10px; padding: 0 5px; cursor: pointer; width: fit-content; }
.iv-empty { font-size: 12px; color: #6b7563; }
</style>