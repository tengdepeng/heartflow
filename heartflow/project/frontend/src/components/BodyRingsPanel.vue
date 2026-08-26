<template>
  <section class="rings-panel">
    <h3 class="section-title">🌀 三环 · 今天的状态</h3>
    <p class="rings-hint">记录当下的状态，而非追逐分数。环档位：空白 / 微动 / 舒展 / 充盈 / 盈满。</p>

    <div class="rings-grid">
      <!-- 活动环 -->
      <article class="ring-card">
        <div class="ring-head">
          <span class="ring-name">🏃 活动</span>
          <span class="ring-label">{{ activityRing.label }}</span>
        </div>
        <div class="ring-dots">
          <span v-for="n in 4" :key="n" :class="['ring-dot', { on: activityRing.level >= n }]"></span>
        </div>
        <div class="ring-value">今日 {{ activityRing.todayValue }} 分钟</div>
        <div class="ring-trend" :title="'近7天趋势'">
          <span
            v-for="(t, i) in activityRing.trend"
            :key="i"
            class="trend-bar"
            :class="'lv' + t"
            :style="{ height: trendHeight(t) }"
          ></span>
        </div>
        <div class="ring-control">
          <input v-model.number="activityMinutes" type="number" min="0" class="ring-input act-input" placeholder="分钟" />
          <button class="ring-btn" @click="onLogActivity">记录活动</button>
        </div>
      </article>

      <!-- 休息环 -->
      <article class="ring-card">
        <div class="ring-head">
          <span class="ring-name">🌙 休息</span>
          <span class="ring-label">{{ restRing.label }}</span>
        </div>
        <div class="ring-dots">
          <span v-for="n in 4" :key="n" :class="['ring-dot', { on: restRing.level >= n }]"></span>
        </div>
        <div class="ring-value">今日 {{ restRing.todayValue }} 分钟</div>
        <div class="ring-trend" :title="'近7天趋势'">
          <span
            v-for="(t, i) in restRing.trend"
            :key="i"
            class="trend-bar"
            :class="'lv' + t"
            :style="{ height: trendHeight(t) }"
          ></span>
        </div>
        <div class="ring-control">
          <input v-model.number="restMinutes" type="number" min="0" class="ring-input rest-input" placeholder="分钟" />
          <button class="ring-btn" @click="onLogRest">记录休息</button>
        </div>
      </article>

      <!-- 感受环 -->
      <article class="ring-card">
        <div class="ring-head">
          <span class="ring-name">💗 感受</span>
          <span class="ring-label">{{ feelingRing.label }}</span>
        </div>
        <div class="ring-dots">
          <span v-for="n in 4" :key="n" :class="['ring-dot', { on: feelingRing.level >= n }]"></span>
        </div>
        <div class="ring-value">今日档位 {{ feelingRing.level }}</div>
        <div class="ring-trend" :title="'近7天趋势'">
          <span
            v-for="(t, i) in feelingRing.trend"
            :key="i"
            class="trend-bar"
            :class="'lv' + t"
            :style="{ height: trendHeight(t) }"
          ></span>
        </div>
        <div class="ring-feeling">
          <button
            v-for="t in 5"
            :key="t - 1"
            :class="['feeling-btn', { active: feelingRing.level === (t - 1) }]"
            @click="setFeeling((t - 1) as RingTier)"
          >{{ TIER_LABELS[t - 1] }}</button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBodyRings, TIER_LABELS, type RingTier } from '../modules/body/rings'

const { activityRing, restRing, feelingRing, logActivity, logRest, setFeeling } = useBodyRings()

const activityMinutes = ref(30)
const restMinutes = ref(60)

function onLogActivity() {
  const v = Math.max(0, Math.round(activityMinutes.value || 0))
  if (v > 0) {
    logActivity(v)
    activityMinutes.value = 0
  }
}

function onLogRest() {
  const v = Math.max(0, Math.round(restMinutes.value || 0))
  if (v > 0) {
    logRest(v)
    restMinutes.value = 0
  }
}

/** 趋势条高度：档位 0-4 → 12%-100%，0 档保留细桩 */
function trendHeight(tier: number): string {
  return `${12 + (tier / 4) * 88}%`
}
</script>

<style scoped>
.rings-panel {
  margin-top: 8px;
}
.rings-hint {
  margin: 4px 0 14px;
  font-size: 12px;
  opacity: 0.62;
  line-height: 1.5;
}
.rings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.ring-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ring-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.ring-name {
  font-size: 15px;
  font-weight: 600;
}
.ring-label {
  font-size: 13px;
  color: #6b9fc4;
}
.ring-dots {
  display: flex;
  gap: 8px;
}
.ring-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s, transform 0.2s;
}
.ring-dot.on {
  background: linear-gradient(135deg, #6b9fc4, #5ab8a0);
  transform: scale(1.05);
}
.ring-value {
  font-size: 13px;
  opacity: 0.78;
}
.ring-trend {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 42px;
  padding: 4px 0;
}
.trend-bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  background: rgba(107, 159, 196, 0.25);
  min-height: 4px;
}
.trend-bar.lv0 { background: rgba(255, 255, 255, 0.08); }
.trend-bar.lv1 { background: rgba(107, 159, 196, 0.35); }
.trend-bar.lv2 { background: rgba(107, 159, 196, 0.55); }
.trend-bar.lv3 { background: rgba(107, 159, 196, 0.78); }
.trend-bar.lv4 { background: linear-gradient(180deg, #5ab8a0, #6b9fc4); }
.ring-control {
  display: flex;
  gap: 8px;
}
.ring-input {
  width: 72px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
}
.ring-btn {
  flex: 1;
  padding: 6px 10px;
  border-radius: 8px;
  border: none;
  background: rgba(107, 159, 196, 0.18);
  color: #cfe0ff;
  font-size: 13px;
  cursor: pointer;
}
.ring-btn:hover {
  background: rgba(107, 159, 196, 0.3);
}
.ring-feeling {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.feeling-btn {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.feeling-btn.active {
  background: linear-gradient(135deg, #6b9fc4, #5ab8a0);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}
</style>
