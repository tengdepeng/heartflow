<template>
  <section class="rap-panel" aria-label="休憩档案">
    <!-- 空态：息壤未耕 -->
    <template v-if="archive.overview.total === 0">
      <div class="rap-head">
        <span class="rap-title">🌿 休憩档案</span>
        <span class="rap-badge rap-badge-neutral">息壤未耕</span>
      </div>
      <p class="rap-empty">
        息壤未曾耕动。允许自己停下来喝杯茶、散个步——记下一笔休憩，档案便会在此显影：活动分布、休憩节律、恢复健康与温和洞察都将汇聚。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="rap-head">
        <span class="rap-title">🌿 休憩档案</span>
        <span class="rap-badge">{{ archive.health.label }}</span>
      </div>

      <!-- 档案概览 -->
      <div class="rap-block">
        <h3 class="rap-block-title">档案概览</h3>
        <div class="rap-grid">
          <div class="rap-cell">
            <b>{{ archive.overview.total }}</b><span>总次数</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.overview.totalMinutes }}</b><span>总时长(分)</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.overview.avgDuration }}</b><span>平均时长(分)</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.overview.avgMood }}</b><span>平均心情</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.overview.thisMonth }}</b><span>本月</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.overview.thisMonthMinutes }}</b><span>本月时长(分)</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.overview.distinctDays }}</b><span>休息日数</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.overview.lastActive ? shortDate(archive.overview.lastActive) : '—' }}</b><span>最近一次</span>
          </div>
        </div>
      </div>

      <!-- 活动分布 -->
      <div class="rap-block" v-if="archive.activities.length">
        <h3 class="rap-block-title">活动分布</h3>
        <div class="rap-activities">
          <div v-for="a in archive.activities" :key="a.activity" class="rap-activity-row">
            <span class="rap-activity-label">{{ a.icon }} {{ a.name }}</span>
            <div class="rap-activity-bar">
              <div class="rap-activity-fill" :style="{ width: a.pct + '%' }"></div>
            </div>
            <span class="rap-activity-val">{{ a.count }}次 · {{ a.minutes }}分</span>
          </div>
        </div>
      </div>

      <!-- 休憩节律 -->
      <div class="rap-block">
        <h3 class="rap-block-title">休憩节律</h3>
        <div class="rap-grid">
          <div class="rap-cell">
            <b>{{ archive.rhythm.weeklyCount }}</b><span>近7天</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.rhythm.weeklyMinutes }}</b><span>近7天时长(分)</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.rhythm.streakDays }}</b><span>连续天数</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.rhythm.avgGapDays }}</b><span>平均间隔(天)</span>
          </div>
          <div class="rap-cell">
            <b>{{ archive.rhythm.peakDayCount }}</b><span>单日最多</span>
          </div>
        </div>
      </div>

      <!-- 恢复健康 -->
      <div class="rap-block">
        <h3 class="rap-block-title">恢复健康</h3>
        <div class="rap-health">
          <div class="rap-health-score">
            <b>{{ archive.health.score }}</b>
            <span>{{ archive.health.label }}</span>
          </div>
          <div class="rap-health-bars">
            <div class="rap-health-row">
              <span class="rap-health-label">广度</span>
              <div class="rap-health-bar"><i :style="{ width: archive.health.breadth + '%' }"></i></div>
              <span class="rap-health-val">{{ archive.health.breadth }}</span>
            </div>
            <div class="rap-health-row">
              <span class="rap-health-label">节律</span>
              <div class="rap-health-bar"><i :style="{ width: archive.health.cadence + '%' }"></i></div>
              <span class="rap-health-val">{{ archive.health.cadence }}</span>
            </div>
            <div class="rap-health-row">
              <span class="rap-health-label">滋养</span>
              <div class="rap-health-bar"><i :style="{ width: archive.health.nurture + '%' }"></i></div>
              <span class="rap-health-val">{{ archive.health.nurture }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="rap-insights">
        <li v-for="ins in archive.insights" :key="ins" class="rap-insight">
          <span class="rap-insight-mark">✦</span>
          <span class="rap-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BreakRecord, RestPractice } from '../modules/rest'
import {
  restOverview,
  restActivityRows,
  restRhythm,
  restHealth,
  restInsights,
} from '../modules/rest/rest-analytics'

const props = defineProps<{ records: BreakRecord[]; practices: RestPractice[] }>()

const archive = computed(() => {
  const now = new Date()
  return {
    overview: restOverview(props.records, now),
    activities: restActivityRows(props.records, props.practices),
    rhythm: restRhythm(props.records, now),
    health: restHealth(props.records, props.practices, now),
    insights: restInsights(props.records, props.practices, now),
  }
})

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.rap-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.08), rgba(232, 192, 96, 0.04));
  border: 1px solid rgba(138, 154, 122, 0.22);
}

.rap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.rap-title {
  font-size: 15px;
  font-weight: 600;
  color: #d8dcd0;
}

.rap-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 192, 96, 0.16);
  color: #e8c060;
  border: 1px solid rgba(232, 192, 96, 0.3);
}

.rap-badge-neutral {
  background: rgba(148, 163, 184, 0.12);
  color: #a8b0a0;
  border-color: rgba(148, 163, 184, 0.25);
}

.rap-empty {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #9aa090;
}

.rap-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rap-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #c8ccb8;
}

.rap-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.rap-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.07);
  text-align: center;
}

.rap-cell b {
  font-size: 16px;
  color: #e8c060;
}

.rap-cell span {
  font-size: 11px;
  color: #9aa090;
}

.rap-activities {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rap-activity-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rap-activity-label {
  flex: 0 0 96px;
  font-size: 12px;
  color: #c8ccb8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rap-activity-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.14);
  overflow: hidden;
}

.rap-activity-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8a9a7a, #e8c060);
}

.rap-activity-val {
  flex: 0 0 74px;
  font-size: 11px;
  color: #9aa090;
  text-align: right;
}

.rap-health {
  display: flex;
  gap: 14px;
  align-items: center;
}

.rap-health-score {
  flex: 0 0 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  border-radius: 12px;
  background: rgba(232, 192, 96, 0.1);
}

.rap-health-score b {
  font-size: 24px;
  color: #e8c060;
}

.rap-health-score span {
  font-size: 11px;
  color: #9aa090;
}

.rap-health-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rap-health-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rap-health-label {
  flex: 0 0 28px;
  font-size: 11px;
  color: #9aa090;
}

.rap-health-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.14);
  overflow: hidden;
}

.rap-health-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8a9a7a, #e8c060);
}

.rap-health-val {
  flex: 0 0 28px;
  font-size: 11px;
  color: #c8ccb8;
  text-align: right;
}

.rap-insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rap-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.6;
  color: #b8bca8;
}

.rap-insight-mark {
  color: #e8c060;
  flex: 0 0 auto;
}
</style>
