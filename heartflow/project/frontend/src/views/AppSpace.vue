<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance app-space">
    <!-- 氛围背景 -->
    <div data-enter class="as-ambient" aria-hidden="true">
      <div class="as-glow as-glow--top"></div>
      <div class="as-glow as-glow--bottom"></div>
    </div>

    <!-- 统一房间壳层 -->
    <RoomLayout
      title="应用空间"
      kicker="你的空间，由你定义"
      data-enter
    >
      <template #meta>
        <!-- 使用统计 -->
        <div data-enter class="as-stats" v-if="usageStats">
      <div class="as-stat-card">
        <span class="as-stat-value">{{ usageStats.totalConfigs }}</span>
        <span class="as-stat-label">空间配置</span>
      </div>
      <div class="as-stat-card">
        <span class="as-stat-value">{{ usageStats.presetCount }}</span>
        <span class="as-stat-label">预置模板</span>
      </div>
      <div class="as-stat-card">
        <span class="as-stat-value">{{ usageStats.totalAccesses }}</span>
        <span class="as-stat-label">总访问</span>
      </div>
      <div class="as-stat-card">
        <span class="as-stat-value">{{ usageStats.activeDays7d }}</span>
        <span class="as-stat-label">7天活跃</span>
      </div>
    </div>
      </template>

    <!-- 本地注意力 · 数字健康（感知层本地壳） -->
    <section data-enter class="as-section as-attention" v-if="attentionEnabled">
      <h2 class="section-label">
        <span class="section-label-icon">🧭</span>
        本地注意力 · 数字健康
        <span class="section-label-count">本地估算</span>
      </h2>
      <div class="as-attn-card">
        <div class="as-attn-score">
          <span class="as-attn-value">{{ attentionReport.score }}</span>
          <span class="as-attn-level">{{ attentionReport.level }}</span>
        </div>
        <div class="as-attn-metrics">
          <span>专注占比 {{ attentionReport.focusRatio }}</span>
          <span>数字舒展 {{ attentionReport.wellbeingIndex }}</span>
          <span>疲劳 {{ attentionReport.fatigueSignal }}</span>
          <span>作息对齐 {{ attentionReport.rhythmAlignment }}</span>
        </div>
        <ul class="as-attn-signals">
          <li v-for="(s, i) in attentionReport.signals" :key="i">{{ s }}</li>
        </ul>
        <p class="as-attn-note">{{ attentionReport.sourceNote }}</p>
        <div class="as-attn-bw" v-if="bodyWisdomSignals.length">
          <span class="as-attn-bw-title">感知 → 藏象阁（只读）：</span>
          <span v-for="sig in bodyWisdomSignals" :key="sig.key" class="as-attn-bw-chip">
            {{ sig.key }}·{{ sig.intensity }}
          </span>
        </div>
        <button class="as-attn-toggle" @click="toggleAttention(false)">关闭本地感知</button>
      </div>
    </section>

    <section data-enter class="as-section as-attention" v-else>
      <h2 class="section-label">
        <span class="section-label-icon">🧭</span>
        本地注意力 · 数字健康
      </h2>
      <div class="as-attn-card as-attn-card--off">
        <p class="as-attn-off-desc">
          本地注意力感知默认关闭（沉默的默认）。开启后将在本地估算应用内注意力与数字健康，不读取系统级用量统计。
        </p>
        <button class="as-attn-toggle" @click="toggleAttention(true)">开启本地感知</button>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section data-enter class="as-section">
      <h2 class="section-label">
        <span class="section-label-icon">⚡</span>
        快捷入口
      </h2>
      <div class="as-quick-grid">
        <div
          v-for="entry in quickSuggestions"
          :key="entry.id"
          class="as-quick-card"
          role="button"
          tabindex="0"
          :aria-label="'前往 ' + entry.name"
          @click="navigateToEntry(entry)"
          @keydown.enter.prevent="navigateToEntry(entry)"
          @keydown.space.prevent="navigateToEntry(entry)"
        >
          <span class="as-quick-icon">{{ entry.icon }}</span>
          <div class="as-quick-info">
            <span class="as-quick-name">{{ entry.name }}</span>
            <span class="as-quick-desc">{{ entry.description }}</span>
          </div>
          <span class="as-quick-arrow">→</span>
        </div>
      </div>
    </section>

    <!-- 分类入口网格 -->
    <section data-enter class="as-section" v-for="(categoryEntries, catKey) in entriesByCategory" :key="catKey">
      <h2 class="section-label">
        <span class="section-label-icon">{{ categoryMeta[catKey]?.icon }}</span>
        {{ categoryMeta[catKey]?.label }}
        <span class="section-label-count">{{ categoryEntries.length }}</span>
      </h2>
      <div class="as-entry-grid">
        <div
          v-for="entry in categoryEntries"
          :key="entry.id"
          class="as-entry-card"
          :class="`as-entry--${entry.status}`"
          role="button"
          tabindex="0"
          :aria-label="'前往 ' + entry.name"
          @click="navigateToEntry(entry)"
          @keydown.enter.prevent="navigateToEntry(entry)"
          @keydown.space.prevent="navigateToEntry(entry)"
        >
          <div class="as-entry-header">
            <span class="as-entry-icon">{{ entry.icon }}</span>
            <span :class="['as-entry-status', `status--${entry.status}`]">
              {{ statusLabel(entry.status) }}
            </span>
          </div>
          <div class="as-entry-body">
            <h3 class="as-entry-name">{{ entry.name }}</h3>
            <p class="as-entry-desc">{{ entry.description }}</p>
          </div>
          <div class="as-entry-footer">
            <div class="as-entry-tags" v-if="entry.tags.length > 0">
              <span v-for="tag in entry.tags.slice(0, 3)" :key="tag" class="as-tag">{{ tag }}</span>
            </div>
            <span class="as-entry-count" v-if="entry.useCount > 0">
              使用 {{ entry.useCount }} 次
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 最近活动 -->
    <section data-enter class="as-section" v-if="recentActivities.length > 0">
      <h2 class="section-label">
        <span class="section-label-icon">📋</span>
        最近活动
      </h2>
      <div class="as-activity-list">
        <div
          v-for="act in recentActivities.slice(0, 8)"
          :key="act.id"
          class="as-activity-item"
        >
          <span class="as-activity-icon">{{ activityIcon(act.type) }}</span>
          <span class="as-activity-desc">{{ act.description }}</span>
          <span class="as-activity-time">{{ formatTime(act.timestamp) }}</span>
        </div>
      </div>
    </section>

    <!-- 空间对比 -->
    <section data-enter class="as-section" v-if="comparisons.length > 1">
      <h2 class="section-label">
        <span class="section-label-icon">📊</span>
        空间对比 ({{ comparisons.length }})
      </h2>
      <div class="as-compare-grid">
        <div v-for="comp in comparisons" :key="comp.configId" class="as-compare-card">
          <div class="as-compare-name">{{ comp.configName }}</div>
          <div class="as-compare-meta">
            <span>{{ comp.roomCount }} 房间</span>
            <span>{{ comp.featureCount }} 功能</span>
            <span>{{ comp.styleTheme }}</span>
          </div>
          <div class="as-compare-footer">
            <span class="as-compare-date">{{ comp.lastModified.slice(0, 10) }}</span>
            <span class="as-compare-use">访问 {{ comp.useCount }} 次</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 应用市场（space·app-market 引擎，INCR-242 补挂载孤儿组件） -->
    <section data-enter class="as-section">
      <h2 class="section-label">
        <span class="section-label-icon">🛒</span>
        应用市场
        <span class="section-label-count">本地可安装 · 收藏 · 历史</span>
      </h2>
      <AppMarketPanel />
    </section>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
import AppMarketPanel from '../components/AppMarketPanel.vue'
import { useAppSpaceManager } from '../modules/space/app-space-manager'
import type { AppSpaceEntry } from '../modules/space/app-space-manager'
import { getPerception, isPerceptionAllowed, setPerceptionAllowed } from '../modules/perception'
import { deriveAttentionReport, attentionToBodyWisdomSignal } from '../modules/attention/attention-model'
import { formatDateTime as formatTime } from '../utils/time'

const { entranceRef, entranceClass } = useViewEntrance()
const router = useRouter()

const {
  entriesByCategory,
  usageStats,
  quickSuggestions,
  recentActivities,
  getSpaceComparisons,
  recordEntryAccess,
  recordActivity,
} = useAppSpaceManager()

const comparisons = computed(() => getSpaceComparisons())

// ---- 本地注意力 · 数字健康（#84 感知层本地壳，默认关闭 / 沉默的默认）----
const attentionEnabled = ref(isPerceptionAllowed('attention'))

const attentionReport = computed(() => {
  const env = getPerception().snapshot()
  const totalAccesses = usageStats.value?.totalAccesses ?? 0
  return deriveAttentionReport(env, {
    navigationCount: totalAccesses,
    focusMinutes: 0,
    dateStr: new Date().toISOString().slice(0, 10),
  })
})

const bodyWisdomSignals = computed(() => attentionToBodyWisdomSignal(attentionReport.value))

function toggleAttention(on: boolean): void {
  setPerceptionAllowed('attention', on)
  attentionEnabled.value = on
}

// ---- 分类元数据 ----
const categoryMeta: Record<string, { label: string; icon: string }> = {
  space: { label: '空间管理', icon: '🏠' },
  design: { label: '设计装修', icon: '🎨' },
  editor: { label: '编辑器', icon: '✏️' },
  config: { label: '配置', icon: '⚙️' },
  market: { label: '市场', icon: '🛒' },
}

// ---- 状态标签 ----
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: '使用中',
    ready: '已就绪',
    wip: '开发中',
  }
  return map[status] || status
}

// ---- 活动图标 ----
function activityIcon(type: string): string {
  const map: Record<string, string> = {
    config_created: '➕',
    config_updated: '✏️',
    config_deleted: '🗑️',
    preset_applied: '📋',
    layout_installed: '📐',
    theme_installed: '🎭',
    scene_created: '🎬',
    dimension_edited: '🔧',
  }
  return map[type] || '📌'
}

// ---- 导航 ----
function navigateToEntry(entry: AppSpaceEntry): void {
  recordEntryAccess(entry.id)
  recordActivity(
    'config_updated',
    `访问了「${entry.name}」`,
  )
  router.push(entry.route)
}

// ---- 时间格式化 ----
</script>

<style scoped>
/* =============================================
   应用空间 · 统一入口
   你的空间，由你定义
   ============================================= */

.app-space {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden auto;
  background: transparent;
}

.app-space :deep(.room-layout) {
  position: relative;
  z-index: 1;
}

/* ---- 氛围背景 ---- */
.as-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.as-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(150px);
  opacity: 0.06;
}

.as-glow--top {
  top: -200px;
  left: -100px;
  background: var(--accent);
}

.as-glow--bottom {
  bottom: -200px;
  right: -100px;
  background: var(--accent);
}


/* ---- 统计卡片 ---- */
.as-stats {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px 32px 0;
}

.as-stat-card {
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

.as-stat-value {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.as-stat-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

/* ---- 内容区 ---- */
.as-section {
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

.section-label-count {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
  margin-left: auto;
  background: rgba(var(--accent-rgb), 0.06);
  padding: 1px 8px;
  border-radius: 10px;
}

/* ---- 快捷入口 ---- */
.as-quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.as-quick-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: all 0.25s;
}

.as-quick-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--accent-rgb), 0.2);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.as-quick-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.as-quick-info {
  flex: 1;
  min-width: 0;
}

.as-quick-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.8);
}

.as-quick-desc {
  display: block;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.as-quick-arrow {
  font-size: 16px;
  color: rgba(var(--accent-rgb), 0.2);
  flex-shrink: 0;
}

/* ---- 入口网格 ---- */
.as-entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.as-entry-card {
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  cursor: pointer;
  transition: all 0.25s;
}

.as-entry-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--accent-rgb), 0.15);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.as-entry--wip {
  opacity: 0.6;
}

.as-entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.as-entry-icon {
  font-size: 22px;
}

.as-entry-status {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 8px;
  letter-spacing: 1px;
}

.status--active {
  background: rgba(52, 211, 153, 0.12);
  color: var(--green);
}

.status--ready {
  background: rgba(108, 156, 245, 0.12);
  color: var(--accent);
}

.status--wip {
  background: rgba(240, 192, 64, 0.12);
  color: var(--yellow);
}

.as-entry-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.8);
  margin-bottom: 4px;
}

.as-entry-desc {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.as-entry-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.as-entry-tags {
  display: flex;
  gap: 4px;
}

.as-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--accent-rgb), 0.7);
}

.as-entry-count {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.68);
}

/* ---- 活动列表 ---- */
.as-activity-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.as-activity-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.03);
}

.as-activity-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.as-activity-desc {
  flex: 1;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.7);
}

.as-activity-time {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.5);
  flex-shrink: 0;
}

/* ---- 空间对比 ---- */
.as-compare-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.as-compare-card {
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.as-compare-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.7);
  margin-bottom: 6px;
}

.as-compare-meta {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
  margin-bottom: 6px;
}

.as-compare-footer {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.25);
}

/* ---- 本地注意力 · 数字健康（感知层本地壳） ---- */
.as-attention .as-attn-card {
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.as-attn-card--off {
  opacity: 0.85;
}

.as-attn-off-desc {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.68);
  line-height: 1.6;
  margin: 0 0 12px;
}

.as-attn-score {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}

.as-attn-value {
  font-size: 34px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1;
}

.as-attn-level {
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.72);
  letter-spacing: 2px;
}

.as-attn-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.as-attn-metrics span {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.68);
}

.as-attn-signals {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.as-attn-signals li {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.72);
  line-height: 1.5;
}

.as-attn-note {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.68);
  margin: 0 0 10px;
}

.as-attn-bw {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  margin-bottom: 12px;
}

.as-attn-bw-title {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
}

.as-attn-bw-chip {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.6);
}

.as-attn-toggle {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.as-attn-toggle:hover {
  border-color: rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.06);
}
</style>