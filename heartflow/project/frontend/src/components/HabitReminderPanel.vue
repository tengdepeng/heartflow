<template>
  <section class="hr-panel" aria-label="记账习惯">
    <header class="hr-head">
      <span class="hr-title">🔔 记账习惯</span>
      <span class="hr-sub">每日提醒 · 连续打卡 · 本月活跃</span>
    </header>

    <div class="hr-grid">
      <!-- 今日状态 -->
      <div class="hr-card hr-today" :class="{ miss: !todayRecorded }">
        <span class="hr-k">今日{{ todayRecorded ? '已记账' : '未记账' }}</span>
        <span class="hr-emoji">{{ todayRecorded ? '✅' : '✍️' }}</span>
        <span v-if="!todayRecorded" class="hr-tip">今天还没有收支记录，记得记一笔</span>
      </div>

      <!-- 连续打卡 -->
      <div class="hr-card">
        <span class="hr-k">连续记账</span>
        <span class="hr-big">{{ streak }} 天</span>
        <span class="hr-tip">坚持每天记账，习惯成自然</span>
      </div>

      <!-- 本月活跃 -->
      <div class="hr-card">
        <span class="hr-k">本月（{{ monthLabel }}）</span>
        <span class="hr-big">{{ monthStat.count }} 笔 · {{ monthStat.activeDays }} 天</span>
        <span class="hr-tip">本月还有 {{ monthDaysLeft }} 天</span>
      </div>
    </div>

    <!-- 每日提醒设置 -->
    <div class="hr-remind">
      <label class="hr-switch">
        <input type="checkbox" :checked="remindEnabled" @change="toggleRemind" />
        <span>每日记账提醒</span>
      </label>
      <input
        v-if="remindEnabled"
        type="time"
        :value="remindTime"
        class="hr-time"
        @change="setTime"
      />
      <button v-if="remindEnabled" v-show="todayRecorded === false" class="hr-now" @click="scrollToForm">▶ 现在记一笔</button>
    </div>

    <!-- 本周小日历 -->
    <div class="hr-week" v-if="weekDots.length">
      <div v-for="d in weekDots" :key="d.date" class="hr-day" :class="{ has: d.has, today: d.today }">
        <span class="hr-day-date">{{ d.label }}</span>
        <span class="hr-day-dot"></span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getLocalDateKey } from '../utils/time'
import { computed } from 'vue'
import {
  useDailyReminder,
  hasRecordToday,
  recordStreak,
  monthActivity,
  DEFAULT_REMINDER_TIME,
} from '../modules/reward/daily-reminder'
import type { RewardRecord } from '../modules/reward/reward-list'

const props = defineProps<{ records: RewardRecord[] }>()
const emit = defineEmits<{ focusForm: [] }>()

const remind = useDailyReminder()
const DEFAULT_TIME = DEFAULT_REMINDER_TIME

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const month = today.slice(0, 7)
const monthLabel = today.slice(5, 7) + ' 月'

const todayRecorded = computed(() => hasRecordToday(props.records, today))
const streak = computed(() => recordStreak(props.records, today))
const monthStat = computed(() => monthActivity(props.records, month))
const monthDaysLeft = computed(() => {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Math.max(0, d - now.getDate())
})

const remindEnabled = computed(() => remind.config.value.enabled)
const remindTime = computed(() => remind.config.value.time || DEFAULT_TIME)

// 近 7 天习惯点
const weekDots = computed(() => {
  const days = new Set(props.records.map(r => getLocalDateKey(new Date(r.at))))
  const todayIdx = now.getDay() // 0=Sunday
  const start = new Date(now)
  start.setDate(start.getDate() - todayIdx) // 周一
  const out: { date: string; label: string; has: boolean; today: boolean }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (d > now) continue
    out.push({
      date: key,
      label: ['一', '二', '三', '四', '五', '六', '日'][i],
      has: days.has(key),
      today: key === today,
    })
  }
  return out
})

function toggleRemind(e: Event): void {
  const enabled = (e.target as HTMLInputElement).checked
  remind.update({ enabled, time: remind.config.value.time || DEFAULT_TIME })
}
function setTime(e: Event): void {
  remind.update({ time: (e.target as HTMLInputElement).value || DEFAULT_TIME })
}
function scrollToForm(): void {
  emit('focusForm')
}
</script>

<style scoped>
.hr-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.hr-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.hr-title { font-weight: 600; }
.hr-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.hr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.hr-card { background: #161a15; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 3px; }
.hr-today.miss { border: 1px solid rgba(196, 106, 90, 0.4); }
.hr-k { font-size: 11px; color: #8a9a7a; }
.hr-emoji { font-size: 20px; }
.hr-big { font-size: 17px; font-weight: 600; color: #e8c060; }
.hr-tip { font-size: 10px; color: #6b7563; }

.hr-remind { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
.hr-switch { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; }
.hr-switch input { accent-color: #8a9a7a; }
.hr-time {
  background: #101310; border: 1px solid #374136; border-radius: 8px; color: #d9decf;
  padding: 5px 8px; font-size: 12px; color-scheme: dark;
}
.hr-now { background: #e8c060; color: #171a15; border: none; border-radius: 8px; padding: 5px 12px; font-weight: 600; cursor: pointer; font-size: 12px; }

.hr-week { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.hr-day { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.hr-day-date { font-size: 11px; color: #8a9a7a; }
.hr-day-dot { width: 10px; height: 10px; border-radius: 50%; background: #2b3129; }
.hr-day.has .hr-day-dot { background: #8a9a7a; }
.hr-day.today .hr-day-dot { outline: 2px solid #e8c060; }

@media (max-width: 640px) {
  .hr-grid { grid-template-columns: 1fr; }
}
</style>