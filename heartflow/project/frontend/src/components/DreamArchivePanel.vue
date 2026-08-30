<template>
  <section class="drm-panel">
    <header class="drm-head">
      <span class="drm-title">🌙 梦境档案</span>
      <span v-if="overview.total" class="drm-total">{{ overview.total }} 段</span>
    </header>

    <!-- 统计速览 -->
    <div class="drm-stats">
      <div class="drm-stat">
        <span class="drm-stat-n">{{ overview.total }}</span>
        <span class="drm-stat-l">总梦境</span>
      </div>
      <div class="drm-stat">
        <span class="drm-stat-n">{{ overview.thisMonth }}</span>
        <span class="drm-stat-l">本月</span>
      </div>
      <div class="drm-stat">
        <span class="drm-stat-n">{{ overview.thisWeek }}</span>
        <span class="drm-stat-l">近7天</span>
      </div>
      <div class="drm-stat">
        <span class="drm-stat-n">{{ overview.consecutiveDays }}</span>
        <span class="drm-stat-l">连续夜</span>
      </div>
    </div>

    <!-- 梦的情绪分布 -->
    <div v-if="moods.length" class="drm-block">
      <p class="drm-block-title">梦的情绪</p>
      <div class="drm-mood-list">
        <div v-for="m in moods" :key="m.mood" class="drm-mood-row">
          <span class="drm-mood-emoji">{{ m.emoji }}</span>
          <span class="drm-mood-track"><i :style="{ width: m.pct + '%' }"></i></span>
          <span class="drm-mood-count">{{ m.count }} · {{ m.pct }}%</span>
        </div>
      </div>
    </div>

    <!-- 高频主题 -->
    <div v-if="themes.length" class="drm-block">
      <p class="drm-block-title">高频主题</p>
      <div class="drm-themes">
        <span v-for="t in themes" :key="t.tag" class="drm-theme-chip">{{ t.tag }}<b>{{ t.count }}</b></span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="drm-insights">
      <li v-for="(ins, i) in insights" :key="i">{{ ins }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Dream } from '../stores/dreamNook'
import { dreamOverview, moodDistribution, topThemes, dreamInsights } from '../modules/dream'

const props = defineProps<{ dreams: Dream[] }>()

const overview = computed(() => dreamOverview(props.dreams, new Date()))
const moods = computed(() => moodDistribution(props.dreams))
const themes = computed(() => topThemes(props.dreams, 6))
const insights = computed(() => dreamInsights(props.dreams, new Date()))
</script>

<style scoped>
.drm-panel {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--accent-rgb), 0.03);
  margin-bottom: 24px;
  box-sizing: border-box;
}
.drm-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.drm-title { font-size: 13px; font-weight: 600; color: rgba(240, 232, 224, 0.9); }
.drm-total { font-size: 11px; color: rgba(var(--accent-rgb), 0.55); }

.drm-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.drm-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
}
.drm-stat-n { font-size: 16px; font-weight: 600; color: var(--accent); }
.drm-stat-l { font-size: 10px; color: rgba(var(--accent-rgb), 0.5); }

.drm-block { margin-bottom: 10px; }
.drm-block-title {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.6);
  margin: 0 0 6px;
}
.drm-mood-list { display: flex; flex-direction: column; gap: 5px; }
.drm-mood-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.drm-mood-emoji { width: 18px; text-align: center; flex: none; }
.drm-mood-track {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.drm-mood-track i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  transition: width 0.4s;
}
.drm-mood-count { width: 64px; text-align: right; color: rgba(232, 221, 208, 0.55); flex: none; }

.drm-themes { display: flex; flex-wrap: wrap; gap: 6px; }
.drm-theme-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.12);
  color: rgba(232, 221, 208, 0.8);
  font-size: 11px;
}
.drm-theme-chip b { color: var(--accent); font-weight: 600; }

.drm-insights {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  list-style: none;
}
.drm-insights li {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.55);
  line-height: 1.7;
}
.drm-insights li + li { border-top: 1px dashed rgba(var(--accent-rgb), 0.1); padding-top: 4px; }

@media (max-width: 480px) {
  .drm-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
