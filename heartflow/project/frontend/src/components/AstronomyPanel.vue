<template>
  <section class="astro-panel">
    <header class="astro-head">
      <h4 class="astro-title">🌌 天文日历 · 观星时节</h4>
      <p class="astro-hint">月相与天象皆由本地计算，无网络依赖</p>
    </header>

    <!-- 今日月相 -->
    <div class="astro-moon">
      <div class="astro-moon-icon" :style="{ filter: `drop-shadow(0 0 10px ${moonGlow})` }">{{ moon.icon }}</div>
      <div class="astro-moon-body">
        <span class="astro-moon-label">{{ moon.label }} · 月龄 {{ moon.age }} 天</span>
        <div class="astro-moon-bar">
          <span class="astro-moon-fill" :style="{ width: `${moon.illumination * 100}%`, background: moonGlow }"></span>
        </div>
        <span class="astro-moon-sub">照亮 {{ Math.round(moon.illumination * 100) }}%</span>
      </div>
    </div>

    <!-- 近期流星雨 -->
    <div class="astro-block">
      <h5 class="astro-block-title">☄️ 近期流星雨</h5>
      <ul v-if="showers.length" class="astro-list">
        <li v-for="s in showers" :key="s.id" class="astro-item">
          <span class="astro-item-icon">{{ s.icon }}</span>
          <div class="astro-item-main">
            <span class="astro-item-name">{{ s.name }}</span>
            <span class="astro-item-sub">{{ s.peakDate }} · ZHR {{ s.zhr }}</span>
          </div>
          <span class="astro-item-note">{{ s.note }}</span>
        </li>
      </ul>
      <p v-else class="astro-empty">近期无流星雨峰值。</p>
    </div>

    <!-- 近期日月食 -->
    <div class="astro-block">
      <h5 class="astro-block-title">🌒 近期日月食</h5>
      <ul v-if="eclipses.length" class="astro-list">
        <li v-for="(e, i) in eclipses" :key="i" class="astro-item">
          <span class="astro-item-icon">{{ e.icon }}</span>
          <div class="astro-item-main">
            <span class="astro-item-name">{{ e.label }}</span>
            <span class="astro-item-sub">{{ e.date }} · {{ e.visibility }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="astro-empty">近期无日月食事件。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getMoonPhase, getUpcomingMeteorShowers, getUpcomingEclipses } from '../modules/timeline/astronomy'

const now = new Date()

const moon = computed(() => getMoonPhase(now))
const moonGlow = computed(() => {
  const illum = moon.value.illumination
  return `rgba(212, 208, 255, ${0.35 + illum * 0.4})`
})
const showers = computed(() => getUpcomingMeteorShowers(now, 3))
const eclipses = computed(() => getUpcomingEclipses(now, 3))
</script>

<style scoped>
.astro-panel {
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.astro-head { margin-bottom: 12px; }
.astro-title { margin: 0; font-size: 14px; letter-spacing: 2px; color: rgba(var(--accent-rgb), 0.75); }
.astro-hint { margin: 4px 0 0; font-size: 11px; opacity: 0.5; }

.astro-moon {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 12px;
}
.astro-moon-icon { font-size: 34px; line-height: 1; }
.astro-moon-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.astro-moon-label { font-size: 13px; color: #e8dcc8; }
.astro-moon-bar { height: 5px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
.astro-moon-fill { display: block; height: 100%; border-radius: 999px; transition: width 0.4s; }
.astro-moon-sub { font-size: 11px; opacity: 0.55; }

.astro-block { margin-top: 12px; }
.astro-block-title { margin: 0 0 8px; font-size: 12px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.6); }
.astro-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.astro-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-radius: 8px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06);
}
.astro-item-icon { font-size: 16px; }
.astro-item-main { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.astro-item-name { font-size: 12px; color: #e8dcc8; }
.astro-item-sub { font-size: 11px; opacity: 0.5; }
.astro-item-note { font-size: 11px; opacity: 0.4; max-width: 40%; text-align: right; }
.astro-empty { margin: 0; font-size: 12px; opacity: 0.5; }
</style>
