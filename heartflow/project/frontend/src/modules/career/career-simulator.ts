// ============================================================
// 业脉 · 职业模拟器（P20-4）
// 基于决策树的职业路径模拟 + 场景分析 + 期望值计算
// ============================================================

import { ref } from 'vue'
import type { SkillNode, SkillCategory, ProficiencyLevel, CareerMilestone } from './skill-map'
import type { Contact, CareerConnection } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 职业场景 */
export interface CareerScenario {
  /** 场景 ID */
  id: string
  /** 场景名称 */
  name: string
  /** 场景描述 */
  description: string
  /** 场景类型 */
  type: ScenarioType
  /** 当前技能 */
  currentSkills: SkillNode[]
  /** 当前人脉 */
  contacts: Contact[]
  /** 人脉连接 */
  connections: CareerConnection[]
  /** 里程碑 */
  milestones: CareerMilestone[]
  /** 决策选项 */
  decisions: DecisionNode[]
  /** 假设条件 */
  assumptions: ScenarioAssumption[]
}

/** 场景类型 */
export type ScenarioType =
  | 'promotion'      // 晋升场景
  | 'transition'     // 转型场景
  | 'startup'        // 创业场景
  | 'freelance'      // 自由职业场景
  | 'education'      // 进修场景
  | 'lateral'        // 平级调动场景
  | 'sabbatical'     // 休整期场景
  | 'dual-track'     // 双轨并行场景

/** 场景假设 */
export interface ScenarioAssumption {
  /** 假设名称 */
  name: string
  /** 假设值 */
  value: string | number
  /** 乐观估计 */
  optimistic: string | number
  /** 悲观估计 */
  pessimistic: string | number
  /** 影响权重 0-1 */
  weight: number
}

/** 决策节点 */
export interface DecisionNode {
  /** 节点 ID */
  id: string
  /** 决策标题 */
  title: string
  /** 决策描述 */
  description: string
  /** 父节点 ID（根节点为空） */
  parentId?: string
  /** 子节点 */
  children: DecisionNode[]
  /** 决策类型 */
  type: DecisionType
  /** 预期结果 */
  outcomes: DecisionOutcome[]
  /** 所需技能 */
  requiredSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[]
  /** 所需人脉 */
  requiredContacts: string[]
  /** 风险等级 1-5 */
  riskLevel: number
  /** 时间成本（月） */
  timeCost: number
  /** 财务成本 */
  financialCost?: number
  /** 是否已选择 */
  selected: boolean
}

/** 决策类型 */
export type DecisionType =
  | 'accept'       // 接受机会
  | 'decline'      // 拒绝
  | 'prepare'      // 准备/积累
  | 'negotiate'    // 协商
  | 'defer'        // 延迟
  | 'explore'      // 探索

/** 决策结果 */
export interface DecisionOutcome {
  /** 结果 ID */
  id: string
  /** 结果描述 */
  description: string
  /** 发生概率 0-1 */
  probability: number
  /** 技能提升 */
  skillGains: { skillName: string; gain: number }[]
  /** 人脉增值 */
  networkGrowth: number
  /** 收入影响（月薪变化百分比） */
  incomeImpact: number
  /** 满意度影响 0-100 */
  satisfactionImpact: number
  /** 是否为最佳结果 */
  isOptimal: boolean
  /** 是否为最差结果 */
  isWorst: boolean
}

/** 模拟结果 */
export interface SimulationResult {
  /** 场景 ID */
  scenarioId: string
  /** 模拟时间 */
  simulatedAt: string
  /** 决策路径 */
  decisionPath: DecisionPathStep[]
  /** 最终结果 */
  finalOutcome: DecisionOutcome
  /** 期望值 */
  expectedValue: number
  /** 技能变化 */
  skillChanges: SkillChange[]
  /** 综合评分 0-100 */
  overallScore: number
  /** 风险评估 */
  riskAssessment: RiskAssessment
  /** 建议 */
  recommendation: string
  /** 备选方案 */
  alternatives: AlternativeScenario[]
}

/** 决策路径步骤 */
export interface DecisionPathStep {
  /** 决策节点 ID */
  nodeId: string
  /** 决策标题 */
  title: string
  /** 选择的结果 */
  chosenOutcome: DecisionOutcome
  /** 累积评分 */
  cumulativeScore: number
}

/** 技能变化 */
export interface SkillChange {
  /** 技能名称 */
  skillName: string
  /** 变化前 */
  before: number
  /** 变化后 */
  after: number
  /** 变化量 */
  delta: number
}

/** 风险评估 */
export interface RiskAssessment {
  /** 总体风险等级 1-5 */
  overallRisk: number
  /** 财务风险 */
  financialRisk: number
  /** 职业风险 */
  careerRisk: number
  /** 技能风险 */
  skillRisk: number
  /** 人脉风险 */
  networkRisk: number
  /** 风险因素列表 */
  factors: RiskFactor[]
}

/** 风险因素 */
export interface RiskFactor {
  /** 因素名称 */
  name: string
  /** 严重度 1-5 */
  severity: number
  /** 缓解措施 */
  mitigations: string[]
}

/** 备选方案 */
export interface AlternativeScenario {
  /** 方案名称 */
  name: string
  /** 期望值 */
  expectedValue: number
  /** 与当前方案差异 */
  difference: number
  /** 简要描述 */
  description: string
}

// ============================================================
// 场景元数据
// ============================================================

export const SCENARIO_TYPE_META: Record<ScenarioType, { label: string; icon: string; color: string; description: string }> = {
  promotion: { label: '晋升', icon: '📈', color: '#8a9a7a', description: '在当前组织内向上晋升' },
  transition: { label: '转型', icon: '🔄', color: '#6b9fc4', description: '切换到新的职业方向' },
  startup: { label: '创业', icon: '🚀', color: '#e0a96d', description: '创办自己的事业' },
  freelance: { label: '自由职业', icon: '🕊️', color: '#b5707a', description: '成为独立工作者' },
  education: { label: '进修', icon: '📚', color: '#d98c7a', description: '返回学校或参加培训' },
  lateral: { label: '平调', icon: '↔️', color: '#6b9fc4', description: '在组织内横向调动' },
  sabbatical: { label: '休整', icon: '🧘', color: '#cf8b6b', description: '暂时离开职场休整充电' },
  'dual-track': { label: '双轨', icon: '🛤️', color: '#e4e6ed', description: '同时发展两条职业路径' },
}

export const DECISION_TYPE_META: Record<DecisionType, { label: string; color: string }> = {
  accept: { label: '接受', color: '#8a9a7a' },
  decline: { label: '拒绝', color: '#c46a5a' },
  prepare: { label: '准备', color: '#e0a96d' },
  negotiate: { label: '协商', color: '#6b9fc4' },
  defer: { label: '延迟', color: '#94a3b8' },
  explore: { label: '探索', color: '#b5707a' },
}

// ============================================================
// 预设场景模板
// ============================================================

export const PRESET_SCENARIOS: { id: string; name: string; description: string; type: ScenarioType }[] = [
  {
    id: 'preset-promotion',
    name: '内部晋升',
    description: '在当前公司争取高级职位或管理岗位',
    type: 'promotion',
  },
  {
    id: 'preset-tech-transition',
    name: '技术转型',
    description: '从当前技术栈转向新兴技术领域',
    type: 'transition',
  },
  {
    id: 'preset-management',
    name: '管理路线',
    description: '从技术岗转向管理岗的路径模拟',
    type: 'transition',
  },
  {
    id: 'preset-startup',
    name: '创业冒险',
    description: '评估创业的可行性和风险',
    type: 'startup',
  },
  {
    id: 'preset-freelance',
    name: '自由之路',
    description: '评估成为自由职业者的前景',
    type: 'freelance',
  },
  {
    id: 'preset-advanced-study',
    name: '深造进修',
    description: '评估深造对职业发展的影响',
    type: 'education',
  },
]

// ============================================================
// useCareerSimulator Composable
// ============================================================

export function useCareerSimulator() {
  // ---- 状态 ----
  const result = ref<SimulationResult | null>(null)
  const scenarios = ref<CareerScenario[]>([])
  const isSimulating = ref(false)

  // ---- 场景管理 ----

  /**
   * 创建场景
   */
  function createScenario(config: {
    name: string
    description: string
    type: ScenarioType
    currentSkills: SkillNode[]
    contacts: Contact[]
    connections: CareerConnection[]
    milestones: CareerMilestone[]
    decisions: DecisionNode[]
    assumptions?: ScenarioAssumption[]
  }): CareerScenario {
    const defaultAssumptions: ScenarioAssumption[] = [
      {
        name: '市场环境',
        value: '稳定增长',
        optimistic: '高速增长',
        pessimistic: '经济下行',
        weight: 0.3,
      },
      {
        name: '学习能力',
        value: '中等',
        optimistic: '快速学习',
        pessimistic: '较慢',
        weight: 0.2,
      },
      {
        name: '家庭支持',
        value: '一般',
        optimistic: '全力支持',
        pessimistic: '不支持',
        weight: 0.15,
      },
      {
        name: '行业趋势',
        value: '平稳',
        optimistic: '风口',
        pessimistic: '衰退',
        weight: 0.25,
      },
      {
        name: '竞争程度',
        value: '中等',
        optimistic: '低竞争',
        pessimistic: '高竞争',
        weight: 0.1,
      },
    ]

    const scenario: CareerScenario = {
      id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: config.name,
      description: config.description,
      type: config.type,
      currentSkills: config.currentSkills,
      contacts: config.contacts,
      connections: config.connections,
      milestones: config.milestones,
      decisions: config.decisions,
      assumptions: config.assumptions || defaultAssumptions,
    }

    scenarios.value.push(scenario)
    return scenario
  }

  /**
   * 获取预设场景模板
   */
  function getPresetScenarios(): typeof PRESET_SCENARIOS {
    return PRESET_SCENARIOS
  }

  /**
   * 从预设创建场景
   */
  function createFromPreset(
    presetId: string,
    currentSkills: SkillNode[],
    contacts: Contact[],
    connections: CareerConnection[],
    milestones: CareerMilestone[],
    customName?: string,
  ): CareerScenario | null {
    const preset = PRESET_SCENARIOS.find(p => p.id === presetId)
    if (!preset) return null

    const decisions = generateDefaultDecisions(preset.type, currentSkills, contacts, milestones)

    return createScenario({
      name: customName || preset.name,
      description: preset.description,
      type: preset.type,
      currentSkills,
      contacts,
      connections,
      milestones,
      decisions,
    })
  }

  // ---- 模拟运行 ----

  /**
   * 运行模拟
   */
  function simulate(
    scenario: CareerScenario,
    selectedPath: string[] = [],
  ): SimulationResult {
    isSimulating.value = true

    try {
      const decisionPath = buildDecisionPath(scenario.decisions, selectedPath)
      const finalOutcome = determineFinalOutcome(decisionPath, scenario)
      const expectedValue = calculateExpectedValue(finalOutcome, scenario.assumptions)
      const skillChanges = computeSkillChanges(scenario.currentSkills, decisionPath)
      const overallScore = computeOverallScore(finalOutcome, skillChanges, scenario)
      const riskAssessment = assessRisk(decisionPath, scenario)
      const recommendation = generateRecommendation(finalOutcome, riskAssessment, scenario.type)
      const alternatives = generateAlternatives(scenario, decisionPath)

      const simResult: SimulationResult = {
        scenarioId: scenario.id,
        simulatedAt: new Date().toISOString(),
        decisionPath,
        finalOutcome,
        expectedValue,
        skillChanges,
        overallScore,
        riskAssessment,
        recommendation,
        alternatives,
      }

      result.value = simResult
      return simResult
    } finally {
      isSimulating.value = false
    }
  }

  /**
   * 快速模拟（使用默认选择路径）
   */
  function quickSimulate(scenario: CareerScenario): SimulationResult {
    // 默认选择最优路径
    const optimalPath = findOptimalPath(scenario.decisions)
    return simulate(scenario, optimalPath)
  }

  /**
   * 对比模拟（运行多个场景并对比）
   */
  function compareScenarios(
    ...scenariosToCompare: CareerScenario[]
  ): { scenarioName: string; result: SimulationResult }[] {
    return scenariosToCompare.map(s => ({
      scenarioName: s.name,
      result: quickSimulate(s),
    }))
  }

  // ---- 决策操作 ----

  /**
   * 生成默认决策树
   */
  function generateDecisionTree(
    scenarioType: ScenarioType,
    skills: SkillNode[],
    contacts: Contact[],
    milestones: CareerMilestone[],
  ): DecisionNode[] {
    return generateDefaultDecisions(scenarioType, skills, contacts, milestones)
  }

  /**
   * 添加决策节点
   */
  function addDecisionNode(
    parentNode: DecisionNode,
    newNode: DecisionNode,
  ): DecisionNode {
    parentNode.children.push(newNode)
    return parentNode
  }

  /**
   * 计算决策的期望值
   */
  function calculateDecisionEV(outcomes: DecisionOutcome[]): number {
    return outcomes.reduce((sum, o) => sum + o.probability * (
      o.incomeImpact * 0.4 +
      o.satisfactionImpact * 0.3 +
      (o.networkGrowth * 0.2) +
      (o.skillGains.reduce((s, g) => s + g.gain, 0) / Math.max(o.skillGains.length, 1) * 0.1)
    ), 0)
  }

  return {
    // 状态
    result,
    scenarios,
    isSimulating,

    // 场景管理
    createScenario,
    getPresetScenarios,
    createFromPreset,

    // 模拟
    simulate,
    quickSimulate,
    compareScenarios,

    // 决策
    generateDecisionTree,
    addDecisionNode,
    calculateDecisionEV,
  }
}

// ============================================================
// 内部函数
// ============================================================

/** 生成默认决策树 */
function generateDefaultDecisions(
  type: ScenarioType,
  skills: SkillNode[],
  contacts: Contact[],
  _milestones: CareerMilestone[],
): DecisionNode[] {
  const coreSkills = skills.filter(s => s.isCore)
  const mentorContacts = contacts.filter(c => c.nodeType === 'mentor' || c.nodeType === 'superior')

  switch (type) {
    case 'promotion':
      return [
        {
          id: 'promo-1',
          title: '申请晋升',
          description: '向直属上级提出晋升申请',
          parentId: undefined,
          children: [
            {
              id: 'promo-1a',
              title: '等待评审结果',
              description: '提交晋升材料后等待评审',
              parentId: 'promo-1',
              children: [],
              type: 'accept',
              outcomes: [
                {
                  id: 'promo-out-1',
                  description: '晋升成功，获得新职位',
                  probability: 0.6,
                  skillGains: [{ skillName: '领导力', gain: 15 }],
                  networkGrowth: 0.3,
                  incomeImpact: 30,
                  satisfactionImpact: 85,
                  isOptimal: true,
                  isWorst: false,
                },
                {
                  id: 'promo-out-2',
                  description: '评审未通过，但获得宝贵反馈',
                  probability: 0.4,
                  skillGains: [{ skillName: '自我认知', gain: 10 }],
                  networkGrowth: 0.1,
                  incomeImpact: 0,
                  satisfactionImpact: 30,
                  isOptimal: false,
                  isWorst: true,
                },
              ],
              requiredSkills: coreSkills.slice(0, 2).map(s => ({
                name: s.name,
                category: s.category,
                level: 'advanced' as ProficiencyLevel,
              })),
              requiredContacts: mentorContacts.slice(0, 2).map(c => c.id),
              riskLevel: 2,
              timeCost: 3,
              financialCost: 0,
              selected: false,
            },
          ],
          type: 'prepare',
          outcomes: [
            {
              id: 'promo-root-1',
              description: '开始准备晋升材料',
              probability: 1.0,
              skillGains: [{ skillName: '自我展示', gain: 5 }],
              networkGrowth: 0.05,
              incomeImpact: 0,
              satisfactionImpact: 20,
              isOptimal: false,
              isWorst: false,
            },
          ],
          requiredSkills: coreSkills.map(s => ({
            name: s.name,
            category: s.category,
            level: 'intermediate' as ProficiencyLevel,
          })),
          requiredContacts: [],
          riskLevel: 1,
          timeCost: 1,
          selected: false,
        },
        {
          id: 'promo-2',
          title: '积累更多经验',
          description: '先积累更多项目经验和成果',
          parentId: undefined,
          children: [],
          type: 'defer',
          outcomes: [
            {
              id: 'promo-alt-1',
              description: '经验积累后晋升机会更大',
              probability: 0.8,
              skillGains: [
                { skillName: '专业能力', gain: 20 },
                { skillName: '项目管理', gain: 15 },
              ],
              networkGrowth: 0.15,
              incomeImpact: 15,
              satisfactionImpact: 60,
              isOptimal: false,
              isWorst: false,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 1,
          timeCost: 6,
          selected: false,
        },
      ]

    case 'transition':
      return [
        {
          id: 'trans-1',
          title: '直接转型',
          description: '立即开始投递目标岗位',
          parentId: undefined,
          children: [
            {
              id: 'trans-1a',
              title: '接受初级岗位',
              description: '从目标领域初级岗位开始',
              parentId: 'trans-1',
              children: [],
              type: 'accept',
              outcomes: [
                {
                  id: 'trans-out-1',
                  description: '成功转型，快速成长',
                  probability: 0.5,
                  skillGains: [
                    { skillName: '新领域技能', gain: 30 },
                    { skillName: '适应能力', gain: 15 },
                  ],
                  networkGrowth: 0.4,
                  incomeImpact: -10,
                  satisfactionImpact: 70,
                  isOptimal: true,
                  isWorst: false,
                },
                {
                  id: 'trans-out-2',
                  description: '适应困难，进展缓慢',
                  probability: 0.5,
                  skillGains: [{ skillName: '新领域技能', gain: 10 }],
                  networkGrowth: 0.1,
                  incomeImpact: -20,
                  satisfactionImpact: 25,
                  isOptimal: false,
                  isWorst: true,
                },
              ],
              requiredSkills: [],
              requiredContacts: [],
              riskLevel: 4,
              timeCost: 3,
              selected: false,
            },
          ],
          type: 'explore',
          outcomes: [
            {
              id: 'trans-root-1',
              description: '开始探索转型可能',
              probability: 1.0,
              skillGains: [],
              networkGrowth: 0.05,
              incomeImpact: 0,
              satisfactionImpact: 10,
              isOptimal: false,
              isWorst: false,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 3,
          timeCost: 1,
          selected: false,
        },
        {
          id: 'trans-2',
          title: '渐进式转型',
          description: '先学习目标领域技能，再逐步过渡',
          parentId: undefined,
          children: [],
          type: 'prepare',
          outcomes: [
            {
              id: 'trans-alt-1',
              description: '稳步转型，风险可控',
              probability: 0.7,
              skillGains: [
                { skillName: '新领域技能', gain: 25 },
                { skillName: '学习能力', gain: 10 },
              ],
              networkGrowth: 0.25,
              incomeImpact: 5,
              satisfactionImpact: 75,
              isOptimal: false,
              isWorst: false,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 2,
          timeCost: 8,
          selected: false,
        },
      ]

    case 'startup':
      return [
        {
          id: 'startup-1',
          title: '全职创业',
          description: '辞去当前工作，全力投入创业',
          parentId: undefined,
          children: [],
          type: 'accept',
          outcomes: [
            {
              id: 'startup-out-1',
              description: '创业成功，获得巨大回报',
              probability: 0.15,
              skillGains: [
                { skillName: '创业能力', gain: 40 },
                { skillName: '领导力', gain: 25 },
              ],
              networkGrowth: 0.8,
              incomeImpact: 200,
              satisfactionImpact: 95,
              isOptimal: true,
              isWorst: false,
            },
            {
              id: 'startup-out-2',
              description: '创业失败，但获得宝贵经验',
              probability: 0.5,
              skillGains: [
                { skillName: '创业能力', gain: 20 },
                { skillName: '韧性', gain: 15 },
              ],
              networkGrowth: 0.3,
              incomeImpact: -50,
              satisfactionImpact: 35,
              isOptimal: false,
              isWorst: false,
            },
            {
              id: 'startup-out-3',
              description: '创业失败，财务严重受损',
              probability: 0.35,
              skillGains: [{ skillName: '创业能力', gain: 10 }],
              networkGrowth: 0.05,
              incomeImpact: -80,
              satisfactionImpact: 10,
              isOptimal: false,
              isWorst: true,
            },
          ],
          requiredSkills: [],
          requiredContacts: contacts.filter(c => c.tier === 'core').map(c => c.id),
          riskLevel: 5,
          timeCost: 24,
          financialCost: 200000,
          selected: false,
        },
        {
          id: 'startup-2',
          title: '兼职创业',
          description: '保留现有工作，业余时间创业',
          parentId: undefined,
          children: [],
          type: 'explore',
          outcomes: [
            {
              id: 'startup-alt-1',
              description: '平衡发展，风险可控',
              probability: 0.4,
              skillGains: [
                { skillName: '创业能力', gain: 15 },
                { skillName: '时间管理', gain: 10 },
              ],
              networkGrowth: 0.2,
              incomeImpact: 10,
              satisfactionImpact: 65,
              isOptimal: false,
              isWorst: false,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 3,
          timeCost: 12,
          selected: false,
        },
      ]

    case 'freelance':
      return [
        {
          id: 'free-1',
          title: '全职自由职业',
          description: '辞去工作，成为全职自由职业者',
          parentId: undefined,
          children: [],
          type: 'accept',
          outcomes: [
            {
              id: 'free-out-1',
              description: '自由职业成功，收入稳定增长',
              probability: 0.4,
              skillGains: [
                { skillName: '自我管理', gain: 20 },
                { skillName: '商业能力', gain: 15 },
              ],
              networkGrowth: 0.2,
              incomeImpact: 10,
              satisfactionImpact: 85,
              isOptimal: true,
              isWorst: false,
            },
            {
              id: 'free-out-2',
              description: '收入不稳定，重返职场',
              probability: 0.6,
              skillGains: [{ skillName: '自我认知', gain: 10 }],
              networkGrowth: 0.05,
              incomeImpact: -30,
              satisfactionImpact: 20,
              isOptimal: false,
              isWorst: true,
            },
          ],
          requiredSkills: coreSkills.map(s => ({
            name: s.name,
            category: s.category,
            level: 'advanced' as ProficiencyLevel,
          })),
          requiredContacts: contacts.filter(c => c.tier === 'core' || c.tier === 'active').map(c => c.id),
          riskLevel: 4,
          timeCost: 6,
          selected: false,
        },
        {
          id: 'free-2',
          title: '兼职自由职业',
          description: '保留工作，业余接单试水',
          parentId: undefined,
          children: [],
          type: 'explore',
          outcomes: [
            {
              id: 'free-alt-1',
              description: '逐步建立客户基础',
              probability: 0.6,
              skillGains: [
                { skillName: '商业能力', gain: 10 },
                { skillName: '客户管理', gain: 10 },
              ],
              networkGrowth: 0.15,
              incomeImpact: 5,
              satisfactionImpact: 60,
              isOptimal: false,
              isWorst: false,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 2,
          timeCost: 6,
          selected: false,
        },
      ]

    case 'education':
      return [
        {
          id: 'edu-1',
          title: '全日制深造',
          description: '辞职攻读学位',
          parentId: undefined,
          children: [],
          type: 'accept',
          outcomes: [
            {
              id: 'edu-out-1',
              description: '学成归来，职业跃升',
              probability: 0.7,
              skillGains: [
                { skillName: '专业知识', gain: 35 },
                { skillName: '研究能力', gain: 20 },
              ],
              networkGrowth: 0.5,
              incomeImpact: 50,
              satisfactionImpact: 80,
              isOptimal: true,
              isWorst: false,
            },
            {
              id: 'edu-out-2',
              description: '学历提升但错失职场机会',
              probability: 0.3,
              skillGains: [{ skillName: '专业知识', gain: 25 }],
              networkGrowth: 0.1,
              incomeImpact: 10,
              satisfactionImpact: 40,
              isOptimal: false,
              isWorst: true,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 3,
          timeCost: 24,
          financialCost: 100000,
          selected: false,
        },
        {
          id: 'edu-2',
          title: '在职进修',
          description: '边工作边学习',
          parentId: undefined,
          children: [],
          type: 'prepare',
          outcomes: [
            {
              id: 'edu-alt-1',
              description: '工作学习两不误',
              probability: 0.6,
              skillGains: [
                { skillName: '专业知识', gain: 20 },
                { skillName: '时间管理', gain: 10 },
              ],
              networkGrowth: 0.2,
              incomeImpact: 15,
              satisfactionImpact: 70,
              isOptimal: false,
              isWorst: false,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 2,
          timeCost: 36,
          selected: false,
        },
      ]

    case 'lateral':
      return [
        {
          id: 'lat-1',
          title: '申请调岗',
          description: '在同一公司内转换到不同部门',
          parentId: undefined,
          children: [],
          type: 'accept',
          outcomes: [
            {
              id: 'lat-out-1',
              description: '调岗成功，拓宽视野',
              probability: 0.7,
              skillGains: [
                { skillName: '跨领域知识', gain: 20 },
                { skillName: '适应能力', gain: 10 },
              ],
              networkGrowth: 0.3,
              incomeImpact: 0,
              satisfactionImpact: 65,
              isOptimal: true,
              isWorst: false,
            },
            {
              id: 'lat-out-2',
              description: '调岗未通过，留在原岗位',
              probability: 0.3,
              skillGains: [],
              networkGrowth: 0,
              incomeImpact: 0,
              satisfactionImpact: 25,
              isOptimal: false,
              isWorst: true,
            },
          ],
          requiredSkills: [],
          requiredContacts: contacts.filter(c => c.tier === 'core' || c.tier === 'active').map(c => c.id),
          riskLevel: 2,
          timeCost: 2,
          selected: false,
        },
      ]

    case 'sabbatical':
      return [
        {
          id: 'sab-1',
          title: '休整充电',
          description: '申请 3-12 个月的休假',
          parentId: undefined,
          children: [],
          type: 'accept',
          outcomes: [
            {
              id: 'sab-out-1',
              description: '休整后精力充沛，找到新方向',
              probability: 0.6,
              skillGains: [
                { skillName: '自我认知', gain: 25 },
                { skillName: '生活平衡', gain: 20 },
              ],
              networkGrowth: 0.1,
              incomeImpact: 5,
              satisfactionImpact: 90,
              isOptimal: true,
              isWorst: false,
            },
            {
              id: 'sab-out-2',
              description: '休整后难以回归职场',
              probability: 0.4,
              skillGains: [{ skillName: '自我认知', gain: 10 }],
              networkGrowth: -0.1,
              incomeImpact: -20,
              satisfactionImpact: 30,
              isOptimal: false,
              isWorst: true,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 3,
          timeCost: 6,
          financialCost: 50000,
          selected: false,
        },
      ]

    case 'dual-track':
      return [
        {
          id: 'dual-1',
          title: '双轨并行',
          description: '同时发展两条职业路径',
          parentId: undefined,
          children: [],
          type: 'explore',
          outcomes: [
            {
              id: 'dual-out-1',
              description: '双轨互补，形成独特优势',
              probability: 0.4,
              skillGains: [
                { skillName: '跨领域整合', gain: 30 },
                { skillName: '时间管理', gain: 15 },
              ],
              networkGrowth: 0.5,
              incomeImpact: 25,
              satisfactionImpact: 80,
              isOptimal: true,
              isWorst: false,
            },
            {
              id: 'dual-out-2',
              description: '精力分散，两头落空',
              probability: 0.6,
              skillGains: [{ skillName: '时间管理', gain: 5 }],
              networkGrowth: 0.05,
              incomeImpact: -10,
              satisfactionImpact: 20,
              isOptimal: false,
              isWorst: true,
            },
          ],
          requiredSkills: [],
          requiredContacts: [],
          riskLevel: 4,
          timeCost: 12,
          selected: false,
        },
      ]

    default:
      return []
  }
}

/** 构建决策路径 */
function buildDecisionPath(
  decisions: DecisionNode[],
  selectedPath: string[],
): DecisionPathStep[] {
  const path: DecisionPathStep[] = []
  let cumulativeScore = 0

  for (let i = 0; i < decisions.length; i++) {
    const decision = decisions[i]
    const selectedOutcomeId = selectedPath[i]
    const chosenOutcome = selectedOutcomeId
      ? decision.outcomes.find(o => o.id === selectedOutcomeId) || decision.outcomes[0]
      : decision.outcomes[0]

    cumulativeScore += chosenOutcome.probability * (
      chosenOutcome.incomeImpact * 0.4 +
      chosenOutcome.satisfactionImpact * 0.3 +
      (chosenOutcome.networkGrowth * 100) * 0.2 +
      (chosenOutcome.skillGains.reduce((s, g) => s + g.gain, 0) / Math.max(chosenOutcome.skillGains.length, 1)) * 0.1
    )

    path.push({
      nodeId: decision.id,
      title: decision.title,
      chosenOutcome,
      cumulativeScore: Math.round(cumulativeScore),
    })
  }

  return path
}

/** 确定最终结果 */
function determineFinalOutcome(
  path: DecisionPathStep[],
  _scenario: CareerScenario,
): DecisionOutcome {
  if (path.length === 0) {
    return {
      id: 'empty',
      description: '未做任何决策',
      probability: 1.0,
      skillGains: [],
      networkGrowth: 0,
      incomeImpact: 0,
      satisfactionImpact: 0,
      isOptimal: false,
      isWorst: false,
    }
  }

  return path[path.length - 1].chosenOutcome
}

/** 计算期望值 */
function calculateExpectedValue(
  outcome: DecisionOutcome,
  assumptions: ScenarioAssumption[],
): number {
  const baseValue =
    outcome.incomeImpact * 0.35 +
    outcome.satisfactionImpact * 0.25 +
    (outcome.networkGrowth * 100) * 0.2 +
    (outcome.skillGains.reduce((s, g) => s + g.gain, 0) / Math.max(outcome.skillGains.length, 1)) * 0.2

  // 根据假设调整
  const assumptionFactor = assumptions.reduce((factor, a) => {
    return factor * (1 + (typeof a.value === 'number' ? (a.value / 100) : 0.1) * a.weight)
  }, 1)

  return Math.round(baseValue * assumptionFactor * outcome.probability * 100) / 100
}

/** 计算技能变化 */
function computeSkillChanges(
  currentSkills: SkillNode[],
  path: DecisionPathStep[],
): SkillChange[] {
  const allGains = new Map<string, number>()

  for (const step of path) {
    for (const gain of step.chosenOutcome.skillGains) {
      allGains.set(gain.skillName, (allGains.get(gain.skillName) || 0) + gain.gain)
    }
  }

  const changes: SkillChange[] = []
  for (const [skillName, gain] of allGains) {
    const existing = currentSkills.find(s => s.name.toLowerCase() === skillName.toLowerCase())
    const before = existing ? existing.proficiencyScore : 0
    changes.push({
      skillName,
      before,
      after: Math.min(before + gain, 100),
      delta: gain,
    })
  }

  return changes
}

/** 计算综合评分 */
function computeOverallScore(
  outcome: DecisionOutcome,
  skillChanges: SkillChange[],
  scenario: CareerScenario,
): number {
  let score = 0

  // 结果评分 40%
  score += outcome.satisfactionImpact * 0.4

  // 技能提升 30%
  const avgSkillGain = skillChanges.length > 0
    ? skillChanges.reduce((s, c) => s + c.delta, 0) / skillChanges.length
    : 0
  score += Math.min(avgSkillGain * 2, 100) * 0.3

  // 收入影响 20%
  score += Math.min(Math.max(outcome.incomeImpact + 30, 0), 100) * 0.2

  // 里程碑完成 10%
  const milestoneScore = scenario.milestones.length > 0
    ? Math.min(scenario.milestones.length * 10, 100)
    : 50
  score += milestoneScore * 0.1

  return Math.round(score)
}

/** 评估风险 */
function assessRisk(
  path: DecisionPathStep[],
  scenario: CareerScenario,
): RiskAssessment {
  const factors: RiskFactor[] = []
  let totalRisk = 0

  // 财务风险
  const financialRisk = path.reduce((r, step) => {
    const outcome = step.chosenOutcome
    return r + (outcome.incomeImpact < 0 ? Math.abs(outcome.incomeImpact) / 100 * 5 : 0)
  }, 0)
  const cappedFinancialRisk = Math.min(financialRisk, 5)
  if (cappedFinancialRisk >= 2) {
    factors.push({
      name: '财务风险',
      severity: Math.round(cappedFinancialRisk),
      mitigations: [
        '建立 6-12 个月的应急基金',
        '考虑兼职收入来源',
        '制定详细的财务规划',
      ],
    })
  }

  // 职业风险
  const careerRisk = Math.min(
    path.reduce((r, s) => r + s.chosenOutcome.satisfactionImpact < 30 ? 1 : 0, 0),
    5,
  )
  if (careerRisk >= 2) {
    factors.push({
      name: '职业风险',
      severity: Math.round(careerRisk),
      mitigations: [
        '保持技能更新，确保竞争力',
        '维护行业人脉网络',
        '制定备选职业计划',
      ],
    })
  }

  // 技能风险
  const skillRisk = path.reduce((r, step) => {
    const hasSkillGap = step.chosenOutcome.skillGains.length === 0
    return r + (hasSkillGap ? 1 : 0)
  }, 0)
  if (skillRisk >= 1) {
    factors.push({
      name: '技能风险',
      severity: Math.min(skillRisk, 5),
      mitigations: [
        '制定系统学习计划',
        '寻找导师或教练',
        '参加相关培训课程',
      ],
    })
  }

  // 人脉风险
  const networkRisk = path.reduce((r, step) => {
    return r + (step.chosenOutcome.networkGrowth < 0.1 ? 0.5 : 0)
  }, 0)
  if (networkRisk >= 1) {
    factors.push({
      name: '人脉风险',
      severity: Math.min(Math.round(networkRisk), 5),
      mitigations: [
        '定期维护核心人脉关系',
        '参加行业活动扩展网络',
        '在社交媒体上保持活跃',
      ],
    })
  }

  totalRisk = Math.max(
    cappedFinancialRisk,
    careerRisk,
    skillRisk,
    networkRisk,
    scenario.type === 'startup' ? 4 : scenario.type === 'freelance' ? 3 : 2,
  )

  return {
    overallRisk: Math.round(Math.min(totalRisk, 5)),
    financialRisk: Math.round(cappedFinancialRisk),
    careerRisk: Math.round(careerRisk),
    skillRisk: Math.round(skillRisk),
    networkRisk: Math.round(networkRisk),
    factors,
  }
}

/** 生成建议 */
function generateRecommendation(
  outcome: DecisionOutcome,
  risk: RiskAssessment,
  scenarioType: ScenarioType,
): string {
  if (outcome.isOptimal) {
    return '该路径预期结果良好，建议积极推进。注意关注风险因素，做好应对预案。'
  }

  if (outcome.isWorst) {
    return '该路径风险较高，建议谨慎考虑。可以先尝试降低风险的替代方案，或在条件更成熟时再推进。'
  }

  if (risk.overallRisk >= 4) {
    return `此${SCENARIO_TYPE_META[scenarioType]?.label || '场景'}风险较高（${risk.overallRisk}/5），建议：1) 先积累更多资源；2) 考虑渐进式方案；3) 制定详细的应急计划。`
  }

  return '该路径有一定不确定性，建议在推进过程中持续评估并灵活调整策略。'
}

/** 生成备选方案 */
function generateAlternatives(
  scenario: CareerScenario,
  _currentPath: DecisionPathStep[],
): AlternativeScenario[] {
  const alternatives: AlternativeScenario[] = []

  // 更保守的方案
  const conservativeOutcome: DecisionOutcome = {
    id: 'alt-conservative',
    description: '保持现状，稳步积累',
    probability: 0.9,
    skillGains: [{ skillName: '专业能力', gain: 10 }],
    networkGrowth: 0.05,
    incomeImpact: 5,
    satisfactionImpact: 50,
    isOptimal: false,
    isWorst: false,
  }

  alternatives.push({
    name: '保守方案',
    expectedValue: calculateExpectedValue(conservativeOutcome, scenario.assumptions),
    difference: 0,
    description: '保持现状，通过积累经验和技能稳步提升',
  })

  // 更激进的方案
  const aggressiveOutcome: DecisionOutcome = {
    id: 'alt-aggressive',
    description: '全力冲刺，追求快速提升',
    probability: 0.3,
    skillGains: [
      { skillName: '综合能力', gain: 30 },
      { skillName: '领导力', gain: 20 },
    ],
    networkGrowth: 0.6,
    incomeImpact: 60,
    satisfactionImpact: 90,
    isOptimal: false,
    isWorst: false,
  }

  alternatives.push({
    name: '激进方案',
    expectedValue: calculateExpectedValue(aggressiveOutcome, scenario.assumptions),
    difference: 0,
    description: '全力以赴追求高回报，但风险也更高',
  })

  // 对每个备选方案计算与当前方案的差异
  // 占位，实际差异需要对比当前方案

  return alternatives
}

/** 寻找最优路径 */
function findOptimalPath(decisions: DecisionNode[]): string[] {
  return decisions.map(decision => {
    const optimalOutcome = decision.outcomes.reduce((best, o) =>
      o.probability * (
        o.incomeImpact * 0.4 + o.satisfactionImpact * 0.3 +
        (o.networkGrowth * 100) * 0.2 +
        (o.skillGains.reduce((s, g) => s + g.gain, 0) / Math.max(o.skillGains.length, 1)) * 0.1
      ) > best.probability * (
        best.incomeImpact * 0.4 + best.satisfactionImpact * 0.3 +
        (best.networkGrowth * 100) * 0.2 +
        (best.skillGains.reduce((s, g) => s + g.gain, 0) / Math.max(best.skillGains.length, 1)) * 0.1
      ) ? o : best
    , decision.outcomes[0])

    return optimalOutcome.id
  })
}