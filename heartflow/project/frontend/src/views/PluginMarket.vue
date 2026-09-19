<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance pm">
    <!-- Header -->
    <header data-enter class="pm-header">
      <div class="pm-header-ornament">
        <span class="pm-orn-line"></span>
        <span class="pm-orn-diamond">✦</span>
        <span class="pm-orn-line"></span>
      </div>
      <p class="pm-header-kicker">扩展你的殿堂功能</p>
      <h1 class="pm-title">插件市场</h1>
    </header>

    <!-- Overview Cards -->
    <section data-enter class="pm-section pm-overview-section">
      <div class="pm-overview-cards">
        <div class="pm-overview-card">
          <span class="pm-overview-number">{{ plugins.length }}</span>
          <span class="pm-overview-label">已安装插件</span>
        </div>
        <div class="pm-overview-card">
          <span class="pm-overview-number">{{ catalogTotal }}</span>
          <span class="pm-overview-label">可安装插件</span>
        </div>
        <div class="pm-overview-card">
          <span class="pm-overview-number">{{ categories.length }}</span>
          <span class="pm-overview-label">插件分类</span>
        </div>
      </div>
    </section>

    <!-- 已安装插件 -->
    <section data-enter class="pm-section pm-installed-section">
      <h2 class="pm-section-title">
        已安装插件
        <span class="pm-section-count">{{ plugins.length }}</span>
      </h2>
      <div v-if="plugins.length === 0" class="pm-empty-hint">
        <span class="pm-empty-icon">📦</span>
        <p>暂无已安装的插件</p>
      </div>
      <div v-else class="pm-plugin-grid hf-room-grid--wide">
        <div
          v-for="p in plugins"
          :key="p.manifest.meta.id"
          class="pm-plugin-card"
          :class="{ 'pm-disabled': !p.enabled }"
        >
          <div class="pm-plugin-icon">{{ p.manifest.meta.icon }}</div>
          <div class="pm-plugin-info">
            <div class="pm-plugin-name">
              {{ p.manifest.meta.name }}
              <span class="pm-plugin-version">v{{ p.manifest.meta.version }}</span>
              <span class="pm-tier-badge" :class="`pm-tier-${p.manifest.meta.tier}`">
                {{ tierLabel(p.manifest.meta.tier) }}
              </span>
            </div>
            <div class="pm-plugin-desc">{{ p.manifest.meta.description }}</div>
            <div v-if="p.manifest.meta.author" class="pm-plugin-author">
              by {{ p.manifest.meta.author }}
            </div>
          </div>
          <div class="pm-plugin-actions">
            <button
              class="pm-btn-toggle"
              :class="{ active: p.enabled }"
              @click="pluginBridge.toggle(p.manifest.meta.id)"
            >
              {{ p.enabled ? '禁用' : '启用' }}
            </button>
            <button
              v-if="p.manifest.meta.tier !== 'official'"
              class="pm-btn-uninstall"
              @click="uninstall(p.manifest.meta.id)"
              title="卸载"
            >✕</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 可安装插件 -->
    <section class="pm-section pm-community-section">
      <h2 class="pm-section-title">可安装插件</h2>

      <!-- 市场工具栏：搜索 + 分类筛选 -->
      <div class="pm-market-toolbar">
        <input
          v-model="searchQuery"
          type="search"
          class="pm-search"
          placeholder="搜索市场插件…"
          aria-label="搜索市场插件"
        />
        <div class="pm-category-chips" role="group" aria-label="按分类筛选">
          <button
            type="button"
            class="pm-chip"
            :class="{ active: selectedCategory === null }"
            @click="selectedCategory = null"
          >
            全部<span class="pm-chip-count">{{ catalogTotal }}</span>
          </button>
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="pm-chip"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            {{ cat.label }}<span class="pm-chip-count">{{ cat.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="availablePlugins.length === 0" class="pm-empty-hint pm-filter-empty">
        <span class="pm-empty-icon">🔍</span>
        <p>没有匹配的市场插件</p>
        <p class="pm-empty-hint-sub">试试更换关键词或切换分类</p>
      </div>
      <div v-else class="pm-plugin-grid hf-room-grid--wide">
        <div
          v-for="plugin in availablePlugins"
          :key="plugin.manifest.meta.id"
          class="pm-plugin-card pm-community-card"
          :class="{ 'pm-installed': isInstalled(plugin.manifest.meta.id) }"
          :data-plugin-id="plugin.manifest.meta.id"
        >
          <div class="pm-plugin-icon">{{ plugin.manifest.meta.icon }}</div>
          <div class="pm-plugin-info">
            <div class="pm-plugin-name">
              {{ plugin.manifest.meta.name }}
              <span class="pm-plugin-version">v{{ plugin.manifest.meta.version }}</span>
              <span class="pm-tier-badge pm-tier-community">社区</span>
            </div>
            <div class="pm-plugin-desc">{{ plugin.manifest.meta.description }}</div>
            <div class="pm-plugin-author">by {{ plugin.manifest.meta.author }}</div>
            <div class="pm-market-meta">
              <span class="pm-market-stat" title="下载量">⬇ {{ formatDownload(plugin.downloads) }}</span>
              <span class="pm-market-stat" title="社区评分">★ {{ plugin.rating.toFixed(1) }}</span>
            </div>
            <div class="pm-plugin-perms">
              <span
                v-for="perm in plugin.manifest.permissions"
                :key="perm"
                class="pm-perm-badge"
              >{{ perm }}</span>
            </div>
          </div>
          <div class="pm-plugin-actions">
            <button
              v-if="!isInstalled(plugin.manifest.meta.id)"
              class="pm-btn-install"
              @click="install(plugin)"
            >安装</button>
            <span v-else class="pm-installed-label">已安装</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 开发指南 -->
    <section class="pm-section pm-guide-section">
      <h2 class="pm-section-title">开发指南</h2>
      <div class="pm-guide-card">
        <div class="pm-guide-icon">📘</div>
        <div class="pm-guide-content">
          <h3 class="pm-guide-title">插件开发入门</h3>
          <p class="pm-guide-desc">
            插件是基于 PluginManifest 声明的功能模块，支持从社区动态安装。
            每个插件运行在独立的沙箱环境中，通过注册的 API 端点与系统交互。
          </p>
          <div class="pm-guide-api-list">
            <div class="pm-guide-api-item">
              <code class="pm-api-name">data:read</code>
              <span class="pm-api-desc">读取会话、结晶、笔记、情绪等数据</span>
            </div>
            <div class="pm-guide-api-item">
              <code class="pm-api-name">data:write</code>
              <span class="pm-api-desc">写入笔记和情绪记录（受限）</span>
            </div>
            <div class="pm-guide-api-item">
              <code class="pm-api-name">navigation</code>
              <span class="pm-api-desc">导航到指定路由路径</span>
            </div>
            <div class="pm-guide-api-item">
              <code class="pm-api-name">notification</code>
              <span class="pm-api-desc">发送系统通知</span>
            </div>
          </div>
          <div class="pm-guide-tip">
            <strong>提示：</strong>插件 manifest 通过 <code>createExternalManifest(id, name, version, description, author)</code> 创建，然后使用 <code>pluginStore.installPlugin(manifest)</code> 安装。
          </div>
        </div>
      </div>

      <!-- 数据引渡插件开发说明 -->
      <div class="pm-guide-card" style="margin-top: 14px;">
        <div class="pm-guide-icon">🔌</div>
        <div class="pm-guide-content">
          <h3 class="pm-guide-title">数据引渡插件开发</h3>
          <p class="pm-guide-desc">
            数据引渡插件通过实现 <code>DataConverter</code> 接口，注册自定义的导入/导出格式转换器，
            扩展数据档案馆的导入导出能力。每个转换器可独立声明支持的输入/输出格式。
          </p>
          <div class="pm-guide-api-list">
            <div class="pm-guide-api-item">
              <code class="pm-api-name">registerConverter</code>
              <span class="pm-api-desc">注册转换器到全局注册表</span>
            </div>
            <div class="pm-guide-api-item">
              <code class="pm-api-name">unregisterConverter</code>
              <span class="pm-api-desc">从注册表移除指定转换器</span>
            </div>
            <div class="pm-guide-api-item">
              <code class="pm-api-name">toPayload(data, format)</code>
              <span class="pm-api-desc">将外部格式解析为标准 DataPortPayload</span>
            </div>
            <div class="pm-guide-api-item">
              <code class="pm-api-name">fromPayload(payload, format)</code>
              <span class="pm-api-desc">将标准 DataPortPayload 序列化为外部格式</span>
            </div>
          </div>
          <div class="pm-guide-tip">
            <strong>示例：</strong>自定义转换器通过 <code>import { registerConverter } from '../engine/data-port-converter'</code>
            注册，实现 <code>DataConverter</code> 接口即可。内置转换器包括 JSON、Markdown 和 CSV 格式。
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePlugin } from '../resonance/bridges/plugin'
import type { PluginTier } from '../modules/plugin/types'
import type { MarketplaceEntry, PluginCategoryId } from '../modules/plugin/plugin-registry'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceRef, entranceClass } = useViewEntrance()
const pluginBridge = usePlugin()
const { plugins } = pluginBridge

onMounted(() => {
  pluginBridge.init()
})

// ---- 市场源注册表 ----
const marketplace = pluginBridge.marketplace

/** 市场可选插件总数（真实统计） */
const catalogTotal = computed(() => marketplace.count())

/** 市场分类（含计数，真实统计） */
const categories = computed(() => marketplace.getCategories())

/** 搜索关键词 */
const searchQuery = ref('')

/** 当前选中分类（null = 全部） */
const selectedCategory = ref<PluginCategoryId | null>(null)

/** 可安装插件（经关键词搜索 + 分类筛选后的市场条目） */
const availablePlugins = computed<MarketplaceEntry[]>(() => {
  const kw = searchQuery.value.trim().toLowerCase()
  const matchIds = kw ? new Set(marketplace.search(searchQuery.value).map(m => m.meta.id)) : null
  return marketplace.getAll().filter(e => {
    const m = e.manifest
    if (selectedCategory.value && m.meta.category !== selectedCategory.value) return false
    if (matchIds && !matchIds.has(m.meta.id)) return false
    return true
  })
})

/** 下载量格式化（千/万可读化） */
function formatDownload(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function isInstalled(id: string): boolean {
  return plugins.value.some(p => p.manifest.meta.id === id)
}

function install(entry: MarketplaceEntry) {
  const success = pluginBridge.installPlugin(entry.manifest)
  if (success) {
    // 模拟安装成功效果
    const card = document.querySelector(`[data-plugin-id="${entry.manifest.meta.id}"]`)
    if (card) {
      card.classList.add('installed-anim')
      setTimeout(() => card.classList.remove('installed-anim'), 600)
    }
  }
}

function uninstall(id: string) {
  if (confirm('确定要卸载此插件吗？卸载后数据不受影响。')) {
    pluginBridge.uninstallPlugin(id)
  }
}

function tierLabel(t: PluginTier): string {
  const map: Record<PluginTier, string> = {
    official: '官方',
    community: '社区',
    experimental: '实验',
  }
  return map[t] ?? t
}
</script>

<style scoped>
/* ============================================================
   PluginMarket — Warm Amber Visual Theme
   Background: gradient var(--bg-primary)→var(--bg-deep)→var(--bg-surface-alt)→var(--bg-deepest)
   Accent:     var(--accent)
   Max-width:  600px
   ============================================================ */

/* ---- Root Container ---- */
.pm {
  max-width: 600px;
  margin: 0 auto;
  padding: 48px 28px 80px;
  position: relative;
  background: transparent;
  min-height: 100vh;
}

/* Ambient glow pseudo-elements */
.pm::before {
  content: '';
  position: fixed;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.08) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.pm::after {
  content: '';
  position: fixed;
  bottom: -80px;
  right: -120px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.05) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */
.pm-header {
  text-align: center;
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.pm-header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 14px;
}

.pm-orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}

.pm-orn-diamond {
  font-size: 13px;
  color: var(--accent);
  opacity: 0.7;
}

.pm-header-kicker {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.6;
  margin-bottom: 8px;
  font-weight: 400;
}

.pm-title {
  font-size: 26px;
  font-weight: 700;
  color: #ede0d4;
  margin: 0;
  letter-spacing: 1px;
}

/* ---- Overview Section ---- */
.pm-overview-section {
  position: relative;
  z-index: 1;
  margin-bottom: 32px;
}

.pm-overview-cards {
  display: flex;
  gap: 10px;
}

.pm-overview-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 18px 10px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  position: relative;
  overflow: hidden;
}

.pm-overview-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.08), transparent 70%);
  pointer-events: none;
}

.pm-overview-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.1;
  position: relative;
}

.pm-overview-label {
  font-size: 11px;
  color: rgba(237,224,212,0.68);
  font-weight: 400;
  position: relative;
}

/* ---- Section ---- */
.pm-section {
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.pm-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #ede0d4;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.12);
  display: flex;
  align-items: center;
  gap: 10px;
}

.pm-section-count {
  font-size: 10px;
  font-weight: 500;
  color: rgba(237,224,212,0.68);
  background: rgba(var(--accent-rgb), 0.08);
  padding: 1px 8px;
  border-radius: 10px;
}

/* ---- 市场工具栏：搜索 + 分类筛选 ---- */
.pm-market-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.pm-search {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 14px;
  font-size: 13px;
  font-family: inherit;
  color: #ede0d4;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.pm-search::placeholder {
  color: rgba(237,224,212,0.44);
}

.pm-search:focus {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
}

.pm-category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pm-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: transparent;
  color: rgba(237,224,212,0.7);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.pm-chip:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  color: #ede0d4;
}

.pm-chip.active {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: var(--accent);
  color: var(--accent);
}

.pm-chip-count {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 8px;
  background: rgba(237,224,212,0.08);
  color: rgba(237,224,212,0.55);
}

.pm-chip.active .pm-chip-count {
  background: rgba(var(--accent-rgb), 0.18);
  color: var(--accent);
}

/* ---- 市场条目附加元信息（下载量 / 评分） ---- */
.pm-market-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.pm-market-stat {
  font-size: 11px;
  color: rgba(237,224,212,0.6);
  font-family: var(--font-mono, 'SF Mono', 'Fira Code', monospace);
}

.pm-filter-empty .pm-empty-hint-sub {
  font-size: 11px;
  color: rgba(237,224,212,0.5);
  margin-top: 2px;
}

/* ---- Plugin Grid ---- */
/* ② 自适应整改：由单列 flex 改为 auto-fit 多列网格，
   窗口够宽自动多列、窄屏自动降为单列，减少纵向滚屏。 */
.pm-plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
  gap: 8px;
}

.pm-plugin-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-surface);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 10px;
  transition: all 0.25s ease;
  position: relative;
}

.pm-plugin-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(255,255,255,0.05);
}

.pm-plugin-card.pm-disabled {
  opacity: 0.45;
}

.pm-plugin-card.pm-community-card {
  border-color: rgba(var(--accent-rgb), 0.10);
}

.pm-plugin-card.pm-community-card:hover {
  border-color: rgba(var(--accent-rgb), 0.22);
}

.pm-plugin-card.pm-installed {
  opacity: 0.55;
  border-color: rgba(var(--accent-rgb), 0.15);
}

/* ---- Plugin Icon ---- */
.pm-plugin-icon {
  font-size: 26px;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
}

/* ---- Plugin Info ---- */
.pm-plugin-info {
  flex: 1;
  min-width: 0;
}

.pm-plugin-name {
  font-size: 14px;
  font-weight: 600;
  color: #ede0d4;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pm-plugin-version {
  font-size: 11px;
  color: rgba(237,224,212,0.6);
  font-weight: 400;
}

.pm-tier-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.pm-tier-badge.pm-tier-community {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.pm-tier-badge.pm-tier-experimental {
  background: rgba(255,193,7,0.12);
  color: #ffc107;
}

.pm-plugin-desc {
  font-size: 12px;
  color: rgba(237,224,212,0.7);
  margin-bottom: 4px;
  line-height: 1.4;
}

.pm-plugin-author {
  font-size: 11px;
  color: rgba(237,224,212,0.6);
  margin-bottom: 4px;
}

.pm-plugin-perms {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.pm-perm-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(237,224,212,0.68);
  font-family: var(--font-mono, 'SF Mono', 'Fira Code', monospace);
}

/* ---- Actions ---- */
.pm-plugin-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}

.pm-btn-toggle {
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: rgba(237,224,212,0.7);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
}

.pm-btn-toggle:hover {
  background: rgba(var(--accent-rgb), 0.08);
  color: #ede0d4;
}

.pm-btn-toggle.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: var(--accent);
  color: var(--accent);
}

.pm-btn-install {
  font-size: 12px;
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.pm-btn-install:hover {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.35);
}

.pm-btn-uninstall {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(237,224,212,0.6);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.pm-btn-uninstall:hover {
  color: #e87373;
  border-color: rgba(232,115,115,0.25);
  background: rgba(232,115,115,0.06);
}

.pm-installed-label {
  font-size: 11px;
  color: var(--accent);
  opacity: 0.6;
  white-space: nowrap;
}

/* ---- Empty State ---- */
.pm-empty-hint {
  text-align: center;
  padding: 40px 20px;
  color: rgba(237,224,212,0.6);
}

.pm-empty-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 10px;
}

/* ---- Guide ---- */
.pm-guide-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: var(--bg-surface);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 10px;
  position: relative;
}

.pm-guide-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.15), transparent);
  pointer-events: none;
}

.pm-guide-icon {
  font-size: 30px;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
}

.pm-guide-content {
  flex: 1;
  min-width: 0;
}

.pm-guide-title {
  font-size: 15px;
  font-weight: 600;
  color: #ede0d4;
  margin-bottom: 6px;
}

.pm-guide-desc {
  font-size: 12px;
  color: rgba(237,224,212,0.68);
  line-height: 1.7;
  margin-bottom: 14px;
}

.pm-guide-api-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.pm-guide-api-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.pm-api-name {
  font-family: var(--font-mono, 'SF Mono', 'Fira Code', monospace);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  white-space: nowrap;
}

.pm-api-desc {
  color: rgba(237,224,212,0.68);
}

.pm-guide-tip {
  font-size: 12px;
  color: rgba(237,224,212,0.72);
  background: rgba(var(--accent-rgb), 0.04);
  padding: 10px 14px;
  border-radius: 6px;
  line-height: 1.7;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.pm-guide-tip code {
  font-family: var(--font-mono, 'SF Mono', 'Fira Code', monospace);
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
}

/* ---- Install Animation (kept for script compat) ---- */
.installed-anim {
  animation: pm-install-pop 0.6s ease;
}

@keyframes pm-install-pop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.03); }
  60%  { transform: scale(0.97); }
  100% { transform: scale(1); }
}

/* ---- 响应式 ---- */
@media (max-width: 860px) {
  .pm {
    padding: 32px 20px 80px;
  }

  .pm-header {
    margin-bottom: 28px;
  }

  .pm-header-ornament {
    gap: 10px;
    margin-bottom: 10px;
  }

  .pm-orn-line {
    width: 36px;
  }

  .pm-orn-diamond {
    font-size: 11px;
  }

  .pm-header-kicker {
    font-size: 10px;
    letter-spacing: 2px;
  }

  .pm-title {
    font-size: 22px;
  }

  .pm-overview-cards {
    gap: 10px;
  }

  .pm-overview-card {
    padding: 12px 14px;
  }

  .pm-overview-number {
    font-size: 22px;
  }

  .pm-section-title {
    font-size: 15px;
  }

  .pm-search {
    font-size: 12px;
    padding: 8px 12px;
  }

  .pm-chip {
    font-size: 11px;
    padding: 3px 9px;
  }

  .pm-market-stat {
    font-size: 10px;
  }

  .pm-plugin-card {
    padding: 12px 14px;
    gap: 10px;
  }

  .pm-plugin-icon {
    width: 36px;
    height: 36px;
    font-size: 22px;
  }

  .pm-plugin-name {
    font-size: 13px;
  }

  .pm-plugin-version {
    font-size: 10px;
  }

  .pm-plugin-desc {
    font-size: 11px;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  .pm-plugin-author {
    font-size: 10px;
  }

  .pm-plugin-perms {
    flex-wrap: wrap;
    gap: 3px;
  }

  .pm-perm-badge {
    font-size: 9px;
    padding: 1px 5px;
  }

  .pm-plugin-actions {
    flex-shrink: 0;
  }

  .pm-btn-toggle,
  .pm-btn-install,
  .pm-btn-uninstall {
    font-size: 11px;
    padding: 5px 10px;
  }

  .pm-installed-label {
    font-size: 9px;
  }

  .pm-guide-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
  }

  .pm-guide-icon {
    font-size: 28px;
  }

  .pm-guide-title {
    font-size: 15px;
  }

  .pm-guide-desc {
    font-size: 12px;
  }

  .pm-guide-api-list {
    gap: 2px;
  }

  .pm-guide-api-item {
    font-size: 11px;
    padding: 4px 8px;
  }

  .pm-guide-tip {
    font-size: 11px;
    padding: 8px 12px;
  }
}

@media (max-width: 640px) {
  .pm {
    padding: 24px 14px 80px;
  }

  .pm-header {
    margin-bottom: 24px;
  }

  .pm-header-ornament {
    gap: 8px;
  }

  .pm-orn-line {
    width: 28px;
  }

  .pm-orn-diamond {
    font-size: 9px;
  }

  .pm-title {
    font-size: 20px;
  }

  .pm-overview-cards {
    gap: 6px;
  }

  .pm-overview-card {
    padding: 10px 10px;
    min-height: 56px;
  }

  .pm-overview-number {
    font-size: 18px;
  }

  .pm-overview-label {
    font-size: 9px;
  }

  .pm-search {
    font-size: 12px;
    padding: 8px 10px;
  }

  .pm-chip {
    font-size: 11px;
    padding: 3px 8px;
    gap: 4px;
  }

  .pm-plugin-card {
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 8px;
  }

  .pm-plugin-icon {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }

  .pm-plugin-info {
    min-width: calc(100% - 42px);
  }

  .pm-plugin-name {
    font-size: 12px;
    gap: 6px;
  }

  .pm-plugin-version {
    font-size: 9px;
  }

  .pm-plugin-desc {
    -webkit-line-clamp: 1;
  }

  .pm-plugin-actions {
    width: 100%;
    margin-top: 4px;
  }

  .pm-btn-toggle,
  .pm-btn-install,
  .pm-btn-uninstall {
    font-size: 10px;
    padding: 4px 8px;
  }

  .pm-tier-badge {
    font-size: 8px;
    padding: 1px 5px;
  }

  .pm-empty-hint {
    padding: 40px 0;
  }

  .pm-empty-icon {
    font-size: 32px;
  }

  .pm-empty-hint p {
    font-size: 12px;
  }

  .pm-empty-hint .pm-empty-hint {
    font-size: 11px;
  }

  .pm-guide-card {
    padding: 14px;
  }

  .pm-guide-title {
    font-size: 14px;
  }

  .pm-guide-api-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pm-guide-api-item {
    width: 100%;
    box-sizing: border-box;
  }
}
</style>