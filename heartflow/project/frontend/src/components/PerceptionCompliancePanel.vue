<template>
  <section class="pcm-panel" aria-label="感知采集合规">
    <header class="pcm-head">
      <span class="pcm-title">👁 感知采集合规</span>
      <span class="pcm-badge" :class="badgeCls">{{ badge.text }}</span>
    </header>

    <!-- 宪法约束 -->
    <div class="pcm-block">
      <h3 class="pcm-block-title">宪法约束</h3>
      <ul class="pcm-rules">
        <li v-for="(rule, i) in RULES" :key="i" class="pcm-rule">
          <span class="pcm-rule-mark">✦</span>
          <span class="pcm-rule-text">{{ rule }}</span>
        </li>
      </ul>
    </div>

    <!-- 可配置采集项 -->
    <div class="pcm-block">
      <div class="pcm-block-head">
        <h3 class="pcm-block-title">可配置采集项</h3>
        <span class="pcm-stat">已授权 {{ grantedCount }}/{{ PERCEPTION_ITEMS.length }}</span>
      </div>
      <div class="pcm-items">
        <div
          v-for="item in PERCEPTION_ITEMS"
          :key="item.key"
          class="pcm-item"
          :class="{ 'is-on': state[item.key] }"
        >
          <span class="pcm-item-icon">{{ item.icon }}</span>
          <div class="pcm-item-info">
            <span class="pcm-item-name">{{ item.label }}</span>
            <span class="pcm-item-desc">{{ item.desc }}</span>
          </div>
          <button
            class="pcm-switch"
            :class="{ 'is-on': state[item.key] }"
            type="button"
            :aria-label="`${item.label}开关`"
            @click="toggle(item.key)"
          >
            <span class="pcm-switch-knob"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- 恒开项（系统基础依赖） -->
    <div class="pcm-block">
      <h3 class="pcm-block-title">恒开采集项</h3>
      <p class="pcm-hint">以下为系统基础功能依赖，不可关闭。</p>
      <div class="pcm-alwayson">
        <span v-for="item in ALWAYS_ON_ITEMS" :key="item" class="pcm-alwayson-chip">
          {{ alwaysOnLabel(item) }}
        </span>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="pcm-actions">
      <button class="pcm-btn" type="button" @click="doReset">恢复默认（全部关闭）</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  USER_CONFIGURABLE_ITEMS,
  ALWAYS_ON_ITEMS,
  isPerceptionAllowed,
  setPerceptionAllowed,
  getAllPerceptionPermissions,
  resetPerceptionPermissions,
} from '../modules/perception/compliance'
import type { ConfigurablePerceptionItem } from '../modules/perception/compliance'

const RULES = [
  '第1条·本地私有：所有采集数据仅存本地，不经过任何外部服务。',
  '第2条·超级自定义：你可关闭任意采集项。',
  '第52条·沉默的默认：新增采集项默认关闭，需主动开启。',
]

interface PerceptionItemMeta {
  key: ConfigurablePerceptionItem
  label: string
  icon: string
  desc: string
}

const PERCEPTION_ITEMS: PerceptionItemMeta[] = [
  { key: 'battery', label: '电池电量', icon: '🔋', desc: '识别低电量场景，调整后台行为' },
  { key: 'ambientLight', label: '环境光线', icon: '💡', desc: '感知明暗，适配暗色氛围' },
  { key: 'screenAwake', label: '屏幕唤醒', icon: '🖥️', desc: '记录设备活跃与专注状态' },
  { key: 'activeWindow', label: '当前窗口', icon: '🪟', desc: '识别当前聚焦的应用，估算专注' },
  { key: 'healthData', label: '健康数据', icon: '❤️', desc: '仅存脱敏趋势摘要，不存原始数值' },
  { key: 'attention', label: '本地注意力', icon: '🧭', desc: '本地估算应用内注意力与数字健康' },
]

const ALWAYS_ON_LABELS: Record<string, string> = {
  timeOfDay: '时段',
  isDark: '暗色',
  isOnline: '在线状态',
  deviceIdle: '设备空闲',
}

const state = reactive<Record<ConfigurablePerceptionItem, boolean>>(
  getAllPerceptionPermissions(),
)

function refresh(): void {
  for (const item of USER_CONFIGURABLE_ITEMS) {
    state[item] = isPerceptionAllowed(item)
  }
}

function toggle(item: ConfigurablePerceptionItem): void {
  const next = !state[item]
  setPerceptionAllowed(item, next)
  state[item] = next
}

function doReset(): void {
  resetPerceptionPermissions()
  refresh()
}

const grantedCount = computed(() =>
  PERCEPTION_ITEMS.filter((i) => state[i.key]).length,
)

const badge = computed(() => {
  const count = grantedCount.value
  if (count === 0) return { text: '未授权·最私密', cls: 'pcm-badge--off' }
  if (count <= 2) return { text: '精简授权', cls: 'pcm-badge--mild' }
  return { text: '宽泛授权', cls: 'pcm-badge--wide' }
})

const badgeCls = computed(() => badge.value.cls)

function alwaysOnLabel(item: string): string {
  return ALWAYS_ON_LABELS[item] || item
}
</script>

<style scoped>
.pcm-panel {
  background: var(--bg-card, rgba(22, 19, 16, 0.72));
  border: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
  border-radius: var(--radius-lg, 16px);
  padding: 18px 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow, 0 4px 24px rgba(0, 0, 0, 0.4));
}

.pcm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.pcm-title {
  font-family: var(--font-serif, Georgia, 'Songti SC', serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}

.pcm-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.pcm-badge--off {
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.35);
  background: rgba(138, 154, 122, 0.12);
}

.pcm-badge--mild {
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.35);
  background: rgba(240, 192, 64, 0.12);
}

.pcm-badge--wide {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.35);
  background: rgba(196, 106, 90, 0.12);
}

.pcm-block {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
}

.pcm-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-bottom: 10px;
}

.pcm-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.pcm-block-head .pcm-block-title {
  margin-bottom: 0;
}

.pcm-stat {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.pcm-hint {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 10px;
}

/* 宪法约束 */
.pcm-rules {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pcm-rule {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.pcm-rule-mark {
  color: #f0c040;
  flex-shrink: 0;
}

/* 可配置采集项 */
.pcm-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pcm-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(154, 143, 128, 0.06);
}

.pcm-item.is-on {
  background: rgba(138, 154, 122, 0.1);
}

.pcm-item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.pcm-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pcm-item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}

.pcm-item-desc {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

/* 开关 */
.pcm-switch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid rgba(154, 143, 128, 0.3);
  background: rgba(154, 143, 128, 0.12);
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  padding: 0;

  min-height: 24px;
  min-width: 24px;
}

.pcm-switch.is-on {
  background: rgba(138, 154, 122, 0.45);
  border-color: rgba(138, 154, 122, 0.5);
}

.pcm-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #9a8f80;
  transition: transform 0.2s, background 0.2s;
}

.pcm-switch.is-on .pcm-switch-knob {
  transform: translateX(16px);
  background: #8a9a7a;
}

/* 恒开项 */
.pcm-alwayson {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pcm-alwayson-chip {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(154, 143, 128, 0.25);
  background: rgba(154, 143, 128, 0.08);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

/* 操作区 */
.pcm-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.pcm-btn {
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(240, 192, 64, 0.4);
  background: rgba(240, 192, 64, 0.14);
  color: #f0c040;
  cursor: pointer;
  transition: opacity 0.2s;
}

.pcm-btn:hover {
  opacity: 0.85;
}
</style>