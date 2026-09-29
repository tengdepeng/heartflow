<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance pl">
    <RoomLayout
      title="插件管理"
      kicker="管理你的插件"
      align="center"
      data-enter
    >

    <!-- Overview Cards -->
    <div data-enter class="pl-overview">
      <div class="pl-overview-card">
        <span class="pl-overview-num">{{ officialPlugins.length }}</span>
        <span class="pl-overview-label">核心插件</span>
      </div>
      <div class="pl-overview-card">
        <span class="pl-overview-num">{{ thirdParty.length }}</span>
        <span class="pl-overview-label">第三方插件</span>
      </div>
      <div class="pl-overview-card">
        <span class="pl-overview-num">{{ plugins.length }}</span>
        <span class="pl-overview-label">总计</span>
      </div>
    </div>

    <!-- 插件生态总览（INCR-384 补挂载孤儿桥接面板 PluginEcosystemPanel：usePluginEcosystemBridge 聚合生态概览/分类/沙箱守卫/调度器/市场健康/权限风险/建议七面, Plugins.vue 原走 resonance usePlugin store+网格, 桥接层聚合 computed 面零呈现, 真缺口） -->
    <PluginEcosystemPanel />

    <!-- 核心插件 -->
    <section data-enter class="pl-core-section">
      <h2 class="pl-section-title">核心插件（内置）</h2>
      <div class="pl-plugin-grid">
        <div
          v-for="p in officialPlugins"
          :key="p.manifest.meta.id"
          class="pl-plugin-card"
          :class="{ disabled: !p.enabled }"
        >
          <div class="pl-plugin-icon">{{ p.manifest.meta.icon }}</div>
          <div class="pl-plugin-info">
            <div class="pl-plugin-name">
              {{ p.manifest.meta.name }}
              <span class="pl-plugin-version">v{{ p.manifest.meta.version }}</span>
            </div>
            <div class="pl-plugin-desc">{{ p.manifest.meta.description }}</div>
            <div v-if="capsOf(p).length" class="plugin-caps">
              <div class="caps-head">
                <span class="caps-head-title">提供的能力</span>
                <span class="caps-count">{{ capsOf(p).length }}</span>
              </div>
              <div class="caps-list">
                <div v-for="cap in capsOf(p)" :key="cap.id" class="cap-row" :title="cap.description">
                  <span class="cap-dot" :class="capState(p, cap)"></span>
                  <span class="cap-label">{{ cap.label }}</span>
                  <span class="cap-state" :class="capState(p, cap)">{{ capStateLabel(capState(p, cap)) }}</span>
                </div>
              </div>
            </div>
            <div class="plugin-perms">
              <div class="perm-head">
                <span class="perm-head-title">所需权限</span>
                <button
                  type="button"
                  class="perm-revoke-all"
                  :disabled="(p.granted ?? p.manifest.permissions).length === 0"
                  @click="revokeAll(p)"
                >撤销全部</button>
              </div>
              <div class="perm-list">
                <div v-for="perm in p.manifest.permissions" :key="perm" class="perm-row">
                  <span class="perm-label">{{ permLabel(perm) }}</span>
                  <button
                    type="button"
                    class="perm-switch"
                    role="switch"
                    :aria-checked="isGranted(p, perm)"
                    :class="{ on: isGranted(p, perm) }"
                    :title="isGranted(p, perm) ? '点击撤销该权限' : '点击授予该权限'"
                    @click="togglePerm(p, perm)"
                  ><span class="perm-knob"></span></button>
                </div>
              </div>
            </div>
          </div>
          <div class="plugin-status">
            <span v-if="p.enabled" class="status-on">● 运行中</span>
            <span v-else class="status-off">○ 已禁用</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 第三方插件 -->
    <section class="pl-third-section" v-if="thirdParty.length > 0">
      <h2 class="pl-section-title">已安装插件</h2>
      <div class="pl-plugin-grid">
        <div
          v-for="p in thirdParty"
          :key="p.manifest.meta.id"
          class="pl-plugin-card"
          :class="[{ disabled: !p.enabled }, `tier-${p.manifest.meta.tier}`]"
        >
          <div class="pl-plugin-icon">{{ p.manifest.meta.icon }}</div>
          <div class="pl-plugin-info">
            <div class="pl-plugin-name">
              {{ p.manifest.meta.name }}
              <span class="pl-plugin-version">v{{ p.manifest.meta.version }}</span>
              <span class="tier-badge" :class="`tier-${p.manifest.meta.tier}`">
                {{ tierLabel(p.manifest.meta.tier) }}
              </span>
            </div>
            <div class="pl-plugin-desc">{{ p.manifest.meta.description }}</div>
            <div v-if="p.manifest.meta.author" class="plugin-author">
              by {{ p.manifest.meta.author }}
            </div>
            <div v-if="capsOf(p).length" class="plugin-caps">
              <div class="caps-head">
                <span class="caps-head-title">提供的能力</span>
                <span class="caps-count">{{ capsOf(p).length }}</span>
              </div>
              <div class="caps-list">
                <div v-for="cap in capsOf(p)" :key="cap.id" class="cap-row" :title="cap.description">
                  <span class="cap-dot" :class="capState(p, cap)"></span>
                  <span class="cap-label">{{ cap.label }}</span>
                  <span class="cap-state" :class="capState(p, cap)">{{ capStateLabel(capState(p, cap)) }}</span>
                </div>
              </div>
            </div>
            <div class="plugin-perms">
              <div class="perm-head">
                <span class="perm-head-title">所需权限</span>
                <button
                  type="button"
                  class="perm-revoke-all"
                  :disabled="(p.granted ?? p.manifest.permissions).length === 0"
                  @click="revokeAll(p)"
                >撤销全部</button>
              </div>
              <div class="perm-list">
                <div v-for="perm in p.manifest.permissions" :key="perm" class="perm-row">
                  <span class="perm-label">{{ permLabel(perm) }}</span>
                  <button
                    type="button"
                    class="perm-switch"
                    role="switch"
                    :aria-checked="isGranted(p, perm)"
                    :class="{ on: isGranted(p, perm) }"
                    :title="isGranted(p, perm) ? '点击撤销该权限' : '点击授予该权限'"
                    @click="togglePerm(p, perm)"
                  ><span class="perm-knob"></span></button>
                </div>
              </div>
            </div>
          </div>
          <div class="pl-plugin-actions">
            <button
              class="pl-btn-toggle"
              :class="{ active: p.enabled }"
              @click="pluginBridge.toggle(p.manifest.meta.id)"
            >
              {{ p.enabled ? '禁用' : '启用' }}
            </button>
            <button
              class="pl-btn-uninstall"
              @click="uninstall(p.manifest.meta.id)"
              title="卸载"
            >✕</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 空状态 -->
    <EmptyState v-if="plugins.length === 0" icon="🔌" title="插件管理器尚未初始化" :glow="false" cta-label="" />
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePlugin } from '../resonance/bridges/plugin'
import type {
  PluginTier,
  PluginRuntime,
  PluginPermission,
  PluginCapability,
} from '../modules/plugin/types'
import { PERMISSION_LABELS } from '../modules/plugin/types'
import { useViewEntrance } from '../composables/useViewEntrance'
import PluginEcosystemPanel from '../components/PluginEcosystemPanel.vue'
import EmptyState from '../components/EmptyState.vue'
import RoomLayout from '../components/RoomLayout.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const pluginBridge = usePlugin()
const { plugins, officialPlugins } = pluginBridge

onMounted(() => {
  pluginBridge.init()
})

const thirdParty = computed(() =>
  plugins.value.filter(p => p.manifest.meta.tier !== 'official')
)

function tierLabel(t: PluginTier): string {
  const map: Record<PluginTier, string> = {
    official: '官方',
    community: '社区',
    experimental: '实验',
  }
  return map[t] ?? t
}

/** 权限中文名（缺省回退原始串） */
function permLabel(perm: string): string {
  return PERMISSION_LABELS[perm as PluginPermission] ?? perm
}

/** 该权限当前是否已授予 */
function isGranted(p: PluginRuntime, perm: string): boolean {
  const granted = p.granted ?? p.manifest.permissions
  return (granted as string[]).includes(perm)
}

/** 逐项开关：授予 / 撤销 */
function togglePerm(p: PluginRuntime, perm: string) {
  pluginBridge.setPermission(p.manifest.meta.id, perm as PluginPermission, !isGranted(p, perm))
}

/** 一键撤销：清空该插件全部权限 */
function revokeAll(p: PluginRuntime) {
  pluginBridge.revokeAllPermissions(p.manifest.meta.id)
}

/** 该插件对外声明的能力 */
function capsOf(p: PluginRuntime): PluginCapability[] {
  return p.manifest.capabilities ?? []
}

/** 能力就绪状态（与能力注册表前四重门控一致：插件启用 + 权限已授予） */
type CapState = 'ready' | 'unauthorized' | 'disabled'
function capState(p: PluginRuntime, cap: PluginCapability): CapState {
  if (!p.enabled) return 'disabled'
  if (!isGranted(p, cap.permission)) return 'unauthorized'
  return 'ready'
}

function capStateLabel(s: CapState): string {
  return s === 'ready' ? '就绪' : s === 'unauthorized' ? '未授权' : '已禁用'
}

function uninstall(id: string) {
  if (confirm('确定要卸载此插件吗？卸载后数据不受影响。')) {
    pluginBridge.uninstallPlugin(id)
  }
}
</script>

<style scoped>
/* ===== Global ===== */
.pl {
  max-width: 600px;
  margin: 0 auto;
  padding: 48px 24px 80px;
  position: relative;
  z-index: 1;
  background: transparent;
  min-height: 100vh;
}

.pl :deep(.room-layout__body) {
  padding: 0;
  gap: 0;
}

/* Ambient glow pseudo-elements */
.pl::before,
.pl::after {
  content: '';
  position: fixed;
  pointer-events: none;
  z-index: 0;
}

.pl::before {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.07) 0%, transparent 70%);
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
}

.pl::after {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
  bottom: -80px;
  right: -80px;
}

/* ===== Overview Cards ===== */
.pl-overview {
  display: flex;
  gap: 12px;
  margin-top: 36px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.pl-overview-card {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  padding: 16px 12px;
  text-align: center;
  backdrop-filter: blur(4px);
  transition: border-color 0.3s;
}

.pl-overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
}

.pl-overview-num {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}

.pl-overview-label {
  display: block;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.45);
  margin-top: 4px;
  letter-spacing: 1px;
}

/* ===== Sections ===== */
.pl-core-section,
.pl-third-section {
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.pl-section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 14px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.12);
  letter-spacing: 0.5px;
}

/* ===== Plugin Grid ===== */
.pl-plugin-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pl-plugin-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-surface);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 10px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.pl-plugin-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.04) 0%, transparent 50%);
  pointer-events: none;
}

.pl-plugin-card:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(255, 255, 255, 0.05);
}

.pl-plugin-card.disabled {
  opacity: 0.5;
}

.pl-plugin-card.tier-experimental {
  border-color: rgba(var(--accent-rgb), 0.15);
}

.pl-plugin-icon {
  font-size: 26px;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  position: relative;
  z-index: 1;
}

.pl-plugin-info {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.pl-plugin-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pl-plugin-version {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.35);
  font-weight: 400;
}

.tier-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.tier-badge.tier-community {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.tier-badge.tier-experimental {
  background: rgba(255, 193, 7, 0.12);
  color: #ffc107;
}

.pl-plugin-desc {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
  margin-bottom: 4px;
}

.plugin-author {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
  margin-bottom: 4px;
}

.plugin-perms {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.plugin-caps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.caps-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.caps-head-title {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
  letter-spacing: 1px;
}

.caps-count {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.caps-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cap-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cap-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(232, 221, 208, 0.25);
}

.cap-dot.ready {
  background: #a5d6a7;
  box-shadow: 0 0 6px rgba(165, 214, 167, 0.5);
}

.cap-dot.unauthorized {
  background: #ffc107;
}

.cap-dot.disabled {
  background: rgba(232, 221, 208, 0.2);
}

.cap-label {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.72);
}

.cap-state {
  margin-left: auto;
  font-size: 10px;
  letter-spacing: 0.5px;
  color: rgba(232, 221, 208, 0.55);
}

.cap-state.ready {
  color: #a5d6a7;
}

.cap-state.unauthorized {
  color: #ffc107;
}

.cap-state.disabled {
  color: rgba(232, 221, 208, 0.5);
}

.perm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.perm-head-title {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
  letter-spacing: 1px;
}

.perm-revoke-all {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(239, 154, 154, 0.25);
  background: transparent;
  color: rgba(239, 154, 154, 0.8);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.25s;

  min-height: 26px;
}

.perm-revoke-all:hover:not(:disabled) {
  background: rgba(239, 154, 154, 0.1);
  border-color: rgba(239, 154, 154, 0.45);
  color: #ef9a9a;
}

.perm-revoke-all:disabled {
  opacity: 0.35;
  cursor: default;
  border-color: rgba(232, 221, 208, 0.12);
  color: rgba(232, 221, 208, 0.3);
}

.perm-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.perm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.perm-label {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.6);
}

/* 权限开关 */
.perm-switch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  position: relative;
  width: 38px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(232, 221, 208, 0.08);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.25s;

  min-height: 24px;
  min-width: 24px;
}

.perm-switch .perm-knob {
  position: absolute;
  top: 50%;
  left: 2px;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(232, 221, 208, 0.55);
  transition: all 0.25s;
}

.perm-switch.on {
  background: rgba(var(--accent-rgb), 0.35);
  border-color: rgba(var(--accent-rgb), 0.5);
}

.perm-switch.on .perm-knob {
  left: 20px;
  background: var(--accent, #d4a574);
}

.perm-switch:focus-visible {
  outline: 2px solid rgba(var(--accent-rgb), 0.5);
  outline-offset: 2px;
}

.perm-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(232, 221, 208, 0.55);
  font-family: var(--font-mono, monospace);
}

.plugin-status {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.status-on {
  font-size: 12px;
  color: #a5d6a7;
}

.status-off {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.5);
}

/* ===== Actions ===== */
.pl-plugin-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.pl-btn-toggle {
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: rgba(232, 221, 208, 0.55);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s;
}

.pl-btn-toggle:hover {
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--text-primary);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.pl-btn-toggle.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.35);
  color: var(--accent);
}

.pl-btn-uninstall {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(232, 221, 208, 0.3);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.pl-btn-uninstall:hover {
  color: #ef9a9a;
  border-color: rgba(239, 154, 154, 0.3);
  background: rgba(239, 154, 154, 0.08);
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .pl { padding: 32px 20px 64px; }
  .pl-overview { gap: 8px; }
  .pl-overview-card { padding: 12px 8px; }
  .pl-plugin-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .pl { padding: 24px 14px 56px; }
  .pl-overview { flex-direction: column; }
  .pl-section-title { font-size: 12px; }
}

@media (max-width: 480px) {
  .pl { padding: 12px; }
  .pl-overview { flex-direction: column; gap: 6px; }
  .pl-section-title { font-size: 13px; }
}
</style>