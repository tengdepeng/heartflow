// ============================================================
// 镜面对话系统 · useMirrorDialogue() composable
// 连接解析器、执行流与真实 stores，形成完整的镜我对话回路
// 蓝图要求：Mirror Self Dialogue System
// ============================================================

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { parseTask } from './parser'
import { executePlan } from './executor'
import { resolveRoomRoute } from './roomResolver'
import { decideForProactive, emitOperationGate } from '../../modules/operation-mode/gate'
import type {
  ParsedTask,
  ParsedTaskResult,
  ExecutionResult,
  DialogueEntry,
  StepResult,
  IntentCategory,
} from './types'
import type { ActionHandlerRegistry } from './executor'
import {
  invokePluginCapability,
  findCapabilityByKeyword,
} from '../plugin/capability-registry'
import { useStudy } from '../study'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import { getAllRooms } from '../../engine/room-graph'
import { GROUP_LABELS } from '../../modules/room-taxonomy'
import { INTENT_INFO } from './intents'

// ---- 默认 Action Handler 工厂 ----

/**
 * 创建默认的 Action Handler 注册表，连接真实 stores
 */
function createDefaultHandlers(): ActionHandlerRegistry {
  const handlers: Partial<ActionHandlerRegistry> = {}

  // ---- start-focus: 启动专注计时 ----
  // 实现由核心插件 core-timer 提供（声明见 types.CORE_PLUGINS.capabilities），
  // 经能力注册表三重门控：插件禁用 / 权限回收 → 该能力即刻失效。
  // 这是插件「被真实消费」的第一个链路（蓝图 L10612）。
  handlers['start-focus'] = (params: Record<string, unknown>): StepResult => {
    const r = invokePluginCapability<{ duration: number; taskName: string }>(
      'core-timer',
      'start-focus',
      params,
    )
    if (!r.ok) {
      return {
        order: 0,
        action: 'start-focus',
        success: false,
        error: r.error || '专注计时启动失败',
      }
    }
    return {
      order: 0,
      action: 'start-focus',
      success: true,
      data: r.value,
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

  // ---- start-rest: 开始休息（进入安全岛）----
  // 同 start-focus：实现由核心插件 core-timer 提供，经能力通道门控
  handlers['start-rest'] = (params: Record<string, unknown>): StepResult => {
    const r = invokePluginCapability<{ duration: number }>('core-timer', 'start-rest', params)
    if (!r.ok) {
      return { order: 0, action: 'start-rest', success: false, error: r.error || '休息启动失败' }
    }
    return { order: 0, action: 'start-rest', success: true, data: r.value }
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

// ---- 资产感知（Item 4）：让幕僚"知晓自身院落" ----
// 用户问"有哪些房间 / 能做什么"时，列举真实房间与能力，而非通用兜底
const ROOM_AWARE_CUES = [
  '房间', '空间', '都有啥', '有哪些', '你有哪些', '你能打开', '打开什么',
  '去哪', '在哪里', '目录', '都有什么', '院落', '地方',
]
const CAPABILITY_AWARE_CUES = [
  '能做什么', '会什么', '能干嘛', '功能', '你会', '能帮我', '可以做什么',
  '擅长', '能干什么', '能做什么事', '本领',
]

function buildAssetOverview(text: string): string | null {
  const t = text.toLowerCase()
  const asksRooms = ROOM_AWARE_CUES.some((c) => t.includes(c.toLowerCase()))
  const asksCaps = CAPABILITY_AWARE_CUES.some((c) => t.includes(c.toLowerCase()))
  if (!asksRooms && !asksCaps) return null

  const parts: string[] = []

  if (asksRooms) {
    const byGroup = new Map<string, string[]>()
    for (const room of getAllRooms()) {
      if (room.defaultNavVisible === false) continue
      const label = GROUP_LABELS[room.group] ?? room.group
      if (!byGroup.has(label)) byGroup.set(label, [])
      byGroup.get(label)!.push(room.name)
    }
    const lines = [...byGroup.entries()].map(([g, names]) => `· ${g}：${names.join('、')}`)
    parts.push(
      `我这里是一整座院落，目前有这些房间：\n${lines.join('\n')}\n\n想进哪个，直接说「打开 XX」就行——比如「打开记账」会带你去劳酬空间。`,
    )
  }

  if (asksCaps) {
    const caps = Object.values(INTENT_INFO)
      .filter((i) => i.category !== 'unknown')
      .map((i) => `${i.label}（${i.description}）`)
    parts.push(`我能帮你做这些事：\n${caps.join('；')}。`)
  }

  return parts.join('\n\n')
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

  /**
   * 发送用户输入，触发完整的解析-执行-回应流程
   * @param text 用户输入文本
   * @param opts.overrideIntent 歧义消解：强制选定的意图
   * @param opts.roomId 房间感知：创建的笔记/计划所归属房间
   * @returns 执行结果
   */
  async function send(
    text: string,
    opts?: { overrideIntent?: IntentCategory; roomId?: string; bypassGate?: boolean },
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
        // Item 4：资产感知优先于通用兜底——用户问"有哪些房间/能做什么"时真正列举院落资产
        const overview = buildAssetOverview(text)
        if (overview) {
          const mirrorEntry: DialogueEntry = {
            id: generateDialogueId(),
            role: 'mirror',
            text: overview,
            timestamp: Date.now(),
          }
          dialogue.value.push(mirrorEntry)
          lastResponse.value = overview
          const result: ExecutionResult = {
            success: true,
            stepsExecuted: 0,
            stepsTotal: 0,
            message: overview,
            stepResults: [],
          }
          lastExecutionResult.value = result
          return {
            response: overview,
            result,
            parsedTask: null,
            ambiguous: false,
          }
        }
        // 3.1 插件能力路由（蓝图 L10612）：既有意图都处理不了时，交给已启用插件提供的能力。
        // 放在兜底之前、资产感知之后，确保不会截胡正常意图。
        const capHit = findCapabilityByKeyword(text)
        if (capHit) {
          const capRes = invokePluginCapability<{ summary?: string }>(
            capHit.pluginId,
            capHit.capability.id,
            { query: text },
          )
          const capText = capRes.ok
            ? capRes.value?.summary ?? `「${capHit.capability.label}」已执行。`
            : capRes.error ?? '该能力暂时不可用。'

          const capEntry: DialogueEntry = {
            id: generateDialogueId(),
            role: 'mirror',
            text: capText,
            timestamp: Date.now(),
          }
          dialogue.value.push(capEntry)
          lastResponse.value = capText

          const capResult: ExecutionResult = {
            success: capRes.ok,
            stepsExecuted: capRes.ok ? 1 : 0,
            stepsTotal: 1,
            message: capText,
            stepResults: [
              {
                order: 0,
                action: 'respond',
                success: capRes.ok,
                data: { pluginId: capHit.pluginId, capability: capHit.capability.id },
                error: capRes.ok ? undefined : capRes.error,
              },
            ],
          }
          lastExecutionResult.value = capResult

          return {
            response: capText,
            result: capResult,
            parsedTask: null,
            ambiguous: false,
          }
        }

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

      // 4.2 三级操作模式门控
      // silent（默认）→ 直接执行；confirm/suggest → 不自动执行，改发待确认/建议事件。
      // bypassGate=true 表示已用户点头（来自待确认托盘回投），跳过门控直接执行。
      const decision = opts?.bypassGate ? 'execute' : decideForProactive()
      if (decision !== 'execute') {
        emitOperationGate({
          kind: 'advisor',
          decision: decision as 'confirm' | 'suggest',
          message: response,
          text: response,
          advisorId: 'mirror',
          originalText: text,
          intent: best.intent,
        })
        const gateLine =
          decision === 'confirm'
            ? `已为你备好：${response}（请在右下角「待确认」中点执行）`
            : `建议：${response}`
        const gateEntry: DialogueEntry = {
          id: generateDialogueId(),
          role: 'mirror',
          text: gateLine,
          timestamp: Date.now(),
        }
        dialogue.value.push(gateEntry)
        lastResponse.value = gateLine
        return {
          response: gateLine,
          result: { success: true, stepsExecuted: 0, stepsTotal: plan.steps.length, message: gateLine, stepResults: [] },
          parsedTask: best,
          ambiguous: lastParseResult.value.ambiguous,
        }
      }

      // 5. 处理 navigate 操作（需要在执行前处理路由跳转）
      // 用房间图动态解析 + 别名表，替换写死的 roomRouteMap；解析失败则回退提示而非静默无动作
      let navigateFailedTarget: string | null = null
      const navigateStep = plan.steps.find(s => s.action === 'navigate')
      if (navigateStep) {
        const target = (navigateStep.params.target as string) || ''
        const resolved = resolveRoomRoute(target)
        if (resolved.path) {
          router.push(resolved.path)
        } else {
          // 解析失败：记录目标，步骤 7 用回退文案覆盖「正在跳转」回执
          navigateFailedTarget = target
        }
      }

      // 6. 执行计划
      const result = await executePlan(plan, handlers)
      lastExecutionResult.value = result

      // 7. 添加镜我回应到对话记录
      // 若 navigate 解析失败，用回退文案覆盖「正在跳转」回执，避免「只说不做」
      const mirrorText = navigateFailedTarget
        ? `没找到「${navigateFailedTarget}」对应的房间，试试更准确的说法，例如「打开殿堂设置」或「去情绪花房」。`
        : (result.message || response)
      const mirrorEntry: DialogueEntry = {
        id: generateDialogueId(),
        role: 'mirror',
        text: mirrorText,
        timestamp: Date.now(),
        executionResult: result,
      }
      dialogue.value.push(mirrorEntry)
      lastResponse.value = mirrorText

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