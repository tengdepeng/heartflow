<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance da">
    <!-- 氛围背景层：数据资产 · 星尘与网格 -->
    <div data-enter class="da-ambient" aria-hidden="true">
      <div class="da-glow da-glow--top"></div>
      <div class="da-glow da-glow--bottom"></div>
      <div class="da-grid" aria-hidden="true">
        <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="0.5" opacity="0.03">
            <circle cx="80" cy="120" r="3" fill="currentColor" />
            <circle cx="300" cy="180" r="2" fill="currentColor" />
            <circle cx="160" cy="300" r="2.5" fill="currentColor" />
            <circle cx="240" cy="420" r="2" fill="currentColor" />
            <circle cx="100" cy="520" r="3" fill="currentColor" />
            <circle cx="320" cy="600" r="2" fill="currentColor" />
            <circle cx="200" cy="700" r="2.5" fill="currentColor" />
            <line x1="80" y1="120" x2="300" y2="180" />
            <line x1="300" y1="180" x2="160" y2="300" />
            <line x1="160" y1="300" x2="240" y2="420" />
            <line x1="240" y1="420" x2="100" y2="520" />
            <line x1="100" y1="520" x2="320" y2="600" />
            <line x1="320" y1="600" x2="200" y2="700" />
          </g>
        </svg>
      </div>
    </div>

    <!-- 统一房间壳层：RoomLayout 提供标准化头部（装饰菱形 / 标题 / 副标题 / 眉标 / 面包屑） -->
    <RoomLayout
      :title="roomData?.name ?? '数据资产'"
      :subtitle="roomData?.description ?? ''"
      kicker="你在这座殿堂里留下的每一粒数据，都是资产"
      data-enter
    >
      <template #breadcrumb>
        <div class="breadcrumb-row">
          <button class="breadcrumb-link" @click="nav.enterRoom('home-space')">
            <span class="breadcrumb-home-icon">🏠</span>
            <span>家</span>
          </button>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-link current">
            <span class="breadcrumb-icon">{{ roomData?.icon }}</span>
            <span>{{ roomData?.name }}</span>
          </span>
        </div>
      </template>

    <!-- 概览统计 -->
    <section data-enter class="da-section">
      <div class="da-overview">
        <div class="da-ov-card da-ov-card--main">
          <span class="da-ov-value">{{ overview.totalItems }}</span>
          <span class="da-ov-label">数据条目</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.crystalCount }}</span>
          <span class="da-ov-label">结晶</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.sessionCount }}</span>
          <span class="da-ov-label">专注</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.noteCount }}</span>
          <span class="da-ov-label">笔记</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.emotionCount }}</span>
          <span class="da-ov-label">情绪</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.anchorCount }}</span>
          <span class="da-ov-label">锚点</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.goalCount }}</span>
          <span class="da-ov-label">目标</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.carrierCount }}</span>
          <span class="da-ov-label">载体</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.advisorCount }}</span>
          <span class="da-ov-label">幕僚</span>
        </div>
        <div class="da-ov-card">
          <span class="da-ov-value">{{ overview.relationCount }}</span>
          <span class="da-ov-label">关系</span>
        </div>
      </div>
    </section>

    <!-- 存储与趋势 -->
    <section data-enter class="da-section">
      <div class="da-two-col">
        <div class="da-panel">
          <h3 class="da-panel-title">💾 存储使用</h3>
          <div class="da-storage">
            <span class="da-storage-size">{{ usage.formatSize }}</span>
            <span class="da-storage-meta">{{ usage.kvEntries }} 个 KV 条目 · Schema v{{ overview.schemaVersion }}</span>
          </div>
        </div>
        <div class="da-panel">
          <h3 class="da-panel-title">📈 增长趋势</h3>
          <div class="da-trend">
            <span class="da-trend-badge" :class="trendClass">{{ trendLabel }}</span>
            <div class="da-trend-stats">
              <span>近 7 天 <b>{{ growth.last7Days }}</b></span>
              <span>近 30 天 <b>{{ growth.last30Days }}</b></span>
              <span>近 90 天 <b>{{ growth.last90Days }}</b></span>
              <span>90 天前 <b>{{ growth.olderThan90 }}</b></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据域健康度 -->
    <section data-enter class="da-section">
      <h3 class="da-panel-title">🩺 数据域健康度</h3>
      <div class="da-health">
        <div v-for="d in health" :key="d.key" class="da-health-item" :class="'da-health--' + d.integrity">
          <span class="da-health-name">{{ d.name }}</span>
          <span class="da-health-count">{{ d.count }}</span>
          <span class="da-health-state">{{ healthLabel(d.integrity) }}</span>
        </div>
      </div>
    </section>

    <!-- 完整性检查 -->
    <section data-enter class="da-section">
      <h3 class="da-panel-title">🧩 数据完整性</h3>
      <div v-if="integrity.overallHealthy" class="da-ok">
        <span class="da-ok-icon">✓</span>
        <span>全部 {{ integrity.domains.length }} 个数据域完整健康</span>
      </div>
      <div v-else class="da-issues">
        <div v-for="r in integrity.domains.filter(d => !d.isHealthy)" :key="r.domain" class="da-issue">
          <span class="da-issue-name">{{ r.name }}</span>
          <span class="da-issue-detail">{{ r.issues.join(' · ') }}</span>
        </div>
      </div>
    </section>

    <!-- 导出就绪 -->
    <section data-enter class="da-section">
      <h3 class="da-panel-title">📤 导出就绪</h3>
      <div class="da-export">
        <div class="da-export-meta">
          <span v-if="exportReady.hasData">{{ exportReady.domainCount }}/{{ exportReady.totalDomainCount }} 个域有数据</span>
          <span v-else>尚无数据可导出</span>
          <span>· 估算大小 {{ exportReady.estimatedExportSize }}</span>
        </div>
        <div class="da-export-ctrl">
          <button class="da-btn" :disabled="!exportReady.hasData" @click="doExport">导出全部数据</button>
          <button class="da-btn da-btn--ghost" @click="doRefresh">刷新</button>
        </div>
      </div>
    </section>

    <!-- 建议 -->
    <section data-enter class="da-section">
      <h3 class="da-panel-title">💡 数据资产建议</h3>
      <div v-if="recommendations.length" class="da-recs">
        <div v-for="r in recommendations" :key="r.id" class="da-rec" :class="'da-rec--' + r.priority">
          <span class="da-rec-pri">{{ priLabel(r.priority) }}</span>
          <div class="da-rec-body">
            <span class="da-rec-title">{{ r.title }}</span>
            <p class="da-rec-desc">{{ r.description }}</p>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        icon="💡"
        title="数据资产状态良好"
        hint="暂无优化建议，继续保持"
        cta-label=""
      />
    </section>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import { useDataAssetBridge } from '../modules/data-asset'
import { getRoom } from '../engine/room-graph'
import EmptyState from '../components/EmptyState.vue'
import RoomLayout from '../components/RoomLayout.vue'

const { entranceClass, entranceRef } = useViewEntrance()
const nav = useRoomNavigation()
const roomData = computed(() => getRoom('data-asset'))

const asset = useDataAssetBridge()

const overview = computed(() => asset.dataOverview.value)
const usage = computed(() => asset.storageUsage.value)
const health = computed(() => asset.dataDomainHealth.value)
const integrity = computed(() => asset.dataIntegrity.value)
const exportReady = computed(() => asset.exportReadiness.value)
const growth = computed(() => asset.dataGrowth.value)
const recommendations = computed(() => asset.recommendations.value)

const TREND_LABELS: Record<string, string> = {
  growing: '📈 增长中',
  stable: '➖ 平稳',
  declining: '📉 放缓',
  dormant: '💤 沉寂',
}
const trendLabel = computed(() => TREND_LABELS[growth.value.trend] ?? growth.value.trend)
const trendClass = computed(() => 'da-trend--' + growth.value.trend)

const HEALTH_LABELS: Record<string, string> = {
  healthy: '健康',
  warning: '警告',
  empty: '空',
}
function healthLabel(s: string) {
  return HEALTH_LABELS[s] ?? s
}
const PRI_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}
function priLabel(p: string) {
  return PRI_LABELS[p] ?? p
}

function doRefresh() {
  asset.refreshAll()
}
function doExport() {
  const json = asset.exportAllData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `heartflow-data-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  asset.refreshAll()
})
</script>

<style scoped>
.da { position: relative; max-width: 860px; margin: 0 auto; }
.da-ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.da-glow { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.14; }
.da-glow--top { width: 420px; height: 420px; top: -120px; right: -80px; background: #6b9fc4; }
.da-glow--bottom { width: 380px; height: 380px; bottom: -100px; left: -80px; background: #9a7ab8; }
.da-grid { position: absolute; right: 4%; top: 10%; opacity: 0.5; }

/* 头部（已迁移至 RoomLayout 统一头部，面包屑经 #breadcrumb 插槽保留 nav.enterRoom） */

.da-section { position: relative; z-index: 1; margin-bottom: 20px; padding: 18px 20px; border-radius: 14px; background: var(--card-bg, rgba(18, 14, 11, 0.6)); border: 1px solid var(--border, rgba(255, 255, 255, 0.08)); }
.da-panel-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); margin: 0 0 12px; }

.da-overview { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.da-ov-card { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 12px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.da-ov-card--main { background: rgba(var(--accent-rgb), 0.08); border: 1px solid rgba(var(--accent-rgb), 0.15); }
.da-ov-value { font-size: 19px; font-weight: 600; color: var(--text-high, #d8c3a5); font-variant-numeric: tabular-nums; }
.da-ov-label { font-size: 10px; color: rgba(232, 221, 208, 0.45); }

.da-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.da-panel { padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
.da-storage { display: flex; flex-direction: column; gap: 4px; }
.da-storage-size { font-size: 22px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.da-storage-meta { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.da-trend { display: flex; flex-direction: column; gap: 8px; }
.da-trend-badge { align-self: flex-start; font-size: 12px; padding: 3px 12px; border-radius: 8px; background: rgba(148,163,184,0.12); color: #94a3b8; }
.da-trend--growing { background: rgba(138,154,122,0.15); color: #8a9a7a; }
.da-trend--declining { background: rgba(196,106,90,0.12); color: #c46a5a; }
.da-trend--dormant { background: rgba(148,163,184,0.12); color: #94a3b8; }
.da-trend-stats { display: flex; flex-wrap: wrap; gap: 8px; font-size: 10px; color: rgba(232, 221, 208, 0.5); }
.da-trend-stats b { color: var(--text-high, #d8c3a5); font-variant-numeric: tabular-nums; }

.da-health { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.da-health-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.da-health-name { font-size: 12px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.da-health-count { margin-left: auto; font-size: 13px; font-weight: 600; color: var(--text-high, #d8c3a5); font-variant-numeric: tabular-nums; }
.da-health-state { font-size: 10px; padding: 1px 8px; border-radius: 8px; }
.da-health--healthy .da-health-state { background: rgba(138,154,122,0.15); color: #8a9a7a; }
.da-health--warning .da-health-state { background: rgba(240,192,64,0.12); color: #f0c040; }
.da-health--empty .da-health-state { background: rgba(148,163,184,0.12); color: #94a3b8; }

.da-ok { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; background: rgba(138,154,122,0.08); font-size: 12px; color: #8a9a7a; }
.da-ok-icon { font-size: 16px; }
.da-issues { display: flex; flex-direction: column; gap: 6px; }
.da-issue { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(240,192,64,0.06); font-size: 11px; }
.da-issue-name { font-weight: 600; color: #f0c040; }
.da-issue-detail { color: rgba(232, 221, 208, 0.55); }

.da-export { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.da-export-meta { font-size: 11px; color: rgba(232, 221, 208, 0.5); }
.da-export-ctrl { display: flex; gap: 8px; }
.da-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d8c3a5); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.da-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.da-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.da-btn--ghost { background: transparent; border-color: rgba(255,255,255,0.15); color: rgba(232, 221, 208, 0.6); }
.da-btn--ghost:hover { border-color: rgba(var(--accent-rgb), 0.4); color: var(--accent, #d8c3a5); background: rgba(var(--accent-rgb), 0.08); }

.da-recs { display: flex; flex-direction: column; gap: 8px; }
.da-rec { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.da-rec-pri { font-size: 10px; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
.da-rec--high .da-rec-pri { background: rgba(196,106,90,0.15); color: #c46a5a; }
.da-rec--medium .da-rec-pri { background: rgba(240,192,64,0.12); color: #f0c040; }
.da-rec--low .da-rec-pri { background: rgba(148,163,184,0.12); color: #94a3b8; }
.da-rec-body { display: flex; flex-direction: column; gap: 2px; }
.da-rec-title { font-size: 12px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.da-rec-desc { font-size: 11px; color: rgba(232, 221, 208, 0.5); margin: 0; line-height: 1.5; }

@media (max-width: 640px) {
  .da-overview { grid-template-columns: repeat(3, 1fr); }
  .da-two-col { grid-template-columns: 1fr; }
  .da-health { grid-template-columns: repeat(2, 1fr); }
}
</style>