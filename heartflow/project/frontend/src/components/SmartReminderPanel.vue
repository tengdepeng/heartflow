<template>
  <section class="sr-panel" aria-label="智能提醒">
    <div class="sr-panel-head">
      <span class="sr-panel-title">⏰ 智能提醒</span>
      <span class="sr-panel-sub">本地规则 · 宪法门控 · 不诱导</span>
      <button class="sr-btn sr-btn-primary" @click="runCheck">检查提醒</button>
    </div>

    <!-- 待确认提醒 -->
    <div v-if="pendingReminders.length" class="sr-block">
      <span class="sr-block-label">待确认 · {{ pendingReminders.length }}</span>
      <div v-for="r in pendingReminders" :key="r.id" class="sr-pending">
        <span class="sr-pending-msg">{{ r.message }}</span>
        <span class="sr-pending-time">{{ fmtTime(r.triggeredAt) }}</span>
        <button class="sr-btn" @click="ack(r.id)">确认</button>
      </div>
    </div>

    <!-- 提醒规则 -->
    <div class="sr-block">
      <span class="sr-block-label">提醒规则 · {{ reminder.rules.value.length }}</span>
      <div v-for="rule in reminder.rules.value" :key="rule.id" class="sr-rule">
        <div class="sr-rule-main">
          <span class="sr-rule-type" :style="{ color: RULE_TYPE_META[rule.type].color }">
            {{ RULE_TYPE_META[rule.type].icon }} {{ RULE_TYPE_META[rule.type].label }}
          </span>
          <span class="sr-rule-msg">{{ rule.messageTemplate }}</span>
          <span class="sr-rule-prio" :class="`prio-${rule.priority}`">{{ PRIORITY_LABELS[rule.priority] }}</span>
        </div>
        <button
          class="sr-toggle"
          :class="{ on: rule.enabled }"
          @click="reminder.toggleRule(rule.id)"
        >{{ rule.enabled ? '开' : '关' }}</button>
      </div>
    </div>

    <!-- 提醒记录 -->
    <div v-if="records.length" class="sr-block">
      <span class="sr-block-label">提醒记录 · {{ records.length }}</span>
      <div v-for="r in records.slice(0, 8)" :key="r.id" class="sr-record">
        <span class="sr-record-dot" :class="{ done: r.acknowledged }" />
        <span class="sr-record-msg">{{ r.message }}</span>
        <span class="sr-record-time">{{ fmtTime(r.triggeredAt) }}</span>
      </div>
    </div>
    <p v-else class="sr-hint">还没有提醒记录。点击「检查提醒」按当前锚点状态生成提醒。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSmartReminder } from '../modules/anchor/celebration'
import type { ReminderRule } from '../modules/anchor/celebration'
import type { Anchor } from '../modules/anchor/types'

const props = defineProps<{ anchors: Anchor[] }>()

const RULE_TYPE_META: Record<ReminderRule['type'], { label: string; icon: string; color: string }> = {
  time: { label: '定时', icon: '🕐', color: '#9fc4e8' },
  priority: { label: '优先级', icon: '⚑', color: '#f0c040' },
  deadline: { label: '截止', icon: '⏳', color: '#e0a96d' },
  drift: { label: '漂移', icon: '↻', color: '#c46a5a' },
  idle: { label: '空闲', icon: '◌', color: '#8a97ad' },
  streak: { label: '连续', icon: '🔥', color: '#d98c7a' },
}

const PRIORITY_LABELS: Record<ReminderRule['priority'], string> = {
  low: '低',
  medium: '中',
  high: '高',
}

const reminder = useSmartReminder()
onMounted(() => reminder.loadAll())

const pendingReminders = computed(() => reminder.getPendingReminders())
const records = computed(() => reminder.records.value)

function runCheck() {
  reminder.checkReminders(props.anchors)
}

function ack(id: string) {
  reminder.acknowledgeReminder(id)
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.sr-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.sr-panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.sr-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.sr-panel-sub {
  flex: 1;
  font-size: 12px;
  color: #8a97ad;
}
.sr-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.sr-btn-primary {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.sr-block { margin-bottom: 12px; }
.sr-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.sr-pending {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(240, 192, 64, 0.08);
  border: 1px solid rgba(240, 192, 64, 0.25);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
}
.sr-pending-msg {
  flex: 1;
  font-size: 12px;
  color: #e8d9a8;
}
.sr-pending-time {
  font-size: 11px;
  color: #8a97ad;
}
.sr-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
}
.sr-rule-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.sr-rule-type {
  font-size: 12px;
  white-space: nowrap;
}
.sr-rule-msg {
  flex: 1;
  font-size: 12px;
  color: #aab6c9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sr-rule-prio {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(140, 160, 190, 0.12);
}
.sr-rule-prio.prio-high { color: #c46a5a; }
.sr-rule-prio.prio-medium { color: #e0a96d; }
.sr-rule-prio.prio-low { color: #8a9a7a; }
.sr-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  width: 34px;
  height: 22px;
  border-radius: 11px;
  border: 1px solid rgba(140, 160, 190, 0.3);
  background: rgba(20, 26, 38, 0.6);
  color: #7a879c;
  font-size: 11px;
  cursor: pointer;

  min-height: 24px;
  min-width: 24px;
}
.sr-toggle.on {
  background: rgba(120, 150, 200, 0.3);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.sr-record {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
}
.sr-record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f0c040;
  flex-shrink: 0;
}
.sr-record-dot.done {
  background: #8a9a7a;
}
.sr-record-msg {
  flex: 1;
  font-size: 12px;
  color: #aab6c9;
}
.sr-record-time {
  font-size: 11px;
  color: #7a879c;
}
.sr-hint {
  font-size: 12px;
  color: #7a879c;
  margin: 8px 0 0;
}
</style>
