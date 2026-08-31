<template>
  <section class="whp-panel" aria-label="工作习惯档案">
    <!-- 空态：习惯未显影 -->
    <template v-if="profile.insights.length === 0 && profile.timeSlotProductivity.length === 0">
      <div class="whp-head">
        <span class="whp-title">🌿 工作习惯档案</span>
        <span class="whp-badge whp-badge-neutral">习惯未显影</span>
      </div>
      <p class="whp-empty">
        还没有工作日志可供分析。写下第一条日志后，习惯画像便会在此显影——时段生产力、峰值低谷、连续节奏与温和洞察都将汇聚。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="whp-head">
        <span class="whp-title">🌿 工作习惯档案</span>
        <span class="whp-badge">{{ badge.text }}</span>
      </div>

      <!-- 档案概览 -->
      <div class="whp-block">
        <h3 class="whp-block-title">档案概览</h3>
        <div class="whp-grid">
          <div class="whp-cell">
            <b>{{ profile.entryCount }}</b><span>日志总数</span>
          </div>
          <div class="whp-cell">
            <b>{{ profile.avgDailyEntries }}</b><span>日均日志</span>
          </div>
          <div class="whp-cell">
            <b>{{ profile.avgDailyFocus }}</b><span>日均专注</span>
          </div>
          <div class="whp-cell">
            <b>{{ profile.streakPattern.currentStreak }}</b><span>当前连续</span>
          </div>
          <div class="whp-cell">
            <b>{{ profile.streakPattern.longestStreak }}</b><span>最长连续</span>
          </div>
          <div class="whp-cell">
            <b>{{ profile.bestDayOfWeek || '—' }}</b><span>最佳工作日</span>
          </div>
          <div class="whp-cell">
            <b>{{ profile.worstDayOfWeek || '—' }}</b><span>最差工作日</span>
          </div>
          <div class="whp-cell">
            <b>{{ rhythmLabel }}</b><span>工作节奏</span>
          </div>
        </div>
      </div>

      <!-- 时段生产力 -->
      <div class="whp-block" v-if="profile.timeSlotProductivity.length">
        <h3 class="whp-block-title">时段生产力</h3>
        <div class="whp-slots">
          <div v-for="s in profile.timeSlotProductivity" :key="s.slot" class="whp-slot-row">
            <span class="whp-slot-label" :class="{ 'whp-slot-peak': s.isPeak }">
              {{ s.label }}{{ s.isPeak ? ' · 峰值' : '' }}
            </span>
            <div class="whp-slot-bar">
              <div class="whp-slot-fill" :style="{ width: slotWidth(s.productivityScore) }"></div>
            </div>
            <span class="whp-slot-val">{{ s.productivityScore }}分 · {{ s.entryCount }}条</span>
          </div>
        </div>
      </div>

      <!-- 标签偏好 -->
      <div class="whp-block" v-if="profile.topTags.length">
        <h3 class="whp-block-title">标签偏好</h3>
        <div class="whp-tags">
          <span v-for="t in profile.topTags.slice(0, 8)" :key="t.tag" class="whp-tag">
            #{{ t.tag }} <i>{{ t.count }}</i>
          </span>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="whp-insights">
        <li v-for="ins in profile.insights" :key="ins.title" class="whp-insight">
          <span class="whp-insight-mark">✦</span>
          <span class="whp-insight-text">
            <b>{{ ins.title }}</b>
            <span>{{ ins.description }}</span>
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LogEntry } from '../modules/worklog/types'
import { useWorklogHabits } from '../modules/worklog/worklog-habits'

const props = defineProps<{ entries: LogEntry[] }>()

const habits = useWorklogHabits()

const profile = computed(() => {
  const p = habits.buildProfile(props.entries)
  return { ...p, entryCount: props.entries.length }
})

const badge = computed(() => {
  const sp = profile.value.streakPattern
  if (sp.currentStreak >= 7) return { text: '连续记录中' }
  if (profile.value.entryCount > 0) return { text: '习惯显影' }
  return { text: '习惯未显影' }
})

const rhythmLabel = computed(() => {
  const t = profile.value.rhythm.type
  return t === 'sprinter' ? '短跑型' : t === 'marathoner' ? '长跑型' : t === 'steady' ? '稳健型' : '不规则型'
})

function slotWidth(score: number): string {
  return `${Math.max(4, Math.min(100, score))}%`
}
</script>

<style scoped>
.whp-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(212, 165, 116, 0.08), rgba(232, 192, 96, 0.04));
  border: 1px solid rgba(212, 165, 116, 0.22);
}

.whp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.whp-title {
  font-size: 15px;
  font-weight: 600;
  color: #e6d8c4;
}

.whp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 192, 96, 0.16);
  color: #e8c060;
  border: 1px solid rgba(232, 192, 96, 0.3);
}

.whp-badge-neutral {
  background: rgba(148, 163, 184, 0.12);
  color: #a8b0a0;
  border-color: rgba(148, 163, 184, 0.25);
}

.whp-empty {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #b0a890;
}

.whp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.whp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #d8c8a8;
}

.whp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.whp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(212, 165, 116, 0.07);
  text-align: center;
}

.whp-cell b {
  font-size: 16px;
  color: #e8c060;
}

.whp-cell span {
  font-size: 11px;
  color: #b0a890;
}

.whp-slots {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.whp-slot-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.whp-slot-label {
  flex: 0 0 110px;
  font-size: 12px;
  color: #b0a890;
}

.whp-slot-peak {
  color: #e8c060;
  font-weight: 600;
}

.whp-slot-bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgba(212, 165, 116, 0.14);
  overflow: hidden;
}

.whp-slot-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #d4a574, #e8c060);
  transition: width 0.4s ease;
}

.whp-slot-val {
  flex: 0 0 auto;
  font-size: 11px;
  color: #b0a890;
}

.whp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.whp-tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(212, 165, 116, 0.1);
  color: #d8c8a8;
  border: 1px solid rgba(212, 165, 116, 0.2);
}

.whp-tag i {
  font-style: normal;
  color: #e8c060;
  margin-left: 2px;
}

.whp-insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.whp-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.6;
  color: #c8b898;
}

.whp-insight-mark {
  color: #e8c060;
  flex: 0 0 auto;
}

.whp-insight-text {
  display: flex;
  flex-direction: column;
}

.whp-insight-text b {
  color: #e8c060;
  font-weight: 600;
}
</style>
