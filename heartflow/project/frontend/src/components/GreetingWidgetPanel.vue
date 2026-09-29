<template>
  <section class="gwp" aria-label="问候浮窗与桌面小组件">
    <div class="gwp-head">
      <span class="gwp-title">👋 问候浮窗与桌面小组件</span>
      <span class="gwp-sub">幕僚问候 · 浮窗配置 · 桌面小组件</span>
    </div>

    <!-- 幕僚问候浮窗 -->
    <div class="gwp-block">
      <div class="gwp-block-title">👋 幕僚问候浮窗</div>
      <div class="gwp-row">
        <span class="gwp-label">启用浮窗</span>
        <label class="gwp-toggle">
          <input type="checkbox" :checked="config.enabled" @change="toggleEnabled" />
          <span class="gwp-toggle-track"><span class="gwp-toggle-thumb" /></span>
        </label>
        <span class="gwp-period">当前时段 · {{ periodLabel }}</span>
      </div>
      <div class="gwp-row">
        <span class="gwp-label">位置</span>
        <div class="gwp-chips">
          <button
            v-for="p in POSITION_OPTIONS"
            :key="p.value"
            class="gwp-chip"
            :class="{ active: config.position === p.value }"
            @click="setPosition(p.value)"
          >{{ p.label }}</button>
        </div>
      </div>
      <div class="gwp-row">
        <span class="gwp-label">动画</span>
        <div class="gwp-chips">
          <button
            v-for="a in ANIMATION_OPTIONS"
            :key="a.value"
            class="gwp-chip"
            :class="{ active: config.animation === a.value }"
            @click="setAnimation(a.value)"
          >{{ a.label }}</button>
        </div>
      </div>
      <div class="gwp-row">
        <span class="gwp-label">显示时长</span>
        <div class="gwp-chips">
          <button
            v-for="d in DURATION_OPTIONS"
            :key="d.value"
            class="gwp-chip"
            :class="{ active: config.displayDuration === d.value }"
            @click="setDuration(d.value)"
          >{{ d.label }}</button>
        </div>
      </div>
      <div class="gwp-row">
        <span class="gwp-label">问候模式</span>
        <div class="gwp-chips">
          <button
            v-for="m in MODE_OPTIONS"
            :key="m.value"
            class="gwp-chip"
            :class="{ active: config.greetingMode === m.value }"
            @click="setMode(m.value)"
          >{{ m.label }}</button>
        </div>
      </div>
      <div v-if="previewGreeting.message" class="gwp-preview">
        <div class="gwp-preview-msg">{{ previewGreeting.message }}</div>
        <div class="gwp-preview-sub">{{ previewGreeting.subtitle }}</div>
      </div>
      <div class="gwp-row">
        <button class="gwp-btn gwp-btn--primary" @click="preview">预览问候</button>
        <button class="gwp-btn" @click="show">显示浮窗</button>
        <button class="gwp-btn" @click="hide">隐藏浮窗</button>
        <button class="gwp-btn gwp-btn--danger" @click="resetAll">重置</button>
      </div>
    </div>

    <!-- 桌面小组件 -->
    <div class="gwp-block">
      <div class="gwp-block-title">🧩 桌面小组件</div>
      <div class="gwp-stats">
        <div class="gwp-stat">
          <span class="gwp-stat-value">{{ widgets.length }}</span>
          <span class="gwp-stat-label">总数</span>
        </div>
        <div class="gwp-stat">
          <span class="gwp-stat-value">{{ enabledWidgets.length }}</span>
          <span class="gwp-stat-label">已启用</span>
        </div>
      </div>
      <div class="gwp-row">
        <span class="gwp-label">添加</span>
        <div class="gwp-chips">
          <button
            v-for="w in WIDGET_OPTIONS"
            :key="w.type"
            class="gwp-chip"
            :class="{ active: selectedWidgetType === w.type }"
            @click="selectedWidgetType = w.type"
          >{{ w.icon }} {{ w.label }}</button>
        </div>
        <button class="gwp-btn gwp-btn--primary" @click="add">添加</button>
      </div>
      <div v-if="widgets.length" class="gwp-widget-list">
        <div v-for="w in widgets" :key="w.id" class="gwp-widget">
          <span class="gwp-widget-icon">{{ widgetMeta(w.type).icon }}</span>
          <div class="gwp-widget-info">
            <span class="gwp-widget-title">{{ widgetMeta(w.type).label }}</span>
            <span class="gwp-widget-meta">位置 {{ w.x }}%,{{ w.y }}% · {{ sizeLabel(w.size) }}</span>
          </div>
          <div class="gwp-widget-controls">
            <select :value="w.size" @change="changeSize(w, $event)">
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
            <label class="gwp-toggle gwp-toggle-sm">
              <input type="checkbox" :checked="w.enabled" @change="toggleWidgetState(w)" />
              <span class="gwp-toggle-track"><span class="gwp-toggle-thumb" /></span>
            </label>
            <button class="gwp-btn gwp-btn--danger" @click="remove(w)">删除</button>
          </div>
        </div>
      </div>
      <div v-else class="gwp-empty">暂无小组件，点击上方类型添加。</div>
      <button class="gwp-btn" @click="resetWidgets">重置默认布局</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGreetingEngine } from '../modules/touchpoints/greeting-engine'
import { useWidgetManager } from '../modules/touchpoints/widget-manager'
import { WIDGET_META } from '../modules/touchpoints/types'
import type {
  FloatingPosition,
  FloatingAnimation,
  GreetingPeriod,
  WidgetType,
  WidgetSize,
  WidgetInstance,
} from '../modules/touchpoints/types'

const {
  config,
  currentPeriod,
  getGreeting,
  updateConfig,
  setPosition,
  setAnimation,
  setDisplayDuration,
  setGreetingMode,
  show,
  hide,
  reset,
} = useGreetingEngine()

const {
  widgets,
  enabledWidgets,
  addWidget,
  removeWidget,
  updateSize,
  toggleWidget,
  resetToDefault,
} = useWidgetManager()

// ---- 浮窗配置选项 ----
const POSITION_OPTIONS: { value: FloatingPosition; label: string }[] = [
  { value: 'top-right', label: '右上' },
  { value: 'top-left', label: '左上' },
  { value: 'bottom-right', label: '右下' },
  { value: 'bottom-left', label: '左下' },
  { value: 'center', label: '居中' },
]
const ANIMATION_OPTIONS: { value: FloatingAnimation; label: string }[] = [
  { value: 'fade', label: '淡入' },
  { value: 'slide-up', label: '上滑' },
  { value: 'slide-left', label: '左滑' },
  { value: 'scale', label: '缩放' },
  { value: 'bounce', label: '弹跳' },
]
const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 3000, label: '3秒' },
  { value: 8000, label: '8秒' },
  { value: 15000, label: '15秒' },
  { value: 0, label: '常驻' },
]
const MODE_OPTIONS: { value: GreetingPeriod; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'morning', label: '早' },
  { value: 'afternoon', label: '午' },
  { value: 'evening', label: '晚' },
  { value: 'night', label: '夜' },
]
const PERIOD_LABELS: Record<string, string> = {
  morning: '早',
  afternoon: '午',
  evening: '晚',
  night: '夜',
  auto: '自动',
}
const SIZE_LABELS: Record<WidgetSize, string> = {
  small: '小',
  medium: '中',
  large: '大',
}

const periodLabel = computed(() => PERIOD_LABELS[currentPeriod.value] ?? currentPeriod.value)
const previewGreeting = ref({ message: '', subtitle: '' })

function toggleEnabled() {
  updateConfig({ enabled: !config.value.enabled })
}
function setDuration(ms: number) {
  setDisplayDuration(ms)
}
function setMode(mode: GreetingPeriod) {
  setGreetingMode(mode)
}
function preview() {
  previewGreeting.value = getGreeting()
}
function resetAll() {
  reset()
}

// ---- 小组件 ----
const WIDGET_OPTIONS = (Object.keys(WIDGET_META) as WidgetType[]).map((t) => WIDGET_META[t])
const selectedWidgetType = ref<WidgetType>('pomodoro')
function add() {
  addWidget(selectedWidgetType.value)
}
function widgetMeta(type: WidgetType) {
  return WIDGET_META[type]
}
function sizeLabel(size: WidgetSize) {
  return SIZE_LABELS[size]
}
function changeSize(w: WidgetInstance, e: Event) {
  updateSize(w.id, (e.target as HTMLSelectElement).value as WidgetSize)
}
function toggleWidgetState(w: WidgetInstance) {
  toggleWidget(w.id)
}
function remove(w: WidgetInstance) {
  removeWidget(w.id)
}
function resetWidgets() {
  resetToDefault()
}
</script>

<style scoped>
.gwp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--bg-panel, #1a1612);
}
.gwp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.gwp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.gwp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.gwp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.06);
  border: 1px solid rgba(138, 154, 122, 0.16);
}
.gwp-block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.gwp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.gwp-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  min-width: 56px;
}
.gwp-period {
  font-size: 11px;
  color: #8a9a7a;
  margin-left: auto;
}
.gwp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.gwp-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.gwp-chip:hover {
  border-color: #f0c040;
  color: #f0c040;
}
.gwp-chip.active {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.12);
}
.gwp-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}
.gwp-preview-msg {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.gwp-preview-sub {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.gwp-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.gwp-btn:hover {
  border-color: #f0c040;
  color: #f0c040;
}
.gwp-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
}
.gwp-btn--danger {
  border-color: rgba(196, 106, 90, 0.4);
  color: #c46a5a;
}
.gwp-btn--danger:hover {
  border-color: #c46a5a;
  color: #c46a5a;
}
.gwp-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.gwp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.gwp-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #f0c040;
}
.gwp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.gwp-widget-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gwp-widget {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.gwp-widget-icon {
  font-size: 16px;
}
.gwp-widget-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.gwp-widget-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.gwp-widget-meta {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.gwp-widget-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.gwp-widget-controls select {
  padding: 3px 6px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e0d8);
  font-size: 11px;
  outline: none;
}
.gwp-toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}
.gwp-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.gwp-toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  transition: background 0.25s ease;
}
.gwp-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: transform 0.25s ease, background 0.25s ease;
}
.gwp-toggle input:checked + .gwp-toggle-track {
  background: #8a9a7a;
}
.gwp-toggle input:checked + .gwp-toggle-track .gwp-toggle-thumb {
  transform: translateX(16px);
  background: #fff;
}
.gwp-toggle-sm {
  width: 32px;
  height: 18px;
}
.gwp-toggle-sm .gwp-toggle-thumb {
  width: 14px;
  height: 14px;
}
.gwp-toggle-sm input:checked + .gwp-toggle-track .gwp-toggle-thumb {
  transform: translateX(14px);
}
.gwp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
</style>
