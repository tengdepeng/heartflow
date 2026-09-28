<template>
  <section class="scap-panel">
    <!-- 空态：尚未开炉 -->
    <template v-if="archive.overview.total === 0">
      <div class="scap-head">
        <span class="scap-title">⚒️ 铸造档案</span>
        <span class="scap-badge scap-badge-neutral">印记待启</span>
      </div>
      <EmptyState title="工痕尚未开炉。身体留下的印记值得被如实看见——点下砧板，记下最近一道，铸造档案便会在此显影：锻造节律、铸造健康与温和洞察都将汇聚。" :glow="false" cta-label="" />
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="scap-head">
        <span class="scap-title">⚒️ 铸造档案</span>
        <span class="scap-badge">{{ archive.health.label }}</span>
      </div>

      <!-- 档案概览 -->
      <div class="scap-block">
        <h3 class="scap-block-title">档案概览</h3>
        <div class="scap-grid">
          <div class="scap-cell">
            <b>{{ archive.overview.total }}</b><span>总印记</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.overview.mild }}</b><span>轻中度</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.overview.severe }}</b><span>重度(≥4)</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.overview.thisMonth }}</b><span>本月新增</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.overview.bodyPartsCovered }}</b><span>覆盖部位</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.overview.avgSeverity }}</b><span>平均严重度</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.overview.avgAgeDays }}</b><span>平均印记年龄(天)</span>
          </div>
          <div class="scap-cell">
            <b class="scap-cell--sm">{{ lastActiveLabel }}</b><span>最近记录</span>
          </div>
        </div>
      </div>

      <!-- 锻造节律 -->
      <div class="scap-block">
        <h3 class="scap-block-title">锻造节律</h3>
        <div class="scap-grid">
          <div class="scap-cell">
            <b>{{ archive.rhythm.weeklyCount }}</b><span>近7天</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.rhythm.monthlyCount }}</b><span>近30天</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.rhythm.activeDays }}</b><span>有记录天数</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.rhythm.streakDays }}</b><span>连续记录</span>
          </div>
          <div class="scap-cell">
            <b>{{ archive.rhythm.avgGapDays }}</b><span>平均间隔(天)</span>
          </div>
        </div>
      </div>

      <!-- 铸造健康 -->
      <div class="scap-block">
        <h3 class="scap-block-title">铸造健康</h3>
        <div class="scap-health">
          <div class="scap-health-score">
            <b>{{ archive.health.score }}</b>
            <span>{{ archive.health.label }}</span>
          </div>
          <div class="scap-health-bars">
            <div class="scap-health-row">
              <span class="scap-health-label">觉察广度</span>
              <div class="scap-health-bar"><i :style="{ width: archive.health.breadth + '%' }"></i></div>
              <span class="scap-health-val">{{ archive.health.breadth }}</span>
            </div>
            <div class="scap-health-row">
              <span class="scap-health-label">沉淀深度</span>
              <div class="scap-health-bar"><i :style="{ width: archive.health.depth + '%' }"></i></div>
              <span class="scap-health-val">{{ archive.health.depth }}</span>
            </div>
            <div class="scap-health-row">
              <span class="scap-health-label">锻造节律</span>
              <div class="scap-health-bar"><i :style="{ width: archive.health.cadence + '%' }"></i></div>
              <span class="scap-health-val">{{ archive.health.cadence }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="scap-insights">
        <li v-for="ins in archive.insights" :key="ins" class="scap-insight">
          <span class="scap-insight-mark">✦</span>
          <span class="scap-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScarMark } from '../modules/scar'
import EmptyState from '../components/EmptyState.vue'
import {
  scarOverview,
  scarRhythm,
  scarHealth,
  scarInsights,
} from '../modules/scar/scar-analytics'

const props = defineProps<{ marks: ScarMark[] }>()

const archive = computed(() => {
  const now = new Date()
  return {
    overview: scarOverview(props.marks, now),
    rhythm: scarRhythm(props.marks, now),
    health: scarHealth(props.marks, now),
    insights: scarInsights(props.marks, now),
  }
})

const lastActiveLabel = computed(() => {
  const last = archive.value.overview.lastActive
  if (!last) return '—'
  const d = new Date(last)
  if (!isFinite(d.getTime())) return '—'
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
</script>

<style scoped>
.scap-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 16px;
  border: 1px solid rgba(196, 138, 106, 0.18);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(196, 138, 106, 0.08), rgba(232, 192, 96, 0.04));
}

.scap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.scap-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #e8c060;
}

.scap-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 192, 96, 0.14);
  color: #e8c060;
  border: 1px solid rgba(232, 192, 96, 0.25);
  white-space: nowrap;
}

.scap-badge-neutral {
  background: rgba(138, 138, 122, 0.12);
  color: #8a8a7a;
  border-color: rgba(138, 138, 122, 0.2);
}


.scap-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scap-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: rgba(220, 208, 196, 0.9);
}

.scap-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.scap-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(196, 138, 106, 0.06);
  border: 1px solid rgba(196, 138, 106, 0.1);
}

.scap-cell b {
  font-size: 16px;
  font-weight: 700;
  color: #e8c060;
  line-height: 1.2;
}

.scap-cell--sm {
  font-size: 12px !important;
  color: #d4a574 !important;
}

.scap-cell span {
  font-size: 11px;
  color: rgba(220, 208, 196, 0.6);
}

.scap-health {
  display: flex;
  gap: 16px;
  align-items: center;
}

.scap-health-score {
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

.scap-health-score b {
  font-size: 30px;
  font-weight: 700;
  color: #e8c060;
  line-height: 1.1;
}

.scap-health-score span {
  font-size: 12px;
  color: rgba(220, 208, 196, 0.72);
  margin-top: 2px;
}

.scap-health-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scap-health-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scap-health-label {
  width: 56px;
  font-size: 12px;
  color: rgba(220, 208, 196, 0.7);
  flex-shrink: 0;
}

.scap-health-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(196, 138, 106, 0.14);
  overflow: hidden;
}

.scap-health-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c48a6a, #e8c060);
  transition: width 0.4s ease;
}

.scap-health-val {
  width: 28px;
  font-size: 12px;
  color: #d4a574;
  text-align: right;
  flex-shrink: 0;
}

.scap-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scap-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(220, 208, 196, 0.82);
}

.scap-insight-mark {
  color: #e8c060;
  flex-shrink: 0;
  margin-top: 2px;
}

@media (max-width: 480px) {
  .scap-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .scap-health {
    flex-direction: column;
    align-items: stretch;
  }
  .scap-health-score {
    min-width: 0;
  }
}
</style>
