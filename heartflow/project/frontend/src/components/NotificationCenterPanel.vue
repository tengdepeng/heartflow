<template>
  <section class="ncp" aria-label="通知中心">
    <div class="ncp-head">
      <span class="ncp-title">🔔 通知中心</span>
      <span class="ncp-sub">收件箱 · 规则 · 偏好 · 统计</span>
    </div>

    <div class="ncp-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="ncp-tab"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 收件箱 -->
    <template v-if="tab === 'inbox'">
      <div v-if="unreadNotifications.length" class="ncp-list">
        <div v-for="n in unreadNotifications" :key="n.id" class="ncp-item">
          <div class="ncp-item-head">
            <span class="ncp-item-icon">{{ n.icon }}</span>
            <div class="ncp-item-info">
              <span class="ncp-item-title">{{ n.title }}</span>
              <span class="ncp-item-meta">{{ typeLabel(n.type) }} · {{ formatTime(n.createdAt) }}</span>
            </div>
            <span class="ncp-item-priority" :class="`prio-${n.priority}`">{{ priorityLabel(n.priority) }}</span>
          </div>
          <p class="ncp-item-msg">{{ n.message }}</p>
          <div class="ncp-item-actions">
            <button class="ncp-btn--small" @click="handleRead(n.id)">标为已读</button>
            <button class="ncp-btn--small" @click="handleDismiss(n.id)">关闭</button>
          </div>
        </div>
      </div>
      <p v-else class="ncp-empty">收件箱空空如也。</p>
      <div v-if="unreadCount > 0" class="ncp-actions">
        <button class="ncp-btn" @click="handleMarkAllRead">全部标为已读</button>
      </div>
    </template>

    <!-- 规则 -->
    <template v-else-if="tab === 'rules'">
      <div v-if="rules.length" class="ncp-list">
        <div v-for="r in rules" :key="r.id" class="ncp-rule">
          <div class="ncp-rule-head">
            <span class="ncp-rule-icon">{{ r.template.icon }}</span>
            <div class="ncp-rule-info">
              <span class="ncp-rule-name">{{ r.name }}</span>
              <span class="ncp-rule-meta">{{ typeLabel(r.type) }} · {{ r.condition }}</span>
            </div>
            <button class="ncp-toggle" :class="{ on: r.enabled }" @click="handleToggleRule(r.id)">
              {{ r.enabled ? '启用' : '停用' }}
            </button>
          </div>
        </div>
      </div>
      <p v-else class="ncp-empty">暂无通知规则。</p>
    </template>

    <!-- 偏好 -->
    <template v-else-if="tab === 'prefs'">
      <div class="ncp-prefs">
        <label class="ncp-pref-row">
          <span>启用通知</span>
          <input type="checkbox" :checked="preferences.enabled" @change="handleToggleEnabled" />
        </label>
        <label class="ncp-pref-row">
          <span>免打扰开始</span>
          <input type="time" :value="preferences.quietStart" @change="handleQuietStart" />
        </label>
        <label class="ncp-pref-row">
          <span>免打扰结束</span>
          <input type="time" :value="preferences.quietEnd" @change="handleQuietEnd" />
        </label>
        <label class="ncp-pref-row">
          <span>最大通知数</span>
          <input type="number" :value="preferences.maxNotifications" min="10" max="500" @change="handleMaxNotifications" />
        </label>
        <p v-if="inQuiet" class="ncp-quiet-note">当前处于免打扰时段</p>
      </div>
    </template>

    <!-- 统计 -->
    <template v-else>
      <div v-if="stats" class="ncp-stats">
        <div class="ncp-stat">
          <span class="ncp-stat-value">{{ stats.totalSent }}</span>
          <span class="ncp-stat-label">已发送</span>
        </div>
        <div class="ncp-stat">
          <span class="ncp-stat-value">{{ stats.totalRead }}</span>
          <span class="ncp-stat-label">已读</span>
        </div>
        <div class="ncp-stat">
          <span class="ncp-stat-value">{{ stats.readRate }}%</span>
          <span class="ncp-stat-label">已读率</span>
        </div>
      </div>
      <div v-if="typeRows.length" class="ncp-block">
        <span class="ncp-block-label">按类型分布</span>
        <div v-for="row in typeRows" :key="row.key" class="ncp-row">
          <span class="ncp-row-label">{{ row.label }}</span>
          <div class="ncp-row-bar">
            <div class="ncp-row-fill" :style="{ width: rowPct(row.count), background: row.color }"></div>
          </div>
          <span class="ncp-row-count">{{ row.count }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useNotificationEngine,
  NOTIFICATION_TYPE_META,
  NOTIFICATION_PRIORITY_META,
} from '../modules/touchpoints/notification-engine'
import type { NotificationType } from '../modules/touchpoints/notification-engine'

const {
  rules,
  preferences,
  unreadNotifications,
  unreadCount,
  stats,
  markAsRead,
  markAllAsRead,
  dismiss,
  toggleRule,
  updatePreferences,
  isInQuietHours,
} = useNotificationEngine()

const tab = ref<'inbox' | 'rules' | 'prefs' | 'stats'>('inbox')
const tabs = [
  { key: 'inbox', label: '收件箱' },
  { key: 'rules', label: '规则' },
  { key: 'prefs', label: '偏好' },
  { key: 'stats', label: '统计' },
] as const

const inQuiet = computed(() => isInQuietHours())

function typeLabel(type: string): string {
  return NOTIFICATION_TYPE_META[type as NotificationType]?.label ?? type
}

function priorityLabel(priority: string): string {
  return NOTIFICATION_PRIORITY_META[priority as keyof typeof NOTIFICATION_PRIORITY_META]?.label ?? priority
}

const typeRows = computed(() => {
  const s = stats.value
  if (!s) return []
  return (Object.keys(NOTIFICATION_TYPE_META) as NotificationType[])
    .map(key => ({
      key,
      label: NOTIFICATION_TYPE_META[key].label,
      color: NOTIFICATION_TYPE_META[key].color,
      count: s.byType[key] ?? 0,
    }))
    .filter(r => r.count > 0)
})

function rowPct(count: number): string {
  const total = stats.value?.totalSent ?? 0
  if (total === 0) return '0%'
  return `${Math.round((count / total) * 100)}%`
}

function formatTime(ts: string): string {
  return ts.slice(0, 16).replace('T', ' ')
}

function handleRead(id: string): void {
  markAsRead(id)
}

function handleDismiss(id: string): void {
  dismiss(id)
}

function handleMarkAllRead(): void {
  markAllAsRead()
}

function handleToggleRule(id: string): void {
  toggleRule(id)
}

function handleToggleEnabled(e: Event): void {
  updatePreferences({ enabled: (e.target as HTMLInputElement).checked })
}

function handleQuietStart(e: Event): void {
  updatePreferences({ quietStart: (e.target as HTMLInputElement).value })
}

function handleQuietEnd(e: Event): void {
  updatePreferences({ quietEnd: (e.target as HTMLInputElement).value })
}

function handleMaxNotifications(e: Event): void {
  const v = Number((e.target as HTMLInputElement).value)
  if (!Number.isNaN(v) && v > 0) updatePreferences({ maxNotifications: v })
}
</script>

<style scoped>
.ncp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--bg-panel, #1a1612);
}
.ncp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ncp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.ncp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ncp-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ncp-tab {
  padding: 5px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
}
.ncp-tab.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.ncp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ncp-item,
.ncp-rule {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.ncp-item-head,
.ncp-rule-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ncp-item-icon,
.ncp-rule-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.ncp-item-info,
.ncp-rule-info {
  flex: 1;
  min-width: 0;
}
.ncp-item-title,
.ncp-rule-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
}
.ncp-item-meta,
.ncp-rule-meta {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-top: 2px;
}
.ncp-item-priority {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.prio-urgent {
  background: rgba(196, 106, 90, 0.14);
  color: #c46a5a;
}
.prio-normal {
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
}
.prio-low {
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
}
.ncp-item-msg {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  line-height: 1.5;
  margin: 8px 0;
}
.ncp-item-actions {
  display: flex;
  gap: 8px;
}
.ncp-btn--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.ncp-btn--small:hover {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
}
.ncp-actions {
  display: flex;
  justify-content: flex-end;
}
.ncp-btn {
  padding: 6px 16px;
  border: 1px solid #f0c040;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.08);
  color: #f0c040;
  font-size: 12px;
  cursor: pointer;
}
.ncp-toggle {
  padding: 3px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
}
.ncp-toggle.on {
  border-color: #8a9a7a;
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.1);
}
.ncp-prefs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ncp-pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
  font-size: 13px;
  color: var(--text-primary, #e8e0d8);
  cursor: pointer;
}
.ncp-pref-row input[type='checkbox'] {
  accent-color: #f0c040;
  width: 16px;
  height: 16px;
}
.ncp-pref-row input[type='time'],
.ncp-pref-row input[type='number'] {
  padding: 4px 8px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
}
.ncp-quiet-note {
  font-size: 11px;
  color: #f0c040;
  text-align: center;
}
.ncp-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.ncp-stat {
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
.ncp-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #f0c040;
}
.ncp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ncp-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ncp-block-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ncp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.ncp-row-label {
  width: 40px;
  color: var(--text-primary, #e8e0d8);
  flex-shrink: 0;
}
.ncp-row-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.ncp-row-fill {
  height: 100%;
  border-radius: 4px;
}
.ncp-row-count {
  width: 28px;
  text-align: right;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  flex-shrink: 0;
}
.ncp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  padding: 16px 0;
  text-align: center;
}
</style>
