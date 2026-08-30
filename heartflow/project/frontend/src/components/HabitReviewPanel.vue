<template>
  <section data-enter class="hr-panel">
    <header class="hr-head">
      <span class="hr-title">🔄 习惯打卡档案</span>
      <span class="hr-hint">Streaks 式复合视图</span>
    </header>

    <!-- 统计速览 -->
    <div class="hr-stats">
      <div class="hr-stat">
        <span class="hr-stat-n">{{ habits.length }}</span>
        <span class="hr-stat-l">习惯</span>
      </div>
      <div class="hr-stat">
        <span class="hr-stat-n">{{ calendar.todayHits }}</span>
        <span class="hr-stat-l">今日打卡</span>
      </div>
      <div class="hr-stat">
        <span class="hr-stat-n">{{ calendar.weekHits }}</span>
        <span class="hr-stat-l">本周人次</span>
      </div>
      <div class="hr-stat">
        <span class="hr-stat-n">{{ avgStreak }}</span>
        <span class="hr-stat-l">平均连续</span>
      </div>
      <div class="hr-stat">
        <span class="hr-stat-n">{{ review.best?.streak ?? 0 }}</span>
        <span class="hr-stat-l">最佳连续</span>
      </div>
    </div>

    <!-- 打卡热图（近 28 天） -->
    <div v-if="calendar.days.length" class="hr-heat">
      <div class="hr-heat-caption">
        <span>近 28 天打卡热图</span>
        <span class="hr-heat-legend">
          <i v-for="n in 5" :key="n" class="hr-legend-cell" :style="{ opacity: n / 5 }"></i>
        </span>
      </div>
      <div class="hr-heat-grid">
        <div
          v-for="(c, i) in calendar.days"
          :key="c.date"
          class="hr-heat-cell"
          :class="{ on: c.active, today: i === calendar.days.length - 1 }"
          :style="c.active ? { opacity: 0.35 + c.count * 0.2 } : {}"
          :title="`${c.date} · ${c.count} 个习惯`"
        >
          <span class="hr-heat-week" v-if="i % 7 === 0">{{ c.label }}</span>
        </div>
      </div>
      <p class="hr-heat-summary">
        {{ calendar.activeHabits }} 个习惯累计打卡 {{ calendar.totalHits }} 人次
      </p>
    </div>

    <!-- 坚持 / 停滞清单 -->
    <div v-if="review.strong.length || review.stagnant.length" class="hr-reviews">
      <div v-if="review.strong.length" class="hr-review-block">
        <p class="hr-review-title">🌿 坚持中（≥3 天）</p>
        <ul class="hr-review-list">
          <li v-for="h in review.strong" :key="h.text">「{{ h.text }}」· {{ h.streak }} 天</li>
        </ul>
      </div>
      <div v-if="review.stagnant.length" class="hr-review-block">
        <p class="hr-review-title">🍂 易中断</p>
        <ul class="hr-review-list">
          <li v-for="h in review.stagnant" :key="h.text">「{{ h.text }}」· 才 {{ h.streak }} 天</li>
        </ul>
      </div>
    </div>

    <!-- 成长势能 -->
    <div v-if="momentum.score > 0" class="hr-momentum">
      <span class="hr-momentum-label" :style="{ color: momentum.color }">{{ momentum.label }}</span>
      <span class="hr-momentum-bar"><i :style="{ width: momentum.score + '%', background: momentum.color }"></i></span>
      <span class="hr-momentum-score">{{ momentum.score }}</span>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="hr-insights">
      <li v-for="(ins, i) in insights" :key="i">{{ ins }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGardenFlourish } from '../modules/garden'
import { useGoal } from '../modules/goal'
import { useCocoonStore } from '../modules/seasonal/cocoon-store'
import { habitReview, growthMomentum, growthInsights } from '../modules/garden/growth-meteor'
import { habitCalendarAggregate } from '../modules/garden/habit-calendar'

const flourish = useGardenFlourish()
const goal = useGoal()
const cocoonStore = useCocoonStore()

const habits = computed(() => flourish.habits.value)
const now = computed(() => new Date())

const calendar = computed(() => habitCalendarAggregate(habits.value, now.value))
const review = computed(() => habitReview(habits.value))
const momentum = computed(() => growthMomentum(goal.targets.value, flourish.seeds.value, habits.value))
const insights = computed(() => growthInsights(
  goal.targets.value,
  flourish.seeds.value,
  habits.value,
  cocoonStore.cocoons.value,
  now.value,
  3,
))
const avgStreak = computed(() => {
  const rated = habits.value.filter((h) => h.streak > 0)
  return rated.length ? Math.round(rated.reduce((s, h) => s + h.streak, 0) / rated.length) : 0
})
</script>

<style scoped>
.hr-panel {
  max-width: 640px;
  margin: 18px auto 0;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--bg-card);
  color: var(--text-high);
}
.hr-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}
.hr-title { font-size: 14px; font-weight: 600; }
.hr-hint { font-size: 11px; color: var(--text-secondary); }

.hr-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.hr-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.16);
}
.hr-stat-n { font-size: 16px; font-weight: 600; color: var(--accent); }
.hr-stat-l { font-size: 10px; color: var(--text-secondary); }

.hr-heat { margin-bottom: 12px; }
.hr-heat-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.hr-heat-legend { display: inline-flex; gap: 2px; }
.hr-legend-cell {
  width: 10px; height: 10px;
  border-radius: 2px;
  background: var(--accent);
}
.hr-heat-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.hr-heat-cell {
  position: relative;
  height: 22px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06);
}
.hr-heat-cell.on { background: var(--accent); }
.hr-heat-cell.today { outline: 1px solid rgba(var(--accent-rgb), 0.5); }
.hr-heat-week {
  position: absolute;
  left: 2px; top: 1px;
  font-size: 9px;
  color: var(--text-faint);
}
.hr-heat-summary { font-size: 11px; color: var(--text-secondary); margin: 6px 0 0; }

.hr-reviews {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.hr-review-title { font-size: 12px; color: var(--accent); margin: 0 0 4px; }
.hr-review-list { margin: 0; padding-left: 16px; }
.hr-review-list li { font-size: 11px; color: var(--text-secondary); line-height: 1.7; }

.hr-momentum {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}
.hr-momentum-label { font-weight: 600; white-space: nowrap; }
.hr-momentum-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.hr-momentum-bar i { display: block; height: 100%; border-radius: 3px; }
.hr-momentum-score { font-size: 12px; color: var(--text-secondary); }

.hr-insights {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.16);
  list-style: none;
}
.hr-insights li {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.7;
}
.hr-insights li + li { border-top: 1px dashed rgba(var(--accent-rgb), 0.1); padding-top: 4px; }
</style>