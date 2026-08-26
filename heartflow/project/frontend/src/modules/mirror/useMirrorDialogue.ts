// ============================================================
// 镜面对话系统 · useMirrorDialogue() composable
// 连接解析器、执行流与真实 stores，形成完整的镜我对话回路
// 蓝图要求：Mirror Self Dialogue System
// ============================================================

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { parseTask } from './parser'
import { executePlan } from './executor'
import type {
  ParsedTask,
  ParsedTaskResult,
  ExecutionResult,
  DialogueEntry,
  StepResult,
  IntentCategory,
} from './types'
import type { ActionHandlerRegistry } from './executor'
import { useTimer } from '../../resonance/bridges/timer'
import { useStudy } from '../study'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

// ---- 默认 Action Handler 工厂 ----

/**
 * 创建默认的 Action Handler 注册表，连接真实 stores
 */
function createDefaultHandlers(): ActionHandlerRegistry {
  const handlers: Partial<ActionHandlerRegistry> = {}

  // ---- start-focus: 启动专注计时 ----
  handlers['start-focus'] = (params: Record<string, unknown>): StepResult => {
    try {
      const timer = useTimer()
      const duration = (params.duration as number) || 25
      const taskName = (params.taskName as string) || ''

      // 如果当前正在专注，先中断
      if (timer.isFocusing || timer.isPaused) {
        timer.interrupt()
      }

      timer.setMode('focus', duration)
      timer.start()

      return {
        order: 0,
        action: 'start-focus',
        success: true,
        data: { duration, taskName },
      }
    } catch (err) {
      return {
        order: 0,
        action: 'start-focus',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- create-note: 创建笔记（复用思绪书房 quickCapture，落库 roomId/标签一致） ----
  handlers['create-note'] = (params: Record<string, unknown>): StepResult => {
    try {
      const content = (params.content as string) || ''
      const title = (params.title as string) || ''
      const roomId = (params.roomId as string) || undefined
      const note = useStudy().quickCapture(content, {
        roomId,
        title: title || undefined,
      })
      if (!note) {
        return {
          order: 0,
          action: 'create-note',
          success: false,
          error: '笔记创建失败',
        }
      }
      return {
        order: 0,
        action: 'create-note',
        success: true,
        data: note,
      }
    } catch (err) {
      return {
        order: 0,
        action: 'create-note',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- log-emotion: 记录情绪 ----
  handlers['log-emotion'] = (params: Record<string, unknown>): StepResult => {
    try {
      const type = (params.type as string) || 'calm'
      const note = (params.note as string) || ''
      const emotions = storage.getEmotions()

      const newEmotion = {
        id: `em_${Date.now()}`,
        type: type as 'happy' | 'calm' | 'sad' | 'anxious' | 'angry',
        note,
        createdAt: new Date().toISOString(),
      }

      emotions.unshift(newEmotion)
      storage.setEmotions(emotions)

      return {
        order: 0,
        action: 'log-emotion',
        success: true,
        data: newEmotion,
      }
    } catch (err) {
      return {
        order: 0,
        action: 'log-emotion',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- create-anchor: 创建锚点 ----
  handlers['create-anchor'] = (params: Record<string, unknown>): StepResult => {
    try {
      const title = (params.title as string) || ''
      const targetDate = (params.targetDate as string) || getLocalDateKey()
      const anchors = storage.getAnchors()

      const newAnchor = {
        id: `anchor_${Date.now()}`,
        text: title,
        done: false,
        targetDate,
        createdAt: new Date().toISOString(),
        priority: 'can' as const,
        stage: 'active' as const,
        driftCount: 0,
      }

      anchors.push(newAnchor)
      storage.setAnchors(anchors)

      return {
        order: 0,
        action: 'create-anchor',
        success: true,
        data: newAnchor,
      }
    } catch (err) {
      return {
        order: 0,
        action: 'create-anchor',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- complete-anchor: 完成锚点 ----
  handlers['complete-anchor'] = (params: Record<string, unknown>): StepResult => {
    try {
      const anchorId = (params.anchorId as string) || ''
      const anchors = storage.getAnchors()
      const idx = anchors.findIndex(a => a.id === anchorId)
      if (idx === -1) {
        return { order: 0, action: 'complete-anchor', success: false, error: '锚点未找到' }
      }
      anchors[idx].done = true
      anchors[idx].doneAt = new Date().toISOString()
      storage.setAnchors(anchors)
      return { order: 0, action: 'complete-anchor', success: true, data: anchors[idx] }
    } catch (err) {
      return {
        order: 0,
        action: 'complete-anchor',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- list-anchors: 列出锚点 ----
  handlers['list-anchors'] = (): StepResult => {
    try {
      const anchors = storage.getAnchors()
      const today = getLocalDateKey()
      const todayAnchors = anchors.filter(a => a.targetDate === today)
      const pending = todayAnchors.filter(a => !a.done)
      return {
        order: 0,
        action: 'list-anchors',
        success: true,
        data: { total: anchors.length, today: todayAnchors.length, pending: pending.length, anchors: todayAnchors },
      }
    } catch (err) {
      return {
        order: 0,
        action: 'list-anchors',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- create-plan: 创建计划（存储为笔记，透传 roomId 供房间聚合） ----
  handlers['create-plan'] = (params: Record<string, unknown>): StepResult => {
    const result = handlers['create-note']!({
      title: `计划: ${new Date().toLocaleDateString('zh-CN')}`,
      content: (params.content as string) || '',
      roomId: params.roomId,
    })
    // create-note 返回同步 StepResult，此处安全断言
    return result as StepResult
  }

  // ---- list-notes: 列出笔记 ----
  handlers['list-notes'] = (): StepResult => {
    try {
      const notes = storage.getNotes()
      const active = notes.filter(n => !n.archived && !n.deletedAt)
      return {
        order: 0,
        action: 'list-notes',
        success: true,
        data: { total: notes.length, active: active.length, recent: active.slice(0, 5) },
      }
    } catch (err) {
      return {
        order: 0,
        action: 'list-notes',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- show-stats: 显示统计 ----
  handlers['show-stats'] = (): StepResult => {
    try {
      const sessions = storage.getSessions()
      const notes = storage.getNotes()
      const emotions = storage.getEmotions()
      const anchors = storage.getAnchors()
      const today = getLocalDateKey()

      const completedSessions = sessions.filter(s => s.status === 'completed')
      const todaySessions = completedSessions.filter(s => s.completedAt?.startsWith(today))
      const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + (s.elapsed || 0), 0) / 60000
      const activeNotes = notes.filter(n => !n.archived && !n.deletedAt)
      const todayAnchors = anchors.filter(a => a.targetDate === today)
      const completedAnchors = todayAnchors.filter(a => a.done)

      return {
        order: 0,
        action: 'show-stats',
        success: true,
        data: {
          todayFocusCount: todaySessions.length,
          todayFocusMinutes: Math.round(todayFocusMinutes),
          totalFocusCount: completedSessions.length,
          totalNotes: activeNotes.length,
          totalEmotions: emotions.length,
          todayAnchors: todayAnchors.length,
          todayAnchorsDone: completedAnchors.length,
        },
      }
    } catch (err) {
      return {
        order: 0,
        action: 'show-stats',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- start-rest: 开始休息（进入安全岛） ----
  handlers['start-rest'] = (params: Record<string, unknown>): StepResult => {
    try {
      const duration = (params.duration as number) || 5
      // 暂停计时器（如果有正在进行的专注）
      const timer = useTimer()
      if (timer.isFocusing || timer.isPaused) {
        timer.pauseForSanctuary()
      }
      return {
        order: 0,
        action: 'start-rest',
        success: true,
        data: { duration },
      }
    } catch (err) {
      return {
        order: 0,
        action: 'start-rest',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- navigate: 导航到房间 ----
  handlers['navigate'] = (params: Record<string, unknown>): StepResult => {
    try {
      const target = (params.target as string) || ''
      // 导航逻辑由 composeable 在外部处理，这里只做校验
      if (!target) {
        return { order: 0, action: 'navigate', success: false, error: '未指定目标房间' }
      }
      return {
        order: 0,
        action: 'navigate',
        success: true,
        data: { target },
      }
    } catch (err) {
      return {
        order: 0,
        action: 'navigate',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ---- respond: 返回文字回应 ----
  handlers['respond'] = (params: Record<string, unknown>): StepResult => {
    return {
      order: 0,
      action: 'respond',
      success: true,
      data: { message: params.message as string || '' },
    }
  }

  return handlers as ActionHandlerRegistry
}

// ---- Composable ----

let dialogueIdCounter = 0

function generateDialogueId(): string {
  return `dlg_${Date.now()}_${++dialogueIdCounter}`
}

/**
 * 镜我对话 composable
 *
 * 用法：
 * const { send, dialogue, lastResponse, isProcessing, isAmbiguous, candidates } = useMirrorDialogue()
 * await send('开始专注 25 分钟')
 */
export function useMirrorDialogue() {
  // ---- 状态 ----
  const dialogue = ref<DialogueEntry[]>([])
  const isProcessing = ref(false)
  const lastResponse = ref<string | null>(null)
  const lastParseResult = ref<ParsedTaskResult | null>(null)
  const lastExecutionResult = ref<ExecutionResult | null>(null)

  // ---- 计算属性 ----
  const isAmbiguous = computed(() => lastParseResult.value?.ambiguous ?? false)
  const candidates = computed(() => lastParseResult.value?.tasks ?? [])
  const bestCandidate = computed(() => lastParseResult.value?.best ?? null)

  // ---- 内部处理器 ----
  const handlers = createDefaultHandlers()
  const router = useRouter()

  /** 房间名称到路由的映射 */
  const roomRouteMap: Record<string, string> = {
    '锚点': '/anchor',
    'anchor': '/anchor',
    '笔记': '/notes',
    'notes': '/notes',
    '情绪': '/emotion',
    'emotion': '/emotion',
    '身体': '/body',
    'body': '/body',
    '账本': '/reward',
    'reward': '/reward',
    '安全岛': '/sanctuary',
    'sanctuary': '/sanctuary',
    '花房': '/garden',
    'garden': '/garden',
    '工艺': '/craft',
    'craft': '/craft',
    '职业': '/career',
    'career': '/career',
    '休息': '/rest',
    'rest': '/rest',
    '背包': '/bag',
    'bag': '/bag',
    '伤疤': '/scar',
    'scar': '/scar',
    '知识': '/knowledge',
    'knowledge': '/knowledge',
    '时间线': '/timeline',
    'timeline': '/timeline',
    '首页': '/',
    'home': '/',
  }

  /**
   * 发送用户输入，触发完整的解析-执行-回应流程
   * @param text 用户输入文本
   * @param opts.overrideIntent 歧义消解：强制选定的意图
   * @param opts.roomId 房间感知：创建的笔记/计划所归属房间
   * @returns 执行结果
   */
  async function send(
    text: string,
    opts?: { overrideIntent?: IntentCategory; roomId?: string },
  ): Promise<{
    response: string
    result: ExecutionResult
    parsedTask: ParsedTask | null
    ambiguous: boolean
  }> {
    isProcessing.value = true

    try {
      // 1. 添加用户输入到对话记录
      const userEntry: DialogueEntry = {
        id: generateDialogueId(),
        role: 'user',
        text,
        timestamp: Date.now(),
      }

      // 2. 解析用户输入（支持歧义消解：overrideIntent 强制选定意图）
      const parseResult = parseTask(text)
      let best: ParsedTask | null = parseResult.best
      if (opts?.overrideIntent) {
        const forced = parseResult.tasks.find(t => t.intent === opts.overrideIntent)
        if (forced) best = forced
      }

      // 同步解析状态：歧义消解后不再视为 ambiguous
      lastParseResult.value = {
        tasks: parseResult.tasks,
        best,
        ambiguous: opts?.overrideIntent ? false : parseResult.ambiguous,
      }

      if (best) {
        userEntry.parsedTask = best
      }
      dialogue.value.push(userEntry)

      // 3. 如果没有最佳匹配，返回通用回应
      if (!best) {
        const fallbackResponse = '收到你的消息，但我不太确定你想做什么。试试说「开始专注」或「记录笔记」？'
        const mirrorEntry: DialogueEntry = {
          id: generateDialogueId(),
          role: 'mirror',
          text: fallbackResponse,
          timestamp: Date.now(),
        }
        dialogue.value.push(mirrorEntry)
        lastResponse.value = fallbackResponse

        const result: ExecutionResult = {
          success: true,
          stepsExecuted: 0,
          stepsTotal: 0,
          message: fallbackResponse,
          stepResults: [],
        }
        lastExecutionResult.value = result

        return {
          response: fallbackResponse,
          result,
          parsedTask: null,
          ambiguous: lastParseResult.value.ambiguous,
        }
      }

      // 4. 生成执行计划（带强制意图）
      const { planMirrorInput } = await import('./executor')
      const { plan, response } = planMirrorInput(text, opts?.overrideIntent)

      if (!plan) {
        const mirrorEntry: DialogueEntry = {
          id: generateDialogueId(),
          role: 'mirror',
          text: response,
          timestamp: Date.now(),
        }
        dialogue.value.push(mirrorEntry)
        lastResponse.value = response
        return {
          response,
          result: { success: true, stepsExecuted: 0, stepsTotal: 0, message: response, stepResults: [] },
          parsedTask: best,
          ambiguous: lastParseResult.value.ambiguous,
        }
      }

      // 4.1 房间感知：将当前房间 id 注入笔记/计划创建步骤
      if (opts?.roomId) {
        for (const step of plan.steps) {
          if (step.action === 'create-note' || step.action === 'create-plan') {
            step.params.roomId = opts.roomId
          }
        }
      }

      // 5. 处理 navigate 操作（需要在执行前处理路由跳转）
      const navigateStep = plan.steps.find(s => s.action === 'navigate')
      if (navigateStep) {
        const target = (navigateStep.params.target as string) || ''
        const route = roomRouteMap[target] || roomRouteMap[target.toLowerCase()]
        if (route) {
          router.push(route)
        }
      }

      // 6. 执行计划
      const result = await executePlan(plan, handlers)
      lastExecutionResult.value = result

      // 7. 添加镜我回应到对话记录
      const mirrorEntry: DialogueEntry = {
        id: generateDialogueId(),
        role: 'mirror',
        text: result.message || response,
        timestamp: Date.now(),
        executionResult: result,
      }
      dialogue.value.push(mirrorEntry)
      lastResponse.value = result.message || response

      return {
        response: result.message || response,
        result,
        parsedTask: best,
        ambiguous: lastParseResult.value.ambiguous,
      }
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * 仅解析用户输入，不执行
   * @param text 用户输入文本
   * @returns 解析结果
   */
  function parse(text: string): ParsedTaskResult {
    const result = parseTask(text)
    lastParseResult.value = result
    return result
  }

  /**
   * 清空对话记录
   */
  function clear() {
    dialogue.value = []
    lastResponse.value = null
    lastParseResult.value = null
    lastExecutionResult.value = null
  }

  /**
   * 获取最近 N 条对话
   */
  function recent(count: number = 10): DialogueEntry[] {
    return dialogue.value.slice(-count)
  }

  return {
    // 状态
    dialogue,
    isProcessing,
    lastResponse,
    lastParseResult,
    lastExecutionResult,
    // 计算属性
    isAmbiguous,
    candidates,
    bestCandidate,
    // 动作
    send,
    parse,
    clear,
    recent,
  }
}