<template>
  <section class="va-panel" aria-label="保险库安全审计">
    <header class="va-head">
      <span class="va-title">🛡️ 安全审计</span>
      <span class="va-sub">资产集中度 · 完整度 · 陈旧记录 · 温和洞察</span>
    </header>

    <!-- 概览卡 -->
    <div class="va-stats">
      <div class="va-stat"><span>资产条目</span><b>{{ ov.totalAssets }}</b></div>
      <div class="va-stat"><span>总价值</span><b>{{ money(ov.totalValue) }}</b></div>
      <div class="va-stat"><span>档案</span><b>{{ ov.archiveCount }}</b></div>
      <div class="va-stat"><span>分类</span><b>{{ ov.categoryCount }}</b></div>
    </div>

    <!-- 风险清单 -->
    <div v-if="hasRisk" class="va-risks">
      <div class="va-risk va-risk--warn" v-if="ov.largest && ov.largest.pct >= 50">
        <span class="va-risk-icon">⚖️</span>
        <span>「{{ ov.largest.name }}」占总价值 <b>{{ ov.largest.pct }}%</b>，集中度偏高</span>
      </div>
      <div class="va-risk" v-if="ov.missingValueCount > 0">
        <span class="va-risk-icon">🚫</span><span>{{ ov.missingValueCount }} 条资产价值为 0</span>
      </div>
      <div class="va-risk" v-if="ov.missingNoteCount > 0">
        <span class="va-risk-icon">📝</span><span>{{ ov.missingNoteCount }} 条资产未填备注</span>
      </div>
      <div class="va-risk" v-if="ov.staleCount > 0">
        <span class="va-risk-icon">⏳</span><span>{{ ov.staleCount }} 条资产超过半年未更新</span>
      </div>
      <div class="va-risk" v-if="ov.archiveMissingDetailCount > 0">
        <span class="va-risk-icon">🗂️</span><span>{{ ov.archiveMissingDetailCount }} 个档案未填详情</span>
      </div>
    </div>
    <div v-else class="va-allclear">✅ 未发现集中度或完整度风险，守备良好</div>

    <!-- 集中度 -->
    <div v-if="ov.totalAssets > 1" class="va-conc">
      <div class="va-conc-row">
        <span class="va-conc-label">最大单项占比</span>
        <div class="va-conc-track"><div class="va-conc-fill" :style="{ width: concPct + '%', background: concColor }" /></div>
        <span class="va-conc-val">{{ concPct }}%</span>
      </div>
      <div class="va-conc-row">
        <span class="va-conc-label">前 3 项合计</span>
        <div class="va-conc-track"><div class="va-conc-fill" :style="{ width: ov.top3Pct + '%' }" /></div>
        <span class="va-conc-val">{{ ov.top3Pct }}%</span>
      </div>
    </div>

    <!-- 分类分布 -->
    <div v-if="catRows.length" class="va-cats">
      <span class="va-cats-t">按分类资产分布</span>
      <div v-for="r in catRows" :key="r.cat" class="va-cat-row">
        <span class="va-cat-label">{{ r.icon }} {{ r.label }}</span>
        <div class="va-cat-track"><div class="va-cat-fill" :style="{ width: r.pct + '%', background: r.color }" /></div>
        <span class="va-cat-val">{{ money(r.total) }}（{{ r.count }}）</span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <div v-if="insights.length" class="va-insights">
      <span class="va-insights-t">温和洞察</span>
      <ul class="va-insights-list">
        <li v-for="(t, i) in insights" :key="i">💡 {{ t }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Asset, Archive } from '../modules/vault'
import {
  assetAuditOverview,
  assetCategoryDistribution,
  vaultAssetInsights,
} from '../modules/vault/vault-analytics'

const props = defineProps<{ assets: Asset[]; archives: Archive[] }>()

const ov = computed(() =>
  assetAuditOverview(props.assets, props.archives),
)
const catRows = computed(() => assetCategoryDistribution(props.assets))
const insights = computed(() => vaultAssetInsights(props.assets, props.archives))
const hasRisk = computed(
  () =>
    (ov.value.largest && ov.value.largest.pct >= 50) ||
    ov.value.missingValueCount > 0 ||
    ov.value.missingNoteCount > 0 ||
    ov.value.staleCount > 0 ||
    ov.value.archiveMissingDetailCount > 0,
)
const concPct = computed(() => ov.value.largest?.pct ?? 0)
const concColor = computed(() =>
  concPct.value >= 50 ? '#e0a96d' : concPct.value >= 30 ? '#e8c060' : '#8a9a7a',
)

function money(n: number): string {
  const abs = Math.round(Math.abs(n) * 100) / 100
  let s = abs.toLocaleString('zh-CN', { minimumFractionDigits: abs % 1 ? 2 : 0, maximumFractionDigits: 2 })
  return (n < 0 ? '-' : '') + s
}
</script>

<style scoped>
.va-panel { background: #20241f; border: 1px solid #333a33; border-radius: 12px; padding: 14px; margin-bottom: 14px; color: #d9decf; }
.va-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.va-title { font-weight: 600; }
.va-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.va-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
.va-stat { background: #161a15; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 3px; }
.va-stat span { font-size: 11px; color: #8a9a7a; }
.va-stat b { font-size: 16px; font-variant-numeric: tabular-nums; }

.va-risks { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.va-risk { display: flex; gap: 8px; align-items: center; font-size: 12px; background: #161a15; border-radius: 8px; padding: 8px 10px; color: #e0b36a; }
.va-risk b { color: #e8c060; }
.va-risk-icon { font-size: 14px; }
.va-allclear { font-size: 12px; color: #8aca70; background: #161a15; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; }

.va-conc { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
.va-conc-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.va-conc-label { width: 96px; color: #b7c0a8; }
.va-conc-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.05); overflow: hidden; }
.va-conc-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.va-conc-val { width: 44px; text-align: right; color: #e8c060; font-variant-numeric: tabular-nums; }

.va-cats { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 7px; }
.va-cats-t, .va-insights-t { font-size: 12px; color: #e8c060; }
.va-cat-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.va-cat-label { width: 96px; color: #d9decf; }
.va-cat-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.05); overflow: hidden; }
.va-cat-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.va-cat-val { width: 88px; text-align: right; color: #b7c0a8; font-variant-numeric: tabular-nums; white-space: nowrap; }

.va-insights { background: #161a15; border-radius: 10px; padding: 10px; }
.va-insights-list { margin: 6px 0 0; padding-left: 2px; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.va-insights-list li { font-size: 12px; color: #b7c0a8; line-height: 1.5; }

@media (max-width: 560px) {
  .va-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>