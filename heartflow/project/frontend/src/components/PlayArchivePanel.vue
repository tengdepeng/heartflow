<template>
  <section class="pap-archive" aria-label="逸趣档案">
    <!-- 空态（无藏品也无种子） -->
    <template v-if="!hasData">
      <div class="pap-head">
        <span class="pap-title">✨ 逸趣档案</span>
        <span class="pap-badge pap-badge-neutral">逸趣未启</span>
      </div>
      <p class="pap-empty">
        还没有可供陈列的逸趣记录。记下一段游戏时光、收进一件玩具，或种下一粒心情种子，收藏的宽度与心意的温度便会在此显影。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="pap-head">
        <span class="pap-title">✨ 逸趣档案</span>
        <span class="pap-badge pap-badge-gold">{{ health?.label }} </span>
      </div>

      <!-- 逸趣库概览 -->
      <div class="pap-block" v-if="overview">
        <h3 class="pap-block-title">逸趣库</h3>
        <div class="pap-g8">
          <div class="pap-cell"><span class="pap-cell-num">{{ overview.totalItems }}</span><span class="pap-cell-label">总藏品</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ overview.totalGames }}</span><span class="pap-cell-label">游戏数</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ overview.totalHours }}<small>h</small></span><span class="pap-cell-label">总时长</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ overview.platformCount }}</span><span class="pap-cell-label">平台数</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ overview.seriesCount }}</span><span class="pap-cell-label">系列数</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ overview.seedCount }}</span><span class="pap-cell-label">种子数</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ overview.seededCount }}</span><span class="pap-cell-label">已照料</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ overview.bloomCount }}</span><span class="pap-cell-label">已开花</span></div>
        </div>
        <p v-if="overview.topPlatform !== '—' || overview.topGame !== '—'" class="pap-hint">
          最常玩「{{ overview.topPlatform }}」，投入最深的游戏是「{{ overview.topGame }}」。近 7 天新添 {{ overview.recent7 }} 件，近 30 天 {{ overview.recent30 }} 件。
        </p>
      </div>

      <!-- 品类分布 -->
      <div class="pap-block" v-if="typeRows.length">
        <h3 class="pap-block-title">品类分布</h3>
        <div class="pap-rows">
          <div v-for="r in typeRows" :key="r.type" class="pap-row">
            <span class="pap-row-icon">{{ r.icon }}</span>
            <span class="pap-row-label">{{ r.type }}</span>
            <div class="pap-row-bar"><div class="pap-row-fill" :style="{ width: pct(r.percentage) }"></div></div>
            <span class="pap-row-num">{{ r.count }} 件 · {{ r.percentage }}%</span>
          </div>
        </div>
      </div>

      <!-- 心情种子成长 -->
      <div class="pap-block" v-if="seedOvw && seedOvw.rows.some(r => r.count > 0)">
        <h3 class="pap-block-title">心情种子成长</h3>
        <div class="pap-seed-stages">
          <div v-for="r in seedOvw.rows" :key="r.stage" class="pap-seed-stage">
            <span class="pap-seed-dot" :style="{ background: r.color }"></span>
            <span class="pap-seed-label">{{ r.label }}</span>
            <span class="pap-seed-num">{{ r.count }} <small>{{ r.percentage }}%</small></span>
          </div>
        </div>
        <div v-if="seedOvw.moodDist.length" class="pap-moods">
          <span v-for="m in seedOvw.moodDist" :key="m.mood" class="pap-mood-chip">{{ m.mood }} · {{ m.count }}</span>
        </div>
        <p class="pap-hint">共浇水 {{ seedOvw.totalWater }} 次，平均每粒种子被照料 {{ seedOvw.avgWater }} 次。</p>
      </div>

      <!-- 收藏节律 -->
      <div class="pap-block" v-if="rhythm">
        <h3 class="pap-block-title">收藏节律</h3>
        <div class="pap-g5">
          <div class="pap-cell"><span class="pap-cell-num">{{ rhythm.activeDays }}</span><span class="pap-cell-label">活跃天数</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ rhythm.spanDays }}<small>天</small></span><span class="pap-cell-label">跨度</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ rhythm.monthAdditions }}</span><span class="pap-cell-label">本月新增</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ rhythm.monthHours }}<small>h</small></span><span class="pap-cell-label">本月时长</span></div>
          <div class="pap-cell"><span class="pap-cell-num">{{ rhythm.monthsTracked }}</span><span class="pap-cell-label">覆盖月份</span></div>
        </div>
      </div>

      <!-- 收藏健康 -->
      <div class="pap-block" v-if="health">
        <h3 class="pap-block-title">收藏健康</h3>
        <div class="pap-health">
          <div class="pap-health-score">
            <span class="pap-health-num">{{ health.score }}</span>
            <span class="pap-health-label">{{ health.label }}</span>
          </div>
          <div class="pap-health-bars">
            <div class="pap-hbar">
              <span class="pap-hbar-label">广度</span>
              <div class="pap-hbar-track"><div class="pap-hbar-fill" :style="{ width: pct(pctOf(health.breadth, 40)) }"></div></div>
              <span class="pap-hbar-num">{{ health.breadth }}/40</span>
            </div>
            <div class="pap-hbar">
              <span class="pap-hbar-label">深度</span>
              <div class="pap-hbar-track"><div class="pap-hbar-fill pap-hbar-fill--deep" :style="{ width: pct(pctOf(health.depth, 35)) }"></div></div>
              <span class="pap-hbar-num">{{ health.depth }}/35</span>
            </div>
            <div class="pap-hbar">
              <span class="pap-hbar-label">延续</span>
              <div class="pap-hbar-track"><div class="pap-hbar-fill pap-hbar-fill--cont" :style="{ width: pct(pctOf(health.continuity, 25)) }"></div></div>
              <span class="pap-hbar-num">{{ health.continuity }}/25</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="pap-insights">
        <li v-for="ins in insights" :key="ins.text" class="pap-insight">
          <span class="pap-insight-mark">✦</span>
          <span class="pap-insight-text">{{ ins.text }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayGallery } from '../modules/play'
import { usePlaySeeds } from '../modules/play/seeds'
import {
  playArchiveOverview,
  collectionTypeRows,
  moodSeedOverview,
  collectionRhythm,
  collectionHealth,
  playInsights,
} from '../modules/play/play-analytics'
import type { TimeSeed } from '../modules/play/seeds'

const pg = usePlayGallery()
const seedApi = usePlaySeeds()

const data = computed(() => ({
  games: pg.games.value,
  toys: pg.toys.value,
  models: pg.models.value,
  others: pg.others.value,
}))
const seeds = computed<TimeSeed[]>(() => seedApi.seeds.value)
const now = computed(() => new Date())

const hasData = computed(() =>
  data.value.games.length + data.value.toys.length + data.value.models.length + data.value.others.length > 0
  || seeds.value.length > 0)

const overview = computed(() => hasData.value ? playArchiveOverview(data.value, seeds.value, now.value) : null)
const typeRows = computed(() => hasData.value ? collectionTypeRows(data.value) : [])
const seedOvw = computed(() => hasData.value ? moodSeedOverview(seeds.value, now.value) : null)
const rhythm = computed(() => hasData.value ? collectionRhythm(data.value, seeds.value, now.value) : null)
const health = computed(() => hasData.value ? collectionHealth(data.value, seeds.value, now.value) : null)
const insights = computed(() => hasData.value ? playInsights(data.value, seeds.value, now.value) : [])

function pct(v: number): string {
  return `${Math.max(0, Math.min(100, Math.round(v)))}%`
}
function pctOf(part: number, full: number): number {
  return full > 0 ? (part / full) * 100 : 0
}
</script>

<style scoped>
.pap-archive {
  background: var(--bg-card, rgba(22, 19, 16, 0.72));
  border: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
  border-radius: var(--radius-lg, 16px);
  padding: 18px 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow, 0 4px 24px rgba(0, 0, 0, 0.4));
}

.pap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.pap-title {
  font-family: var(--font-serif, Georgia, 'Songti SC', serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}

.pap-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.pap-badge-gold {
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.35);
  background: rgba(240, 192, 64, 0.12);
}

.pap-badge-neutral {
  color: #9a8f80;
  border-color: rgba(154, 143, 128, 0.3);
  background: rgba(154, 143, 128, 0.1);
}

.pap-empty {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 13px;
  line-height: 1.7;
}

.pap-block {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
}

.pap-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-bottom: 10px;
}

.pap-hint {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  line-height: 1.6;
  margin-top: 8px;
}

/* ---- 概览格 ---- */
.pap-g8 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.pap-g5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.pap-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(154, 143, 128, 0.08);
}

.pap-cell-num {
  font-size: 19px;
  font-weight: 700;
  color: var(--text-primary, #e8e0d8);
}

.pap-cell-num small {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.65;
  margin-left: 2px;
}

.pap-cell-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

/* ---- 品类分布 ---- */
.pap-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pap-row {
  display: grid;
  grid-template-columns: 22px 1fr 90px 46px;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.pap-row-icon {
  font-size: 14px;
}

.pap-row-label {
  color: var(--text-primary, #e8e0d8);
  white-space: nowrap;
}

.pap-row-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(154, 143, 128, 0.15);
  overflow: hidden;
}

.pap-row-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
}

.pap-row-num {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  text-align: right;
}

/* ---- 心情种子 ---- */
.pap-seed-stages {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pap-seed-stage {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.pap-seed-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.pap-seed-label {
  color: var(--text-primary, #e8e0d8);
}

.pap-seed-num {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
}

.pap-seed-num small {
  font-size: 11px;
  opacity: 0.7;
}

.pap-moods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.pap-mood-chip {
  font-size: 11px;
  color: var(--text-primary, #e8e0d8);
  background: rgba(138, 154, 122, 0.14);
  border: 1px solid rgba(138, 154, 122, 0.25);
  border-radius: 999px;
  padding: 3px 9px;
}

/* ---- 收藏健康 ---- */
.pap-health {
  display: flex;
  gap: 18px;
  align-items: center;
}

.pap-health-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
}

.pap-health-num {
  font-size: 34px;
  font-weight: 700;
  color: #f0c040;
  line-height: 1;
}

.pap-health-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-top: 4px;
}

.pap-health-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pap-hbar {
  display: grid;
  grid-template-columns: 34px 1fr 36px;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.pap-hbar-label {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.pap-hbar-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(154, 143, 128, 0.15);
  overflow: hidden;
}

.pap-hbar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
}

.pap-hbar-fill--deep {
  background: linear-gradient(90deg, #c46a5a, #f0c040);
}

.pap-hbar-fill--cont {
  background: linear-gradient(90deg, #a08a7a, #f0c040);
}

.pap-hbar-num {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  text-align: right;
}

/* ---- 温和洞察 ---- */
.pap-insights {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 16px 0 0;
  border-top: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
  padding-top: 14px;
}

.pap-insight {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
}

.pap-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}

.pap-insight-text {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

@media (max-width: 480px) {
  .pap-g8 {
    grid-template-columns: repeat(2, 1fr);
  }
  .pap-g5 {
    grid-template-columns: repeat(3, 1fr);
  }
  .pap-health {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
</style>