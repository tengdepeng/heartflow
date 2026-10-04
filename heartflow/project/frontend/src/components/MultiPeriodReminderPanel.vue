<template>
  <section class="mpr-panel">
    <header class="mpr-head">
      <div class="mpr-head-main">
        <h4 class="mpr-title">⏰ 多时段提醒</h4>
        <p class="mpr-sub">一天多个时段 · 时间进度一眼看清</p>
      </div>
      <div class="mpr-clock">
        <span class="mpr-clock-time">{{ clockText }}</span>
        <span v-if="next" class="mpr-clock-next">距「{{ next.label }}」{{ countdownText }}</span>
        <span v-else class="mpr-clock-next mpr-clock-none">暂无启用时段</span>
      </div>
    </header>

    <!-- 当日时间进度条（time_progress） -->
    <div class="mpr-track" aria-label="当日时间进度">
      <div class="mpr-track-fill" :style="{ width: progressPct + '%' }"></div>
      <span class="mpr-track-now" :style="{ left: progressPct + '%' }"></span>
      <span
        v-for="c in classified"
        :key="'mk-' + c.slot.id"
        class="mpr-mark"
        :class="'mpr-mark--' + c.status"
        :style="{ left: slotPercent(c.slot) + '%' }"
        :title="`${c.slot.time} ${c.slot.label}`"
      ></span>
    </div>
    <div class="mpr-scale">
      <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
    </div>

    <!-- 时段列表 -->
    <ul class="mpr-list">
      <li
        v-for="c in classified"
        :key="c.slot.id"
        class="mpr-item"
        :class="'mpr-item--' + c.status"
      >
        <span class="mpr-icon">{{ c.slot.icon }}</span>
        <div class="mpr-item-main">
          <div class="mpr-item-line">
            <span class="mpr-item-label">{{ c.slot.label }}</span>
            <span class="mpr-badge" :class="'mpr-badge--' + c.status">{{ statusLabel(c.status) }}</span>
          </div>
          <input
            class="mpr-time-input"
            type="time"
            :value="c.slot.time"
            @change="onTime(c.slot.id, $event)"
          />
        </div>
        <button
          class="mpr-toggle"
          :class="{ 'is-on': c.slot.enabled }"
          :aria-pressed="c.slot.enabled"
          @click="toggle(c.slot.id)"
        >{{ c.slot.enabled ? '已开' : '已关' }}</button>
        <button class="mpr-del" title="删除时段" @click="remove(c.slot.id)">✕</button>
      </li>
      <li v-if="classified.length === 0" class="mpr-empty">还没有时段，先在下面加一个吧。</li>
    </ul>

    <!-- 新增时段 -->
    <div class="mpr-add">
      <input
        v-model="newLabel"
        class="mpr-add-label"
        placeholder="时段名，如「午休」"
        maxlength="8"
      />
      <input v-model="newTime" class="mpr-add-time" type="time" />
      <div class="mpr-add-icons">
        <button
          v-for="ic in ICON_CHOICES"
          :key="ic"
          class="mpr-icon-btn"
          :class="{ 'is-on': newIcon === ic }"
          @click="newIcon = ic"
        >{{ ic }}</button>
      </div>
      <button class="mpr-add-btn" @click="add">＋ 添加时段</button>
      <button class="mpr-reset" title="恢复默认时段" @click="reset">↺ 默认</button>
    </div>
    <p v-if="addError" class="mpr-err">{{ addError }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  useMultiReminder,
  classifySlots,
  nextSlot,
  msUntilNextSlot,
  dayProgress,
  slotPercent,
} from '../modules/multi-reminder'
import type { SlotStatus } from '../modules/multi-reminder'

const mr = useMultiReminder()
const slots = mr.slots

const nowTs = ref(Date.now())
const now = computed(() => new Date(nowTs.value))

const pad = (n: number) => String(n).padStart(2, '0')

const clockText = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const classified = computed(() => classifySlots(slots.value, now.value))
const next = computed(() => nextSlot(slots.value, now.value))
const countdown = computed(() => msUntilNextSlot(slots.value, now.value))
const progressPct = computed(() => dayProgress(now.value) * 100)

const countdownText = computed(() => {
  const ms = countdown.value
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  return `${pad(Math.floor(totalSec / 3600))}:${pad(Math.floor((totalSec % 3600) / 60))}:${pad(totalSec % 60)}`
})

const STATUS_LABEL: Record<SlotStatus, string> = {
  off: '已关闭',
  passed: '已过',
  next: '下一个',
  upcoming: '待触发',
}
function statusLabel(s: SlotStatus): string {
  return STATUS_LABEL[s] ?? s
}

const ICON_CHOICES = ['⏰', '🌅', '🍚', '💧', '🌇', '🌙', '📚', '🏃', '🧘', '💊']

const newLabel = ref('')
const newTime = ref('09:00')
const newIcon = ref('⏰')
const addError = ref('')

function add() {
  const created = mr.addSlot({ label: newLabel.value, time: newTime.value, icon: newIcon.value })
  if (!created) {
    addError.value = '请填写时段名并选择合法时刻。'
    return
  }
  addError.value = ''
  newLabel.value = ''
}
function onTime(id: string, e: Event) {
  mr.updateSlot(id, { time: (e.target as HTMLInputElement).value })
}
function toggle(id: string) {
  mr.toggleSlot(id)
}
function remove(id: string) {
  mr.removeSlot(id)
}
function reset() {
  mr.resetSlots()
  addError.value = ''
}

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  nowTs.value = Date.now()
  timer = setInterval(() => {
    nowTs.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.mpr-panel {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb, 255, 255, 255), 0.5);
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.14);
}
.mpr-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.mpr-title {
  margin: 0;
  font-size: 14px;
  color: var(--accent, #d4a574);
}
.mpr-sub {
  margin: 3px 0 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb, 232, 224, 216), 0.45);
}
.mpr-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}
.mpr-clock-time {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary, #e8e0d8);
}
.mpr-clock-next {
  font-size: 11px;
  color: var(--accent, #d4a574);
}
.mpr-clock-none {
  color: rgba(var(--text-primary-rgb, 232, 224, 216), 0.4);
}

/* 时间进度条 */
.mpr-track {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.22);
  overflow: visible;
  margin: 6px 0 4px;
}
.mpr-track-fill {
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(212, 165, 116, 0.35), rgba(212, 165, 116, 0.7));
  transition: width 0.6s ease;
}
.mpr-track-now {
  position: absolute;
  top: -3px;
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: var(--accent, #d4a574);
  transform: translateX(-50%);
  box-shadow: 0 0 6px rgba(212, 165, 116, 0.8);
}
.mpr-mark {
  position: absolute;
  top: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(150, 150, 160, 0.6);
  border: 1px solid rgba(20, 20, 24, 0.6);
}
.mpr-mark--passed {
  background: rgba(138, 154, 122, 0.85);
}
.mpr-mark--next {
  background: #d4a574;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.25);
}
.mpr-mark--upcoming {
  background: rgba(107, 159, 196, 0.8);
}
.mpr-mark--off {
  opacity: 0.35;
}
.mpr-scale {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: rgba(var(--text-primary-rgb, 232, 224, 216), 0.35);
  margin-bottom: 12px;
}

/* 时段列表 */
.mpr-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mpr-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.mpr-item--next {
  border-color: rgba(212, 165, 116, 0.4);
  background: rgba(212, 165, 116, 0.08);
}
.mpr-item--off {
  opacity: 0.55;
}
.mpr-icon {
  font-size: 16px;
  flex: 0 0 auto;
}
.mpr-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mpr-item-line {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mpr-item-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.mpr-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.25);
  color: rgba(var(--text-primary-rgb, 232, 224, 216), 0.6);
}
.mpr-badge--next {
  background: rgba(212, 165, 116, 0.22);
  color: var(--accent, #d4a574);
}
.mpr-badge--passed {
  background: rgba(138, 154, 122, 0.2);
  color: #a7b597;
}
.mpr-badge--upcoming {
  background: rgba(107, 159, 196, 0.2);
  color: #8fb8d4;
}
.mpr-time-input {
  width: 92px;
  padding: 2px 6px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-primary, #e8e0d8);
}
.mpr-toggle {
  flex: 0 0 auto;
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: rgba(var(--text-primary-rgb, 232, 224, 216), 0.6);
  cursor: pointer;
  transition: all 0.2s;
}
.mpr-toggle.is-on {
  border-color: rgba(212, 165, 116, 0.5);
  color: var(--accent, #d4a574);
  background: rgba(212, 165, 116, 0.12);
}
.mpr-del {
  flex: 0 0 auto;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb, 232, 224, 216), 0.35);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 6px;
  transition: all 0.2s;
}
.mpr-del:hover {
  color: #c46a5a;
  background: rgba(196, 106, 90, 0.12);
}
.mpr-empty {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb, 232, 224, 216), 0.45);
  padding: 8px 4px;
  list-style: none;
}

/* 新增 */
.mpr-add {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.mpr-add-label {
  flex: 1 1 130px;
  min-width: 110px;
  padding: 5px 8px;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-primary, #e8e0d8);
}
.mpr-add-time {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-primary, #e8e0d8);
}
.mpr-add-icons {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}
.mpr-icon-btn {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1;
  padding: 3px;
  cursor: pointer;
  opacity: 0.55;
  transition: all 0.15s;
}
.mpr-icon-btn.is-on {
  opacity: 1;
  border-color: rgba(212, 165, 116, 0.5);
  background: rgba(212, 165, 116, 0.12);
}
.mpr-add-btn {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid rgba(212, 165, 116, 0.5);
  background: rgba(212, 165, 116, 0.14);
  color: var(--accent, #d4a574);
  cursor: pointer;
  transition: all 0.2s;
}
.mpr-add-btn:hover {
  background: rgba(212, 165, 116, 0.24);
}
.mpr-reset {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: rgba(var(--text-primary-rgb, 232, 224, 216), 0.6);
  cursor: pointer;
}
.mpr-reset:hover {
  color: var(--text-primary, #e8e0d8);
}
.mpr-err {
  margin: 6px 0 0;
  font-size: 11px;
  color: #c46a5a;
}
</style>
