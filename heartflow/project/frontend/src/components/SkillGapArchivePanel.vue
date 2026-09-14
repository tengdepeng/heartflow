<template>
  <section class="sgp-panel" aria-label="技能缺口档案">
    <!-- 空态：技能未显影 -->
    <template v-if="!hasData">
      <div class="sgp-head">
        <span class="sgp-title">🧭 技能缺口档案</span>
        <span class="sgp-badge sgp-badge-neutral">技能未显影</span>
      </div>
      <p class="sgp-empty">
        还没有技能与里程碑可供分析。记录技能图谱并点亮里程碑后，缺口分析、学习路线图与温和洞察便会在此显影。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="sgp-head">
        <span class="sgp-title">🧭 技能缺口档案</span>
        <span class="sgp-badge" :class="badgeClass">{{ badge.text }}</span>
      </div>

      <!-- 档案概览 -->
      <div class="sgp-block">
        <h3 class="sgp-block-title">档案概览</h3>
        <div class="sgp-grid">
          <div class="sgp-cell">
            <b>{{ profile.summary.totalSkills }}</b><span>技能总数</span>
          </div>
          <div class="sgp-cell">
            <b>{{ profile.summary.coreSkills }}</b><span>核心技能</span>
          </div>
          <div class="sgp-cell">
            <b>{{ profile.summary.avgProficiency }}</b><span>平均熟练度</span>
          </div>
          <div class="sgp-cell">
            <b>{{ profile.summary.overallScore }}</b><span>整体评分</span>
          </div>
          <div class="sgp-cell">
            <b>{{ profile.coverage }}%</b><span>里程碑覆盖</span>
          </div>
          <div class="sgp-cell">
            <b>{{ profile.overallReadiness }}</b><span>整体准备度</span>
          </div>
          <div class="sgp-cell">
            <b class="sgp-cell-name">{{ strongestName }}</b><span>最强技能</span>
          </div>
          <div class="sgp-cell">
            <b class="sgp-cell-name">{{ weakestName }}</b><span>最弱技能</span>
          </div>
        </div>
      </div>

      <!-- 技能缺口 -->
      <div class="sgp-block" v-if="profile.gaps.length">
        <h3 class="sgp-block-title">技能缺口</h3>
        <div class="sgp-gaps">
          <div v-for="g in profile.gaps.slice(0, 6)" :key="g.skillName" class="sgp-gap">
            <div class="sgp-gap-head">
              <span class="sgp-gap-name">{{ g.skillName }}</span>
              <span class="sgp-priority" :class="`sgp-priority--${g.priority}`">{{ priorityLabel(g.priority) }}</span>
            </div>
            <div class="sgp-gap-meta">
              {{ levelLabel(g.currentLevel) }} → {{ levelLabel(g.targetLevel) }} · 缺口 {{ g.gapSize }} · 约 {{ g.estimatedHours }} 小时
            </div>
            <div class="sgp-gap-bar">
              <div class="sgp-gap-fill" :style="{ width: gapWidth(g) }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 学习路线图 -->
      <div class="sgp-block" v-if="profile.roadmap.roadmap.length">
        <h3 class="sgp-block-title">学习路线图</h3>
        <div class="sgp-roadmap">
          <div v-for="stage in profile.roadmap.roadmap" :key="stage.stage" class="sgp-stage">
            <span class="sgp-stage-num">{{ stage.stage }}</span>
            <div class="sgp-stage-body">
              <span class="sgp-stage-name">{{ stage.name }}</span>
              <span class="sgp-stage-skills">{{ stage.skills.join(' · ') }}</span>
              <span class="sgp-stage-meta">约 {{ stage.estimatedMonths }} 个月</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 里程碑关联 -->
      <div class="sgp-block" v-if="profile.milestoneConnections.length">
        <h3 class="sgp-block-title">里程碑关联</h3>
        <div class="sgp-milestones">
          <div v-for="c in profile.milestoneConnections.slice(0, 5)" :key="c.milestone.id" class="sgp-milestone">
            <div class="sgp-milestone-head">
              <span class="sgp-milestone-title">{{ c.milestone.title }}</span>
              <span class="sgp-milestone-readiness">{{ c.readiness }}%</span>
            </div>
            <span class="sgp-milestone-suggestion">{{ c.suggestion }}</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="sgp-insights">
        <li v-for="ins in profile.insights" :key="ins.title" class="sgp-insight">
          <span class="sgp-insight-mark">✦</span>
          <span class="sgp-insight-text">
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
import type { SkillNode, CareerMilestone } from '../modules/career/skill-map'
import { PROFICIENCY_META } from '../modules/career/skill-map'
import { useSkillGapAdvisor } from '../modules/career/skill-gap-advisor'

const props = defineProps<{ skills: SkillNode[]; milestones: CareerMilestone[] }>()

const advisor = useSkillGapAdvisor()

const hasData = computed(() => props.skills.length > 0 || props.milestones.length > 0)

const profile = computed(() => advisor.buildSkillGapProfile(props.skills, props.milestones))

const badge = computed(() => {
  const p = profile.value
  if (p.gapCount === 0 && p.summary.totalSkills > 0) return { text: '技能齐备' }
  if (p.gapCount > 0) return { text: `${p.gapCount} 项缺口` }
  return { text: '技能未显影' }
})

const badgeClass = computed(() => {
  const p = profile.value
  if (p.gapCount === 0 && p.summary.totalSkills > 0) return 'sgp-badge-positive'
  if (p.gapCount > 0) return 'sgp-badge-warn'
  return 'sgp-badge-neutral'
})

const strongestName = computed(() => profile.value.summary.strongestSkills[0]?.name || '—')
const weakestName = computed(() => profile.value.summary.weakestSkills[0]?.name || '—')

function levelLabel(level: string): string {
  return PROFICIENCY_META[level as keyof typeof PROFICIENCY_META]?.label || level
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = { urgent: '紧急', high: '高', medium: '中', low: '低' }
  return map[p] || p
}

function gapWidth(g: { gapSize: number }): string {
  return `${Math.max(4, Math.min(100, g.gapSize))}%`
}
</script>

<style scoped>
.sgp-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.sgp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sgp-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-high);
  letter-spacing: 0.02em;
}

.sgp-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px;
  border: 1px solid;
}

.sgp-badge-neutral {
  color: var(--text-secondary);
  border-color: rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.06);
}

.sgp-badge-warn {
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.3);
  background: rgba(240, 192, 64, 0.08);
}

.sgp-badge-positive {
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.3);
  background: rgba(138, 154, 122, 0.08);
}

.sgp-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.sgp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sgp-block-title {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}

.sgp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.sgp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 8px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.sgp-cell b {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-high);
  line-height: 1.2;
}

.sgp-cell-name {
  font-size: 12px !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sgp-cell span {
  font-size: 10px;
  color: var(--text-dim);
}

.sgp-gaps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sgp-gap {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.sgp-gap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sgp-gap-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-high);
}

.sgp-priority {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  border: 1px solid;
}

.sgp-priority--urgent { color: #c46a5a; border-color: rgba(196, 106, 90, 0.3); background: rgba(196, 106, 90, 0.08); }
.sgp-priority--high { color: #f0c040; border-color: rgba(240, 192, 64, 0.3); background: rgba(240, 192, 64, 0.08); }
.sgp-priority--medium { color: #6b9fc4; border-color: rgba(107, 159, 196, 0.3); background: rgba(107, 159, 196, 0.08); }
.sgp-priority--low { color: var(--text-secondary); border-color: rgba(var(--accent-rgb), 0.2); background: rgba(var(--accent-rgb), 0.06); }

.sgp-gap-meta {
  font-size: 11px;
  color: var(--text-low);
}

.sgp-gap-bar {
  height: 5px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}

.sgp-gap-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c46a5a, #f0c040);
}

.sgp-roadmap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sgp-stage {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.sgp-stage-num {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  color: var(--bg-card);
  background: linear-gradient(135deg, #6b9fc4, #8a9a7a);
}

.sgp-stage-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sgp-stage-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-high);
}

.sgp-stage-skills {
  font-size: 11px;
  color: var(--text-low);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sgp-stage-meta {
  font-size: 10px;
  color: var(--text-dim);
}

.sgp-milestones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sgp-milestone {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.sgp-milestone-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sgp-milestone-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-high);
}

.sgp-milestone-readiness {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: #8a9a7a;
}

.sgp-milestone-suggestion {
  font-size: 11px;
  color: var(--text-low);
}

.sgp-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sgp-insight {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.sgp-insight-mark {
  flex-shrink: 0;
  color: #f0c040;
  font-size: 12px;
  line-height: 1.6;
}

.sgp-insight-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sgp-insight-text b {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-high);
}

.sgp-insight-text span {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
}

@media (max-width: 520px) {
  .sgp-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
