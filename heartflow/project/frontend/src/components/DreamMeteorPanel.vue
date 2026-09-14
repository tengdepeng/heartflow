<template>
  <section class="dmp">
    <div class="dmp-head">
      <span class="dmp-title">🌙 梦境档案</span>
      <span class="dmp-sub">把记下的梦，看成一段夜里的心绪曲线</span>
    </div>

    <!-- 概览指标 -->
    <div class="dmp-metrics">
      <div class="dmp-metric"><b>{{ ov.active }}</b><span>段梦里</span></div>
      <div class="dmp-metric"><b>{{ ov.consecutiveDays }}</b><span>连续记录</span></div>
      <div class="dmp-metric"><b>{{ ov.thisWeek }}</b><span>近7天</span></div>
      <div class="dmp-metric"><b>{{ ov.avgWords }}</b><span>均字数</span></div>
      <div class="dmp-metric"><b v-if="ov.peakHour !== null">{{ ov.peakHour }}<i>时</i></b><span>记录高峰</span></div>
    </div>

    <!-- 情绪分布 -->
    <div class="dmp-moods">
      <div v-for="m in moods" :key="m.mood" class="dmp-mood" :style="{ '--w': m.pct + '%' }">
        <span class="dmp-mood-emoji">{{ m.emoji }}</span>
        <span class="dmp-mood-bar"><i></i></span>
        <span class="dmp-mood-pct">{{ m.pct }}%</span>
      </div>
      <p v-if="dominant" class="dmp-dominant">夜里最多的情绪是「{{ dominant.emoji }}」{{ moodName(dominant.mood) }}，共 {{ dominant.count }} 段</p>
      <p v-else class="dmp-dominant">还没有足够多的梦来勾勒情绪的轮廓。</p>
    </div>

    <!-- 高频主题 -->
    <div v-if="themes.length" class="dmp-themes">
      <div v-for="t in themes" :key="t.tag" class="dmp-theme">
        <span class="dmp-theme-label">{{ t.tag }}</span>
        <span class="dmp-theme-bar"><i :style="{ width: (t.pct / maxThemePct) * 100 + '%' }"></i></span>
        <span class="dmp-theme-count">{{ t.count }}</span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="dmp-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Dream } from '../stores/dreamNook'
import {
  dreamOverview,
  moodDistribution,
  dominantMood,
  topThemes,
  dreamInsights,
} from '../modules/dream'

const props = defineProps<{ dreams: Dream[] }>()

const MOOD_NAME: Record<string, string> = {
  happy: '愉快',
  fear: '恐惧',
  sad: '悲伤',
  curious: '好奇',
  confused: '困惑',
  neutral: '平常',
}
function moodName(mood: string): string {
  return MOOD_NAME[mood] || mood
}

const ov = ref(dreamOverview([], new Date()))
const moods = ref(moodDistribution([]))
const dominant = ref(dominantMood([]))
const themes = ref(topThemes([], 6))
const insights = ref<string[]>([])

function refresh() {
  const now = new Date()
  ov.value = dreamOverview(props.dreams, now)
  moods.value = moodDistribution(props.dreams)
  dominant.value = dominantMood(props.dreams)
  themes.value = topThemes(props.dreams, 6)
  insights.value = dreamInsights(props.dreams, now, 4)
}

watch(
  () => props.dreams,
  () => refresh(),
  { deep: true }
)

const maxThemePct = computed(() => {
  const pcts = themes.value.map(t => t.pct)
  return Math.max(1, ...pcts)
})

refresh()
</script>

<style scoped>
.dmp {
  margin: 4px 0 24px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--bg-card, rgba(18, 14, 11, 0.6));
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.dmp-head { margin-bottom: 14px; }
.dmp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); display: block; }
.dmp-sub { font-size: 11px; color: rgba(200, 180, 160, 0.5); }

.dmp-metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 16px; }
.dmp-metric { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.dmp-metric b { font-size: 17px; font-weight: 300; color: #e8cdae; }
.dmp-metric b i { font-style: normal; font-size: 10px; opacity: 0.5; }
.dmp-metric span { font-size: 10px; color: rgba(200, 180, 160, 0.5); letter-spacing: 0.5px; }

.dmp-moods { margin-bottom: 14px; }
.dmp-mood { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dmp-mood-emoji { width: 22px; text-align: center; }
.dmp-mood-bar { flex: 1; height: 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.dmp-mood-bar i {
  display: block; height: 100%; width: var(--w);
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(167, 139, 250, 0.55), #b8860b);
}
.dmp-mood-pct { width: 34px; text-align: right; font-size: 11px; color: rgba(200, 180, 160, 0.6); }
.dmp-dominant { margin: 8px 0 0; font-size: 12px; color: rgba(200, 180, 160, 0.75); line-height: 1.6; }

.dmp-themes { margin-bottom: 14px; }
.dmp-theme { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.dmp-theme-label { width: 74px; font-size: 12px; color: rgba(220, 200, 180, 0.85); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dmp-theme-bar { flex: 1; height: 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.dmp-theme-bar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, rgba(52, 211, 153, 0.5), #34d399); }
.dmp-theme-count { width: 20px; text-align: right; font-size: 11px; color: rgba(200, 180, 160, 0.5); }

.dmp-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px solid rgba(var(--accent-rgb), 0.12); display: flex; flex-direction: column; gap: 6px; }
.dmp-insights li { font-size: 12px; color: rgba(200, 180, 160, 0.75); line-height: 1.7; }
</style>