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
          <span class="pm-overview-number">{{ availablePlugins.length }}</span>
          <span class="pm-overview-label">可安装插件</span>
        </div>
        <div class="pm-overview-card">
          <span class="pm-overview-number">2</span>
          <span class="pm-overview-label">开发指南</span>
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
      <div v-else class="pm-plugin-grid">
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
      <div class="pm-plugin-grid">
        <div
          v-for="plugin in availablePlugins"
          :key="plugin.meta.id"
          class="pm-plugin-card pm-community-card"
          :class="{ 'pm-installed': isInstalled(plugin.meta.id) }"
          :data-plugin-id="plugin.meta.id"
        >
          <div class="pm-plugin-icon">{{ plugin.meta.icon }}</div>
          <div class="pm-plugin-info">
            <div class="pm-plugin-name">
              {{ plugin.meta.name }}
              <span class="pm-plugin-version">v{{ plugin.meta.version }}</span>
              <span class="pm-tier-badge pm-tier-community">社区</span>
            </div>
            <div class="pm-plugin-desc">{{ plugin.meta.description }}</div>
            <div class="pm-plugin-author">by {{ plugin.meta.author }}</div>
            <div class="pm-plugin-perms">
              <span
                v-for="perm in plugin.permissions"
                :key="perm"
                class="pm-perm-badge"
              >{{ perm }}</span>
            </div>
          </div>
          <div class="pm-plugin-actions">
            <button
              v-if="!isInstalled(plugin.meta.id)"
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
import { onMounted, ref } from 'vue'
import { usePlugin } from '../resonance/bridges/plugin'
import type { PluginManifest, PluginTier } from '../modules/plugin/types'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceRef, entranceClass } = useViewEntrance()
const pluginBridge = usePlugin()
const { plugins } = pluginBridge

onMounted(() => {
  pluginBridge.init()
})

/** 模拟社区插件列表 */
const availablePlugins = ref<PluginManifest[]>([
  {
    meta: {
      id: 'community-pomodoro-stats',
      name: '番茄钟统计',
      version: '1.2.0',
      description: '高级番茄钟数据统计，包含周报、月报和趋势图表',
      author: '社区',
      tier: 'community',
      category: 'timer',
      icon: '🍅',
    },
    permissions: ['read:history', 'read:current'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
    entry: 'community:pomodoro-stats',
    hooks: [],
  },
  {
    meta: {
      id: 'community-daily-review',
      name: '每日回顾',
      version: '0.8.0',
      description: '每日结束时自动生成回顾卡片，汇总当日专注与情绪',
      author: '社区',
      tier: 'community',
      category: 'note',
      icon: '📋',
    },
    permissions: ['read:history', 'read:current', 'write:data'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
    entry: 'community:daily-review',
    hooks: [],
  },
  {
    meta: {
      id: 'community-white-noise',
      name: '白噪音播放器',
      version: '1.0.0',
      description: '专注时播放白噪音/自然音效，支持多种声景',
      author: '社区',
      tier: 'community',
      category: 'other',
      icon: '🎧',
    },
    permissions: ['read:current'],
    sandbox: { isolateFS: true, isolateNetwork: false, isolateDOM: false },
    entry: 'community:white-noise',
    hooks: [],
  },
  {
    meta: {
      id: 'community-diary-export',
      name: '日记导出',
      version: '1.1.0',
      description: '将笔记和结晶数据导出为 Markdown 或 PDF 格式',
      author: '社区',
      tier: 'community',
      category: 'note',
      icon: '📤',
    },
    permissions: ['read:history', 'export:data'],
    sandbox: { isolateFS: false, isolateNetwork: true, isolateDOM: false },
    entry: 'community:diary-export',
    hooks: [],
  },
])

function isInstalled(id: string): boolean {
  return plugins.value.some(p => p.manifest.meta.id === id)
}

function install(manifest: PluginManifest) {
  const success = pluginBridge.installPlugin(manifest)
  if (success) {
    // 模拟安装成功效果
    const card = document.querySelector(`[data-plugin-id="${manifest.meta.id}"]`)
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
  color: rgba(237,224,212,0.45);
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
  color: rgba(237,224,212,0.4);
  background: rgba(var(--accent-rgb), 0.08);
  padding: 1px 8px;
  border-radius: 10px;
}

/* ---- Plugin Grid ---- */
.pm-plugin-grid {
  display: flex;
  flex-direction: column;
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
  color: rgba(237,224,212,0.35);
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
  color: rgba(237,224,212,0.45);
  margin-bottom: 4px;
  line-height: 1.4;
}

.pm-plugin-author {
  font-size: 11px;
  color: rgba(237,224,212,0.35);
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
  color: rgba(237,224,212,0.45);
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
  color: rgba(237,224,212,0.55);
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
  color: rgba(237,224,212,0.35);
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
  color: rgba(237,224,212,0.35);
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
  color: rgba(237,224,212,0.45);
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
  color: rgba(237,224,212,0.45);
}

.pm-guide-tip {
  font-size: 12px;
  color: rgba(237,224,212,0.5);
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