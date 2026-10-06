<template>
  <section class="sgv">
    <div class="sgv-head">
      <div class="sgv-title-wrap">
        <span class="sgv-title">🧭 技能缺口可视化</span>
        <span class="sgv-sub">把距离拆成颜色与步数，让成长有迹可循</span>
      </div>
      <span v-if="summary" class="sgv-tag" :style="{ color: gapColor(summary.overallGapIndex) }">{{ summary.status }}</span>
    </div>

    <!-- 空态 -->
    <div v-if="!props.skills.length" class="sgv-empty">
      <span class="sgv-empty-icon">💻</span>
      <p class="sgv-empty-text">先在技能图谱中录入技能，才能对照目标角色测算缺口</p>
    </div>

    <template v-else>
      <!-- 目标角色选择 -->
      <div class="sgv-roles">
        <button
          v-for="r in TARGET_ROLES"
          :key="r.id"
          class="sgv-role"
          :class="{ active: activeRoleId === r.id }"
          :style="{ '--role-accent': r.accent }"
          @click="activeRoleId = r.id"
        >
          <span class="sgv-role-icon">{{ r.icon }}</span>
          <span class="sgv-role-name">{{ r.name }}</span>
        </button>
      </div>

      <!-- 缺口总览 -->
      <div v-if="summary" class="sgv-metrics">
        <div class="sgv-metric">
          <b :style="{ color: gapColor(summary.overallGapIndex) }">{{ summary.overallGapIndex }}</b>
          <span>总体缺口指数</span>
        </div>
        <div class="sgv-metric">
          <b>{{ summary.urgentGaps }}</b>
          <span>紧急缺口</span>
        </div>
        <div class="sgv-metric">
          <b>{{ summary.highGaps }}</b>
          <span>重点缺口</span>
        </div>
        <div class="sgv-metric">
          <b>{{ summary.totalGaps }}</b>
          <span>待补技能</span>
        </div>
      </div>
      <div v-if="summary" class="sgv-focus">
        <span>最薄弱领域 <b>{{ summary.weakestArea }}</b></span>
        <span>最强领域 <b>{{ summary.strongestArea }}</b></span>
      </div>

      <!-- 热力图 -->
      <div v-if="heatmap" class="sgv-block">
        <span class="sgv-block-label">缺口热力图</span>
        <div class="sgv-heatmap">
          <div class="sgv-heat-row sgv-heat-head">
            <span class="sgv-heat-corner"></span>
            <span v-for="c in heatmap.colLabels" :key="c" class="sgv-heat-col-label">{{ c }}</span>
          </div>
          <div v-for="(rowLabel, ri) in heatmap.rowLabels" :key="ri" class="sgv-heat-row">
            <span class="sgv-heat-row-label">{{ rowLabel }}</span>
            <div
              v-for="(_, ci) in heatmap.colLabels"
              :key="ci"
              class="sgv-heat-cell"
              :style="cellStyle(ri, ci)"
              :title="cellTitle(ri, ci)"
            ></div>
          </div>
        </div>
        <div class="sgv-heat-legend">
          <span v-for="(l, i) in HEAT_LEGEND" :key="l" class="sgv-heat-legend-item">
            <i :style="{ background: HEAT_STEPS[i] }"></i>{{ l }}
          </span>
        </div>
        <p v-if="heatmap.generatedAt" class="sgv-note">生成于 {{ fmtDate(heatmap.generatedAt) }}</p>
      </div>

      <!-- 缺口矩阵 -->
      <div v-if="matrix" class="sgv-block">
        <span class="sgv-block-label">{{ matrix.name }}</span>
        <div class="sgv-matrix">
          <div class="sgv-matrix-row sgv-matrix-head">
            <span class="sgv-matrix-skill">技能</span>
            <span v-for="d in matrix.dimensions" :key="d" class="sgv-matrix-dim">{{ d }}</span>
            <span class="sgv-matrix-ann">缺口</span>
          </div>
          <div v-for="(skill, i) in matrix.skills" :key="i" class="sgv-matrix-row">
            <span class="sgv-matrix-skill">{{ skill }}</span>
            <span v-for="(_, di) in matrix.dimensions" :key="di" class="sgv-matrix-val">{{ matrix.data[i][di] }}</span>
            <span class="sgv-matrix-ann">
              <em
                v-for="a in annFor(i)"
                :key="a.text"
                :class="`is-${a.type}`"
              >{{ a.text }}</em>
            </span>
          </div>
        </div>
        <ul v-if="matrix.insights.length" class="sgv-insights">
          <li v-for="(s, i) in matrix.insights" :key="i">{{ s }}</li>
        </ul>
      </div>

      <!-- 改善路线图 -->
      <div v-if="roadmap" class="sgv-block">
        <span class="sgv-block-label">{{ roadmap.name }}</span>
        <p class="sgv-advice">💡 {{ roadmap.priorityAdvice }}</p>
        <div class="sgv-road">
          <div
            v-for="p in roadmap.phases"
            :key="p.phase"
            class="sgv-phase"
            :style="{ '--phase-num-bg': p.phase % 2 ? 'rgba(138,154,122,0.14)' : 'rgba(107,159,196,0.14)' }"
          >
            <div class="sgv-phase-head">
              <span class="sgv-phase-num">{{ p.phase }}</span>
              <div class="sgv-phase-title-wrap">
                <b class="sgv-phase-name">{{ p.name }}</b>
                <span class="sgv-phase-meta">{{ p.weeks }} 周 · 每周 {{ p.weeklyHours }} 小时</span>
              </div>
            </div>
            <p class="sgv-phase-objective">{{ p.objective }}</p>
            <div v-if="p.skills.length" class="sgv-chips">
              <span v-for="s in p.skills" :key="s" class="sgv-chip">{{ s }}</span>
            </div>
            <div v-if="p.resources.length" class="sgv-res">
              <span class="sgv-res-label">建议资源</span>
              <span v-for="r in p.resources.slice(0, 3)" :key="r" class="sgv-res-item">{{ r }}</span>
            </div>
            <span class="sgv-phase-crit">{{ p.completionCriteria }}</span>
          </div>
        </div>

        <!-- 里程碑 -->
        <div class="sgv-mstone">
          <div
            v-for="m in roadmap.keyMilestones"
            :key="m.week"
            class="sgv-mstone-item"
            :style="{ '--mweek-pct': (m.week / Math.max(roadmap.totalWeeks, 1)) * 100 + '%' }"
          >
            <span class="sgv-mstone-dot"></span>
            <div class="sgv-mstone-body">
              <b>{{ m.name }}</b>
              <span>第 {{ m.week }} 周 · {{ m.description }}</span>
            </div>
          </div>
        </div>
        <p v-if="roadmap.estimatedCompletion" class="sgv-note">预计完成：{{ roadmap.estimatedCompletion }}</p>
      </div>

      <!-- 现状对比 -->
      <div v-if="comparison" class="sgv-block">
        <span class="sgv-block-label">{{ comparison.name }}</span>
        <div class="sgv-cmp-head">
          <div class="sgv-cmp-stat">
            <b>{{ comparison.current.avgProficiency }}</b>
            <span>当前均分 · {{ comparison.current.totalSkills }} 项技能</span>
          </div>
          <div class="sgv-cmp-arrow">→</div>
          <div class="sgv-cmp-stat">
            <b>{{ comparison.target.avgProficiency }}</b>
            <span>目标均分 · {{ comparison.target.totalSkills }} 项技能</span>
          </div>
        </div>
        <div v-for="rd in comparison.radarData" :key="rd.category" class="sgv-radar">
          <span class="sgv-radar-label">{{ rd.category }}</span>
          <div class="sgv-radar-bars">
            <div class="sgv-radar-track">
              <i class="sgv-radar-cur" :style="{ width: pct(rd.current, rd.max) }"></i>
            </div>
            <div class="sgv-radar-track">
              <i class="sgv-radar-tgt" :style="{ width: pct(rd.target, rd.max) }"></i>
            </div>
          </div>
          <span class="sgv-radar-val">{{ rd.current }} / {{ rd.target }}</span>
        </div>
        <div class="sgv-radar-hint">
          <span><i class="sgv-hint-cur"></i>当前</span>
          <span><i class="sgv-hint-tgt"></i>目标</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, shallowRef } from 'vue'
import { getLocalDateKey } from '../utils/time'
import {
  useSkillGapAdvisor,
  type SkillGapAnalysis,
} from '../modules/career/skill-gap-advisor'
import { useSkillGapVisualization } from '../modules/career/skill-gap-visualization'
import type { SkillNode, SkillCategory, ProficiencyLevel, CareerMilestone } from '../modules/career/skill-map'

interface TargetRole {
  id: string
  name: string
  icon: string
  accent: string
  skills: { name: string; category: SkillCategory; level: ProficiencyLevel }[]
}

const TARGET_ROLES: TargetRole[] = [
  {
    id: 'tech-lead',
    name: '技术负责人',
    icon: '🛠',
    accent: '#6b9fc4',
    skills: [
      { name: '系统架构', category: 'technical', level: 'advanced' },
      { name: '性能优化', category: 'technical', level: 'intermediate' },
      { name: '团队管理', category: 'leadership', level: 'advanced' },
      { name: '项目管理', category: 'leadership', level: 'intermediate' },
      { name: '沟通能力', category: 'soft', level: 'intermediate' },
      { name: '技术选型', category: 'technical', level: 'advanced' },
    ],
  },
  {
    id: 'product',
    name: '产品经理',
    icon: '🧩',
    accent: '#f0c040',
    skills: [
      { name: '需求分析', category: 'domain', level: 'advanced' },
      { name: '用户研究', category: 'domain', level: 'intermediate' },
      { name: '数据分析', category: 'technical', level: 'intermediate' },
      { name: '沟通能力', category: 'soft', level: 'advanced' },
      { name: '项目管理', category: 'leadership', level: 'intermediate' },
      { name: '原型设计', category: 'creative', level: 'beginner' },
    ],
  },
  {
    id: 'frontend',
    name: '前端架构师',
    icon: '💻',
    accent: '#8a9a7a',
    skills: [
      { name: '系统架构', category: 'technical', level: 'advanced' },
      { name: '性能优化', category: 'technical', level: 'expert' },
      { name: '工程化', category: 'technical', level: 'advanced' },
      { name: '技术选型', category: 'technical', level: 'advanced' },
      { name: '团队管理', category: 'leadership', level: 'intermediate' },
      { name: '技术写作', category: 'creative', level: 'intermediate' },
    ],
  },
  {
    id: 'data',
    name: '数据分析师',
    icon: '📊',
    accent: '#d98c7a',
    skills: [
      { name: '数据分析', category: 'technical', level: 'advanced' },
      { name: '统计学', category: 'domain', level: 'intermediate' },
      { name: 'SQL', category: 'technical', level: 'advanced' },
      { name: '可视化', category: 'creative', level: 'intermediate' },
      { name: '业务理解', category: 'domain', level: 'intermediate' },
      { name: '沟通能力', category: 'soft', level: 'intermediate' },
    ],
  },
]

const HEAT_STEPS = ['#8a9a7a', '#a3b06e', '#c9b85a', '#d89a5a', '#c46a5a']
const HEAT_LEGEND = ['无缺口', '轻微', '中等', '较大', '严重']

const props = defineProps<{ skills: SkillNode[]; milestones: CareerMilestone[] }>()

const viz = useSkillGapVisualization()
const advisor = useSkillGapAdvisor()

const activeRoleId = ref(TARGET_ROLES[0].id)
const analysis = shallowRef<SkillGapAnalysis | null>(null)

// 组合式函数返回对象内的 ref 不会自动解包，抽成顶层 computed
const heatmap = computed(() => viz.heatmap.value)
const matrix = computed(() => viz.matrix.value)
const roadmap = computed(() => viz.roadmap.value)
const comparison = computed(() => viz.comparison.value)
const summary = computed(() => viz.heatmapSummary.value)

const activeRole = computed(() => TARGET_ROLES.find(r => r.id === activeRoleId.value) || TARGET_ROLES[0])

function refresh() {
  if (!props.skills.length) return
  const res = advisor.analyzeGaps(props.skills, activeRole.value.skills, props.milestones, activeRole.value.name)
  analysis.value = res
  viz.generateFullReport(props.skills, res.gaps, activeRole.value.skills, activeRole.value.name)
}

function cellStyle(row: number, col: number) {
  const cell = matchCell(row, col)
  return {
    background: cell ? cell.color : 'rgba(255,255,255,0.02)',
    opacity: cell ? 0.35 + cell.intensity * 0.6 : 0.4,
  }
}

function cellTitle(row: number, col: number) {
  const cell = matchCell(row, col)
  if (!cell) return ''
  return `${cell.skillName}：当前 ${cell.currentLevel} → 目标 ${cell.targetLevel}（缺口 ${cell.gapSize}）`
}

function matchCell(row: number, col: number) {
  if (!heatmap.value) return null
  return heatmap.value.cells.find(c => c.row === row && c.col === col) || null
}

function annFor(row: number) {
  if (!matrix.value) return []
  return matrix.value.annotations.filter(a => a.row === row)
}

function pct(val: number, max: number) {
  return Math.min(Math.round((val / Math.max(max, 1)) * 100), 100) + '%'
}

function gapColor(gap: number) {
  if (gap >= 60) return '#c46a5a'
  if (gap >= 30) return '#d89a5a'
  return '#8a9a7a'
}

function fmtDate(iso: string) {
  return getLocalDateKey(new Date(iso))
}

watch([() => props.skills, () => props.milestones, activeRoleId], refresh, { deep: true })
onMounted(refresh)
</script>

<style scoped>
.sgv {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.sgv-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.sgv-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.sgv-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.sgv-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.sgv-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); white-space: nowrap; }

.sgv-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 0; text-align: center; }
.sgv-empty-icon { font-size: 30px; opacity: 0.5; }
.sgv-empty-text { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.sgv-roles { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.sgv-role { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 10px; border: 1px solid var(--border, rgba(255,255,255,0.08)); background: rgba(255,255,255,0.02); color: rgba(232,221,208,0.6); font-size: 12px; cursor: pointer; transition: all 0.25s ease; font-family: inherit; }
.sgv-role:hover { color: rgba(232, 221, 208, 0.85); border-color: rgba(255,255,255,0.16); }
.sgv-role.active { color: var(--role-accent, #8a9a7a); border-color: var(--role-accent, #8a9a7a); background: rgba(var(--accent-rgb), 0.1); }
.sgv-role-icon { font-size: 14px; }

.sgv-metrics { display: flex; gap: 8px; margin-bottom: 10px; }
.sgv-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.sgv-metric b { font-size: 17px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.sgv-metric span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.sgv-focus { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 14px; padding: 8px 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); border-bottom: 1px dashed rgba(var(--accent-rgb), 0.14); }
.sgv-focus span { font-size: 11px; color: rgba(232, 221, 208, 0.55); }
.sgv-focus b { color: var(--text-high, rgba(232, 224, 216, 0.88)); font-weight: 500; }

.sgv-block { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; padding-top: 14px; border-top: 1px solid rgba(var(--accent-rgb), 0.1); }
.sgv-block-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }

/* Heatmap */
.sgv-heatmap { display: flex; flex-direction: column; gap: 3px; overflow-x: auto; }
.sgv-heat-row { display: flex; gap: 3px; align-items: center; }
.sgv-heat-head { margin-bottom: 2px; }
.sgv-heat-corner { width: 64px; flex-shrink: 0; }
.sgv-heat-col-label { flex: 1; min-width: 20px; text-align: center; font-size: 9px; color: rgba(232,221,208,0.45); }
.sgv-heat-row-label { width: 64px; flex-shrink: 0; font-size: 10px; color: rgba(232, 221, 208, 0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sgv-heat-cell { flex: 1; min-width: 20px; height: 20px; border-radius: 3px; }
.sgv-heat-legend { display: flex; gap: 12px; flex-wrap: wrap; }
.sgv-heat-legend-item { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; color: rgba(232, 221, 208, 0.4); }
.sgv-heat-legend-item i { width: 8px; height: 8px; border-radius: 2px; }

/* Matrix */
.sgv-matrix { display: flex; flex-direction: column; gap: 2px; }
.sgv-matrix-row { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 8px; }
.sgv-matrix-row:nth-child(even) { background: rgba(255,255,255,0.02); }
.sgv-matrix-head { background: rgba(var(--accent-rgb), 0.08) !important; }
.sgv-matrix-skill { flex: 0 0 30%; font-size: 12px; color: var(--text-high, rgba(232, 224, 216, 0.88)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sgv-matrix-dim { flex: 1; font-size: 9px; color: rgba(232, 221, 208, 0.4); text-align: center; }
.sgv-matrix-val { flex: 1; font-size: 12px; color: rgba(232, 221, 208, 0.75); text-align: center; font-variant-numeric: tabular-nums; }
.sgv-matrix-ann { flex: 1; display: flex; justify-content: center; gap: 4px; }
.sgv-matrix-ann em { font-style: normal; font-size: 9px; padding: 1px 6px; border-radius: 6px; }
.sgv-matrix-ann em.is-critical { background: rgba(196,106,90,0.16); color: #c46a5a; }
.sgv-matrix-ann em.is-warning { background: rgba(216,154,90,0.16); color: #d89a5a; }
.sgv-matrix-ann em.is-success { background: rgba(138,154,122,0.16); color: #8a9a7a; }
.sgv-matrix-ann em.is-info { background: rgba(107,159,196,0.16); color: #6b9fc4; }

.sgv-insights { list-style: none; margin: 6px 0 0; padding: 10px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 6px; }
.sgv-insights li { font-size: 11px; color: rgba(232, 221, 208, 0.55); }
.sgv-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }

/* Roadmap */
.sgv-advice { font-size: 12px; color: rgba(232, 221, 208, 0.65); margin: 0 0 8px; line-height: 1.5; }
.sgv-road { display: flex; flex-direction: column; gap: 10px; }
.sgv-phase { padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.sgv-phase-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.sgv-phase-num { width: 24px; height: 24px; border-radius: 50%; background: var(--phase-num-bg, rgba(138,154,122,0.14)); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text-high); flex-shrink: 0; }
.sgv-phase-title-wrap { display: flex; flex-direction: column; }
.sgv-phase-name { font-size: 13px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.sgv-phase-meta { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.sgv-phase-objective { font-size: 11px; color: rgba(232, 221, 208, 0.6); margin: 0 0 8px; line-height: 1.5; }
.sgv-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.sgv-chip { font-size: 10px; padding: 2px 8px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); }
.sgv-res { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 6px; }
.sgv-res-label { font-size: 9px; color: rgba(232, 221, 208, 0.35); }
.sgv-res-item { font-size: 10px; padding: 2px 8px; border-radius: 6px; background: rgba(255,255,255,0.04); color: rgba(232, 221, 208, 0.5); }
.sgv-phase-crit { font-size: 10px; color: rgba(232, 221, 208, 0.45); font-style: italic; }

.sgv-mstone { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.sgv-mstone-item { display: flex; align-items: center; gap: 10px; position: relative; margin-left: 8px; }
.sgv-mstone-item::before { content: ''; position: absolute; left: 4px; top: 18px; bottom: -20px; width: 1px; background: rgba(var(--accent-rgb), 0.14); }
.sgv-mstone-item:last-child::before { display: none; }
.sgv-mstone-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--mweek-pct) linear-gradient(135deg, #8a9a7a, #6b9fc4); flex-shrink: 0; box-shadow: 0 0 6px rgba(138,154,122,0.2); }
.sgv-mstone-body { display: flex; flex-direction: column; gap: 2px; }
.sgv-mstone-body b { font-size: 12px; color: var(--text-high, rgba(232, 224, 216, 0.88)); font-weight: 500; }
.sgv-mstone-body span { font-size: 10px; color: rgba(232, 221, 208, 0.45); }

.sgv-note { font-size: 10px; color: rgba(232, 221, 208, 0.35); margin: 4px 0 0; }

/* Comparison */
.sgv-cmp-head { display: flex; align-items: center; gap: 12px; justify-content: space-around; margin-bottom: 12px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.sgv-cmp-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.sgv-cmp-stat b { font-size: 22px; font-weight: 500; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.sgv-cmp-stat span { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.sgv-cmp-arrow { font-size: 16px; color: rgba(232, 221, 208, 0.4); }
.sgv-radar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.sgv-radar-label { width: 58px; font-size: 10px; color: rgba(232, 221, 208, 0.6); flex-shrink: 0; }
.sgv-radar-bars { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.sgv-radar-track { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.05); overflow: hidden; }
.sgv-radar-cur { display: block; height: 100%; border-radius: 999px; background: #8a9a7a; }
.sgv-radar-tgt { display: block; height: 100%; border-radius: 999px; background: rgba(107, 159, 196, 0.7); }
.sgv-radar-val { width: 62px; text-align: right; font-size: 10px; color: rgba(232, 221, 208, 0.55); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.sgv-radar-hint { display: flex; gap: 14px; justify-content: center; }
.sgv-radar-hint span { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.sgv-hint-cur { width: 10px; height: 5px; border-radius: 3px; background: #8a9a7a; }
.sgv-hint-tgt { width: 10px; height: 5px; border-radius: 3px; background: rgba(107, 159, 196, 0.7); }
</style>