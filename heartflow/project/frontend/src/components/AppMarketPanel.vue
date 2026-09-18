<template>
  <section class="amp" aria-label="应用市场">
    <div class="amp-head">
      <span class="amp-title">🛒 应用市场</span>
      <span class="amp-sub">浏览 · 安装 · 收藏 · 历史</span>
    </div>

    <div class="amp-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="amp-tab"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 市场 -->
    <template v-if="tab === 'market'">
      <div v-if="stats" class="amp-stats">
        <div class="amp-stat">
          <span class="amp-stat-value">{{ stats.totalItems }}</span>
          <span class="amp-stat-label">条目</span>
        </div>
        <div class="amp-stat">
          <span class="amp-stat-value">{{ stats.installedCount }}</span>
          <span class="amp-stat-label">已安装</span>
        </div>
        <div class="amp-stat">
          <span class="amp-stat-value">{{ stats.recentlyUpdated }}</span>
          <span class="amp-stat-label">近30天更新</span>
        </div>
      </div>

      <div class="amp-filters">
        <div class="amp-type-chips">
          <button
            v-for="t in typeChips"
            :key="t.key"
            class="amp-chip"
            :class="{ on: currentType === t.key }"
            @click="currentType = t.key"
          >
            {{ t.label }}
          </button>
        </div>
        <input v-model="searchQuery" class="amp-search" placeholder="搜索应用…" />
        <select v-model="sortBy" class="amp-sort">
          <option value="newest">最新</option>
        </select>
        <label class="amp-check"><input type="checkbox" v-model="freeOnly" /> 仅免费</label>
        <label class="amp-check"><input type="checkbox" v-model="installedOnly" /> 仅已安装</label>
      </div>

      <div v-if="filteredItems.length" class="amp-list">
        <div v-for="item in filteredItems" :key="item.id" class="amp-item">
          <div class="amp-item-head">
            <span class="amp-item-icon">{{ item.icon }}</span>
            <div class="amp-item-info">
              <span class="amp-item-name">{{ item.name }}</span>
              <span class="amp-item-meta">{{ item.author }} · v{{ item.version }} · {{ typeLabel(item.type) }}</span>
            </div>
          </div>
          <p class="amp-item-desc">{{ item.description }}</p>
          <div class="amp-item-tags">
            <span v-for="tag in item.tags" :key="tag" class="amp-tag">{{ tag }}</span>
          </div>
          <div class="amp-item-actions">
            <span class="amp-item-installs">{{ item.installCount }} 次安装</span>
            <button class="amp-btn--small" @click="handleToggleFav(item.id)">
              {{ isFav(item.id) ? '★ 已收藏' : '☆ 收藏' }}
            </button>
            <button v-if="isInstalled(item.id)" class="amp-btn--small" @click="handleUninstall(item.id)">卸载</button>
            <button v-else class="amp-btn--small amp-btn--primary" @click="handleInstall(item.id)">安装</button>
          </div>
        </div>
      </div>
      <p v-else class="amp-empty">没有匹配的应用。</p>
    </template>

    <!-- 已安装 -->
    <template v-else-if="tab === 'installed'">
      <div v-if="installedItems.length" class="amp-list">
        <div v-for="item in installedItems" :key="item.id" class="amp-item">
          <div class="amp-item-head">
            <span class="amp-item-icon">{{ item.icon }}</span>
            <div class="amp-item-info">
              <span class="amp-item-name">{{ item.name }}</span>
              <span class="amp-item-meta">{{ item.author }} · v{{ item.version }} · {{ typeLabel(item.type) }}</span>
            </div>
          </div>
          <p class="amp-item-desc">{{ item.description }}</p>
          <div class="amp-item-actions">
            <span class="amp-item-installs">{{ item.installCount }} 次安装</span>
            <button class="amp-btn--small" @click="handleUpdate(item.id)">更新</button>
            <button class="amp-btn--small" @click="handleUninstall(item.id)">卸载</button>
          </div>
        </div>
      </div>
      <p v-else class="amp-empty">尚未安装任何应用。</p>
    </template>

    <!-- 收藏 -->
    <template v-else-if="tab === 'favorites'">
      <div v-if="favoriteItems.length" class="amp-list">
        <div v-for="item in favoriteItems" :key="item.id" class="amp-item">
          <div class="amp-item-head">
            <span class="amp-item-icon">{{ item.icon }}</span>
            <div class="amp-item-info">
              <span class="amp-item-name">{{ item.name }}</span>
              <span class="amp-item-meta">{{ item.author }} · v{{ item.version }} · {{ typeLabel(item.type) }}</span>
            </div>
          </div>
          <p class="amp-item-desc">{{ item.description }}</p>
          <div class="amp-item-actions">
            <span class="amp-item-installs">{{ item.installCount }} 次安装</span>
            <button class="amp-btn--small" @click="handleToggleFav(item.id)">取消收藏</button>
            <button v-if="!isInstalled(item.id)" class="amp-btn--small amp-btn--primary" @click="handleInstall(item.id)">安装</button>
          </div>
        </div>
      </div>
      <p v-else class="amp-empty">还没有收藏。去市场逛逛吧。</p>
    </template>

    <!-- 历史 -->
    <template v-else>
      <div v-if="history.length" class="amp-history">
        <div v-for="rec in history" :key="rec.id" class="amp-history-item">
          <span class="amp-history-action" :class="`act-${rec.action}`">{{ actionLabel(rec.action) }}</span>
          <span class="amp-history-name">{{ itemName(rec.itemId) }}</span>
          <span class="amp-history-version">v{{ rec.version }}</span>
          <span class="amp-history-time">{{ formatTime(rec.timestamp) }}</span>
        </div>
      </div>
      <p v-else class="amp-empty">暂无安装历史。</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppMarket } from '../modules/space/app-market'
import type { MarketItemType } from '../modules/space/app-market'

const {
  filteredItems,
  marketStats,
  installedItems,
  favoriteItems,
  installedIds,
  setFilter,
  installItem,
  uninstallItem,
  updateItem,
  toggleFavorite,
  isFavorite,
  getItem,
  getInstallHistory,
} = useAppMarket()

const tab = ref<'market' | 'installed' | 'favorites' | 'history'>('market')
const tabs = [
  { key: 'market', label: '市场' },
  { key: 'installed', label: '已安装' },
  { key: 'favorites', label: '收藏' },
  { key: 'history', label: '历史' },
] as const

const stats = computed(() => marketStats.value)
const history = computed(() => getInstallHistory())

// ---- 筛选状态（本地 UI 态 → 引擎 setFilter 同步） ----
const currentType = ref<MarketItemType | 'all'>('all')
const searchQuery = ref('')
const sortBy = ref<'newest'>('newest')
const freeOnly = ref(false)
const installedOnly = ref(false)

watch(
  [currentType, searchQuery, sortBy, freeOnly, installedOnly],
  () => {
    setFilter({
      type: currentType.value,
      query: searchQuery.value,
      sortBy: sortBy.value,
      freeOnly: freeOnly.value,
      installedOnly: installedOnly.value,
    })
  },
  { immediate: true },
)

const typeChips = [
  { key: 'all', label: '全部' },
  { key: 'template', label: '模板' },
  { key: 'theme', label: '主题' },
  { key: 'component', label: '组件' },
  { key: 'plugin', label: '插件' },
  { key: 'layout', label: '布局' },
  { key: 'scene', label: '场景' },
] as const

const TYPE_LABELS: Record<string, string> = {
  template: '模板',
  theme: '主题',
  component: '组件',
  plugin: '插件',
  layout: '布局',
  scene: '场景',
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

const ACTION_LABELS: Record<string, string> = {
  install: '安装',
  uninstall: '卸载',
  update: '更新',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function isInstalled(id: string): boolean {
  return installedIds.value.has(id)
}

function isFav(id: string): boolean {
  return isFavorite(id)
}

function handleToggleFav(id: string): void {
  toggleFavorite(id)
}

function handleInstall(id: string): void {
  installItem(id)
}

function handleUninstall(id: string): void {
  uninstallItem(id)
}

function handleUpdate(id: string): void {
  updateItem(id)
}

function itemName(id: string): string {
  return getItem(id)?.name ?? id
}

function formatTime(ts: string): string {
  return ts.slice(0, 16).replace('T', ' ')
}
</script>

<style scoped>
.amp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.amp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.amp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.amp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.amp-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.amp-tab {
  padding: 5px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
  font-size: 12px;
  cursor: pointer;
}
.amp-tab.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.amp-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.amp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.05);
  border: 1px solid rgba(240, 192, 64, 0.12);
  min-width: 72px;
}
.amp-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #f0c040;
}
.amp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.68));
}
.amp-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.amp-type-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.amp-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.68));
  font-size: 11px;
  cursor: pointer;

  min-height: 26px;
}
.amp-chip.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.amp-search {
  flex: 1;
  min-width: 140px;
  padding: 6px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e6e1);
  font-size: 12px;
}
.amp-sort {
  padding: 6px 8px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e6e1);
  font-size: 12px;
}
.amp-check {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.72));
  cursor: pointer;
}
.amp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.amp-item {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.amp-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.amp-item-icon {
  font-size: 22px;
  flex-shrink: 0;
}
.amp-item-info {
  flex: 1;
  min-width: 0;
}
.amp-item-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e6e1);
}
.amp-item-meta {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.62));
  margin-top: 2px;
}
.amp-item-desc {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  line-height: 1.5;
  margin: 8px 0;
}
.amp-item-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.amp-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(240, 192, 64, 0.08);
  color: rgba(240, 192, 64, 0.6);
}
.amp-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.amp-item-installs {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.68));
  margin-right: auto;
}
.amp-btn--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.amp-btn--small:hover {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
}
.amp-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.amp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.68));
  padding: 16px 0;
  text-align: center;
}
.amp-history {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.amp-history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
}
.amp-history-action {
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 10px;
  flex-shrink: 0;
}
.act-install {
  background: rgba(52, 211, 153, 0.12);
  color: #8a9a7a;
}
.act-uninstall {
  background: rgba(196, 106, 90, 0.12);
  color: #c46a5a;
}
.act-update {
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
}
.amp-history-name {
  flex: 1;
  color: var(--text-primary, #e8e6e1);
}
.amp-history-version {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.68));
}
.amp-history-time {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
  flex-shrink: 0;
}
</style>
