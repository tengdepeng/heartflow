<template>
  <section class="mvap-panel" aria-label="动律档案">
    <!-- 空态：身体还空着 -->
    <template v-if="archive.overview.totalCount === 0">
      <div class="mvap-head">
        <span class="mvap-title">🏃 动律档案</span>
        <span class="mvap-badge mvap-badge-neutral">静待启程</span>
      </div>
      <p class="mvap-empty">
        身体还空着，等一场散步或伸展来落笔。记下最近一次律动，档案便会在此显影：运动节律、运动健康与温和洞察都将汇聚。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="mvap-head">
        <span class="mvap-title">🏃 动律档案</span>
        <span class="mvap-badge">{{ archive.health.label }}</span>
      </div>

      <!-- 档案概览 -->
      <div class="mvap-block">
        <h3 class="mvap-block-title">档案概览</h3>
        <div class="mvap-grid">
          <div class="mvap-cell">
            <b>{{ archive.overview.totalCount }}</b><span>总次数</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.overview.totalMinutes }}</b><span>总分钟</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.overview.avgDuration }}</b><span>平均时长(分)</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.overview.weeklyCount }}</b><span>本周</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.overview.monthlyCount }}</b><span>本月</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.overview.recent30 }}</b><span>近30天</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.overview.typeCount }}</b><span>类型数</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.overview.longestMove }}</b><span>最长单次(分)</span>
          </div>
        </div>
      </div>

      <!-- 运动节律 -->
      <div class="mvap-block">
        <h3 class="mvap-block-title">运动节律</h3>
        <div class="mvap-grid">
          <div class="mvap-cell">
            <b>{{ archive.rhythm.activeDays }}</b><span>活跃天数</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.rhythm.spanDays }}</b><span>跨度(天)</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.rhythm.currentStreak }}</b><span>当前连续</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.rhythm.bestStreak }}</b><span>最长连续</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.rhythm.avgGapDays }}</b><span>平均间隔(天)</span>
          </div>
          <div class="mvap-cell">
            <b>{{ archive.rhythm.weeklyPace }}</b><span>周均频次</span>
          </div>
        </div>
      </div>

      <!-- 运动健康 -->
      <div class="mvap-block">
        <h3 class="mvap-block-title">运动健康</h3>
        <div class="mvap-health">
          <div class="mvap-health-score">
            <b>{{ archive.health.score }}</b>
            <span>{{ archive.health.label }}</span>
          </div>
          <div class="mvap-health-bars">
            <div class="mvap-health-row">
              <span class="mvap-health-label">频率</span>
              <div class="mvap-health-bar"><i :style="{ width: archive.health.consistency + '%' }"></i></div>
              <span class="mvap-health-val">{{ archive.health.consistency }}</span>
            </div>
            <div class="mvap-health-row">
              <span class="mvap-health-label">多样性</span>
              <div class="mvap-health-bar"><i :style="{ width: archive.health.diversity + '%' }"></i></div>
              <span class="mvap-health-val">{{ archive.health.diversity }}</span>
            </div>
            <div class="mvap-health-row">
              <span class="mvap-health-label">仪式</span>
              <div class="mvap-health-bar"><i :style="{ width: archive.health.ritual + '%' }"></i></div>
              <span class="mvap-health-val">{{ archive.health.ritual }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 类型分布 -->
      <div class="mvap-block" v-if="archive.types.length">
        <h3 class="mvap-block-title">类型分布</h3>
        <div class="mvap-types">
          <div v-for="t in archive.types" :key="t.type" class="mvap-type-row">
            <span class="mvap-type-label">{{ t.icon }} {{ t.label }}</span>
            <div class="mvap-type-bar">
              <div class="mvap-type-fill" :style="{ width: t.percentage + '%' }"></div>
            </div>
            <span class="mvap-type-val">{{ t.count }}次 · {{ t.duration }}分</span>
          </div>
        </div>
      </div>

      <!-- 同游者 -->
      <div class="mvap-block" v-if="archive.companions.length">
        <h3 class="mvap-block-title">同游者</h3>
        <div class="mvap-companions">
          <span v-for="c in archive.companions" :key="c.name" class="mvap-companion">
            👤 {{ c.name }} <i>×{{ c.count }}</i>
          </span>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="mvap-insights">
        <li v-for="ins in archive.insights" :key="ins.text" class="mvap-insight">
          <span class="mvap-insight-mark">✦</span>
          <span class="mvap-insight-text">{{ ins.text }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Move } from '../modules/movement'
import {
  movementArchiveOverview,
  moveTypeRows,
  movementRhythm,
  moveCompanions,
  movementHealth,
  movementInsights,
} from '../modules/movement/movement-archive-analytics'

const props = defineProps<{ moves: Move[] }>()

const archive = computed(() => {
  const now = new Date()
  return {
    overview: movementArchiveOverview(props.moves, now),
    rhythm: movementRhythm(props.moves, now),
    health: movementHealth(props.moves, now),
    types: moveTypeRows(props.moves),
    companions: moveCompanions(props.moves),
    insights: movementInsights(props.moves, now),
  }
})
</script>

<style scoped>
.mvap-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 16px;
  border: 1px solid rgba(138, 154, 122, 0.2);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.08), rgba(232, 192, 96, 0.04));
}

.mvap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mvap-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #e8c060;
}

.mvap-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.16);
  color: #8a9a7a;
  border: 1px solid rgba(138, 154, 122, 0.28);
  white-space: nowrap;
}

.mvap-badge-neutral {
  background: rgba(138, 138, 122, 0.12);
  color: #8a8a7a;
  border-color: rgba(138, 138, 122, 0.2);
}

.mvap-empty {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: rgba(220, 208, 196, 0.72);
}

.mvap-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mvap-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: rgba(220, 208, 196, 0.9);
}

.mvap-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.mvap-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.07);
  border: 1px solid rgba(138, 154, 122, 0.12);
}

.mvap-cell b {
  font-size: 16px;
  font-weight: 700;
  color: #8a9a7a;
  line-height: 1.2;
}

.mvap-cell span {
  font-size: 11px;
  color: rgba(220, 208, 196, 0.6);
}

.mvap-health {
  display: flex;
  gap: 16px;
  align-items: center;
}

.mvap-health-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  padding: 14px 10px;
  border-radius: 12px;
  background: rgba(232, 192, 96, 0.1);
  border: 1px solid rgba(232, 192, 96, 0.22);
}

.mvap-health-score b {
  font-size: 30px;
  font-weight: 700;
  color: #e8c060;
  line-height: 1.1;
}

.mvap-health-score span {
  font-size: 12px;
  color: rgba(220, 208, 196, 0.72);
  margin-top: 2px;
}

.mvap-health-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mvap-health-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mvap-health-label {
  width: 56px;
  font-size: 12px;
  color: rgba(220, 208, 196, 0.7);
  flex-shrink: 0;
}

.mvap-health-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.16);
  overflow: hidden;
}

.mvap-health-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8a9a7a, #e8c060);
  transition: width 0.4s ease;
}

.mvap-health-val {
  width: 28px;
  font-size: 12px;
  color: #8a9a7a;
  text-align: right;
  flex-shrink: 0;
}

.mvap-types {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mvap-type-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.mvap-type-label {
  width: 96px;
  color: rgba(220, 208, 196, 0.72);
  flex-shrink: 0;
}

.mvap-type-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(138, 154, 122, 0.12);
  overflow: hidden;
}

.mvap-type-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #e8c060);
  transition: width 0.4s ease;
}

.mvap-type-val {
  width: 84px;
  text-align: right;
  color: rgba(220, 208, 196, 0.5);
  font-size: 11px;
  flex-shrink: 0;
}

.mvap-companions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mvap-companion {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.1);
  border: 1px solid rgba(138, 154, 122, 0.18);
  color: rgba(220, 208, 196, 0.8);
}

.mvap-companion i {
  font-style: normal;
  color: #8a9a7a;
  margin-left: 2px;
}

.mvap-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mvap-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(220, 208, 196, 0.82);
}

.mvap-insight-mark {
  color: #e8c060;
  flex-shrink: 0;
  margin-top: 2px;
}

@media (max-width: 480px) {
  .mvap-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .mvap-health {
    flex-direction: column;
    align-items: stretch;
  }
  .mvap-health-score {
    min-width: 0;
  }
}
</style>
