<template>
  <section class="ocp" aria-label="触角编排">
    <div class="ocp-head">
      <span class="ocp-title">🎛 触角编排</span>
      <span class="ocp-sub">场景 · 联动 · 布局 · 统计</span>
    </div>

    <div class="ocp-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="ocp-tab"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 场景 -->
    <template v-if="tab === 'scene'">
      <div class="ocp-scene-card">
        <div class="ocp-scene-head">
          <span class="ocp-scene-type">{{ sceneLabel(currentScene.type) }}</span>
          <span class="ocp-scene-name">{{ currentScene.name }}</span>
          <button class="ocp-btn--small" @click="handleDetect">检测场景</button>
        </div>
        <div class="ocp-scene-meta">
          <span>时段 {{ timeLabel(currentScene.timeOfDay) }}</span>
          <span>{{ currentScene.isFocusing ? '专注中' : '非专注' }}</span>
          <span>{{ currentScene.isResting ? '休息中' : '非休息' }}</span>
          <span v-if="currentScene.isDark !== undefined">{{ currentScene.isDark ? '暗色' : '亮色' }}</span>
          <span v-if="currentScene.isOnline !== undefined">{{ currentScene.isOnline ? '在线' : '离线' }}</span>
          <span v-if="currentScene.batteryLevel !== undefined && currentScene.batteryLevel !== null">
            电量 {{ Math.round(currentScene.batteryLevel * 100) }}%
          </span>
          <span v-if="currentScene.isLowPower">低电量</span>
        </div>
      </div>

      <p class="ocp-subtitle">场景预设</p>
      <div class="ocp-list">
        <div v-for="p in scenePresets" :key="p.id" class="ocp-preset">
          <div class="ocp-preset-head">
            <span class="ocp-preset-name">{{ p.name }}</span>
            <span class="ocp-preset-type">{{ sceneLabel(p.type) }}</span>
            <span v-if="p.type === currentScene.type" class="ocp-current">当前</span>
          </div>
          <p class="ocp-preset-desc">{{ p.description }}</p>
          <div class="ocp-preset-meta">
            <span>显示 {{ p.widgetConfig.visibleTypes.length }} 种</span>
            <span>隐藏 {{ p.widgetConfig.hiddenTypes.length }} 种</span>
          </div>
          <div class="ocp-preset-actions">
            <button class="ocp-btn--small" @click="handleApplyPreset(p.type)">应用预设</button>
          </div>
        </div>
      </div>
    </template>

    <!-- 联动 -->
    <template v-else-if="tab === 'linkage'">
      <div class="ocp-actions">
        <button class="ocp-btn" @click="handleResetRules">重置预设规则</button>
      </div>
      <div v-if="linkageRules.length" class="ocp-list">
        <div v-for="r in linkageRules" :key="r.id" class="ocp-rule">
          <div class="ocp-rule-head">
            <span class="ocp-rule-name">{{ r.name }}</span>
            <span class="ocp-rule-source">{{ sourceLabel(r.sourceType) }}</span>
            <span class="ocp-rule-trigger">{{ triggerLabel(r.trigger.type) }}</span>
            <label class="ocp-toggle">
              <input type="checkbox" :checked="r.enabled" @change="handleToggleRule(r.id)" />
              <span class="ocp-toggle-track"><span class="ocp-toggle-thumb" /></span>
            </label>
          </div>
          <div class="ocp-rule-meta">
            <span>{{ r.targets.length }} 个目标动作</span>
            <span>优先级 {{ r.priority }}</span>
            <span v-if="r.lastTriggeredAt">上次 {{ formatTime(r.lastTriggeredAt) }}</span>
            <span v-else>未触发</span>
          </div>
          <div class="ocp-rule-actions">
            <button class="ocp-btn--small" @click="handleTriggerRule(r.id)">手动触发</button>
          </div>
        </div>
      </div>
      <p v-else class="ocp-empty">暂无联动规则。</p>
    </template>

    <!-- 布局 -->
    <template v-else-if="tab === 'layout'">
      <div class="ocp-size-row">
        <input v-model.number="screenWidth" type="number" class="ocp-input" placeholder="宽度 px" />
        <input v-model.number="screenHeight" type="number" class="ocp-input" placeholder="高度 px" />
        <button class="ocp-btn" @click="handleUpdateSize">更新屏幕尺寸</button>
      </div>
      <div v-if="adaptiveLayouts.length" class="ocp-list">
        <div
          v-for="l in adaptiveLayouts"
          :key="l.id"
          class="ocp-layout"
          :class="{ on: isActiveLayout(l) }"
        >
          <div class="ocp-layout-head">
            <span class="ocp-layout-name">{{ l.name }}</span>
            <span v-if="isActiveLayout(l)" class="ocp-current">当前</span>
          </div>
          <div class="ocp-layout-meta">
            <span>{{ l.screenRange.minWidth }}–{{ l.screenRange.maxWidth === Infinity ? '∞' : l.screenRange.maxWidth }}px</span>
            <span>{{ l.columns }}×{{ l.rows }} 网格</span>
            <span>最多 {{ l.maxWidgets }} 个</span>
          </div>
        </div>
      </div>
      <p v-else class="ocp-empty">暂无自适应布局。</p>
    </template>

    <!-- 统计 -->
    <template v-else>
      <div class="ocp-stats">
        <div class="ocp-stat">
          <span class="ocp-stat-value">{{ statsSummary.totalImpressions }}</span>
          <span class="ocp-stat-label">总展示</span>
        </div>
        <div class="ocp-stat">
          <span class="ocp-stat-value">{{ statsSummary.totalInteractions }}</span>
          <span class="ocp-stat-label">总交互</span>
        </div>
        <div class="ocp-stat">
          <span class="ocp-stat-value">{{ (statsSummary.avgRate * 100).toFixed(0) }}%</span>
          <span class="ocp-stat-label">平均交互率</span>
        </div>
      </div>

      <div class="ocp-actions">
        <button class="ocp-btn" @click="handleRecord('widget')">记录小组件展示</button>
        <button class="ocp-btn" @click="handleRecord('glow')">记录光痕展示</button>
        <button class="ocp-btn" @click="handleClearStats">清除统计</button>
      </div>

      <p class="ocp-subtitle">按类型分布</p>
      <div v-if="byTypeList.length" class="ocp-list">
        <div v-for="t in byTypeList" :key="t.type" class="ocp-type-row">
          <span class="ocp-type-name">{{ touchpointLabel(t.type) }}</span>
          <div class="ocp-type-bar">
            <div
              class="ocp-type-fill"
              :style="{ width: pctOf(t) + '%' }"
            />
          </div>
          <span class="ocp-type-num">{{ t.impressions }} 次 · {{ (t.rate * 100).toFixed(0) }}%</span>
        </div>
      </div>
      <p v-else class="ocp-empty">暂无统计。记录一次展示试试。</p>

      <p class="ocp-subtitle">性能监控</p>
      <div class="ocp-perf">
        <div class="ocp-perf-meta">
          <span>等级 {{ perfLabel(performanceMetrics.grade) }}</span>
          <span>活跃触角 {{ performanceMetrics.activeTouchpoints }}</span>
          <span>帧率 {{ performanceMetrics.fps }}</span>
          <span>{{ performanceMetrics.isSmooth ? '流畅' : '卡顿' }}</span>
        </div>
        <div v-if="performanceMetrics.suggestions.length" class="ocp-perf-suggestions">
          <p v-for="(s, i) in performanceMetrics.suggestions" :key="i" class="ocp-perf-suggestion">{{ s }}</p>
        </div>
        <div class="ocp-actions">
          <button class="ocp-btn--small" @click="handleMonitor">监控性能</button>
          <button class="ocp-btn--small" @click="handleDegrade">性能降级</button>
          <button class="ocp-btn--small" @click="handleRestore">性能恢复</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrchestrationEngine } from '../modules/touchpoints/orchestration-engine'
import type { SceneContext, TouchpointStats } from '../modules/touchpoints/orchestration-engine'

const {
  currentScene,
  scenePresets,
  linkageRules,
  adaptiveLayouts,
  statsSummary,
  performanceMetrics,
  updateScene,
  detectScene,
  triggerLinkage,
  toggleLinkageRule,
  resetLinkageRules,
  updateScreenSize,
  recordImpression,
  getStatsSummary,
  clearStats,
  monitorPerformance,
  degradePerformance,
  restorePerformance,
} = useOrchestrationEngine()

const tab = ref<'scene' | 'linkage' | 'layout' | 'stats'>('scene')
const tabs = [
  { key: 'scene', label: '场景' },
  { key: 'linkage', label: '联动' },
  { key: 'layout', label: '布局' },
  { key: 'stats', label: '统计' },
] as const

const screenWidth = ref(1440)
const screenHeight = ref(900)

const SCENE_LABELS: Record<string, string> = {
  focus: '专注',
  rest: '休息',
  'morning-ritual': '晨间仪式',
  'evening-review': '晚间回顾',
  creative: '创意',
  social: '社交',
  idle: '空闲',
  custom: '自定义',
}

const TIME_LABELS: Record<string, string> = {
  morning: '清晨',
  afternoon: '午后',
  evening: '傍晚',
  night: '夜晚',
}

const SOURCE_LABELS: Record<string, string> = {
  widget: '小组件',
  glow: '光痕',
  greeting: '问候',
  notification: '通知',
}

const TRIGGER_LABELS: Record<string, string> = {
  'state-change': '状态变更',
  'time-based': '定时',
  'user-action': '用户操作',
  'scene-switch': '场景切换',
}

const PERF_LABELS: Record<string, string> = {
  excellent: '优秀',
  good: '良好',
  fair: '一般',
  poor: '较差',
}

function sceneLabel(type: string): string {
  return SCENE_LABELS[type] ?? type
}

function timeLabel(t: string): string {
  return TIME_LABELS[t] ?? t
}

function sourceLabel(s: string): string {
  return SOURCE_LABELS[s] ?? s
}

function triggerLabel(t: string): string {
  return TRIGGER_LABELS[t] ?? t
}

function touchpointLabel(t: string): string {
  return SOURCE_LABELS[t] ?? t
}

function perfLabel(g: string): string {
  return PERF_LABELS[g] ?? g
}

const byTypeList = computed(() => {
  const summary = getStatsSummary()
  return Object.entries(summary.byType).map(([type, v]) => ({
    type,
    impressions: v.impressions,
    interactions: v.interactions,
    rate: v.rate,
  }))
})

function pctOf(t: { impressions: number }): number {
  const total = statsSummary.value.totalImpressions
  if (!total) return 0
  return Math.round((t.impressions / total) * 100)
}

function isActiveLayout(l: { id: string }): boolean {
  return activeLayoutId.value === l.id
}

const activeLayoutId = computed(() => {
  const { width, height } = currentScene.value.screenSize
  const found = adaptiveLayouts.value.find(
    l =>
      width >= l.screenRange.minWidth &&
      width <= l.screenRange.maxWidth &&
      height >= l.screenRange.minHeight &&
      height <= l.screenRange.maxHeight,
  )
  return found?.id ?? null
})

function handleDetect(): void {
  const type = detectScene()
  updateScene({ type, name: SCENE_LABELS[type] ?? type })
}

function handleApplyPreset(type: SceneContext['type']): void {
  updateScene({ type, name: SCENE_LABELS[type] ?? type })
}

function handleToggleRule(id: string): void {
  toggleLinkageRule(id)
}

function handleTriggerRule(id: string): void {
  triggerLinkage(id)
}

function handleResetRules(): void {
  resetLinkageRules()
}

function handleUpdateSize(): void {
  updateScreenSize(screenWidth.value, screenHeight.value)
}

function handleRecord(type: TouchpointStats['touchpointType']): void {
  recordImpression(type)
}

function handleClearStats(): void {
  clearStats()
}

function handleMonitor(): void {
  monitorPerformance()
}

function handleDegrade(): void {
  degradePerformance()
}

function handleRestore(): void {
  restorePerformance()
}

function formatTime(ts: string): string {
  return ts.slice(5, 16).replace('T', ' ')
}
</script>

<style scoped>
.ocp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.ocp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ocp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.ocp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.ocp-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ocp-tab {
  padding: 5px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
  font-size: 12px;
  cursor: pointer;
}
.ocp-tab.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.ocp-subtitle {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  margin-top: 4px;
}
.ocp-scene-card {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(240, 192, 64, 0.05);
  border: 1px solid rgba(240, 192, 64, 0.12);
}
.ocp-scene-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ocp-scene-type {
  font-size: 16px;
  font-weight: 600;
  color: #f0c040;
}
.ocp-scene-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.ocp-scene-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.45));
  margin-top: 8px;
}
.ocp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ocp-preset,
.ocp-rule,
.ocp-layout {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.ocp-layout.on {
  border-color: rgba(240, 192, 64, 0.4);
  background: rgba(240, 192, 64, 0.05);
}
.ocp-preset-head,
.ocp-rule-head,
.ocp-layout-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ocp-preset-name,
.ocp-rule-name,
.ocp-layout-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e6e1);
}
.ocp-preset-type,
.ocp-rule-source,
.ocp-rule-trigger {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(107, 159, 196, 0.14);
  color: #6b9fc4;
  flex-shrink: 0;
}
.ocp-rule-trigger {
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
}
.ocp-current {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(240, 192, 64, 0.14);
  color: #f0c040;
  flex-shrink: 0;
}
.ocp-preset-desc {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.55));
  line-height: 1.5;
  margin: 8px 0;
}
.ocp-preset-meta,
.ocp-rule-meta,
.ocp-layout-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.45));
}
.ocp-preset-actions,
.ocp-rule-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.ocp-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.ocp-size-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.ocp-input {
  padding: 6px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e6e1);
  font-size: 12px;
  width: 110px;
}
.ocp-btn {
  padding: 6px 14px;
  border: 1px solid #f0c040;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.08);
  color: #f0c040;
  font-size: 12px;
  cursor: pointer;
}
.ocp-btn--small {
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

  min-height: 26px;
}
.ocp-btn--small:hover {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
}
.ocp-toggle {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.ocp-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.ocp-toggle-track {
  width: 34px;
  height: 18px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  position: relative;
  transition: background 0.2s;
}
.ocp-toggle input:checked + .ocp-toggle-track {
  background: rgba(138, 154, 122, 0.6);
}
.ocp-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #e8e6e1;
  transition: transform 0.2s;
}
.ocp-toggle input:checked + .ocp-toggle-track .ocp-toggle-thumb {
  transform: translateX(16px);
}
.ocp-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.ocp-stat {
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
.ocp-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #f0c040;
}
.ocp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.55));
}
.ocp-type-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.ocp-type-name {
  width: 64px;
  font-size: 12px;
  color: var(--text-primary, #e8e6e1);
}
.ocp-type-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.ocp-type-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0c040, #8a9a7a);
}
.ocp-type-num {
  width: 110px;
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.45));
}
.ocp-perf {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.ocp-perf-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.45));
}
.ocp-perf-suggestions {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ocp-perf-suggestion {
  font-size: 12px;
  color: #c46a5a;
}
.ocp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.45));
  padding: 16px 0;
  text-align: center;
}
</style>
