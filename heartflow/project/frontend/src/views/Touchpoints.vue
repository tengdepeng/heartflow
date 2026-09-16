<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance tp">
    <!-- ============================================ -->
    <!-- 殿堂触角 · 页面标题 -->
    <!-- ============================================ -->
    <header data-enter class="tp-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">殿堂触角 · 设备交互与通知</p>
      <h1 class="tp-title">殿堂触角</h1>
    </header>

    <!-- ============================================ -->
    <!-- 概览卡片 -->
    <!-- ============================================ -->
    <div data-enter class="overview-cards">
      <div class="overview-card">
        <span class="overview-icon">🔔</span>
        <div class="overview-info">
          <span class="overview-value">通知</span>
          <span class="overview-label">{{ notificationEnabled ? '已启用' : '已关闭' }}</span>
        </div>
      </div>
      <div class="overview-card">
        <span class="overview-icon">💡</span>
        <div class="overview-info">
          <span class="overview-value">光痕</span>
          <span class="overview-label">{{ lockScreenGlowEnabled ? '已启用' : '已关闭' }}</span>
        </div>
      </div>
      <div class="overview-card">
        <span class="overview-icon">👋</span>
        <div class="overview-info">
          <span class="overview-value">浮窗</span>
          <span class="overview-label">{{ greetingFloatingEnabled ? '已启用' : '已关闭' }}</span>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 🔔 通知设置 -->
    <!-- ============================================ -->
    <section class="tp-section">
      <h2 class="tp-section-title">🔔 通知设置</h2>

      <div class="tp-card">
        <div class="setting-info">
          <span class="tp-toggle-label">启用原生通知</span>
          <span class="tp-section-desc">显示系统级原生通知推送</span>
        </div>
        <div class="setting-controls">
          <button class="test-btn" @click="testNotification">测试</button>
          <label class="tp-toggle">
            <input type="checkbox" v-model="notificationEnabled" />
            <span class="toggle-track"><span class="toggle-thumb" /></span>
          </label>
        </div>
      </div>

      <div class="tp-card">
        <div class="setting-info">
          <span class="tp-toggle-label">专注完成时通知</span>
          <span class="tp-section-desc">专注计时完成时推送通知</span>
        </div>
        <div class="setting-controls">
          <label class="tp-toggle">
            <input type="checkbox" v-model="focusCompleteNotify" />
            <span class="toggle-track"><span class="toggle-thumb" /></span>
          </label>
        </div>
      </div>

      <div class="tp-card">
        <div class="setting-info">
          <span class="tp-toggle-label">幕僚问候时通知</span>
          <span class="tp-section-desc">幕僚主动问候时推送通知</span>
        </div>
        <div class="setting-controls">
          <label class="tp-toggle">
            <input type="checkbox" v-model="advisorGreetNotify" />
            <span class="toggle-track"><span class="toggle-thumb" /></span>
          </label>
        </div>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- 💡 锁屏光痕 -->
    <!-- ============================================ -->
    <section class="tp-section">
      <h2 class="tp-section-title">💡 锁屏光痕</h2>

      <div class="tp-card">
        <div class="setting-info">
          <span class="tp-toggle-label">启用锁屏光痕</span>
          <span class="tp-section-desc">锁屏时显示柔和光晕动画</span>
        </div>
        <div class="setting-controls">
          <label class="tp-toggle">
            <input type="checkbox" v-model="lockScreenGlowEnabled" @change="onLockScreenGlowChange" />
            <span class="toggle-track"><span class="toggle-thumb" /></span>
          </label>
        </div>
      </div>

      <!-- 光痕颜色选择 -->
      <div class="color-picker-section">
        <span class="color-picker-label">光痕颜色</span>
        <div class="tp-color-picker">
          <button
            v-for="c in glowColors"
            :key="c.key"
            class="tp-color-swatch"
            :class="{ active: selectedGlowColor === c.key }"
            :style="{ '--swatch-color': c.value }"
            @click="selectedGlowColor = c.key"
          >
            <span class="swatch-inner" />
          </button>
        </div>
      </div>

      <!-- 锁屏预览 -->
      <div class="preview-section">
        <span class="preview-label">预览</span>
        <div class="tp-phone-frame">
          <div class="phone-notch" />
          <div class="phone-screen">
            <div class="phone-status-bar">
              <span class="status-time">21:30</span>
            </div>
            <div class="phone-lock-content">
              <span class="lock-icon">🔒</span>
              <span class="lock-date">{{ todayDate }}</span>
              <span class="lock-hint">向上滑动以解锁</span>
            </div>
            <!-- 光痕效果 -->
            <div
              v-if="lockScreenGlowEnabled"
              class="tp-glow-preview"
              :style="glowOverlayStyle"
            />
          </div>
          <div class="phone-home-indicator" />
        </div>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- 👋 幕僚问候浮窗 -->
    <!-- ============================================ -->
    <section class="tp-section">
      <h2 class="tp-section-title">👋 幕僚问候浮窗</h2>

      <div class="tp-card">
        <div class="setting-info">
          <span class="tp-toggle-label">启用浮窗</span>
          <span class="tp-section-desc">控制 MirrorSelf 问候浮窗的显示</span>
        </div>
        <div class="setting-controls">
          <label class="tp-toggle">
            <input type="checkbox" v-model="greetingFloatingEnabled" @change="onGreetingFloatingChange" />
            <span class="toggle-track"><span class="toggle-thumb" /></span>
          </label>
        </div>
      </div>

      <div class="tp-card">
        <div class="setting-info">
          <span class="tp-toggle-label">浮窗大小</span>
          <span class="tp-section-desc">调整问候浮窗的尺寸</span>
        </div>
        <div class="setting-controls">
          <div class="tp-segmented">
            <button
              v-for="s in sizeOptions"
              :key="s.value"
              class="tp-seg-option"
              :class="{ active: floatingSize === s.value }"
              @click="floatingSize = s.value"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>

      <div class="tp-card">
        <div class="setting-info">
          <span class="tp-toggle-label">浮窗位置</span>
          <span class="tp-section-desc">选择问候浮窗在屏幕上的位置</span>
        </div>
        <div class="setting-controls">
          <div class="tp-segmented">
            <button
              v-for="p in positionOptions"
              :key="p.value"
              class="tp-seg-option"
              :class="{ active: floatingPosition === p.value }"
              @click="floatingPosition = p.value"
            >{{ p.label }}</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- 📊 触达策略管理 -->
    <!-- ============================================ -->
    <section class="tp-section">
      <h2 class="tp-section-title">📊 触达策略</h2>
      <p class="tp-section-desc">智能调度通知触达时机，避免过度打扰</p>

      <div
        v-for="strategy in strategies"
        :key="strategy.id"
        class="tp-card"
      >
        <div class="setting-info">
          <span class="tp-toggle-label">{{ strategy.name }}</span>
          <span class="tp-section-desc">{{ strategy.description }}</span>
          <div class="strategy-meta">
            <span :class="['priority-badge', 'pri-' + strategy.priority]">
              {{ PRIORITY_LABELS[strategy.priority] }}
            </span>
            <span class="strategy-stat">每日上限 {{ strategy.maxDailyDeliveries }}</span>
            <span class="strategy-stat">间隔 {{ strategy.minIntervalMinutes }}min</span>
          </div>
        </div>
        <div class="setting-controls">
          <label class="tp-toggle">
            <input type="checkbox" :checked="strategy.enabled" @change="toggleStrategy(strategy.id)" />
            <span class="toggle-track"><span class="toggle-thumb" /></span>
          </label>
        </div>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- 📡 多通道推送 -->
    <!-- ============================================ -->
    <section class="tp-section">
      <h2 class="tp-section-title">📡 推送渠道</h2>
      <p class="tp-section-desc">管理各推送渠道的启用状态与优先级</p>

      <div class="channel-grid">
        <div
          v-for="ch in channelStatusList"
          :key="ch.type"
          :class="['channel-card', { disabled: !ch.available }]"
        >
          <div class="channel-header">
            <span class="channel-icon">{{ ch.icon }}</span>
            <span class="channel-name">{{ ch.label }}</span>
            <span :class="['channel-status', ch.available ? 'status-ok' : 'status-off']">
              {{ ch.available ? '可用' : '不可用' }}
            </span>
          </div>
          <div class="channel-body">
            <div class="channel-stat">
              <span class="stat-label">今日推送</span>
              <span class="stat-value">{{ ch.todayCount }}/{{ ch.maxDaily }}</span>
            </div>
            <div class="channel-stat">
              <span class="stat-label">权限</span>
              <span class="stat-value">{{ PERMISSION_LABELS[ch.permission] }}</span>
            </div>
          </div>
          <div class="channel-footer">
            <label class="tp-toggle tp-toggle-sm">
              <input type="checkbox" :checked="ch.enabled" @change="toggleChannel(ch.type)" />
              <span class="toggle-track"><span class="toggle-thumb" /></span>
            </label>
            <button
              v-if="ch.permission === 'prompt'"
              class="channel-btn"
              @click="requestChannelPermission(ch.type)"
            >授权</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- 📈 触达分析 -->
    <!-- ============================================ -->
    <section class="tp-section" v-if="pushStatsData.total > 0">
      <h2 class="tp-section-title">📈 触达分析</h2>
      <p class="tp-section-desc">今日推送效果概览</p>

      <div class="analytics-grid">
        <div class="analytics-card">
          <span class="analytics-num">{{ pushStatsData.total }}</span>
          <span class="analytics-label">发送</span>
        </div>
        <div class="analytics-card">
          <span class="analytics-num">{{ pushStatsData.success }}</span>
          <span class="analytics-label">成功</span>
        </div>
        <div class="analytics-card">
          <span class="analytics-num">{{ pushStatsData.opened }}</span>
          <span class="analytics-label">打开</span>
        </div>
        <div class="analytics-card">
          <span class="analytics-num">{{ pushStatsData.clicked }}</span>
          <span class="analytics-label">点击</span>
        </div>
        <div class="analytics-card">
          <span class="analytics-num">{{ (pushStatsData.clickRate * 100).toFixed(1) }}%</span>
          <span class="analytics-label">点击率</span>
        </div>
        <div class="analytics-card">
          <span class="analytics-num">{{ (pushStatsData.avgResponseTimeMs / 1000).toFixed(1) }}s</span>
          <span class="analytics-label">平均响应</span>
        </div>
      </div>

      <div class="analytics-bar">
        <div class="bar-segment bar-sent" :style="{ width: '100%' }">
          <span class="bar-label">发送 {{ pushStatsData.total }}</span>
        </div>
        <div class="bar-segment bar-success" :style="{ width: successPercent + '%' }">
          <span class="bar-label">送达 {{ pushStatsData.success }}</span>
        </div>
        <div class="bar-segment bar-opened" :style="{ width: openPercent + '%' }">
          <span class="bar-label">打开 {{ pushStatsData.opened }}</span>
        </div>
        <div class="bar-segment bar-clicked" :style="{ width: clickPercent + '%' }">
          <span class="bar-label">点击 {{ pushStatsData.clicked }}</span>
        </div>
      </div>

      <!-- 优化建议 -->
      <div class="suggestions-panel" v-if="suggestionsList.length > 0">
        <h3 class="suggestions-title">💡 优化建议（{{ suggestionsList.length }}）</h3>
        <div
          v-for="sug in suggestionsList"
          :key="sug.id"
          :class="['suggestion-item', 'sug-' + sug.severity]"
        >
          <div class="sug-header">
            <span :class="['sug-severity', 'sev-' + sug.severity]">
              {{ SEVERITY_LABELS[sug.severity] }}
            </span>
            <span class="sug-title">{{ sug.title }}</span>
          </div>
          <p class="sug-desc">{{ sug.description }}</p>
          <div class="sug-action">
            <span class="sug-action-label">建议操作：</span>
            <span>{{ sug.action }}</span>
          </div>
          <div class="sug-metric">
            <span class="sug-metric-label">{{ sug.metric }}：</span>
            <span class="sug-metric-current">{{ sug.currentValue }}</span>
            <span class="sug-metric-arrow">→</span>
            <span class="sug-metric-target">{{ sug.targetValue }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 空状态 -->
    <section class="tp-section" v-else>
      <h2 class="tp-section-title">📈 触达分析</h2>
      <div class="empty-state">
        <span class="empty-icon">📊</span>
        <p class="empty-text">暂无推送数据</p>
        <p class="empty-hint">发送通知后，此处将展示触达效果分析</p>
      </div>
    </section>

    <!-- 文本感知：剪贴板实体速识（text-sense 模块，原已实现但未挂载） -->
    <PerceptionPanel />

    <!-- 问候浮窗增强（touchpoints·greeting-engine + widget-manager，INCR-177） -->
    <GreetingWidgetPanel />

    <!-- 剪贴板管理（touchpoints·clipboard，INCR-177） -->
    <ClipboardPanel />

    <!-- ============================================================ -->
    <!-- 通知中心（touchpoints·notification-engine，INCR-241 补挂载孤儿组件） -->
    <!-- ============================================================ -->
    <section data-enter class="tp-section">
      <NotificationCenterPanel />
    </section>

    <!-- ============================================================ -->
    <!-- 触角编排（touchpoints·orchestration-engine，INCR-243 补挂载孤儿组件） -->
    <!-- ============================================================ -->
    <section data-enter class="tp-section">
      <OrchestrationPanel />
    </section>

    <!-- ============================================================ -->
    <!-- 渠道优化（touchpoints·channel-optimizer，INCR-250 补挂载孤儿组件） -->
    <!-- 薄委托化 props 直驱：host 注入 channels/records/performances/hourlyPerformance -->
    <!-- ============================================================ -->
    <section data-enter class="tp-section">
      <ChannelOptimizerPanel
        :performances="channelPerformances"
        :hourly-performance="hourlyPerformances"
        :channels="pushChannel.channels.value"
        :records="pushChannel.records.value"
      />
    </section>

    <!-- 跨设备接续 · 配对（守宪法第1条·本地私有·fail-closed） -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDesktopTouchpoints } from '../composables/useDesktopTouchpoints'
import PerceptionPanel from '../components/PerceptionPanel.vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import GreetingWidgetPanel from '../components/GreetingWidgetPanel.vue'
import ClipboardPanel from '../components/ClipboardPanel.vue'
import NotificationCenterPanel from '../components/NotificationCenterPanel.vue'
import OrchestrationPanel from '../components/OrchestrationPanel.vue'
import ChannelOptimizerPanel from '../components/ChannelOptimizerPanel.vue'
import {
  useDeliveryStrategy,
  usePushChannel,
  useTouchAnalytics,
} from '../modules/touchpoints'
import type {
  DeliveryPriority,
  PushChannelType,
} from '../modules/touchpoints'

const { entranceRef, entranceClass } = useViewEntrance()
const touchpoints = useDesktopTouchpoints()
const deliveryStrategy = useDeliveryStrategy()
const pushChannel = usePushChannel()
const analytics = useTouchAnalytics()

// ---- 渠道优化数据（薄委托给 ChannelOptimizerPanel，INCR-250） ----
const channelPerformances = computed(() => analytics.computeChannelPerformance(pushChannel.records.value))
const hourlyPerformances = computed(() => analytics.computeHourlyPerformance(pushChannel.records.value))

// ---- 优先级标签 ----
const PRIORITY_LABELS: Record<DeliveryPriority, string> = {
  critical: '紧急',
  high: '高',
  normal: '普通',
  low: '低',
}

// ---- 权限标签 ----
const PERMISSION_LABELS: Record<string, string> = {
  granted: '已授权',
  denied: '已拒绝',
  prompt: '待授权',
  unsupported: '不支持',
}

// ---- 严重程度标签 ----
const SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
}

// ---- 通知设置 ----
const notificationEnabled = ref(true)
const focusCompleteNotify = ref(true)
const advisorGreetNotify = ref(true)

async function testNotification() {
  await pushChannel.push({
    title: '心流工坊',
    message: '这是一条测试通知',
    requireSound: true,
  })
}

// ---- 锁屏光痕 ----
const glowColors = [
  { key: 'purple', value: '#a07c8c' },
  { key: 'cyan', value: '#5ab8a0' },
  { key: 'blue', value: '#6b9fc4' },
  { key: 'green', value: '#8a9a7a' },
  { key: 'amber', value: '#f59e0b' },
  { key: 'rose', value: '#d98c7a' },
  { key: 'red', value: '#ef4444' },
  { key: 'white', value: '#ffffff' },
]

const lockScreenGlowEnabled = ref(touchpoints.getLockScreenGlow())
const selectedGlowColor = ref('purple')

function onLockScreenGlowChange() {
  touchpoints.setLockScreenGlow(lockScreenGlowEnabled.value)
}

const glowOverlayStyle = computed(() => {
  const color = glowColors.find(c => c.key === selectedGlowColor.value)?.value || '#d4a574'
  return {
    '--glow-color': color,
    '--glow-rgb': hexToRgb(color),
  }
})

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

const todayDate = computed(() => {
  const d = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})

// ---- 幕僚问候浮窗 ----
const greetingFloatingEnabled = ref(touchpoints.getGreetingFloating())

const sizeOptions = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

const positionOptions = [
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
]

const floatingSize = ref('medium')
const floatingPosition = ref('bottom-right')

function onGreetingFloatingChange() {
  touchpoints.setGreetingFloating(greetingFloatingEnabled.value)
}

// ---- 触达策略 ----
const strategies = computed(() => deliveryStrategy.strategies.value)

function toggleStrategy(id: string) {
  deliveryStrategy.toggleStrategy(id)
}

// ---- 推送渠道 ----
const channelStatusList = computed(() => pushChannel.channelStatus.value)

function toggleChannel(type: PushChannelType) {
  pushChannel.toggleChannel(type)
}

async function requestChannelPermission(type: PushChannelType) {
  await pushChannel.requestPermission(type)
}

// ---- 触达分析 ----
const pushStatsData = computed(() => pushChannel.pushStats.value)

const successPercent = computed(() =>
  pushStatsData.value.total > 0
    ? (pushStatsData.value.success / pushStatsData.value.total) * 100
    : 0,
)

const openPercent = computed(() =>
  pushStatsData.value.total > 0
    ? (pushStatsData.value.opened / pushStatsData.value.total) * 100
    : 0,
)

const clickPercent = computed(() =>
  pushStatsData.value.total > 0
    ? (pushStatsData.value.clicked / pushStatsData.value.total) * 100
    : 0,
)

const suggestionsList = computed(() => analytics.activeSuggestions.value)

// ---- 生命周期 ----
onMounted(() => {
  deliveryStrategy.recordActivity()
})
</script>

<style scoped>
/* ============================================================
   殿堂触角页面样式 — 暖琥珀主题
   ============================================================ */

.tp {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  /* 移动端用 dvh 替代 vh：避免底部内容被浏览器工具栏遮挡（守布局契约：禁 HARD 100vh） */
  min-height: 100vh;
  min-height: 100dvh;
  background: transparent;
  position: relative;
}

/* ---- 环境光晕 ---- */
.tp::before {
  content: '';
  position: fixed;
  top: -40%;
  left: -20%;
  width: 140%;
  height: 80%;
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.tp::after {
  content: '';
  position: fixed;
  bottom: -30%;
  right: -20%;
  width: 120%;
  height: 60%;
  background: radial-gradient(ellipse at 50% 100%, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ---- 顶部标题 ---- */

.tp-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.orn-line {
  display: block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent);
}

.orn-diamond {
  font-size: 10px;
  color: var(--accent);
  opacity: 0.7;
}

.header-kicker {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.tp-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--accent);
  margin: 0;
}

/* ---- 概览卡片 ---- */

.overview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 12px;
  backdrop-filter: blur(6px);
  transition: all 0.3s ease;
}

.overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--bg-card-rgb), 0.55);
}

.overview-icon {
  font-size: 18px;
  line-height: 1;
  opacity: 0.7;
}

.overview-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.overview-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.overview-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 0.5px;
}

/* ---- 分区标题 ---- */

.tp-section {
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.tp-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 12px;
  letter-spacing: 1px;
  opacity: 0.85;
}

/* ---- 设置卡片 ---- */

.tp-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 10px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  backdrop-filter: blur(6px);
}

.tp-card:hover {
  background: rgba(var(--bg-card-rgb), 0.55);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tp-toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.tp-section-desc {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}

.setting-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ---- 开关组件 ---- */

.tp-toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.tp-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.tp-toggle input:focus-visible + .toggle-track {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 999px;
}

.toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.08);
  transition: background 0.25s ease;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: transform 0.25s ease, background 0.25s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.tp-toggle input:checked + .toggle-track {
  background: var(--accent);
}

.tp-toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(18px);
  background: #fff;
}

/* ---- 测试按钮 ---- */

.test-btn {
  padding: 4px 12px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--accent-rgb), 0.6);
  cursor: pointer;
  transition: all 0.25s ease;
}

.test-btn:hover {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}

/* ---- 分段选择器 ---- */

.tp-segmented {
  display: flex;
  gap: 2px;
  background: var(--bg-surface);
  border-radius: 8px;
  padding: 2px;
}

.tp-seg-option {
  padding: 5px 12px;
  font-size: 11px;
  font-family: inherit;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.4);
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.tp-seg-option:hover {
  color: rgba(var(--accent-rgb), 0.7);
}

.tp-seg-option.active {
  background: var(--accent);
  color: var(--bg-primary);
  font-weight: 600;
}

/* ---- 颜色选择器 ---- */

.color-picker-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
}

.color-picker-label {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.45);
  white-space: nowrap;
}

.tp-color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tp-color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--swatch-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.tp-color-swatch:hover {
  transform: scale(1.15);
}

.tp-color-swatch.active {
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 12px var(--swatch-color);
}

.swatch-inner {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}

/* ---- 锁屏预览 ---- */

.preview-section {
  margin-top: 4px;
}

.preview-label {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.45);
  display: block;
  margin-bottom: 10px;
}

.tp-phone-frame {
  position: relative;
  width: 220px;
  height: 440px;
  margin: 0 auto;
  border-radius: 32px;
  border: 2px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-deepest);
  overflow: hidden;
  box-shadow:
    0 0 40px rgba(0, 0, 0, 0.5),
    0 0 60px rgba(var(--accent-rgb), 0.04),
    inset 0 0 1px rgba(var(--accent-rgb), 0.06);
}

.phone-notch {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 24px;
  background: var(--bg-deepest);
  border-radius: 0 0 14px 14px;
  z-index: 3;
}

.phone-screen {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.phone-status-bar {
  display: flex;
  justify-content: center;
  padding: 12px 16px 0;
  z-index: 2;
  position: relative;
}

.status-time {
  font-size: 13px;
  font-weight: 600;
  color: rgba(232, 221, 208, 0.7);
  letter-spacing: 0.5px;
}

.phone-lock-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  z-index: 2;
}

.lock-icon {
  font-size: 20px;
  opacity: 0.5;
}

.lock-date {
  font-size: 14px;
  color: rgba(232, 221, 208, 0.6);
  font-weight: 400;
}

.lock-hint {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.25);
  margin-top: 12px;
  letter-spacing: 0.5px;
}

.phone-home-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.15);
  z-index: 3;
}

/* ---- 光痕效果 ---- */

.tp-glow-preview {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: radial-gradient(
    ellipse at 50% 80%,
    rgba(var(--glow-rgb, 212, 165, 116), 0.25) 0%,
    rgba(var(--glow-rgb, 212, 165, 116), 0.12) 30%,
    rgba(var(--glow-rgb, 212, 165, 116), 0.04) 60%,
    transparent 80%
  );
  animation: glow-breathe 3s ease-in-out infinite;
}

@keyframes glow-breathe {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* ---- 美化覆盖层预览 ---- */

.tp-overlay-preview {
  margin-top: 8px;
}

.overlay-preview-box {
  width: 100%;
  height: 120px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: rgba(10, 8, 6, 0.5);
}

.preview-hint {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  margin-top: 8px;
  position: relative;
  z-index: 1;
}

/* 极简模式：小光点 */
.minimal-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  position: absolute;
  top: 16px;
  right: 16px;
  box-shadow: 0 0 12px var(--accent);
  animation: dot-pulse 2s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}

/* 氛围模式：渐变光晕 */
.ambient-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 100%,
    rgba(var(--accent-rgb), 0.15) 0%,
    rgba(var(--accent-rgb), 0.06) 30%,
    transparent 70%
  );
  animation: ambient-ripple 4s ease-in-out infinite;
}

@keyframes ambient-ripple {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* ---- 响应式 ---- */

/* 860px: 平板过渡 — 紧凑重排 */
@media (max-width: 860px) {
  .tp {
    padding: 32px 20px 72px;
  }

  .tp-header {
    margin-bottom: 24px;
  }

  .tp-title {
    font-size: 22px;
  }

  .tp-phone-frame {
    width: 200px;
    height: 400px;
  }

  .overview-cards {
    gap: 8px;
  }

  .overview-card {
    padding: 12px 10px;
  }
}

@media (max-width: 640px) {
  .tp {
    padding: 24px 16px 60px;
  }

  .tp-phone-frame {
    width: 180px;
    height: 360px;
    border-radius: 24px;
  }

  .color-picker-section {
    flex-wrap: wrap;
  }

  .overview-cards {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

/* 480px: 极紧凑 — 窄屏 */
@media (max-width: 480px) {
  .overview-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .overview-card {
    flex: 1 1 calc(50% - 6px);
    min-width: 0;
    padding: 10px 8px;
  }

  .tp-phone-frame {
    width: 160px;
    height: 320px;
  }

  .color-picker-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
  }

  .tp-color-picker {
    gap: 4px;
  }

  .tp-color-swatch {
    width: 22px;
    height: 22px;
  }

  .setting-controls {
    gap: 6px;
  }

  .tp-segmented {
    flex-wrap: wrap;
  }

  .tp-seg-option {
    padding: 4px 8px;
    font-size: 10px;
  }

  .test-btn {
    padding: 3px 8px;
    font-size: 10px;
  }
}

/* 375px: 最小常见视口（iPhone SE 等）— 防溢出 + 舒适点击目标 */
@media (max-width: 375px) {
  .tp {
    padding: 20px 12px 56px;
  }

  .tp-header {
    margin-bottom: 20px;
  }

  .tp-title {
    font-size: 20px;
    letter-spacing: 2px;
  }

  .overview-card {
    padding: 10px 6px;
    gap: 8px;
  }

  .overview-value {
    font-size: 12px;
  }

  .overview-icon {
    font-size: 16px;
  }

  .tp-card {
    padding: 12px 12px;
  }

  .tp-toggle-label {
    font-size: 13px;
  }

  .tp-section-desc {
    font-size: 10px;
  }

  .tp-phone-frame {
    width: 150px;
    height: 300px;
    border-radius: 22px;
  }

  .tp-seg-option {
    padding: 3px 6px;
    font-size: 9px;
  }

  /* 收敛装饰光晕，避免小屏横向溢出（fixed 子元素不受祖先 overflow 裁剪） */
  .tp::before,
  .tp::after {
    width: 100%;
    left: 0;
    right: 0;
  }
}
</style>