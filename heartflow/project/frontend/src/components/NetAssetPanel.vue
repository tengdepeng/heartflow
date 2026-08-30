<template>
  <section class="na-panel" aria-label="资产负债净资产">
    <header class="na-head">
      <span class="na-title">🏠 资产负债净资产</span>
      <span class="na-sub">资产 − 负债 = 净资产 · 仪表盘 + 趋势</span>
    </header>

    <!-- 净资产仪表盘 -->
    <div class="na-dash">
      <div class="na-dash-main" :class="{ neg: sum.negative }">
        <span class="na-dash-label">净资产</span>
        <span class="na-dash-val">¥{{ fmt(sum.netAssets) }}</span>
        <span v-if="sum.negative" class="na-dash-tag">⚠ 资不抵债</span>
      </div>
      <div class="na-dash-item">
        <span class="na-dash-mini-label">资产总额</span>
        <span class="na-dash-mini-val na-dash--asset">¥{{ fmt(sum.totalAssets) }}</span>
      </div>
      <div class="na-dash-item">
        <span class="na-dash-mini-label">负债总额</span>
        <span class="na-dash-mini-val na-dash--liab">¥{{ fmt(sum.totalLiabilities) }}</span>
      </div>
      <div class="na-dash-item">
        <span class="na-dash-mini-label">资产覆盖</span>
        <span class="na-dash-mini-val">{{ sum.coverage === null ? '—' : fmt(sum.coverage) + '%' }}</span>
      </div>
      <div v-if="sum.negativeAssets || sum.negative" class="na-dash-alert">
        <span v-if="sum.negativeAssets" class="na-alert-tag">⚠ {{ sum.negativeAssets }} 个账户为负</span>
      </div>
    </div>

    <!-- 资产 / 负债 明细 -->
    <div class="na-cols">
      <div class="na-col">
        <h4 class="na-col-title na-col-title--asset">资产 · {{ sum.assetItems.length }} 账户</h4>
        <div v-if="sum.assetItems.length" class="na-list">
          <div v-for="it in sum.assetItems" :key="'a' + it.id" class="na-item" :class="{ neg: it.negative }">
            <span class="na-item-icon">{{ it.icon || '🧾' }}</span>
            <span class="na-item-name">{{ it.name }}</span>
            <span class="na-item-sub">{{ it.sub }}</span>
            <span class="na-item-val">{{ fmt(it.value) }}</span>
          </div>
        </div>
        <p v-else class="na-empty">暂无资产账户，可到上方「多账户」新建。</p>
      </div>
      <div class="na-col">
        <h4 class="na-col-title na-col-title--liab">负债 · {{ sum.liabilityItems.length }} 笔</h4>
        <div v-if="sum.liabilityItems.length" class="na-list">
          <div v-for="it in sum.liabilityItems" :key="'l' + it.id" class="na-item">
            <span class="na-item-icon">{{ it.icon || '📉' }}</span>
            <span class="na-item-name">{{ it.name }}</span>
            <span class="na-item-sub">{{ it.sub }}</span>
            <span class="na-item-val na-item-val--liab">{{ fmt(it.value) }}</span>
          </div>
        </div>
        <p v-else class="na-empty">暂无负债，可到上方「信用卡/负债」添加。</p>
      </div>
    </div>

    <!-- 净资产月度趋势 -->
    <h4 class="na-col-title">净资产趋势 · 近 {{ trend.length }} 月</h4>
    <div v-if="trend.length" class="na-trend">
      <div v-for="p in trend" :key="p.month" class="na-trend-col">
        <span class="na-trend-net" :class="{ neg: p.net < 0 }">¥{{ fmt(p.net) }}</span>
        <div class="na-trend-bar">
          <div class="na-trend-asset" :style="{ height: barH(p.assets) }" :title="'资产 ¥' + fmt(p.assets)"></div>
          <div class="na-trend-liab" :style="{ height: barH(p.liabilities) }" :title="'负债 ¥' + fmt(p.liabilities)"></div>
        </div>
        <span class="na-trend-label">{{ p.label }}</span>
      </div>
    </div>
    <p v-else class="na-empty">暂无趋势数据。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { netAssetSummary, netAssetTrend } from '../modules/reward/net-asset'
import type { Account } from '../modules/reward/accounts'
import type { Transfer } from '../modules/reward/accounts'
import type { CreditCardRecord } from '../modules/reward/credit-card'
import type { RewardRecord } from '../modules/reward/reward-list'

const props = defineProps<{
  accounts: Account[]
  records: RewardRecord[]
  transfers: Transfer[]
  cards: CreditCardRecord[]
  /** 基准日期（缺省本地今天），便于测试注入 */
  today?: string
  /** 趋势月数 */
  months?: number
}>()

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = computed(() => props.today || localToday())
const months = computed(() => props.months ?? 6)

function fmt(n: number): string {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

const sum = computed(() => netAssetSummary(props.accounts, props.records, props.transfers, props.cards, today.value))
const trend = computed(() => netAssetTrend(props.accounts, props.records, props.transfers, props.cards, today.value, months.value))

/** 趋势柱最大刻度（取资产/净资产最大值，保证柱不溢出） */
const trendMax = computed(() => {
  let m = 0
  for (const p of trend.value) m = Math.max(m, p.assets, p.net)
  return m || 100
})

function barH(v: number): string {
  if (trendMax.value <= 0) return '0%'
  return `${Math.max(0, Math.floor((v / trendMax.value) * 100))}%`
}
</script>

<style scoped>
.na-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.na-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.na-title { font-weight: 600; }
.na-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.na-dash { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.na-dash-main { display: flex; align-items: baseline; gap: 8px; }
.na-dash-label { font-size: 12px; color: #8a9a7a; }
.na-dash-val { font-size: 22px; font-weight: 800; color: #8a9a7a; }
.na-dash-main.neg .na-dash-val { color: #c46a5a; }
.na-dash-tag { font-size: 11px; color: #c46a5a; border: 1px solid #7a4538; border-radius: 6px; padding: 1px 6px; }
.na-dash-item { display: flex; align-items: baseline; gap: 6px; }
.na-dash-mini-label { font-size: 11px; color: #8a9a7a; }
.na-dash-mini-val { font-weight: 700; font-size: 13px; }
.na-dash--asset { color: #8a9a7a; }
.na-dash--liab { color: #c46a5a; }
.na-dash-alert { display: flex; gap: 6px; margin-left: auto; }
.na-alert-tag { font-size: 11px; color: #f0c040; border: 1px solid #7a6a2a; border-radius: 6px; padding: 1px 6px; }

.na-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px; }
@media (max-width: 640px) { .na-cols { grid-template-columns: 1fr; } }
.na-col { min-width: 0; }
.na-col-title { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #b7c0a8; }
.na-col-title--asset { color: #8a9a7a; }
.na-col-title--liab { color: #c46a5a; }
.na-list { display: flex; flex-direction: column; gap: 3px; }
.na-item {
  display: flex; align-items: center; gap: 6px; font-size: 12px;
  padding: 4px 6px; border-bottom: 1px dashed #2c312b;
}
.na-item.neg { color: #c46a5a; }
.na-item-icon { flex: 0 0 auto; }
.na-item-name { font-weight: 600; }
.na-item-sub { color: #6b7563; font-size: 11px; }
.na-item-val { margin-left: auto; font-weight: 700; }
.na-item-val--liab { color: #c46a5a; }
.na-empty { font-size: 12px; color: #8a9a7a; }

.na-trend { display: flex; gap: 10px; align-items: flex-end; min-height: 120px; padding-top: 4px; }
.na-trend-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 0; }
.na-trend-net { font-size: 10px; color: #8a9a7a; white-space: nowrap; }
.na-trend-net.neg { color: #c46a5a; }
.na-trend-bar {
  display: flex; align-items: flex-end; gap: 2px; width: 100%;
  height: 80px; background: #161a15; border-radius: 6px; overflow: hidden; padding: 2px;
}
.na-trend-asset { background: #8a9a7a; border-radius: 3px 3px 0 0; flex: 1; }
.na-trend-liab { background: #c46a5a; border-radius: 3px 3px 0 0; flex: 1; }
.na-trend-label { font-size: 10px; color: #b7c0a8; }
</style>