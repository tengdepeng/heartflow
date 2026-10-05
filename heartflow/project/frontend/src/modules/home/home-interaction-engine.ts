// ============================================================
// 家 · 深度交互引擎
// 房间活动系统、交互链、情绪追踪、访问日志
// P13-1b增强：60% → 80%
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { HOME_ROOMS } from './rooms'
import { getLocalDateKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 房间活动类型 */
export type RoomActivityType =
  | 'enter'           // 进入房间
  | 'linger'          // 停留
  | 'interact'        // 交互
  | 'decorate'        // 装饰
  | 'journal'         // 记录
  | 'rest'            // 休息
  | 'ritual'          // 仪式
  | 'insight'         // 洞察
  | 'cleanup'         // 整理

/** 房间活动 */
export interface RoomActivity {
  id: string
  roomId: string
  type: RoomActivityType
  /** 活动标签 */
  label: string
  /** 活动描述 */
  description: string
  /** 持续时间（分钟） */
  duration: number
  /** 情绪评分 1-10 */
  moodScore?: number
  /** 获得的洞察 */
  insight?: string
  /** 创建时间 */
  createdAt: string
}

/** 房间情绪快照 */
export interface RoomMoodSnapshot {
  roomId: string
  /** 平均情绪分 */
  avgMoodScore: number
  /** 访问次数 */
  visitCount: number
  /** 总停留时长（分钟） */
  totalDuration: number
  /** 最近活动类型 */
  lastActivityType: RoomActivityType | null
  /** 最近访问时间 */
  lastVisitedAt: string | null
  /** 情绪趋势：improving/stable/declining */
  moodTrend: 'improving' | 'stable' | 'declining'
}

/** 交互链步骤 */
export interface InteractionStep {
  id: string
  label: string
  description: string
  /** 步骤类型 */
  type: 'action' | 'pause' | 'choice' | 'reflection'
  /** 预计时长（分钟） */
  estimatedDuration: number
  /** 选项（当 type 为 choice 时） */
  options?: { label: string; value: string }[]
  /** 是否完成 */
  completed: boolean
}

/** 交互链 */
export interface InteractionChain {
  id: string
  roomId: string
  name: string
  description: string
  steps: InteractionStep[]
  currentStepIndex: number
  startedAt: string
  completedAt?: string
  cancelled: boolean
}

/** 活动建议 */
export interface ActivitySuggestion {
  id: string
  roomId: string
  roomName: string
  roomIcon: string
  activityName: string
  description: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  estimatedDuration: number
}

/** 存储键 */
const ACTIVITIES_KEY = 'hf:home:activities'
const MOOD_SNAPSHOTS_KEY = 'hf:home:mood_snapshots'
const INTERACTION_CHAINS_KEY = 'hf:home:interaction_chains'

// ---- 预设交互链（按房间） ----

const ROOM_INTERACTION_CHAINS: Record<string, { name: string; description: string; steps: Omit<InteractionStep, 'id' | 'completed'>[] }[]> = {
  kitchen: [{
    name: '烹饪仪式',
    description: '从备料到成品，一次完整的烹饪体验',
    steps: [
      { label: '选择菜谱', description: '从收藏中挑选今日想做的菜', type: 'choice', estimatedDuration: 3, options: [
        { label: '家常小炒', value: 'stir-fry' },
        { label: '暖心汤羹', value: 'soup' },
        { label: '烘焙甜点', value: 'baking' },
      ]},
      { label: '准备食材', description: '清洗、切配，感受食材的质感', type: 'action', estimatedDuration: 10 },
      { label: '烹饪过程', description: '火候与调味，专注当下的创造', type: 'action', estimatedDuration: 20 },
      { label: '品味成品', description: '慢下来，品尝自己的作品', type: 'pause', estimatedDuration: 10 },
      { label: '记录感悟', description: '写下这次烹饪的体验与收获', type: 'reflection', estimatedDuration: 5 },
    ],
  }],
  study: [{
    name: '深度阅读',
    description: '沉浸式阅读与知识沉淀',
    steps: [
      { label: '选择读物', description: '从书架中挑选今日要读的书', type: 'choice', estimatedDuration: 2, options: [
        { label: '专业书籍', value: 'professional' },
        { label: '文学经典', value: 'literature' },
        { label: '随笔杂记', value: 'essay' },
      ]},
      { label: '专注阅读', description: '关闭干扰，沉浸于文字之中', type: 'action', estimatedDuration: 30 },
      { label: '摘录笔记', description: '记录打动你的段落与思考', type: 'action', estimatedDuration: 10 },
      { label: '反思沉淀', description: '写下阅读后的感悟与启发', type: 'reflection', estimatedDuration: 5 },
    ],
  }],
  courtyard: [{
    name: '庭院漫步',
    description: '在庭院中缓步，感受自然与内心的对话',
    steps: [
      { label: '放慢脚步', description: '深呼吸，感受庭院的气息', type: 'pause', estimatedDuration: 3 },
      { label: '观察草木', description: '留意每一株植物的变化', type: 'action', estimatedDuration: 10 },
      { label: '静坐冥想', description: '找一处坐下，闭上眼睛', type: 'pause', estimatedDuration: 10 },
      { label: '记录灵感', description: '写下此刻涌现的想法', type: 'reflection', estimatedDuration: 5 },
    ],
  }],
  bedroom: [{
    name: '睡前仪式',
    description: '为一天画上温柔的句号',
    steps: [
      { label: '整理床铺', description: '铺好被褥，让空间归于整洁', type: 'action', estimatedDuration: 3 },
      { label: '日间回顾', description: '回想今天的三件好事', type: 'reflection', estimatedDuration: 5 },
      { label: '放松呼吸', description: '跟随引导进行深呼吸', type: 'pause', estimatedDuration: 5 },
      { label: '入眠准备', description: '调暗灯光，准备进入梦乡', type: 'pause', estimatedDuration: 3 },
    ],
  }],
  wardrobe: [{
    name: '风格探索',
    description: '探索今日的穿搭风格，表达当下的自我',
    steps: [
      { label: '感受今日', description: '觉察今日的心情与状态', type: 'reflection', estimatedDuration: 2 },
      { label: '选择风格', description: '从风格库中挑选今日方向', type: 'choice', estimatedDuration: 3, options: [
        { label: '干练利落', value: 'sharp' },
        { label: '舒适自在', value: 'comfy' },
        { label: '精致优雅', value: 'elegant' },
        { label: '创意个性', value: 'creative' },
      ]},
      { label: '搭配组合', description: '将单品组合成今日的造型', type: 'action', estimatedDuration: 8 },
      { label: '镜前确认', description: '在镜前确认整体效果', type: 'pause', estimatedDuration: 2 },
      { label: '记录搭配', description: '保存今日搭配作为风格档案', type: 'reflection', estimatedDuration: 2 },
    ],
  }],
  'dining-room': [{
    name: '用餐仪式',
    description: '将每一餐变成一次有意识的体验',
    steps: [
      { label: '布置餐桌', description: '摆放餐具，营造用餐氛围', type: 'action', estimatedDuration: 3 },
      { label: '感恩食物', description: '花片刻感谢食物与劳动者', type: 'pause', estimatedDuration: 1 },
      { label: '慢食体验', description: '细嚼慢咽，感受每一口的味道', type: 'action', estimatedDuration: 20 },
      { label: '用餐记录', description: '记录今日的味觉体验', type: 'reflection', estimatedDuration: 3 },
    ],
  }],
  'living-room': [{
    name: '客厅时光',
    description: '在客厅中放松或进行有意义的对话',
    steps: [
      { label: '营造氛围', description: '调整灯光与音乐，创造舒适空间', type: 'action', estimatedDuration: 2 },
      { label: '选择活动', description: '决定此刻想做什么', type: 'choice', estimatedDuration: 2, options: [
        { label: '阅读一本书', value: 'reading' },
        { label: '写日记', value: 'journaling' },
        { label: '听音乐', value: 'music' },
        { label: '整理思绪', value: 'reflection' },
      ]},
      { label: '沉浸其中', description: '全身心投入选择的活动', type: 'action', estimatedDuration: 25 },
      { label: '记录感受', description: '写下此刻的心境', type: 'reflection', estimatedDuration: 5 },
    ],
  }],
  bathroom: [{
    name: '沐浴仪式',
    description: '在温热的水流中卸下疲惫，让身心归于柔软',
    steps: [
      { label: '准备空间', description: '点燃香薰，调暗灯光', type: 'action', estimatedDuration: 3 },
      { label: '温水浸泡', description: '让身体在温热中放松', type: 'pause', estimatedDuration: 15 },
      { label: '肌肤护理', description: '用心呵护每一寸肌肤', type: 'action', estimatedDuration: 8 },
      { label: '身心重置', description: '感受焕然一新的自己', type: 'reflection', estimatedDuration: 3 },
    ],
  }],
  balcony: [{
    name: '阳台守望',
    description: '在阳台远眺，与城市或星空对话',
    steps: [
      { label: '打开窗户', description: '让新鲜空气流入室内', type: 'action', estimatedDuration: 1 },
      { label: '远眺放松', description: '将目光放远，放松眼部肌肉', type: 'pause', estimatedDuration: 5 },
      { label: '聆听城市', description: '闭眼聆听远处的声音', type: 'pause', estimatedDuration: 5 },
      { label: '记录感悟', description: '写下眺望时浮现的思绪', type: 'reflection', estimatedDuration: 5 },
    ],
  }],
  storage: [{
    name: '整理仪式',
    description: '在整理物品的过程中，也在整理内心',
    steps: [
      { label: '打开储藏室', description: '面对被遗忘的角落', type: 'action', estimatedDuration: 2 },
      { label: '分类整理', description: '将物品按类别重新排列', type: 'action', estimatedDuration: 15 },
      { label: '取舍决策', description: '决定哪些保留、哪些放手', type: 'choice', estimatedDuration: 10, options: [
        { label: '保留——还有情感价值', value: 'keep' },
        { label: '放手——该说再见了', value: 'let_go' },
        { label: '暂存——再想想', value: 'pending' },
      ]},
      { label: '记录发现', description: '写下整理过程中发现的故事', type: 'reflection', estimatedDuration: 5 },
    ],
  }],
  entrance: [{
    name: '归家仪式',
    description: '从外界的身份切换回属于自己的空间',
    steps: [
      { label: '脱下外套', description: '卸下社会角色的外衣', type: 'action', estimatedDuration: 1 },
      { label: '深呼吸', description: '三次深呼吸，让身心回到当下', type: 'pause', estimatedDuration: 2 },
      { label: '整理钥匙', description: '挂好钥匙，环顾今日的备忘', type: 'action', estimatedDuration: 2 },
      { label: '状态切换', description: '觉察自己从"工作模式"切换到"家模式"', type: 'reflection', estimatedDuration: 3 },
    ],
  }],
}

// ============================================================
// 深度交互引擎
// ============================================================

export function useHomeInteractionEngine() {
  const activities = ref<RoomActivity[]>(loadActivities())
  const moodSnapshots = ref<RoomMoodSnapshot[]>(loadMoodSnapshots())
  const chains = ref<InteractionChain[]>(loadChains())

  // ---- 持久化 ----

  function loadActivities(): RoomActivity[] {
    try {
      const raw = storage.getKV<string>(ACTIVITIES_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveActivities() {
    storage.setKV(ACTIVITIES_KEY, JSON.stringify(activities.value))
  }

  function loadMoodSnapshots(): RoomMoodSnapshot[] {
    try {
      const raw = storage.getKV<string>(MOOD_SNAPSHOTS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveMoodSnapshots() {
    storage.setKV(MOOD_SNAPSHOTS_KEY, JSON.stringify(moodSnapshots.value))
  }

  function loadChains(): InteractionChain[] {
    try {
      const raw = storage.getKV<string>(INTERACTION_CHAINS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveChains() {
    storage.setKV(INTERACTION_CHAINS_KEY, JSON.stringify(chains.value))
  }

  // ---- 活动记录 ----

  /** 记录房间活动 */
  function recordActivity(
    roomId: string,
    type: RoomActivityType,
    label: string,
    description: string,
    duration: number,
    moodScore?: number,
    insight?: string
  ): RoomActivity {
    const activity: RoomActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roomId,
      type,
      label,
      description,
      duration,
      moodScore,
      insight,
      createdAt: new Date().toISOString(),
    }
    activities.value.push(activity)

    // 更新房间情绪快照
    updateMoodSnapshot(roomId, moodScore, duration, type)

    saveActivities()
    return activity
  }

  /** 更新房间情绪快照 */
  function updateMoodSnapshot(
    roomId: string,
    moodScore?: number,
    duration?: number,
    activityType?: RoomActivityType
  ) {
    let snapshot = moodSnapshots.value.find(s => s.roomId === roomId)
    if (!snapshot) {
      snapshot = {
        roomId,
        avgMoodScore: 0,
        visitCount: 0,
        totalDuration: 0,
        lastActivityType: null,
        lastVisitedAt: null,
        moodTrend: 'stable',
      }
      moodSnapshots.value.push(snapshot)
    }

    const prevScore = snapshot.avgMoodScore
    snapshot.visitCount++
    if (duration) snapshot.totalDuration += duration
    if (moodScore !== undefined) {
      snapshot.avgMoodScore = Math.round(
        (snapshot.avgMoodScore * (snapshot.visitCount - 1) + moodScore) / snapshot.visitCount
      )
    }
    if (activityType) snapshot.lastActivityType = activityType
    snapshot.lastVisitedAt = new Date().toISOString()

    // 情绪趋势
    if (moodScore !== undefined && snapshot.visitCount > 1) {
      if (moodScore > prevScore + 0.5) snapshot.moodTrend = 'improving'
      else if (moodScore < prevScore - 0.5) snapshot.moodTrend = 'declining'
      else snapshot.moodTrend = 'stable'
    }

    saveMoodSnapshots()
  }

  // ---- 交互链 ----

  /** 获取房间的预设交互链模板 */
  function getRoomInteractionChains(roomId: string) {
    return ROOM_INTERACTION_CHAINS[roomId] || []
  }

  /** 开始一个交互链 */
  function startInteractionChain(roomId: string, chainName: string): InteractionChain | null {
    const templates = ROOM_INTERACTION_CHAINS[roomId]
    if (!templates) return null

    const template = templates.find(t => t.name === chainName)
    if (!template) return null

    const chain: InteractionChain = {
      id: `chain_${Date.now()}`,
      roomId,
      name: template.name,
      description: template.description,
      steps: template.steps.map((step, index) => ({
        ...step,
        id: `step_${index}_${Date.now()}`,
        completed: false,
      })),
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      cancelled: false,
    }

    chains.value.push(chain)
    saveChains()
    return chain
  }

  /** 完成当前步骤 */
  function completeCurrentStep(chainId: string, choiceValue?: string): boolean {
    const chain = chains.value.find(c => c.id === chainId)
    if (!chain || chain.cancelled) return false

    const step = chain.steps[chain.currentStepIndex]
    if (!step) return false

    step.completed = true
    if (choiceValue && step.options) {
      step.options = step.options.map(o => ({ ...o, label: o.value === choiceValue ? `✓ ${o.label}` : o.label }))
    }

    chain.currentStepIndex++
    saveChains()
    return true
  }

  /** 取消交互链 */
  function cancelInteractionChain(chainId: string) {
    const chain = chains.value.find(c => c.id === chainId)
    if (chain) {
      chain.cancelled = true
      saveChains()
    }
  }

  /** 当前活跃的交互链 */
  const activeChains = computed(() =>
    chains.value.filter(c => !c.cancelled && c.currentStepIndex < c.steps.length)
  )

  /** 获取房间的当前活跃交互链 */
  function getActiveChainForRoom(roomId: string): InteractionChain | null {
    return activeChains.value.find(c => c.roomId === roomId) || null
  }

  // ---- 活动建议 ----

  /** 生成活动建议 */
  function generateSuggestions(): ActivitySuggestion[] {
    const suggestions: ActivitySuggestion[] = []

    for (const room of HOME_ROOMS) {
      const snapshot = moodSnapshots.value.find(s => s.roomId === room.id)
      const chains = ROOM_INTERACTION_CHAINS[room.id]
      if (!chains || chains.length === 0) continue

      // 根据房间状态生成建议
      let priority: 'high' | 'medium' | 'low' = 'medium'
      let reason = ''

      if (!snapshot || snapshot.visitCount === 0) {
        priority = 'high'
        reason = '还未探索过这个空间'
      } else if (snapshot.moodTrend === 'declining') {
        priority = 'high'
        reason = '最近在这里的情绪在下降，需要重新连接'
      } else if (snapshot.moodTrend === 'improving') {
        priority = 'medium'
        reason = '这里让你感到越来越好，继续保持'
      } else {
        const lastVisit = snapshot.lastVisitedAt ? new Date(snapshot.lastVisitedAt).getTime() : 0
        const daysSinceLastVisit = (Date.now() - lastVisit) / (1000 * 60 * 60 * 24)
        if (daysSinceLastVisit > 7) {
          priority = 'high'
          reason = `已有 ${Math.floor(daysSinceLastVisit)} 天没有来到这里了`
        } else {
          priority = 'low'
          reason = '最近刚来过，可以偶尔回来看看'
        }
      }

      suggestions.push({
        id: `sug_${room.id}`,
        roomId: room.id,
        roomName: room.name,
        roomIcon: room.icon,
        activityName: chains[0].name,
        description: chains[0].description,
        priority,
        reason,
        estimatedDuration: chains[0].steps.reduce((sum, s) => sum + s.estimatedDuration, 0),
      })
    }

    return suggestions.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  }

  // ---- 房间统计 ----

  /** 房间活动统计 */
  function getRoomStats(roomId: string) {
    const roomActivities = activities.value.filter(a => a.roomId === roomId)
    const snapshot = moodSnapshots.value.find(s => s.roomId === roomId)

    return {
      totalActivities: roomActivities.length,
      totalDuration: snapshot?.totalDuration || 0,
      avgMoodScore: snapshot?.avgMoodScore || 0,
      moodTrend: snapshot?.moodTrend || 'stable',
      lastVisitedAt: snapshot?.lastVisitedAt || null,
      recentActivities: roomActivities.slice(-10).reverse(),
      activityTypeDistribution: roomActivities.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
  }

  /** 最近活动 */
  const recentActivities = computed(() =>
    [...activities.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 20)
  )

  /** 今日活动数 */
  const todayActivityCount = computed(() => {
    const today = getLocalDateKey()
    return activities.value.filter(a => getLocalDateKey(new Date(a.createdAt)) === today).length
  })

  /** 最常访问的房间 */
  const mostVisitedRoom = computed(() => {
    if (moodSnapshots.value.length === 0) return null
    const top = [...moodSnapshots.value].sort((a, b) => b.visitCount - a.visitCount)[0]
    return HOME_ROOMS.find(r => r.id === top.roomId) || null
  })

  return {
    // 状态
    activities,
    moodSnapshots,
    chains,
    activeChains,
    recentActivities,
    todayActivityCount,
    mostVisitedRoom,

    // 活动
    recordActivity,
    getRoomStats,

    // 交互链
    getRoomInteractionChains,
    startInteractionChain,
    completeCurrentStep,
    cancelInteractionChain,
    getActiveChainForRoom,

    // 建议
    generateSuggestions,
  }
}