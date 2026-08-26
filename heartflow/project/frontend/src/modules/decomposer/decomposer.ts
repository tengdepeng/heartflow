// ============================================================
// decomposer · 镜我 · 任务拆解器（模块七 P1 深度）
// 借鉴 WorkBuddy「自然语言 → 拆解子任务 → 设置优先级」。
// 宪法约束：本地启发式拆解，不做评价性判断（不替用户下结论，
// 不给更优解），只提供「可执行的步骤陈列」；默认不主动触发。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 步骤优先级：由任务语境与关键词启发式推断，仅供陈列，不评判孰优 */
export type StepPriority = 'high' | 'medium' | 'low'
export type StepStatus = 'pending' | 'doing' | 'done'

/** 任务意图类型：决定默认拆解模板 */
export type TaskIntent =
  | 'output'   // 写作 / 产出
  | 'study'    // 学习 / 记忆
  | 'meeting'  // 会议 / 沟通
  | 'coding'   // 编程 / 实现
  | 'event'    // 活动 / 出行
  | 'project'  // 项目 / 长期
  | 'health'   // 健康 / 锻炼
  | 'generic'  // 兜底

export interface DecomposedStep {
  id: string
  title: string
  detail?: string
  priority: StepPriority
  status: StepStatus
  estimateMinutes?: number
}

export interface DecomposePlan {
  id: string
  task: string
  intent: TaskIntent
  steps: DecomposedStep[]
  createdAt: string
  source: 'explicit' | 'template'
}

export const DECOMPOSER_STORAGE_KEYS = {
  plans: 'mirror.decomposer.plans',
} as const

export const INTENT_META: Record<TaskIntent, { label: string; steps: string[] }> = {
  output: { label: '写作产出', steps: ['收集素材', '搭建框架', '撰写初稿', '修改润色'] },
  study: { label: '学习记忆', steps: ['明确目标', '梳理知识块', '集中练习', '复习检验'] },
  meeting: { label: '会议沟通', steps: ['准备议题', '同步背景', '执行议程', '整理纪要待办'] },
  coding: { label: '编程实现', steps: ['明确需求', '拆分模块', '编码实现', '测试验证'] },
  event: { label: '活动出行', steps: ['定下目标', '列清单并预订', '执行', '收尾回顾'] },
  project: {
    label: '项目推进',
    steps: ['界定范围', '制定里程碑', '拆分首批任务', '定期复盘'],
  },
  health: { label: '健康锻炼', steps: ['制定计划', '拆分周期', '执行训练', '记录反馈'] },
  generic: { label: '一般事务', steps: ['明确这件事要的成果', '列出第一步行动', '预估所需时间', '排入日程'] },
}

/** 意图关键词 → 触发判定 */
const INTENT_KEYWORDS: Array<{ intent: TaskIntent; keys: string[] }> = [
  { intent: 'coding', keys: ['编程', '代码', '开发', '写个功能', '修 bug', '重构', '脚本', '部署'] },
  { intent: 'study', keys: ['学习', '背书', '背单词', '记熟', '复习', '掌握', '练习', '考证'] },
  { intent: 'meeting', keys: ['会议', '开会', '访谈', '拜访', '沟通', '汇报', '约谈'] },
  { intent: 'event', keys: ['出行', '旅行', '搬家', '办活动', '筹备', '聚会', '布置', '整理房间'] },
  { intent: 'health', keys: ['锻炼', '健身', '跑步', '冥想', '睡眠', '饮食', '体检'] },
  { intent: 'output', keys: ['写作', '写文', '文章', '论文', '报告', '复盘', '总结', '文案', '输出'] },
  { intent: 'project', keys: ['项目', '落地', '推进', '长期', '规划', '阶段', '上线'] },
]

/** 紧急 / 重要 语境词 → 优先级启发 */
const URGENT_WORDS = ['今天', '明天', '尽快', '紧急', '截止', '交稿', 'deadline', '马上', '立刻']
const IMPORTANT_WORDS = ['核心', '重要', '关键', '目标', '长期', '主线', '优先']

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** 识别任务意图（命中关键词即归类，无命中走 generic） */
export function detectIntent(task: string): TaskIntent {
  const t = task.toLocaleLowerCase()
  for (const { intent, keys } of INTENT_KEYWORDS) {
    if (keys.some((k) => t.includes(k.toLocaleLowerCase()))) return intent
  }
  return 'generic'
}

/** 任务文本是否已自带可分句（显式子任务） */
export function hasExplicitParts(task: string): boolean {
  return /(?:；|;|，|,|和|与|并|随后|接着)/.test(task)
}

/** 紧急 / 重要 二元判定（供四象限任务与优先级对齐，不评价得失） */
export function inferQuadrant(task: string): { urgency: boolean; importance: boolean } {
  const t = task.toLocaleLowerCase()
  return {
    urgency: URGENT_WORDS.some((w) => t.includes(w)),
    importance: IMPORTANT_WORDS.some((w) => t.includes(w)),
  }
}

/** 依据急/重要程度给步骤定序的默认优先级 */
export function priorityFor(idx: number, urgency: boolean, importance: boolean): StepPriority {
  if (idx === 0) return importance || urgency ? 'high' : 'medium'
  if (idx <= 1 && urgency) return 'high'
  return importance ? 'medium' : 'low'
}

/** 按意图给每步一个启发式耗时预估（仅参考刻度） */
const ESTIMATE_HINTS: Record<TaskIntent, number[]> = {
  output: [20, 25, 45, 25],
  study: [15, 30, 35, 20],
  meeting: [20, 20, 45, 15],
  coding: [15, 30, 60, 25],
  event: [30, 45, 60, 20],
  project: [30, 40, 40, 20],
  health: [10, 20, 35, 10],
  generic: [15, 15, 10, 10],
}

/** 核心拆解：把一项任务展开为可执行的步骤陈列 */
export function decompose(task: string): DecomposePlan {
  const intent = detectIntent(task)
  const { urgency, importance } = inferQuadrant(task)

  // 显式子任务：把指令分句拆成步骤（保留语义，不添加评论）
  let steps: DecomposedStep[]
  if (hasExplicitParts(task)) {
    steps = task
      .split(/(?:；|;|，|,|和|与|并|随后|接着)/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title, i) => ({
        id: genId(),
        title,
        priority: priorityFor(i, urgency, importance),
        status: 'pending' as const,
      }))
  } else {
    // 模板拆解：用意图模板补齐可执行步骤，首个步骤承接原任务目标
    const template = INTENT_META[intent].steps
    steps = template.map((title, i) => ({
      id: genId(),
      title,
      detail: i === 0 ? task : undefined,
      priority: priorityFor(i, urgency, importance),
      status: 'pending' as const,
      estimateMinutes: ESTIMATE_HINTS[intent][i] ?? 15,
    }))
  }

  return {
    id: genId(),
    task,
    intent,
    steps,
    createdAt: new Date().toISOString(),
    source: hasExplicitParts(task) ? 'explicit' : 'template',
  }
}

/** 汇总拆解产物（陈列形式：含步数、待办进度、按象限归类） */
export function summarizePlan(plan: DecomposePlan): {
  total: number
  done: number
  doing: number
  pending: number
  top: DecomposedStep[]
} {
  const done = plan.steps.filter((s) => s.status === 'done').length
  const doing = plan.steps.filter((s) => s.status === 'doing').length
  return {
    total: plan.steps.length,
    done,
    doing,
    pending: plan.steps.length - done - doing,
    top: plan.steps.filter((s) => s.priority === 'high'),
  }
}

export function useDecomposer() {
  const plans = ref<DecomposePlan[]>(load())

  function load(): DecomposePlan[] {
    const raw = storage.getKV<string>(DECOMPOSER_STORAGE_KEYS.plans, '[]')
    try {
      return JSON.parse(raw) as DecomposePlan[]
    } catch {
      return []
    }
  }

  function save(next: DecomposePlan[]): void {
    plans.value = next
    storage.setKV(DECOMPOSER_STORAGE_KEYS.plans, JSON.stringify(next))
  }

  function decomposeAndSave(task: string): DecomposePlan {
    const plan = decompose(task)
    save([plan, ...plans.value])
    return plan
  }

  function setStep(planId: string, stepId: string, status: StepStatus): boolean {
    const plan = plans.value.find((p) => p.id === planId)
    const step = plan?.steps.find((s) => s.id === stepId)
    if (!plan || !step) return false
    step.status = status
    save([...plans.value])
    return true
  }

  function toggleStep(planId: string, stepId: string): boolean {
    const plan = plans.value.find((p) => p.id === planId)
    const step = plan?.steps.find((s) => s.id === stepId)
    if (!plan || !step) return false
    step.status = step.status === 'done' ? 'pending' : step.status === 'doing' ? 'done' : 'doing'
    save([...plans.value])
    return true
  }

  function remove(planId: string): void {
    save(plans.value.filter((p) => p.id !== planId))
  }

  return { plans, decomposeAndSave, setStep, toggleStep, remove }
}