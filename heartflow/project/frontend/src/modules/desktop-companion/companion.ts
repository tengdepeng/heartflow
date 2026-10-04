// ============================================================
// 陪伴精灵 · 桌面宠物养成闭环（INCR-488）
// 落点：家（HomeSpace）· 桌面端强适配
// 纯 storage 持久化 composable；幕僚好感联动由面板层懒调用（不在此处耦合）
// ============================================================

import { ref, computed, type Ref } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

export type CompanionForm = 'sprite' | 'beast' | 'wisp'

export interface CompanionState {
  /** 是否已领养 */
  adopted: boolean
  /** 精灵名字（用户命名） */
  name: string
  /** 精灵形态 */
  form: CompanionForm
  /** 等级（1 起） */
  level: number
  /** 当前等级内累计经验 */
  xp: number
  /** 饱食度 0-100 */
  satiety: number
  /** 亲密度 0-100 */
  affection: number
  /** 精力 0-100 */
  energy: number
  /** 小窝等级（建屋），由 level 派生 */
  homeLevel: number
  /** 最近喂食日期（本地日 key） */
  lastFedDate: string
  /** 最近陪伴日期 */
  lastPlayDate: string
  /** 领养时间戳 */
  createdAt: string
}

export const COMPANION_FORMS: { id: CompanionForm; name: string; emoji: string }[] = [
  { id: 'sprite', name: '光灵', emoji: '🪄' },
  { id: 'beast', name: '灵兽', emoji: '🐾' },
  { id: 'wisp', name: '萤精灵', emoji: '✨' },
]

const STORAGE_KEY = 'hf:desktop_companion'

function createDefaultState(): CompanionState {
  return {
    adopted: false,
    name: '',
    form: 'sprite',
    level: 1,
    xp: 0,
    satiety: 60,
    affection: 60,
    energy: 60,
    homeLevel: 0,
    lastFedDate: '',
    lastPlayDate: '',
    createdAt: '',
  }
}

/** 读取并补全缺省字段（防御存储写入被截断/老版本缺字段） */
function load(): CompanionState {
  const stored = storage.getKV<Partial<CompanionState>>(STORAGE_KEY, {})
  return { ...createDefaultState(), ...stored }
}

/** 升到下一级所需经验（随等级线性增长） */
export function xpToNext(level: number): number {
  return 50 + (level - 1) * 30
}

/** 由等级派生小窝（建屋）等级：每 3 级扩建一次 */
export function homeLevelFor(level: number): number {
  return Math.max(0, Math.floor((level - 1) / 3))
}

let state: Ref<CompanionState> | null = null

export function useDesktopCompanion() {
  if (!state) {
    state = ref<CompanionState>(load())
  }

  const s = () => state as Ref<CompanionState>

  function persist() {
    storage.setKV(STORAGE_KEY, s().value)
  }

  const isAdopted = computed(() => s().value.adopted)

  const formMeta = computed(
    () => COMPANION_FORMS.find((f) => f.id === s().value.form) ?? COMPANION_FORMS[0],
  )

  /** 领养：命名 + 选形态，初始化满状态 */
  function adopt(name: string, form: CompanionForm): boolean {
    const trimmed = (name || '').trim()
    if (!trimmed) return false
    const today = getLocalDateKey()
    s().value = {
      adopted: true,
      name: trimmed,
      form,
      level: 1,
      xp: 0,
      satiety: 80,
      affection: 80,
      energy: 80,
      homeLevel: 0,
      lastFedDate: today,
      lastPlayDate: today,
      createdAt: new Date().toISOString(),
    }
    persist()
    return true
  }

  /** 经验结算：可能连升多级，并同步小窝等级 */
  function gainXp(amount: number) {
    const cur = s().value
    cur.xp += amount
    while (cur.xp >= xpToNext(cur.level)) {
      cur.xp -= xpToNext(cur.level)
      cur.level += 1
    }
    cur.homeLevel = homeLevelFor(cur.level)
  }

  /** 喂食：提升饱食度并获取经验 */
  function feed(): boolean {
    if (!s().value.adopted) return false
    const cur = s().value
    cur.satiety = Math.min(100, cur.satiety + 25)
    cur.lastFedDate = getLocalDateKey()
    gainXp(10)
    persist()
    return true
  }

  /** 陪伴（玩耍）：提升亲密度、消耗精力、获取经验 */
  function play(): boolean {
    if (!s().value.adopted) return false
    const cur = s().value
    cur.affection = Math.min(100, cur.affection + 20)
    cur.energy = Math.max(0, cur.energy - 15)
    cur.lastPlayDate = getLocalDateKey()
    gainXp(15)
    persist()
    return true
  }

  /** 歇息：恢复精力 */
  function rest(): boolean {
    if (!s().value.adopted) return false
    const cur = s().value
    cur.energy = Math.min(100, cur.energy + 40)
    persist()
    return true
  }

  /**
   * 每日衰减：跨日未喂食则掉饱食/亲密，并自然回精力。
   * 在面板 onMounted 调用一次；同一天重复调用不会二次衰减（lastFedDate 已置今日）。
   */
  function tickDaily(): void {
    const cur = s().value
    if (!cur.adopted) return
    const today = getLocalDateKey()
    if (cur.lastFedDate !== today) {
      cur.satiety = Math.max(0, cur.satiety - 20)
      cur.affection = Math.max(0, cur.affection - 10)
      cur.lastFedDate = today
    }
    if (cur.energy < 100) cur.energy = Math.min(100, cur.energy + 10)
    persist()
  }

  /** 心情（由三项均值推导） */
  const mood = computed(() => {
    const cur = s().value
    const avg = (cur.satiety + cur.affection + cur.energy) / 3
    if (avg >= 75) return { key: 'joy', label: '欢欣', emoji: '😊' }
    if (avg >= 50) return { key: 'calm', label: '安宁', emoji: '🙂' }
    if (avg >= 25) return { key: 'bored', label: '倦怠', emoji: '😟' }
    return { key: 'sad', label: '低落', emoji: '😢' }
  })

  /** 升级进度 */
  const progress = computed(() => {
    const cur = s().value
    const next = xpToNext(cur.level)
    return {
      current: cur.xp,
      next,
      ratio: Math.min(1, cur.xp / next),
    }
  })

  /** 放归（清空，回到未领养） */
  function clearAll(): void {
    s().value = createDefaultState()
    persist()
  }

  /** 测试用：从 storage 重新加载（重置模块单例） */
  function reloadCompanionState(): void {
    state = ref<CompanionState>(load())
  }

  return {
    state: s(),
    isAdopted,
    formMeta,
    mood,
    progress,
    adopt,
    feed,
    play,
    rest,
    tickDaily,
    clearAll,
    reloadCompanionState,
    xpToNext,
    homeLevelFor,
  }
}
