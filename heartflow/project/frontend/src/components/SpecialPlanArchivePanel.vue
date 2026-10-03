<template>
  <section class="spp-panel" aria-label="专项档案">
    <!-- 空态：专项未立 -->
    <template v-if="archive.overview.count === 0">
      <div class="spp-head">
        <span class="spp-title">🗺️ 专项档案</span>
        <span class="spp-badge spp-badge-neutral">专项未立</span>
      </div>
      <p class="spp-empty">
        还没有跨目标规划。写下第一个专项，把多个目标串联成一条路——档案便会在此显影：规划概览、里程碑进度、游离专项与温和洞察都将汇聚。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="spp-head">
        <span class="spp-title">🗺️ 专项档案</span>
        <span class="spp-badge">{{ badge.text }}</span>
      </div>

      <!-- 档案概览 -->
      <div class="spp-block">
        <h3 class="spp-block-title">档案概览</h3>
        <div class="spp-grid">
          <div class="spp-cell">
            <b>{{ archive.overview.count }}</b><span>规划总数</span>
          </div>
          <div class="spp-cell">
            <b>{{ archive.overview.linkedGoalCount }}</b><span>关联目标</span>
          </div>
          <div class="spp-cell">
            <b>{{ archive.overview.withMilestones }}</b><span>含里程碑</span>
          </div>
          <div class="spp-cell">
            <b>{{ archive.overview.averageProgress }}%</b><span>平均完成度</span>
          </div>
          <div class="spp-cell">
            <b>{{ archive.overview.totalMilestones }}</b><span>总里程碑</span>
          </div>
          <div class="spp-cell">
            <b>{{ archive.overview.doneMilestones }}</b><span>已完成</span>
          </div>
          <div class="spp-cell">
            <b>{{ archive.overview.overallProgress }}%</b><span>整体完成度</span>
          </div>
          <div class="spp-cell">
            <b>{{ archive.overview.addedThisWeek }}</b><span>近7天新增</span>
          </div>
        </div>
      </div>

      <!-- 里程碑进度 -->
      <div class="spp-block">
        <h3 class="spp-block-title">里程碑进度</h3>
        <div class="spp-progress">
          <div class="spp-progress-bar">
            <div class="spp-progress-fill" :style="{ width: archive.overview.overallProgress + '%' }"></div>
          </div>
          <div class="spp-progress-meta">
            <span>{{ archive.overview.doneMilestones }} / {{ archive.overview.totalMilestones }} 里程碑</span>
            <b>{{ archive.overview.overallProgress }}%</b>
          </div>
        </div>
      </div>

      <!-- 游离专项 -->
      <div class="spp-block" v-if="archive.orphans.length">
        <h3 class="spp-block-title">游离专项</h3>
        <ul class="spp-orphans">
          <li v-for="p in archive.orphans" :key="p.id" class="spp-orphan">
            <span class="spp-orphan-title">{{ p.title }}</span>
            <span class="spp-orphan-progress">{{ computeProgress(p) }}%</span>
          </li>
        </ul>
      </div>

      <!-- 专项提示（INCR-453：planSuggestion 此前引擎已实现却零 UI 消费） -->
      <div class="spp-block" v-if="planHints.length">
        <h3 class="spp-block-title">专项提示</h3>
        <ul class="spp-hints">
          <li v-for="h in planHints" :key="h.id" class="spp-hint">
            <span class="spp-hint-title">{{ h.title }}</span>
            <span class="spp-hint-text">{{ h.text }}</span>
          </li>
        </ul>
      </div>

      <!-- 温和洞察 -->
      <ul class="spp-insights">
        <li v-for="ins in archive.insights" :key="ins" class="spp-insight">
          <span class="spp-insight-mark">✦</span>
          <span class="spp-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SpecialPlan } from '../modules/goal/types'
import {
  computeSpecialPlanOverview,
  computePlanProgress,
  orphanPlans,
  planSuggestion,
} from '../modules/goal/special-plan-analytics'

const props = defineProps<{ plans: SpecialPlan[] }>()

const archive = computed(() => {
  const now = new Date().getTime()
  return {
    overview: computeSpecialPlanOverview(props.plans, now),
    orphans: orphanPlans(props.plans),
    insights: buildInsights(props.plans, now),
  }
})

/** INCR-453：逐条专项的具名提示（planSuggestion 为 null 表示无需提示） */
const planHints = computed(() =>
  props.plans
    .map((p) => ({ id: p.id, title: p.title, text: planSuggestion(p) }))
    .filter((x): x is { id: string; title: string; text: string } => Boolean(x.text)),
)

const badge = computed(() => {  const ov = archive.value.overview
  if (ov.overallProgress === 100 && ov.totalMilestones > 0) return { text: '全部点亮' }
  if (ov.overallProgress > 0) return { text: '推进中' }
  return { text: '规划起步' }
})

function computeProgress(plan: SpecialPlan): number {
  return computePlanProgress(plan)
}

function buildInsights(plans: SpecialPlan[], now: number): string[] {
  const insights: string[] = []
  const ov = computeSpecialPlanOverview(plans, now)
  const orphans = orphanPlans(plans)

  if (ov.count > 0 && ov.averageProgress > 0) {
    insights.push(`规划平均完成度 ${ov.averageProgress}%，整体点亮了 ${ov.doneMilestones}/${ov.totalMilestones} 个里程碑。`)
  }

  if (ov.overallProgress === 100 && ov.totalMilestones > 0) {
    insights.push('所有里程碑已全部点亮，可以回顾这段路，再写下新的专项。')
  }

  if (orphans.length > 0) {
    insights.push(`${orphans.length} 项专项尚未关联目标，关联后可让规划与愿景彼此呼应。`)
  }

  if (ov.addedThisWeek > 0) {
    insights.push(`近 7 天新增了 ${ov.addedThisWeek} 项专项规划，正在铺开新的路径。`)
  }

  const noMilestone = plans.filter((p) => p.milestones.length === 0).length
  if (noMilestone > 0) {
    insights.push(`${noMilestone} 项专项还未设定里程碑，可从写下第一小步开始。`)
  }

  if (insights.length === 0) {
    insights.push('规划已就位，静待里程碑逐一点亮。')
  }

  return insights.slice(0, 4)
}
</script>

<style scoped>
.spp-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(196, 149, 96, 0.08), rgba(232, 192, 96, 0.04));
  border: 1px solid rgba(196, 149, 96, 0.22);
}

.spp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.spp-title {
  font-size: 15px;
  font-weight: 600;
  color: #e6d8c4;
}

.spp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 192, 96, 0.16);
  color: #e8c060;
  border: 1px solid rgba(232, 192, 96, 0.3);
}

.spp-badge-neutral {
  background: rgba(148, 163, 184, 0.12);
  color: #a8b0a0;
  border-color: rgba(148, 163, 184, 0.25);
}

.spp-empty {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #b0a890;
}

.spp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #d8c8a8;
}

.spp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.spp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(196, 149, 96, 0.07);
  text-align: center;
}

.spp-cell b {
  font-size: 16px;
  color: #e8c060;
}

.spp-cell span {
  font-size: 11px;
  color: #b0a890;
}

.spp-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.spp-progress-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(196, 149, 96, 0.14);
  overflow: hidden;
}

.spp-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c49560, #e8c060);
  transition: width 0.4s ease;
}

.spp-progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #b0a890;
}

.spp-progress-meta b {
  color: #e8c060;
}

.spp-orphans {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.spp-orphan {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(196, 149, 96, 0.06);
  font-size: 12px;
}

.spp-orphan-title {
  color: #d8c8a8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spp-orphan-progress {
  color: #e8c060;
  flex: 0 0 auto;
}

/* 专项提示（INCR-453） */
.spp-hints {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.spp-hint {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(232, 192, 96, 0.06);
  font-size: 12px;
}

.spp-hint-title {
  color: #e8c060;
  flex: 0 0 auto;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spp-hint-text {
  color: rgba(216, 200, 168, 0.85);
  line-height: 1.6;
}

.spp-insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spp-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.6;
  color: #c8b898;
}

.spp-insight-mark {
  color: #e8c060;
  flex: 0 0 auto;
}
</style>
