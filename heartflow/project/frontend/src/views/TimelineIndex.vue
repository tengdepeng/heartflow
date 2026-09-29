<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance timeline-index">
    <!-- 氛围背景 -->
    <div data-enter class="ti-ambient" aria-hidden="true">
      <div class="ti-glow ti-glow--top"></div>
      <div class="ti-glow ti-glow--mid"></div>
    </div>

    <RoomLayout
      title="时间线索引"
      kicker="在时间轴上俯瞰你的每一天"
      align="center"
      data-enter
    >

    <!-- 快速导航 -->
    <div data-enter class="ti-nav">
      <button class="ti-nav-card" @click="navTo('/timeline')">
        <span class="ti-nav-icon">≋</span>
        <span class="ti-nav-label">时间之河</span>
        <span class="ti-nav-desc">逐日回看所有记录</span>
      </button>
      <button class="ti-nav-card" @click="navTo('/time-corridor')">
        <span class="ti-nav-icon">◈</span>
        <span class="ti-nav-label">时间长廊</span>
        <span class="ti-nav-desc">结晶分布可视化</span>
      </button>
      <button class="ti-nav-card" @click="navTo('/garden')">
        <span class="ti-nav-icon">🌷</span>
        <span class="ti-nav-label">情绪花房</span>
        <span class="ti-nav-desc">情绪趋势与花园</span>
      </button>
      <button class="ti-nav-card" @click="navTo('/anchor')">
        <span class="ti-nav-icon">⚓</span>
        <span class="ti-nav-label">逐日心锚</span>
        <span class="ti-nav-desc">锚点记录回顾</span>
      </button>
    </div>

    <!-- 索引统计 -->
    <div data-enter class="ti-stats" v-if="indexStats">
      <div class="ti-stat-card">
        <span class="ti-stat-value">{{ indexStats.totalEntries }}</span>
        <span class="ti-stat-label">总条目</span>
      </div>
      <div class="ti-stat-card">
        <span class="ti-stat-value">{{ indexStats.shardCount }}</span>
        <span class="ti-stat-label">分片数</span>
      </div>
      <div class="ti-stat-card">
        <span class="ti-stat-value">{{ formatWeight(indexStats.averageWeight) }}</span>
        <span class="ti-stat-label">平均权重</span>
      </div>
      <div class="ti-stat-card">
        <span class="ti-stat-value">{{ indexStats.governanceDistribution.active }}</span>
        <span class="ti-stat-label">活跃条目</span>
      </div>
    </div>

    <!-- 类型分布 -->
    <section data-enter class="ti-section" v-if="indexStats">
      <h2 class="section-label">
        <span class="section-label-icon">📊</span>
        类型分布
      </h2>
      <div class="ti-type-grid">
        <div
          v-for="(count, type) in indexStats.typeDistribution"
          :key="type"
          class="ti-type-card"
        >
          <span class="ti-type-icon">{{ typeIcon(type) }}</span>
          <span class="ti-type-name">{{ typeLabel(type) }}</span>
          <span class="ti-type-count">{{ count }}</span>
          <div class="ti-type-bar">
            <div
              class="ti-type-fill"
              :style="{ width: percentage(count, indexStats.totalEntries) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 治理分布 -->
    <section data-enter class="ti-section" v-if="indexStats">
      <h2 class="section-label">
        <span class="section-label-icon">🗂️</span>
        治理状态
      </h2>
      <div class="ti-gov-grid">
        <div class="ti-gov-card gov-active">
          <span class="ti-gov-num">{{ indexStats.governanceDistribution.active }}</span>
          <span class="ti-gov-label">活跃</span>
        </div>
        <div class="ti-gov-card gov-archived">
          <span class="ti-gov-num">{{ indexStats.governanceDistribution.archived }}</span>
          <span class="ti-gov-label">已归档</span>
        </div>
        <div class="ti-gov-card gov-released">
          <span class="ti-gov-num">{{ indexStats.governanceDistribution.released }}</span>
          <span class="ti-gov-label">已发布</span>
        </div>
        <div class="ti-gov-card gov-deleted">
          <span class="ti-gov-num">{{ indexStats.governanceDistribution.deleted }}</span>
          <span class="ti-gov-label">已删除</span>
        </div>
      </div>
    </section>

    <!-- 缓存统计 -->
    <section data-enter class="ti-section" v-if="cacheStats">
      <h2 class="section-label">
        <span class="section-label-icon">💾</span>
        缓存状态
      </h2>
      <div class="ti-cache-info">
        <div class="ti-cache-row">
          <span>已缓存分片</span>
          <span>{{ cacheStats.cachedShards }} / {{ cacheStats.maxCacheSize ? Math.floor(cacheStats.maxCacheSize / 1024) + 'KB' : '-' }}</span>
        </div>
        <div class="ti-cache-row">
          <span>缓存大小</span>
          <span>{{ formatBytes(cacheStats.cacheSizeBytes) }}</span>
        </div>
      </div>
    </section>

    <!-- 最近查询 -->
    <section data-enter class="ti-section">
      <h2 class="section-label">
        <span class="section-label-icon">🔍</span>
        快捷查询
      </h2>
      <div class="ti-query-buttons">
        <button class="ti-query-btn" @click="queryRecent(7)">最近 7 天</button>
        <button class="ti-query-btn" @click="queryRecent(30)">最近 30 天</button>
        <button class="ti-query-btn" @click="queryRecent(90)">最近 90 天</button>
        <button class="ti-query-btn" @click="queryRecent(365)">最近一年</button>
      </div>
      <div v-if="queryResult" class="ti-query-result">
        <span class="ti-query-meta">
          查询到 <strong>{{ queryResult.total }}</strong> 条记录
          （扫描 {{ queryResult.shardsScanned }} 个分片）
          <template v-if="queryResult.hasMore">，还有更多</template>
        </span>
        <div class="ti-query-list" v-if="queryResult.entries.length > 0">
          <div
            v-for="entry in queryResult.entries.slice(0, 10)"
            :key="entry.indexId"
            class="ti-query-item"
          >
            <span class="ti-qi-type">{{ typeIcon(entry.type) }}</span>
            <span class="ti-qi-date">{{ entry.timestamp.slice(0, 10) }}</span>
            <span class="ti-qi-summary">{{ entry.summary.snippet || entry.type }}</span>
            <span class="ti-qi-weight">{{ formatWeight(entry.weight) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 维护操作 -->
    <section data-enter class="ti-section">
      <h2 class="section-label">
        <span class="section-label-icon">🔧</span>
        索引维护
      </h2>
      <div class="ti-maintain">
        <button class="ti-maintain-btn" @click="handleRebuild" :disabled="rebuilding">
          {{ rebuilding ? '重建中...' : '重建二级索引' }}
        </button>
        <button class="ti-maintain-btn" @click="handleClearCache">清空缓存</button>
      </div>
      <div v-if="maintainMessage" class="ti-maintain-msg" :class="maintainMessage.type">
        {{ maintainMessage.text }}
      </div>
    </section>

    <!-- 聚合视图 -->
    <AggregationPanel :entries="allEntries" />

    <!-- 全文搜索 -->
    <FullTextSearchPanel :entries="allEntries" />

    <!-- 事件关联 -->
    <EventLinkagePanel :entries="allEntries" />

    <!-- 叙事报告（INCR-255 补挂载孤儿组件：日·周·月·年叙事生成与导出） -->
    <NarrativeReportPanel />
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useTimelineIndex } from '../modules/timeline-index'
import type { IndexQueryResult } from '../modules/timeline-index'
import type { IndexEntry } from '../modules/timeline-index'
import AggregationPanel from '../components/AggregationPanel.vue'
import FullTextSearchPanel from '../components/FullTextSearchPanel.vue'
import EventLinkagePanel from '../components/EventLinkagePanel.vue'
import NarrativeReportPanel from '../components/NarrativeReportPanel.vue'
import RoomLayout from '../components/RoomLayout.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const router = useRouter()
const index = useTimelineIndex()

const indexStats = ref<ReturnType<typeof index.getStats> | null>(null)
const cacheStats = ref<ReturnType<typeof index.getCacheStats> | null>(null)
const queryResult = ref<IndexQueryResult | null>(null)
const rebuilding = ref(false)
const maintainMessage = ref<{ type: string; text: string } | null>(null)
const allEntries = ref<IndexEntry[]>([])

onMounted(() => {
  indexStats.value = index.getStats()
  cacheStats.value = index.getCacheStats()
  const result = index.queryByTime({ limit: 10000 })
  allEntries.value = result.entries
})

function navTo(path: string) {
  router.push(path)
}

function queryRecent(days: number) {
  const end = new Date().toISOString().slice(0, 10)
  const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  queryResult.value = index.queryByTime({ startDate: start, endDate: end })
}

function handleRebuild() {
  rebuilding.value = true
  maintainMessage.value = null
  // 模拟异步重建
  setTimeout(() => {
    const ok = index.rebuildSecondaryIndex()
    rebuilding.value = false
    maintainMessage.value = {
      type: ok ? 'success' : 'error',
      text: ok ? '二级索引重建成功' : '二级索引重建失败',
    }
    if (ok) {
      indexStats.value = index.getStats()
    }
  }, 300)
}

function handleClearCache() {
  index.clearCache()
  cacheStats.value = index.getCacheStats()
  maintainMessage.value = { type: 'success', text: '缓存已清空' }
}

// ---- 工具函数 ----
function typeIcon(type: string): string {
  const map: Record<string, string> = {
    crystal: '💎', note: '📝', emotion: '🌷',
    session: '⏱️', anchor: '⚓', output: '📤',
  }
  return map[type] || '📌'
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    crystal: '结晶', note: '笔记', emotion: '情绪',
    session: '专注', anchor: '心锚', output: '输出',
  }
  return map[type] || type
}

function formatWeight(w: number): string {
  return (w * 100).toFixed(0) + '%'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function percentage(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}
</script>

<style scoped>
/* =============================================
   时间线索引 · 俯瞰视图
   在时间轴上俯瞰你的每一天
   ============================================= */

.timeline-index {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden auto;
  padding: 0 0 48px;
  background: transparent;
}

.timeline-index :deep(.room-layout__body) {
  padding: 0;
  gap: 0;
}

/* ---- 氛围背景 ---- */
.ti-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.ti-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.05;
}

.ti-glow--top {
  top: -150px;
  left: -80px;
  background: var(--accent);
}

.ti-glow--mid {
  bottom: -100px;
  right: -50px;
  background: var(--accent);
}

/* ---- 快速导航 ---- */
.ti-nav {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 20px 32px 0;
}

.ti-nav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 20px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: all 0.25s;
  min-width: 120px;
}

.ti-nav-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--accent-rgb), 0.2);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.ti-nav-icon {
  font-size: 24px;
}

.ti-nav-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.8);
}

.ti-nav-desc {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.3);
}
/* 窄屏：导航卡换行并弹性平分，避免四卡 min-width 把整行撑出视口（+63px） */
@media (max-width: 640px) {
  .ti-nav {
    flex-wrap: wrap;
    padding: 16px 12px 0;
    gap: 8px;
  }
  .ti-nav-card {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
  }
}

/* ---- 统计卡片 ---- */
.ti-stats {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px 32px 0;
}

.ti-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 20px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  min-width: 80px;
}

.ti-stat-value {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.ti-stat-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

/* ---- 内容区 ---- */
.ti-section {
  position: relative;
  z-index: 1;
  padding: 20px 32px 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 2px;
  margin-bottom: 12px;
  font-weight: 500;
}

.section-label-icon {
  font-size: 16px;
}

/* ---- 类型分布 ---- */
.ti-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.ti-type-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.ti-type-icon {
  font-size: 18px;
}

.ti-type-name {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.6);
  min-width: 32px;
}

.ti-type-count {
  font-size: 16px;
  font-weight: 500;
  color: var(--accent);
  margin-left: auto;
}

.ti-type-bar {
  display: none;
}

/* ---- 治理状态 ---- */
.ti-gov-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.ti-gov-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.ti-gov-num {
  font-size: 20px;
  font-weight: 500;
}

.ti-gov-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

.gov-active .ti-gov-num { color: var(--green); }
.gov-archived .ti-gov-num { color: var(--accent); }
.gov-released .ti-gov-num { color: var(--yellow); }
.gov-deleted .ti-gov-num { color: rgba(var(--accent-rgb), 0.3); }

/* ---- 缓存信息 ---- */
.ti-cache-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.ti-cache-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
}

.ti-cache-row span:last-child {
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- 快捷查询 ---- */
.ti-query-buttons {
  display: flex;
  gap: 8px;
}

.ti-query-btn {
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.ti-query-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

.ti-query-result {
  margin-top: 10px;
}

.ti-query-meta {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

.ti-query-meta strong {
  color: var(--accent);
}

.ti-query-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ti-query-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.03);
  font-size: 12px;
}

.ti-qi-type {
  font-size: 14px;
}

.ti-qi-date {
  color: rgba(var(--accent-rgb), 0.35);
  font-size: 11px;
  min-width: 80px;
}

.ti-qi-summary {
  flex: 1;
  color: rgba(var(--accent-rgb), 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ti-qi-weight {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.25);
  min-width: 36px;
  text-align: right;
}

/* ---- 索引维护 ---- */
.ti-maintain {
  display: flex;
  gap: 8px;
}

.ti-maintain-btn {
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.ti-maintain-btn:hover:not(:disabled) {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

.ti-maintain-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ti-maintain-msg {
  margin-top: 8px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
}

.ti-maintain-msg.success {
  background: rgba(52, 211, 153, 0.08);
  color: var(--green);
}

.ti-maintain-msg.error {
  background: rgba(239, 68, 68, 0.08);
  color: var(--red);
}
</style>