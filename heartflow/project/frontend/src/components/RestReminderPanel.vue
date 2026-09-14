<template>
  <section class="rrp-panel" aria-label="休息提醒">
    <!-- 面板头 -->
    <div class="rrp-head">
      <div class="rrp-head-left">
        <span class="rrp-title">⏰ 休息提醒</span>
        <span class="rrp-sub">{{ activeCount }} 条启用 · {{ reminders.length }} 条提醒</span>
      </div>
      <span class="rrp-badge" :class="{ 'rrp-badge-neutral': activeCount === 0 }">
        {{ badgeLabel }}
      </span>
    </div>

    <!-- 模拟检测 -->
    <div class="rrp-block">
      <h3 class="rrp-block-title">模拟触发</h3>
      <p class="rrp-hint">输入当前专注分钟与时间，预览此刻会触发的提醒。</p>
      <div class="rrp-sim">
        <label class="rrp-field">
          <span class="rrp-field-label">专注分钟</span>
          <input v-model.number="simFocus" type="number" min="0" class="rrp-input" />
        </label>
        <label class="rrp-field">
          <span class="rrp-field-label">当前时间</span>
          <input v-model="simTime" type="time" class="rrp-input" />
        </label>
        <button class="rrp-btn" @click="runSim">模拟检测</button>
      </div>
      <div v-if="simResult.length > 0" class="rrp-sim-result">
        <div v-for="r in simResult" :key="r.id" class="rrp-sim-item">
          <span class="rrp-sim-icon">{{ typeMeta(r.type).icon }}</span>
          <span class="rrp-sim-name">{{ r.title }}</span>
          <span class="rrp-sim-desc">{{ r.description }}</span>
        </div>
      </div>
      <p v-else-if="simRan" class="rrp-sim-none">此刻没有提醒触发，安心专注吧。</p>
    </div>

    <!-- 提醒列表 -->
    <div class="rrp-block">
      <h3 class="rrp-block-title">提醒规则</h3>
      <div class="rrp-list">
        <div
          v-for="r in reminders"
          :key="r.id"
          class="rrp-card"
          :class="{ 'rrp-card--off': !r.enabled }"
        >
          <div class="rrp-card-top">
            <span class="rrp-type-chip" :style="{ '--chip-color': typeMeta(r.type).color }">
              {{ typeMeta(r.type).icon }} {{ typeMeta(r.type).label }}
            </span>
            <span class="rrp-card-title">{{ r.title }}</span>
            <button
              class="rrp-toggle"
              :class="{ 'rrp-toggle--on': r.enabled }"
              :aria-label="`${r.enabled ? '停用' : '启用'} ${r.title}`"
              @click="toggleReminder(r.id)"
            >{{ r.enabled ? '启用' : '停用' }}</button>
          </div>
          <p class="rrp-card-desc">{{ r.description }}</p>
          <div class="rrp-card-meta">
            <span class="rrp-meta-item">🎯 {{ triggerLabel(r) }}</span>
            <span class="rrp-meta-item">{{ activityLabel(r.suggestedActivity) }} · {{ r.suggestedDuration }} 分钟</span>
            <span class="rrp-meta-item">⏳ 冷却 {{ r.cooldownMinutes }} 分钟</span>
          </div>
          <div class="rrp-card-actions">
            <button v-if="r.lastTriggeredAt" class="rrp-link" @click="resetCooldown(r.id)">
              重置冷却（{{ timeAgo(r.lastTriggeredAt) }}）
            </button>
            <span v-else class="rrp-idle">尚未触发</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRestReminders } from '../modules/rest/rest-advanced'
import type { RestReminder, ReminderType } from '../modules/rest/rest-advanced'
import type { RestActivityType } from '../modules/rest'

const { reminders, activeReminders, checkReminders, toggleReminder, resetCooldown } = useRestReminders()

const activeCount = computed(() => activeReminders.value.length)
const badgeLabel = computed(() => {
  if (reminders.value.length === 0) return '尚未启用'
  if (activeCount.value === reminders.value.length) return '全部启用'
  if (activeCount.value === 0) return '尚未启用'
  return '部分启用'
})

const TYPE_META: Record<ReminderType, { label: string; icon: string; color: string }> = {
  pomodoro: { label: '番茄钟', icon: '🍅', color: '#e8a040' },
  scheduled: { label: '定时', icon: '⏰', color: '#8a9a7a' },
  fatigue: { label: '疲劳', icon: '🥱', color: '#b5707a' },
  posture: { label: '姿势', icon: '🧍', color: '#6b9fc4' },
}

const ACTIVITY_LABELS: Record<RestActivityType, string> = {
  meditation: '冥想', nap: '小憩', walk: '散步', music: '音乐',
  reading: '闲读', tea: '品茶', stretch: '拉伸', vacation: '休假',
  breathing: '深呼吸', journal: '日记', gardening: '园艺', social: '社交',
}

function typeMeta(t: ReminderType) {
  return TYPE_META[t] ?? TYPE_META.pomodoro
}

function triggerLabel(r: RestReminder): string {
  switch (r.type) {
    case 'pomodoro':
    case 'posture':
      return `连续专注 ${r.trigger.focusMinutes ?? 0} 分钟`
    case 'scheduled':
      return `定时 ${r.trigger.scheduledTime ?? '--:--'}`
    case 'fatigue':
      return `疲劳阈值 ${r.trigger.fatigueThreshold ?? 0}`
    default:
      return '—'
  }
}

function activityLabel(a: RestActivityType): string {
  return ACTIVITY_LABELS[a] ?? a
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.round(diff / 60000))
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.round(hours / 24)} 天前`
}

// ---- 模拟检测 ----
const simFocus = ref(25)
const simTime = ref('10:00')
const simRan = ref(false)
const simResult = ref<RestReminder[]>([])

function runSim() {
  simResult.value = checkReminders(simFocus.value, simTime.value)
  simRan.value = true
}

onMounted(() => {
  // 初始化时展示一次当前状态下的模拟结果
  runSim()
})
</script>

<style scoped>
.rrp-panel {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  background: rgba(30, 42, 30, 0.4);
  border: 1px solid rgba(122, 184, 122, 0.08);
  border-radius: 12px;
}

.rrp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rrp-head-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rrp-title {
  font-size: 14px;
  color: #d8e8d8;
  letter-spacing: 1px;
}

.rrp-sub {
  font-size: 11px;
  color: rgba(216, 232, 216, 0.55);
}

.rrp-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px;
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.12);
  border: 1px solid rgba(138, 154, 122, 0.2);
  letter-spacing: 1px;
  white-space: nowrap;
}

.rrp-badge-neutral {
  color: rgba(216, 232, 216, 0.5);
  background: rgba(216, 232, 216, 0.06);
  border-color: rgba(216, 232, 216, 0.1);
}

.rrp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rrp-block-title {
  margin: 0;
  font-size: 12px;
  font-weight: 400;
  color: rgba(216, 232, 216, 0.55);
  letter-spacing: 2px;
}

.rrp-hint {
  margin: 0;
  font-size: 11px;
  color: rgba(216, 232, 216, 0.4);
  line-height: 1.5;
}

.rrp-sim {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.rrp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rrp-field-label {
  font-size: 10px;
  color: rgba(216, 232, 216, 0.5);
  letter-spacing: 0.5px;
}

.rrp-input {
  width: 110px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(122, 184, 122, 0.08);
  border-radius: 6px;
  color: #d8e8d8;
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

.rrp-input:focus {
  border-color: rgba(122, 184, 122, 0.25);
}

.rrp-btn {
  padding: 8px 18px;
  background: rgba(122, 184, 122, 0.15);
  border: 1px solid rgba(122, 184, 122, 0.25);
  border-radius: 6px;
  color: #7ab87a;
  font-size: 12px;
  font-family: inherit;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.rrp-btn:hover {
  background: rgba(122, 184, 122, 0.25);
  border-color: rgba(122, 184, 122, 0.4);
}

.rrp-sim-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rrp-sim-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(122, 184, 122, 0.06);
  border: 1px solid rgba(122, 184, 122, 0.1);
  border-radius: 6px;
}

.rrp-sim-icon {
  font-size: 16px;
}

.rrp-sim-name {
  font-size: 12px;
  color: #d8e8d8;
}

.rrp-sim-desc {
  font-size: 11px;
  color: rgba(216, 232, 216, 0.5);
}

.rrp-sim-none {
  margin: 0;
  font-size: 11px;
  color: rgba(216, 232, 216, 0.4);
}

.rrp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rrp-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(122, 184, 122, 0.08);
  border-radius: 8px;
  transition: all 0.25s ease;
}

.rrp-card--off {
  opacity: 0.55;
}

.rrp-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rrp-type-chip {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-color) 25%, transparent);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.rrp-card-title {
  flex: 1;
  font-size: 13px;
  color: #d8e8d8;
  letter-spacing: 0.5px;
}

.rrp-toggle {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-family: inherit;
  letter-spacing: 0.5px;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(216, 232, 216, 0.15);
  color: rgba(216, 232, 216, 0.5);
  transition: all 0.25s ease;
}

.rrp-toggle--on {
  background: rgba(122, 184, 122, 0.15);
  border-color: rgba(122, 184, 122, 0.3);
  color: #7ab87a;
}

.rrp-card-desc {
  margin: 0;
  font-size: 11px;
  color: rgba(216, 232, 216, 0.5);
  line-height: 1.5;
}

.rrp-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rrp-meta-item {
  padding: 2px 8px;
  font-size: 10px;
  color: rgba(216, 232, 216, 0.5);
  background: rgba(216, 232, 216, 0.04);
  border: 1px solid rgba(216, 232, 216, 0.06);
  border-radius: 4px;
}

.rrp-card-actions {
  display: flex;
  align-items: center;
}

.rrp-link {
  padding: 0;
  background: none;
  border: none;
  font-size: 10px;
  font-family: inherit;
  color: #7ab87a;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.rrp-idle {
  font-size: 10px;
  color: rgba(216, 232, 216, 0.3);
}
</style>
