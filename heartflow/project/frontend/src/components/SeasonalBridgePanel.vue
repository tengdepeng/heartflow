<template>
  <section class="sbp" data-test="seasonal-bridge-panel" aria-label="岁时桥·此刻">
    <header class="sbp-head">
      <span class="sbp-title">🍃 岁时桥 · 此刻</span>
      <span class="sbp-badge" data-test="sbp-season-badge">
        {{ overview.currentSeasonIcon }} {{ overview.currentSeasonLabel }}季
      </span>
    </header>

    <!-- 季节概览 -->
    <div class="sbp-card" data-test="sbp-overview">
      <div class="sbp-season-line">
        <span class="sbp-season-name">{{ overview.currentSeasonIcon }} {{ overview.currentSeasonLabel }}季已过半程</span>
        <span class="sbp-season-progress" data-test="sbp-season-progress">{{ overview.seasonProgress }}%</span>
      </div>
      <div class="sbp-track" aria-hidden="true">
        <div class="sbp-track-fill" :style="{ width: `${overview.seasonProgress}%` }" />
      </div>
      <div v-if="overview.nextSolarTerm" class="sbp-term" data-test="sbp-next-term">
        <span class="sbp-term-name">☀️ 下个节气 · {{ overview.nextSolarTerm.name }}</span>
        <span class="sbp-term-desc">{{ overview.nextSolarTerm.desc }}</span>
      </div>
      <div v-if="overview.upcomingFestivals.length" class="sbp-festivals" data-test="sbp-festivals">
        <span
          v-for="f in overview.upcomingFestivals"
          :key="f.name"
          class="sbp-festival-chip"
          :title="`${f.name} · ${f.date}`"
        >
          🎋 {{ f.name }}
        </span>
      </div>
    </div>

    <!-- 仪式统计 -->
    <div v-if="ritualStats.total > 0" class="sbp-card" data-test="sbp-rituals">
      <span class="sbp-card-t">⏳ 仪式节律</span>
      <div class="sbp-stat-row">
        <div class="sbp-stat"><b data-test="sbp-ritual-total">{{ ritualStats.total }}</b><span>仪式总数</span></div>
        <div class="sbp-stat"><b>{{ ritualStats.completed }}</b><span>已启动</span></div>
        <div class="sbp-stat"><b>{{ ritualStats.streak }}</b><span>连续天数</span></div>
      </div>
      <div v-if="ritualStats.bySeason.length" class="sbp-season-dist">
        <div v-for="s in ritualStats.bySeason" :key="s.season" class="sbp-dist-row">
          <span class="sbp-dist-label">{{ s.label }}季</span>
          <div class="sbp-dist-track">
            <div
              class="sbp-dist-fill"
              :style="{ width: distWidth(s.count) }"
              :data-test="`sbp-dist-${s.season}`"
            />
          </div>
          <span class="sbp-dist-count">{{ s.count }}</span>
        </div>
      </div>
    </div>

    <!-- 光茧进度 -->
    <div v-if="cocoon.stats.total > 0" class="sbp-card" data-test="sbp-cocoons">
      <span class="sbp-card-t">🦋 光茧蜕变</span>
      <div class="sbp-stat-row">
        <div class="sbp-stat"><b>{{ cocoon.stats.total }}</b><span>光茧总数</span></div>
        <div class="sbp-stat"><b>{{ cocoon.stats.active }}</b><span>蜕变中</span></div>
        <div class="sbp-stat"><b>{{ cocoon.stats.completed }}</b><span>已飞翔</span></div>
      </div>
      <div class="sbp-stage-row">
        <span
          v-for="st in cocoon.stageDistribution"
          :key="st.stage"
          class="sbp-stage-chip"
        >
          {{ st.label }} {{ st.count }}
        </span>
      </div>
    </div>

    <!-- 季节情绪 -->
    <div v-if="mood" class="sbp-card" data-test="sbp-mood">
      <span class="sbp-card-t">🌊 季节情绪</span>
      <p class="sbp-mood-line">
        主导情绪 <b>{{ mood.dominantMood }}</b>
        <template v-if="mood.keywords.length">
          · 关键词
          <span v-for="k in mood.keywords.slice(0, 4)" :key="k" class="sbp-keyword">{{ k }}</span>
        </template>
      </p>
      <p v-if="mood.changeFromPrevious" class="sbp-mood-change">{{ mood.changeFromPrevious }}</p>
    </div>

    <!-- 季节转换仪式 -->
    <div v-if="transition" class="sbp-card sbp-card--transition" data-test="sbp-transition">
      <span class="sbp-card-t">🌗 季节转换仪式</span>
      <p class="sbp-transition-line">
        从 {{ transition.from }} 走向 {{ transition.to }} · {{ transition.timestamp }}
      </p>
      <ul class="sbp-transition-list">
        <li v-for="(a, i) in transition.ritualActions" :key="i">{{ a }}</li>
      </ul>
      <div class="sbp-transition-two">
        <div>
          <span class="sbp-t2-label">告别</span>
          <p v-for="(t, i) in transition.farewell.things.slice(0, 2)" :key="`f${i}`">{{ t }}</p>
        </div>
        <div>
          <span class="sbp-t2-label">迎接</span>
          <p v-for="(t, i) in transition.welcome.intentions.slice(0, 2)" :key="`w${i}`">{{ t }}</p>
        </div>
      </div>
    </div>

    <!-- 季节推荐 -->
    <div v-if="recommendations.length" class="sbp-card" data-test="sbp-recommendations">
      <span class="sbp-card-t">💡 时节建议</span>
      <div v-for="r in recommendations" :key="r.id" class="sbp-rec-row" :data-test="`sbp-rec-${r.id}`">
        <span class="sbp-rec-pri" :class="`sbp-rec-pri--${r.priority}`">{{ priLabel(r.priority) }}</span>
        <div class="sbp-rec-body">
          <span class="sbp-rec-title">{{ r.title }}</span>
          <span class="sbp-rec-desc">{{ r.description }}</span>
        </div>
      </div>
    </div>

    <!-- 年度回顾 -->
    <div v-if="review" class="sbp-card" data-test="sbp-review">
      <span class="sbp-card-t">📜 年度回顾 · {{ review.year }}</span>
      <p class="sbp-review-theme">{{ review.yearTheme }}</p>
      <p v-if="review.growth.length" class="sbp-review-line">
        成长 · <span v-for="(g, i) in review.growth.slice(0, 3)" :key="i">{{ g }}{{ i < 2 ? ' / ' : '' }}</span>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSeasonalBridge } from '../modules/seasonal/seasonal-bridge'
import type { SeasonalRecommendation } from '../modules/seasonal/seasonal-bridge'

const bridge = useSeasonalBridge()

const overview = computed(() => bridge.seasonalOverview.value)
const ritualStats = computed(() => bridge.ritualStats.value)
const cocoon = computed(() => bridge.cocoonProgress.value)
const mood = computed(() => bridge.moodAnalysis.value)
const transition = computed(() => bridge.seasonTransition.value)
const recommendations = computed(() => bridge.recommendations.value)
const review = computed(() => bridge.yearReview.value)

function distWidth(count: number): string {
  const total = ritualStats.value.total
  return total ? `${Math.round((count / total) * 100)}%` : '0%'
}

function priLabel(p: SeasonalRecommendation['priority']): string {
  const m: Record<SeasonalRecommendation['priority'], string> = {
    high: '优先',
    medium: '建议',
    low: '留意',
  }
  return m[p]
}
</script>

<style scoped>
.sbp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 18px;
}
.sbp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sbp-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-strong, #e8e6e1);
}
.sbp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-soft, #c9c5bc);
}
.sbp-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.sbp-card--transition {
  border-color: rgba(240, 192, 64, 0.35);
}
.sbp-card-t {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.sbp-season-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}
.sbp-season-progress {
  font-weight: 700;
  font-size: 15px;
}
.sbp-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.sbp-track-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
  transition: width 0.4s ease;
}
.sbp-term {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}
.sbp-term-name {
  font-weight: 600;
}
.sbp-term-desc {
  opacity: 0.65;
}
.sbp-festivals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sbp-festival-chip,
.sbp-stage-chip,
.sbp-keyword {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.sbp-stat-row {
  display: flex;
  gap: 18px;
}
.sbp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.sbp-stat b {
  font-size: 17px;
}
.sbp-stat span {
  font-size: 11px;
  opacity: 0.65;
}
.sbp-season-dist {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sbp-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.sbp-dist-label {
  width: 34px;
  opacity: 0.8;
}
.sbp-dist-track {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.sbp-dist-fill {
  height: 100%;
  border-radius: 999px;
  background: #8a9a7a;
}
.sbp-dist-count {
  width: 18px;
  text-align: right;
  opacity: 0.8;
}
.sbp-stage-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sbp-mood-line {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.sbp-mood-change {
  font-size: 12px;
  opacity: 0.7;
}
.sbp-transition-line {
  font-size: 13px;
}
.sbp-transition-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  opacity: 0.85;
}
.sbp-transition-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 12px;
}
.sbp-t2-label {
  font-weight: 700;
  opacity: 0.7;
}
.sbp-rec-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.sbp-rec-pri {
  flex-shrink: 0;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  margin-top: 2px;
}
.sbp-rec-pri--high {
  background: rgba(196, 106, 90, 0.25);
  color: #c46a5a;
}
.sbp-rec-pri--medium {
  background: rgba(240, 192, 64, 0.2);
  color: #f0c040;
}
.sbp-rec-pri--low {
  background: rgba(138, 154, 122, 0.25);
  color: #8a9a7a;
}
.sbp-rec-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}
.sbp-rec-title {
  font-weight: 600;
}
.sbp-rec-desc {
  opacity: 0.7;
}
.sbp-review-theme {
  font-size: 13px;
  font-weight: 600;
}
.sbp-review-line {
  font-size: 12px;
  opacity: 0.8;
}
</style>
