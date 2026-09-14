<template>
  <section class="mach">
    <div class="mach-head">
      <div class="mach-title-wrap">
        <span class="mach-title">🏆 运动成就</span>
        <span class="mach-sub">每一次坚持，都值得一枚勋章</span>
      </div>
      <span class="mach-tag">{{ stats.unlocked }}/{{ stats.total }}</span>
    </div>

    <!-- 成就统计 -->
    <div class="mach-stats">
      <div class="mach-stat"><b>{{ stats.unlocked }}</b><span>已解锁</span></div>
      <div class="mach-stat"><b>{{ stats.total }}</b><span>总数</span></div>
      <div class="mach-stat"><b>{{ stats.completionRate }}%</b><span>完成率</span></div>
    </div>
    <div class="mach-progress">
      <i :style="{ width: stats.completionRate + '%' }"></i>
    </div>

    <!-- 成就列表 -->
    <div class="mach-list">
      <div v-for="a in achievements" :key="a.id" class="mach-item" :class="{ unlocked: a.unlocked }">
        <span class="mach-icon" :style="a.unlocked ? {} : { filter: 'grayscale(1)', opacity: 0.4 }">{{ a.icon }}</span>
        <div class="mach-info">
          <div class="mach-name-row">
            <span class="mach-name">{{ a.name }}</span>
            <span class="mach-tier" :style="{ color: tierColor(a.tier) }">{{ tierLabel(a.tier) }}</span>
          </div>
          <span class="mach-desc">{{ a.description }}</span>
          <div class="mach-bar">
            <i :style="{ width: progressPct(a) + '%' }"></i>
          </div>
          <span class="mach-progress-text">
            {{ a.unlocked ? (a.unlockedAt ? '已解锁 · ' + fmtDate(a.unlockedAt) : '已解锁') : a.condition.progress + ' / ' + a.condition.threshold }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useMovement, useMovementAchievements, movesToRecords, deriveRhythm, ACHIEVEMENT_TIER_META } from '../modules/movement'
import type { MovementAchievement } from '../modules/movement'

const movement = useMovement()
movement.load()
const ach = useMovementAchievements()

const records = computed(() => movesToRecords(movement.items.value))
const rhythm = computed(() => deriveRhythm(records.value))

watch(records, () => {
  ach.updateAchievements(records.value, rhythm.value)
}, { immediate: true, deep: true })

const achievements = computed(() => ach.achievements.value)
const stats = computed(() => ach.getAchievementStats())

function progressPct(a: MovementAchievement) {
  if (a.unlocked) return 100
  const t = a.condition.threshold
  if (t <= 0) return 0
  return Math.min(100, Math.round((a.condition.progress / t) * 100))
}

function tierLabel(t: string) { return ACHIEVEMENT_TIER_META[t]?.label ?? t }
function tierColor(t: string) { return ACHIEVEMENT_TIER_META[t]?.color ?? '#c0c0c0' }

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.mach {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.mach-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.mach-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.mach-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.mach-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.mach-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e3c08a; white-space: nowrap; }

.mach-stats { display: flex; gap: 8px; margin-bottom: 8px; }
.mach-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.mach-stat b { font-size: 15px; font-weight: 500; color: var(--text-high, #d8c3a5); }
.mach-stat span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.mach-progress { height: 5px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; margin-bottom: 14px; }
.mach-progress i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(158 45% 52%), hsl(44 60% 55%)); transition: width 0.6s; }

.mach-list { display: flex; flex-direction: column; gap: 8px; }
.mach-item { display: flex; gap: 10px; padding: 10px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); border: 1px solid rgba(255, 255, 255, 0.05); }
.mach-item.unlocked { border-color: rgba(var(--accent-rgb), 0.25); background: rgba(var(--accent-rgb), 0.05); }
.mach-icon { font-size: 20px; flex-shrink: 0; width: 24px; text-align: center; }
.mach-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.mach-name-row { display: flex; align-items: center; gap: 8px; }
.mach-name { font-size: 12px; font-weight: 500; color: var(--text-high, #d8c3a5); }
.mach-tier { font-size: 10px; padding: 1px 7px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); }
.mach-desc { font-size: 11px; color: rgba(232, 221, 208, 0.45); }
.mach-bar { height: 4px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.mach-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(158 45% 52%), hsl(208 45% 55%)); transition: width 0.5s; }
.mach-progress-text { font-size: 10px; color: rgba(232, 221, 208, 0.35); }
</style>
