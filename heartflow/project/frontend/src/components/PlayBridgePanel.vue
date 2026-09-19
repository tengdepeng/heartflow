<template>
  <section class="pbp" data-test="play-bridge-panel" aria-label="逸趣桥·此刻">
    <header class="pbp-head">
      <span class="pbp-title">🎮 逸趣桥 · 此刻</span>
      <span class="pbp-badge" data-test="pbp-count-badge">{{ overview.playSummary.totalItems }} 件收藏</span>
    </header>

    <!-- 游玩摘要 -->
    <div class="pbp-card" data-test="pbp-summary">
      <span class="pbp-card-t">📊 游玩摘要</span>
      <div class="pbp-stat-row">
        <div class="pbp-stat"><b data-test="pbp-total-items">{{ overview.playSummary.totalItems }}</b><span>总收藏</span></div>
        <div class="pbp-stat"><b>{{ overview.playSummary.totalHours }}</b><span>总时长</span></div>
        <div class="pbp-stat"><b>{{ overview.playSummary.avgHoursPerGame }}</b><span>平均时长</span></div>
        <div class="pbp-stat"><b>{{ overview.playSummary.totalGames }}</b><span>游戏</span></div>
      </div>
    </div>

    <!-- 里程碑 -->
    <div v-if="milestones.length" class="pbp-card" data-test="pbp-milestones">
      <span class="pbp-card-t">🏆 里程碑</span>
      <div class="pbp-stat-row">
        <div class="pbp-stat"><b data-test="pbp-milestone-unlocked">{{ unlockedCount }}</b><span>已解锁</span></div>
        <div class="pbp-stat"><b>{{ milestones.length }}</b><span>里程碑数</span></div>
      </div>
      <div class="pbp-milestone-list">
        <div
          v-for="m in milestones.filter(x => x.unlocked)"
          :key="m.id"
          class="pbp-milestone-chip"
          :data-test="`pbp-milestone-${m.id}`"
        >
          ✅ {{ m.title }}
        </div>
      </div>
    </div>

    <!-- 时间投资回报 -->
    <div v-if="roi.hoursDistribution.length" class="pbp-card" data-test="pbp-roi">
      <span class="pbp-card-t">⏱ 时间投资回报</span>
      <div class="pbp-roi-list">
        <div v-for="d in roi.hoursDistribution" :key="d.label" class="pbp-roi-row">
          <span class="pbp-roi-label">{{ d.label }}</span>
          <div class="pbp-roi-track">
            <div class="pbp-roi-fill" :style="{ width: `${d.percentage}%` }" />
          </div>
          <span class="pbp-roi-count">{{ d.count }}</span>
        </div>
      </div>
      <p v-if="roi.suggestions.length" class="pbp-roi-suggest">{{ roi.suggestions[0] }}</p>
    </div>

    <!-- 收藏热度 -->
    <div v-if="heatmap.byYear.length" class="pbp-card" data-test="pbp-heatmap">
      <span class="pbp-card-t">🔥 收藏热度 · {{ heatmap.trend }}</span>
      <div class="pbp-heatmap-row">
        <div v-for="y in heatmap.byYear.slice(-4)" :key="y.year" class="pbp-heat-cell" :title="`${y.year} · ${y.total} 件`">
          <div class="pbp-heat-bar" :style="{ height: heatHeight(y.total) }" />
          <span class="pbp-heat-label">{{ y.year }}</span>
        </div>
      </div>
      <p v-if="heatmap.peakPeriod" class="pbp-heat-peak">高峰 · {{ heatmap.peakPeriod.period }}（{{ heatmap.peakPeriod.total }} 件）</p>
    </div>

    <!-- 偏好画像 -->
    <div v-if="profile.platformPreference.length" class="pbp-card" data-test="pbp-profile">
      <span class="pbp-card-t">🎯 偏好画像</span>
      <div class="pbp-profile-row">
        <div v-for="p in profile.platformPreference.slice(0, 4)" :key="p.platform" class="pbp-profile-item">
          <span class="pbp-profile-name">{{ p.platform }}</span>
          <div class="pbp-profile-track">
            <div class="pbp-profile-fill" :style="{ width: `${p.percentage}%` }" />
          </div>
          <span class="pbp-profile-pct">{{ p.percentage }}%</span>
        </div>
      </div>
      <div v-if="profile.playerType.length" class="pbp-tag-row">
        <span v-for="t in profile.playerType" :key="t" class="pbp-tag">{{ t }}</span>
      </div>
    </div>

    <!-- 种子概览 -->
    <div v-if="seedOverview.total > 0" class="pbp-card" data-test="pbp-seeds">
      <span class="pbp-card-t">🌱 时间种子</span>
      <div class="pbp-stat-row">
        <div class="pbp-stat"><b data-test="pbp-seed-total">{{ seedOverview.total }}</b><span>种子数</span></div>
        <div class="pbp-stat"><b>{{ seedOverview.lodLevel }}</b><span>LOD 级别</span></div>
      </div>
      <div v-if="seedOverview.byRarity.length" class="pbp-tag-row">
        <span v-for="r in seedOverview.byRarity" :key="r.rarity" class="pbp-tag">
          {{ r.label }} {{ r.count }}
        </span>
      </div>
    </div>

    <!-- 建议 -->
    <div v-if="recommendations.length" class="pbp-card" data-test="pbp-recommendations">
      <span class="pbp-card-t">💡 逸趣建议</span>
      <div v-for="(r, i) in recommendations.slice(0, 5)" :key="i" class="pbp-rec-row" :data-test="`pbp-rec-${i}`">
        <span class="pbp-rec-pri" :class="`pbp-rec-pri--${r.priority}`">{{ priLabel(r.priority) }}</span>
        <div class="pbp-rec-body">
          <span class="pbp-rec-cat">{{ r.category }}</span>
          <span class="pbp-rec-suggest">{{ r.suggestion }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayBridge } from '../modules/play/play-bridge'
import type { PlayRecommendation } from '../modules/play/play-bridge'

const bridge = usePlayBridge()

const overview = computed(() => bridge.overview.value)
const milestones = computed(() => bridge.milestones.value)
const roi = computed(() => bridge.timeROI.value)
const heatmap = computed(() => bridge.collectionHeatmap.value)
const profile = computed(() => bridge.preferenceProfile.value)
const seedOverview = computed(() => bridge.seedOverview.value)
const recommendations = computed(() => bridge.recommendations.value)

const unlockedCount = computed(() => milestones.value.filter(m => m.unlocked).length)

function heatHeight(total: number): string {
  const max = Math.max(...heatmap.value.byYear.map(y => y.total), 1)
  return `${Math.round((total / max) * 100)}%`
}

function priLabel(p: PlayRecommendation['priority']): string {
  const m: Record<PlayRecommendation['priority'], string> = {
    high: '优先',
    medium: '建议',
    low: '留意',
  }
  return m[p]
}
</script>

<style scoped>
.pbp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 18px;
}
.pbp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pbp-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-strong, #e8e6e1);
}
.pbp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-soft, #c9c5bc);
}
.pbp-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.pbp-card-t {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.pbp-stat-row {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}
.pbp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.pbp-stat b {
  font-size: 17px;
}
.pbp-stat span {
  font-size: 11px;
  opacity: 0.65;
}
.pbp-milestone-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pbp-milestone-chip,
.pbp-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.pbp-roi-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pbp-roi-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.pbp-roi-label {
  width: 84px;
  opacity: 0.8;
}
.pbp-roi-track {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.pbp-roi-fill {
  height: 100%;
  border-radius: 999px;
  background: #8a9a7a;
}
.pbp-roi-count {
  width: 18px;
  text-align: right;
  opacity: 0.8;
}
.pbp-roi-suggest {
  font-size: 12px;
  opacity: 0.75;
}
.pbp-heatmap-row {
  display: flex;
  gap: 14px;
  align-items: flex-end;
  height: 64px;
}
.pbp-heat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}
.pbp-heat-bar {
  width: 22px;
  border-radius: 5px 5px 0 0;
  background: linear-gradient(180deg, #f0c040, #c46a5a);
}
.pbp-heat-label {
  font-size: 10px;
  opacity: 0.7;
}
.pbp-heat-peak {
  font-size: 12px;
  opacity: 0.75;
}
.pbp-profile-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pbp-profile-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.pbp-profile-name {
  width: 60px;
  opacity: 0.85;
}
.pbp-profile-track {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.pbp-profile-fill {
  height: 100%;
  border-radius: 999px;
  background: #8a9a7a;
}
.pbp-profile-pct {
  width: 38px;
  text-align: right;
  opacity: 0.8;
}
.pbp-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pbp-rec-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.pbp-rec-pri {
  flex-shrink: 0;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  margin-top: 2px;
}
.pbp-rec-pri--high {
  background: rgba(196, 106, 90, 0.25);
  color: #c46a5a;
}
.pbp-rec-pri--medium {
  background: rgba(240, 192, 64, 0.2);
  color: #f0c040;
}
.pbp-rec-pri--low {
  background: rgba(138, 154, 122, 0.25);
  color: #8a9a7a;
}
.pbp-rec-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}
.pbp-rec-cat {
  font-weight: 600;
}
.pbp-rec-suggest {
  opacity: 0.7;
}
</style>
