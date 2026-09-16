<template>
  <section class="hmr">
    <header class="hmr-head">
      <h3 class="hmr-title">⏰ 健康提醒</h3>
      <p class="hmr-sub">提醒 · 节律 · 护身</p>
    </header>

    <!-- 三格统计 -->
    <div class="hmr-stats">
      <div class="hmr-stat">
        <span class="hmr-stat-num">{{ stats.enabled }}</span>
        <span class="hmr-stat-label">生效提醒</span>
      </div>
      <div class="hmr-stat">
        <span class="hmr-stat-num">{{ stats.todayTriggered }}</span>
        <span class="hmr-stat-label">今日触发</span>
      </div>
      <div class="hmr-stat">
        <span class="hmr-stat-num">{{ stats.activeNow }}</span>
        <span class="hmr-stat-label">此刻生效</span>
      </div>
    </div>

    <!-- 重置今日计数 -->
    <div class="hmr-toolbar">
      <button class="hmr-reset" @click="reset">🔄 重置今日计数</button>
    </div>

    <!-- 空态 -->
    <div class="hmr-empty" v-if="reminders.length === 0">
      <span>⏰</span>
      <p>暂无健康提醒。初始化后，喝水/活动/拉伸/护眼等提醒会出现在这里。</p>
    </div>

    <!-- 提醒列表 -->
    <div class="hmr-list" v-else>
      <article v-for="r in reminders" :key="r.id" class="hmr-item" :class="{ off: !r.enabled }">
        <div class="hmr-item-head">
          <span class="hmr-item-icon">{{ TYPE_META[r.type]?.icon }}</span>
          <div class="hmr-item-main">
            <span class="hmr-item-title">{{ r.title }}</span>
            <span class="hmr-item-type">{{ TYPE_META[r.type]?.label }}</span>
          </div>
          <button
            class="hmr-toggle"
            :class="{ on: r.enabled }"
            @click="toggle(r.id)"
          >{{ r.enabled ? '启用' : '停用' }}</button>
        </div>
        <p class="hmr-item-msg">{{ r.message }}</p>
        <div class="hmr-item-meta">
          <span>每 {{ r.intervalMinutes }} 分钟</span>
          <span>{{ r.activeHours.start }}–{{ r.activeHours.end }}</span>
          <span>{{ formatDays(r.activeDays) }}</span>
        </div>
        <div class="hmr-item-foot">
          <span class="hmr-item-count">今日触发 <b>{{ r.todayCount }}</b> 次</span>
          <span class="hmr-item-last" v-if="r.lastRemindedAt">上次 {{ shortTime(r.lastRemindedAt) }}</span>
          <button class="hmr-fire" @click="fire(r.id)">🔔 触发一次</button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useHealthReminders } from '../modules/body/health-dashboard'
import type { HealthReminder } from '../modules/body/health-dashboard'

const {
  reminders,
  initReminders,
  toggleReminder,
  recordReminderSent,
  resetDailyCounts,
  getEnabledReminders,
} = useHealthReminders()

const TYPE_META: Record<HealthReminder['type'], { label: string; icon: string }> = {
  water: { label: '喝水', icon: '💧' },
  move: { label: '活动', icon: '🚶' },
  stretch: { label: '拉伸', icon: '🧘' },
  eye_rest: { label: '护眼', icon: '👀' },
  posture: { label: '姿势', icon: '💪' },
  medication: { label: '用药', icon: '💊' },
  custom: { label: '自定义', icon: '📌' },
}

const WEEKDAY_LABEL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const stats = computed(() => {
  const enabled = reminders.value.filter((r) => r.enabled).length
  const todayTriggered = reminders.value.reduce((sum, r) => sum + r.todayCount, 0)
  const activeNow = getEnabledReminders().length
  return { enabled, todayTriggered, activeNow }
})

onMounted(() => initReminders())

function toggle(id: string) { toggleReminder(id) }
function fire(id: string) { recordReminderSent(id) }
function reset() { resetDailyCounts() }

function formatDays(days: number[]): string {
  if (days.length === 7) return '每日'
  return days.map((d) => WEEKDAY_LABEL[d]).join('·')
}

function shortTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.hmr {
  margin: 14px 0;
  padding: 14px 16px;
  background: linear-gradient(160deg, rgba(240, 192, 64, 0.08), rgba(107, 159, 196, 0.05));
  border: 1px solid rgba(240, 192, 64, 0.25);
  border-radius: 14px;
}
.hmr-head { margin-bottom: 10px; }
.hmr-title { margin: 0 0 4px; font-size: 15px; color: #1a1a2e; }
.hmr-sub { margin: 0; font-size: 12px; color: #7a8a9a; }
.hmr-stats { display: flex; gap: 10px; margin: 10px 0; }
.hmr-stat {
  flex: 1; padding: 10px; text-align: center; background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(240, 192, 64, 0.2); border-radius: 10px;
}
.hmr-stat-num { display: block; font-size: 20px; font-weight: 700; color: #b08a2a; }
.hmr-stat-label { font-size: 11px; color: #8a9a7a; }
.hmr-toolbar { margin: 8px 0; }
.hmr-reset {
  padding: 5px 12px; font-size: 12px; border: 1px solid rgba(240, 192, 64, 0.4);
  border-radius: 999px; background: transparent; color: #b08a2a; cursor: pointer;
}
.hmr-reset:hover { background: rgba(240, 192, 64, 0.1); }
.hmr-empty { padding: 20px; text-align: center; color: #8a9a7a; font-size: 13px; }
.hmr-empty span { display: block; font-size: 28px; margin-bottom: 6px; }
.hmr-empty p { margin: 0; line-height: 1.6; }
.hmr-item {
  margin: 8px 0; padding: 10px 12px; background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(240, 192, 64, 0.2); border-radius: 10px;
}
.hmr-item.off { opacity: 0.55; }
.hmr-item-head { display: flex; align-items: center; gap: 8px; }
.hmr-item-icon { font-size: 18px; }
.hmr-item-main { display: flex; align-items: center; gap: 8px; flex: 1; }
.hmr-item-title { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.hmr-item-type {
  font-size: 11px; color: #b08a2a; background: rgba(240, 192, 64, 0.12);
  padding: 1px 8px; border-radius: 999px;
}
.hmr-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px; font-size: 11px; border: 1px solid rgba(196, 106, 90, 0.4);
  border-radius: 999px; background: transparent; color: #b04a3a; cursor: pointer;

  min-height: 26px;
}
.hmr-toggle.on { border-color: rgba(90, 184, 160, 0.4); color: #2e8b6a; }
.hmr-item-msg { margin: 6px 0 0; font-size: 12px; color: #4a5a6a; }
.hmr-item-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; font-size: 11px; color: #8a9a7a; }
.hmr-item-foot { display: flex; align-items: center; gap: 12px; margin-top: 8px; font-size: 11px; color: #8a9a7a; }
.hmr-item-count b { color: #b08a2a; }
.hmr-fire {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  margin-left: auto; padding: 3px 10px; font-size: 11px; border: 1px solid rgba(107, 159, 196, 0.4);
  border-radius: 999px; background: transparent; color: #3d7ea6; cursor: pointer;

  min-height: 26px;
}
.hmr-fire:hover { background: rgba(107, 159, 196, 0.1); }
</style>
