// ============================================================
// 业脉 · 技能缺口可视化引擎（P20-4）
// 热力图 + 缺口矩阵 + 改善路线图 + 对比视图
// ============================================================

import { ref, computed } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import type { SkillNode, SkillCategory, ProficiencyLevel } from './skill-map'
import { PROFICIENCY_META, SKILL_CATEGORY_META } from './skill-map'
import type { PrioritizedGap } from './skill-gap-advisor'

// ============================================================
// 类型定义
// ============================================================

/** 技能缺口热力图 */
export interface SkillGapHeatmap {
  /** 热力图单元格 */
  cells: HeatmapCell[]
  /** 行标签（技能分类） */
  rowLabels: string[]
  /** 列标签（熟练度级别） */
  colLabels: string[]
  /** 最大缺口值 */
  maxGap: number
  /** 总体缺口指数 */
  overallGapIndex: number
  /** 最薄弱领域 */
  weakestArea: string
  /** 最强领域 */
  strongestArea: string
  /** 生成时间 */
  generatedAt: string
}

/** 热力图单元格 */
export interface HeatmapCell {
  /** 行索引 */
  row: number
  /** 列索引 */
  col: number
  /** 技能名称 */
  skillName: string
  /** 技能分类 */
  category: SkillCategory
  /** 当前熟练度 */
  currentLevel: ProficiencyLevel
  /** 目标熟练度 */
  targetLevel: ProficiencyLevel
  /** 缺口大小 */
  gapSize: number
  /** 颜色强度 0-1 */
  intensity: number
  /** 颜色 */
  color: string
}

/** 缺口矩阵 */
export interface GapMatrix {
  /** 矩阵名称 */
  name: string
  /** 技能列表 */
  skills: string[]
  /** 维度（如：当前水平 vs 目标水平） */
  dimensions: string[]
  /** 矩阵数据 */
  data: number[][]
  /** 标注 */
  annotations: MatrixAnnotation[]
  /** 洞察 */
  insights: string[]
}

/** 矩阵标注 */
export interface MatrixAnnotation {
  /** 行 */
  row: number
  /** 列 */
  col: number
  /** 标注文本 */
  text: string
  /** 类型 */
  type: 'critical' | 'warning' | 'info' | 'success'
}

/** 改善路线图 */
export interface ImprovementRoadmap {
  /** 路线图名称 */
  name: string
  /** 阶段 */
  phases: ImprovementPhase[]
  /** 总周数 */
  totalWeeks: number
  /** 优先级建议 */
  priorityAdvice: string
  /** 预计完成时间 */
  estimatedCompletion: string
  /** 关键里程碑 */
  keyMilestones: RoadmapMilestone[]
}

/** 改善阶段 */
export interface ImprovementPhase {
  /** 阶段编号 */
  phase: number
  /** 阶段名称 */
  name: string
  /** 阶段目标 */
  objective: string
  /** 阶段技能 */
  skills: string[]
  /** 周数 */
  weeks: number
  /** 每周学习小时数 */
  weeklyHours: number
  /** 资源推荐 */
  resources: string[]
  /** 完成标准 */
  completionCriteria: string
}

/** 路线图里程碑 */
export interface RoadmapMilestone {
  /** 周数 */
  week: number
  /** 里程碑名称 */
  name: string
  /** 描述 */
  description: string
  /** 关联技能 */
  skills: string[]
}

/** 技能对比视图 */
export interface SkillComparisonView {
  /** 视图名称 */
  name: string
  /** 当前状态 */
  current: SkillSnapshot
  /** 目标状态 */
  target: SkillSnapshot
  /** 差距分析 */
  gaps: SkillGapEntry[]
  /** 雷达图数据 */
  radarData: RadarCategory[]
}

/** 技能快照 */
export interface SkillSnapshot {
  /** 标签 */
  label: string
  /** 技能总数 */
  totalSkills: number
  /** 各分类数量 */
  categoryCounts: Record<SkillCategory, number>
  /** 平均熟练度 */
  avgProficiency: number
}

/** 技能缺口条目 */
export interface SkillGapEntry {
  /** 技能名称 */
  skillName: string
  /** 分类 */
  category: SkillCategory
  /** 当前分数 */
  currentScore: number
  /** 目标分数 */
  targetScore: number
  /** 差距 */
  gap: number
  /** 百分比差距 */
  gapPercent: number
}

/** 雷达图分类 */
export interface RadarCategory {
  /** 分类名称 */
  category: string
  /** 当前值 */
  current: number
  /** 目标值 */
  target: number
  /** 最大值 */
  max: number
}

// ============================================================
// 颜色映射
// ============================================================

const GAP_COLOR_SCALE = [
  { threshold: 0, color: '#34d399' },   // 绿色：无缺口
  { threshold: 20, color: '#a3e635' },   // 浅绿：小缺口
  { threshold: 40, color: '#facc15' },   // 黄色：中等缺口
  { threshold: 60, color: '#cf8b6b' },   // 橙色：较大缺口
  { threshold: 80, color: '#ef4444' },   // 红色：严重缺口
]

function getGapColor(intensity: number): string {
  if (intensity <= 0) return GAP_COLOR_SCALE[0].color
  if (intensity <= 0.25) return GAP_COLOR_SCALE[1].color
  if (intensity <= 0.5) return GAP_COLOR_SCALE[2].color
  if (intensity <= 0.75) return GAP_COLOR_SCALE[3].color
  return GAP_COLOR_SCALE[4].color
}

// ============================================================
// useSkillGapVisualization Composable
// ============================================================

export function useSkillGapVisualization() {
  // ---- 状态 ----
  const heatmap = ref<SkillGapHeatmap | null>(null)
  const matrix = ref<GapMatrix | null>(null)
  const roadmap = ref<ImprovementRoadmap | null>(null)
  const comparison = ref<SkillComparisonView | null>(null)

  // ---- 热力图 ----

  /**
   * 生成技能缺口热力图
   */
  function generateHeatmap(
    currentSkills: SkillNode[],
    gaps: PrioritizedGap[],
  ): SkillGapHeatmap {
    const categories = Object.keys(SKILL_CATEGORY_META) as SkillCategory[]
    const levels: ProficiencyLevel[] = ['novice', 'beginner', 'intermediate', 'advanced', 'expert', 'master']

    const cells: HeatmapCell[] = []
    let maxGap = 0

    // 构建热力图单元格
    for (const gap of gaps) {
      const rowIndex = categories.indexOf(gap.category)
      const colIndex = levels.indexOf(gap.targetLevel)
      const intensity = Math.min(gap.gapSize / 100, 1)

      cells.push({
        row: rowIndex,
        col: colIndex,
        skillName: gap.skillName,
        category: gap.category,
        currentLevel: gap.currentLevel,
        targetLevel: gap.targetLevel,
        gapSize: gap.gapSize,
        intensity,
        color: getGapColor(intensity),
      })

      maxGap = Math.max(maxGap, gap.gapSize)
    }

    // 计算总体缺口指数
    const overallGapIndex = gaps.length > 0
      ? Math.round(gaps.reduce((s, g) => s + g.gapSize, 0) / gaps.length)
      : 0

    // 找出最薄弱和最强领域
    const categoryGaps: Record<string, { total: number; count: number }> = {}
    for (const gap of gaps) {
      if (!categoryGaps[gap.category]) {
        categoryGaps[gap.category] = { total: 0, count: 0 }
      }
      categoryGaps[gap.category].total += gap.gapSize
      categoryGaps[gap.category].count++
    }

    let weakestArea = '—'
    let strongestArea = '—'
    let maxAvgGap = 0
    let minAvgGap = Infinity

    for (const [cat, data] of Object.entries(categoryGaps)) {
      const avgGap = data.total / data.count
      if (avgGap > maxAvgGap) {
        maxAvgGap = avgGap
        weakestArea = SKILL_CATEGORY_META[cat as SkillCategory]?.label || cat
      }
      if (avgGap < minAvgGap) {
        minAvgGap = avgGap
        strongestArea = SKILL_CATEGORY_META[cat as SkillCategory]?.label || cat
      }
    }

    // 也考虑没有缺口的技能
    if (currentSkills.length > 0) {
      const existingCats = new Set(currentSkills.map(s => s.category))
      for (const cat of categories) {
        if (!existingCats.has(cat) && !categoryGaps[cat]) {
          weakestArea = SKILL_CATEGORY_META[cat]?.label || cat
          break
        }
      }
    }

    const result: SkillGapHeatmap = {
      cells,
      rowLabels: categories.map(c => SKILL_CATEGORY_META[c]?.label || c),
      colLabels: levels.map(l => PROFICIENCY_META[l]?.label || l),
      maxGap,
      overallGapIndex,
      weakestArea,
      strongestArea,
      generatedAt: new Date().toISOString(),
    }

    heatmap.value = result
    return result
  }

  /**
   * 获取热力图摘要
   */
  const heatmapSummary = computed(() => {
    if (!heatmap.value) return null

    const { overallGapIndex, weakestArea, strongestArea, cells } = heatmap.value

    const urgentCount = cells.filter(c => c.intensity >= 0.75).length
    const highCount = cells.filter(c => c.intensity >= 0.5 && c.intensity < 0.75).length

    return {
      overallGapIndex,
      weakestArea,
      strongestArea,
      totalGaps: cells.length,
      urgentGaps: urgentCount,
      highGaps: highCount,
      status: overallGapIndex >= 60 ? '需要重点关注' : overallGapIndex >= 30 ? '需要计划提升' : '状况良好',
    }
  })

  // ---- 缺口矩阵 ----

  /**
   * 生成缺口矩阵
   */
  function generateGapMatrix(
    currentSkills: SkillNode[],
    targetSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[],
    name: string = '技能缺口矩阵',
  ): GapMatrix {
    const skillNames = targetSkills.map(t => t.name)
    const dimensions = ['当前水平', '目标水平', '差距']

    const data: number[][] = []
    const annotations: MatrixAnnotation[] = []
    const insights: string[] = []

    for (let i = 0; i < targetSkills.length; i++) {
      const target = targetSkills[i]
      const existing = currentSkills.find(
        s => s.name.toLowerCase() === target.name.toLowerCase()
      )
      const currentScore = existing ? existing.proficiencyScore : 0
      const targetScore = PROFICIENCY_META[target.level].score
      const gap = targetScore - currentScore

      data.push([currentScore, targetScore, Math.max(gap, 0)])

      if (gap > 70) {
        annotations.push({
          row: i,
          col: 2,
          text: '严重缺口',
          type: 'critical',
        })
      } else if (gap > 40) {
        annotations.push({
          row: i,
          col: 2,
          text: '较大缺口',
          type: 'warning',
        })
      } else if (gap <= 0) {
        annotations.push({
          row: i,
          col: 2,
          text: '已达标',
          type: 'success',
        })
      }
    }

    // 生成洞察
    const criticalGaps = annotations.filter(a => a.type === 'critical')
    const warningGaps = annotations.filter(a => a.type === 'warning')
    const successCount = annotations.filter(a => a.type === 'success').length

    if (criticalGaps.length > 0) {
      insights.push(`有 ${criticalGaps.length} 个技能存在严重缺口，需要立即关注`)
    }
    if (warningGaps.length > 0) {
      insights.push(`有 ${warningGaps.length} 个技能存在较大缺口，建议制定学习计划`)
    }
    if (successCount > 0) {
      insights.push(`${successCount} 个技能已达标，可以保持并继续深化`)
    }
    if (data.length > 0) {
      const avgGap = data.reduce((s, d) => s + d[2], 0) / data.length
      insights.push(`平均缺口为 ${Math.round(avgGap)} 分，建议每周投入 8-10 小时学习`)
    }

    const result: GapMatrix = {
      name,
      skills: skillNames,
      dimensions,
      data,
      annotations,
      insights,
    }

    matrix.value = result
    return result
  }

  // ---- 改善路线图 ----

  /**
   * 生成改善路线图
   */
  function generateRoadmap(
    gaps: PrioritizedGap[],
    name: string = '技能改善路线图',
  ): ImprovementRoadmap {
    const sortedGaps = [...gaps].sort((a, b) => b.priorityScore - a.priorityScore)

    // 按优先级分组
    const urgentGaps = sortedGaps.filter(g => g.priority === 'urgent')
    const highGaps = sortedGaps.filter(g => g.priority === 'high')
    const mediumGaps = sortedGaps.filter(g => g.priority === 'medium')
    const lowGaps = sortedGaps.filter(g => g.priority === 'low')

    const phases: ImprovementPhase[] = []

    if (urgentGaps.length > 0) {
      phases.push({
        phase: 1,
        name: '紧急补缺',
        objective: '在最短时间内填补关键技能缺口，为后续提升奠定基础',
        skills: urgentGaps.map(g => g.skillName),
        weeks: Math.ceil(urgentGaps.reduce((s, g) => s + g.estimatedHours, 0) / 15),
        weeklyHours: 15,
        resources: urgentGaps.flatMap(g =>
          g.resources.filter(r => !r.completed).map(r => r.title)
        ),
        completionCriteria: '所有紧急缺口技能达到基础水平',
      })
    }

    if (highGaps.length > 0) {
      phases.push({
        phase: phases.length + 1,
        name: '核心提升',
        objective: '系统提升高优先级技能，达到行业标准水平',
        skills: highGaps.map(g => g.skillName),
        weeks: Math.ceil(highGaps.reduce((s, g) => s + g.estimatedHours, 0) / 12),
        weeklyHours: 12,
        resources: highGaps.flatMap(g =>
          g.resources.filter(r => !r.completed).map(r => r.title)
        ),
        completionCriteria: '高优先级技能达到中级水平',
      })
    }

    if (mediumGaps.length > 0 || lowGaps.length > 0) {
      const combined = [...mediumGaps, ...lowGaps]
      phases.push({
        phase: phases.length + 1,
        name: '全面精进',
        objective: '拓展技能广度，打造个人竞争优势',
        skills: combined.map(g => g.skillName),
        weeks: Math.ceil(combined.reduce((s, g) => s + g.estimatedHours, 0) / 10),
        weeklyHours: 10,
        resources: combined.flatMap(g =>
          g.resources.filter(r => !r.completed).map(r => r.title)
        ),
        completionCriteria: '所有缺口技能达到目标水平',
      })
    }

    if (phases.length === 0) {
      phases.push({
        phase: 1,
        name: '保持与深化',
        objective: '当前技能状况良好，继续保持并深化已有技能',
        skills: [],
        weeks: 4,
        weeklyHours: 8,
        resources: [
          '定期回顾技能图谱',
          '关注行业最新动态',
          '参与高级项目实践',
          '分享知识经验',
        ],
        completionCriteria: '维护当前技能水平，探索新方向',
      })
    }

    const totalWeeks = phases.reduce((s, p) => s + p.weeks, 0)
    const completionDate = new Date(Date.now() + totalWeeks * 7 * 86400000)
    const estimatedCompletion = getLocalDateKey(completionDate)

    // 生成关键里程碑
    const keyMilestones: RoadmapMilestone[] = []
    let currentWeek = 0
    for (const phase of phases) {
      currentWeek += phase.weeks
      keyMilestones.push({
        week: currentWeek,
        name: `完成「${phase.name}」阶段`,
        description: `掌握 ${phase.skills.slice(0, 3).join('、')}${phase.skills.length > 3 ? `等 ${phase.skills.length} 个技能` : ''}`,
        skills: phase.skills,
      })
    }

    // 优先级建议
    const priorityAdvice = urgentGaps.length > 0
      ? `建议优先处理 ${urgentGaps.length} 个紧急缺口，预计需要 ${phases[0]?.weeks || 0} 周`
      : gaps.length > 0
      ? `建议按计划逐步提升 ${gaps.length} 个技能缺口`
      : '当前技能状况良好，建议保持并持续深化'

    const result: ImprovementRoadmap = {
      name,
      phases,
      totalWeeks,
      priorityAdvice,
      estimatedCompletion,
      keyMilestones,
    }

    roadmap.value = result
    return result
  }

  // ---- 技能对比视图 ----

  /**
   * 生成技能对比视图
   */
  function generateComparison(
    currentSkills: SkillNode[],
    targetSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[],
    name: string = '技能对比',
  ): SkillComparisonView {
    // 当前快照
    const currentSnapshot: SkillSnapshot = {
      label: '当前状态',
      totalSkills: currentSkills.length,
      categoryCounts: {
        technical: 0, soft: 0, domain: 0, leadership: 0, creative: 0,
      },
      avgProficiency: currentSkills.length > 0
        ? Math.round(currentSkills.reduce((s, sk) => s + sk.proficiencyScore, 0) / currentSkills.length)
        : 0,
    }

    for (const s of currentSkills) {
      currentSnapshot.categoryCounts[s.category] = (currentSnapshot.categoryCounts[s.category] || 0) + 1
    }

    // 目标快照
    const targetSnapshot: SkillSnapshot = {
      label: '目标状态',
      totalSkills: targetSkills.length,
      categoryCounts: {
        technical: 0, soft: 0, domain: 0, leadership: 0, creative: 0,
      },
      avgProficiency: targetSkills.length > 0
        ? Math.round(targetSkills.reduce((s, t) => s + PROFICIENCY_META[t.level].score, 0) / targetSkills.length)
        : 0,
    }

    for (const t of targetSkills) {
      targetSnapshot.categoryCounts[t.category] = (targetSnapshot.categoryCounts[t.category] || 0) + 1
    }

    // 差距条目
    const gaps: SkillGapEntry[] = targetSkills.map(t => {
      const existing = currentSkills.find(
        s => s.name.toLowerCase() === t.name.toLowerCase()
      )
      const currentScore = existing ? existing.proficiencyScore : 0
      const targetScore = PROFICIENCY_META[t.level].score
      const gap = targetScore - currentScore

      return {
        skillName: t.name,
        category: t.category,
        currentScore,
        targetScore,
        gap: Math.max(gap, 0),
        gapPercent: targetScore > 0
          ? Math.round((Math.max(gap, 0) / targetScore) * 100)
          : 0,
      }
    })

    // 雷达图数据
    const categories = Object.keys(SKILL_CATEGORY_META) as SkillCategory[]
    const radarData: RadarCategory[] = categories.map(cat => {
      const currentSkillsInCat = currentSkills.filter(s => s.category === cat)
      const targetSkillsInCat = targetSkills.filter(t => t.category === cat)

      const currentAvg = currentSkillsInCat.length > 0
        ? Math.round(currentSkillsInCat.reduce((s, sk) => s + sk.proficiencyScore, 0) / currentSkillsInCat.length)
        : 0

      const targetAvg = targetSkillsInCat.length > 0
        ? Math.round(targetSkillsInCat.reduce((s, t) => s + PROFICIENCY_META[t.level].score, 0) / targetSkillsInCat.length)
        : 0

      return {
        category: SKILL_CATEGORY_META[cat]?.label || cat,
        current: currentAvg,
        target: targetAvg,
        max: 100,
      }
    })

    const result: SkillComparisonView = {
      name,
      current: currentSnapshot,
      target: targetSnapshot,
      gaps,
      radarData,
    }

    comparison.value = result
    return result
  }

  // ---- 批量操作 ----

  /**
   * 一键生成完整可视化报告
   */
  function generateFullReport(
    currentSkills: SkillNode[],
    gaps: PrioritizedGap[],
    targetSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[],
    reportName: string = '技能缺口分析报告',
  ): {
    heatmap: SkillGapHeatmap
    matrix: GapMatrix
    roadmap: ImprovementRoadmap
    comparison: SkillComparisonView
  } {
    return {
      heatmap: generateHeatmap(currentSkills, gaps),
      matrix: generateGapMatrix(currentSkills, targetSkills, reportName),
      roadmap: generateRoadmap(gaps, reportName),
      comparison: generateComparison(currentSkills, targetSkills, reportName),
    }
  }

  return {
    // 状态
    heatmap,
    matrix,
    roadmap,
    comparison,

    // 计算属性
    heatmapSummary,

    // 方法
    generateHeatmap,
    generateGapMatrix,
    generateRoadmap,
    generateComparison,
    generateFullReport,
  }
}