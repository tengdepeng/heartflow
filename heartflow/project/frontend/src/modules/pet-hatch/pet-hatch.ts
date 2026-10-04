// ============================================================
// 宠物屋 · 蛋→孵化 + 材料建造 + 升级奖励（INCR-497）
// 落点：家（HomeSpace）· 补 INCR-488 陪伴精灵「养成闭环」前置与后置
// 借鉴：组件岛 宠物养成系统（领养→命名→喂食→升级→建屋 闭环 + 孵蛋动画）
// 纯 storage 持久化；孵化产物以「待领养」形式交给 INCR-488 useDesktopCompanion 领养
// ============================================================

import { ref, computed, type Ref } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

/** 蛋的形态（决定孵化产出哪种精灵） */
export type EggForm = 'ember' | 'frost' | 'moss'

/** 蛋的生命周期阶段 */
export type EggStage = 'idle' | 'incubating' | 'hatched'

/** 宠物屋建材 */
export type MaterialKey = 'wood' | 'stone' | 'cloth' | 'herb'

export interface PetHatchState {
  /** 当前阶段 */
  stage: EggStage
  /** 蛋形态（idle/incubating 阶段有效） */
  eggForm: EggForm
  /** 孵化开始时间戳（ms），非 incubating 为 0 */
  incubateStartTs: number
  /** 孵化已累计毫秒（收手后保留，续孵累加） */
  incubateAccumMs: number
  /** 孵化完成时间戳（ms），hatched 为有效值 */
  hatchedAtTs: number
  /** 孵化产出的待领养精灵（未领养前暂存） */
  hatchedForm: EggForm | null
  /** 是否已被领养消耗 */
  hatchedClaimed: boolean
  /** 建材库存 */
  materials: Record<MaterialKey, number>
  /** 小窝等级（由建造升级决定，与 488 的 homeLevel 独立） */
  houseLevel: number
  /** 升级奖励领取记录（按小窝等级，存已领等级避免重复领） */
  rewardsClaimed: number[]
  /** 最近采集建材的本地日 key（跨日限次） */
  lastGatherDate: string
}

export interface EggFormMeta {
  id: EggForm
  name: string
  emoji: string
  /** 对应 INCR-488 的精灵形态（孵化产物领养后使用） */
  companionForm: 'sprite' | 'beast' | 'wisp'
  /** 孵化所需总毫秒 */
  hatchMs: number
  /** 主色（面板用） */
  hue: string
}

export const EGG_FORMS: EggFormMeta[] = [
  { id: 'ember', name: '焰卵', emoji: '🔥', companionForm: 'beast', hatchMs: 30_000, hue: '#e8823c' },
  { id: 'frost', name: '霜卵', emoji: '❄️', companionForm: 'wisp', hatchMs: 45_000, hue: '#6ab0d6' },
  { id: 'moss', name: '苔卵', emoji: '🌱', companionForm: 'sprite', hatchMs: 60_000, hue: '#7fae62' },
]

export const MATERIAL_META: { key: MaterialKey; name: string; emoji: string }[] = [
  { key: 'wood', name: '木料', emoji: '🪵' },
  { key: 'stone', name: '石块', emoji: '🪨' },
  { key: 'cloth', name: '软布', emoji: '🧵' },
  { key: 'herb', name: '灵草', emoji: '🌾' },
]

/** 每级小窝所需建材（随等级递增） */
export function materialsForHouseLevel(level: number): Record<MaterialKey, number> {
  const n = Math.max(0, Math.floor(level)) + 1
  return { wood: 2 * n, stone: 2 * n, cloth: n, herb: n }
}

/** 升到指定小窝等级的总累计建材（逐级求和，供「累计进度」展示） */
export function totalMaterialsForHouseLevel(level: number): Record<MaterialKey, number> {
  const out: Record<MaterialKey, number> = { wood: 0, stone: 0, cloth: 0, herb: 0 }
  for (let i = 0; i < Math.max(0, Math.floor(level)); i++) {
    const c = materialsForHouseLevel(i)
    out.wood += c.wood
    out.stone += c.stone
    out.cloth += c.cloth
    out.herb += c.herb
  }
  return out
}

/** 某等级小窝的升级奖励 */
export function rewardForHouseLevel(level: number): { name: string; emoji: string; desc: string } {
  const table: Record<number, { name: string; emoji: string; desc: string }> = {
    1: { name: '绒垫小窝', emoji: '🛏️', desc: '精灵有了柔软的新窝' },
    2: { name: '木栅小院', emoji: '⛩️', desc: '小窝扩建出围栏' },
    3: { name: '灵泉石池', emoji: '⛲', desc: '院中引入一方灵泉' },
    4: { name: '花藤凉亭', emoji: '🌸', desc: '藤蔓爬满凉亭' },
    5: { name: '星辉阁楼', emoji: '🌟', desc: '阁顶映出星辉' },
  }
  return table[level] ?? { name: '神秘加建', emoji: '🌀', desc: '小窝又添了一处谜之角落' }
}

const STORAGE_KEY = 'hf:pet_hatch'

function createDefaultState(): PetHatchState {
  return {
    stage: 'idle',
    eggForm: 'ember',
    incubateStartTs: 0,
    incubateAccumMs: 0,
    hatchedAtTs: 0,
    hatchedForm: null,
    hatchedClaimed: false,
    materials: { wood: 0, stone: 0, cloth: 0, herb: 0 },
    houseLevel: 0,
    rewardsClaimed: [],
    lastGatherDate: '',
  }
}

function load(): PetHatchState {
  const stored = storage.getKV<Partial<PetHatchState>>(STORAGE_KEY, {})
  const base = createDefaultState()
  return {
    ...base,
    ...stored,
    materials: { ...base.materials, ...(stored.materials ?? {}) },
    rewardsClaimed: Array.isArray(stored.rewardsClaimed) ? [...stored.rewardsClaimed] : [],
  }
}

/** 孵化所需总毫秒（按当前蛋形态） */
export function hatchMsFor(form: EggForm): number {
  return EGG_FORMS.find((f) => f.id === form)?.hatchMs ?? 30_000
}

/** 校验形态，非法回退焰卵 */
function normalizeForm(form: EggForm): EggForm {
  return EGG_FORMS.some((f) => f.id === form) ? form : 'ember'
}

/** 已孵化毫秒 = 累计 + 进行中实时段 */
export function incubatedMs(state: PetHatchState, now: number): number {
  let ms = state.incubateAccumMs
  if (state.stage === 'incubating' && state.incubateStartTs > 0) {
    ms += Math.max(0, now - state.incubateStartTs)
  }
  return ms
}

/** 孵化进度 0~1（按当前/产出形态的需求量） */
export function hatchProgress(state: PetHatchState, now: number): number {
  const form = state.stage === 'hatched' ? (state.hatchedForm ?? state.eggForm) : state.eggForm
  const need = hatchMsFor(form)
  if (need <= 0) return 1
  return Math.min(1, incubatedMs(state, now) / need)
}

let state: Ref<PetHatchState> | null = null
let nowTs = ref(Date.now())

export function usePetHatch() {
  if (!state) {
    state = ref<PetHatchState>(load())
  }
  const s = () => state as Ref<PetHatchState>

  function persist() {
    storage.setKV(STORAGE_KEY, s().value)
  }

  /** 真实时钟；也可由测试或节拍注入 */
  function now() {
    return nowTs.value
  }
  function setNow(ts: number) {
    nowTs.value = ts
  }

  const formMeta = computed(
    () => EGG_FORMS.find((f) => f.id === (s().value.hatchedForm ?? s().value.eggForm)) ?? EGG_FORMS[0],
  )
  const stage = computed(() => s().value.stage)
  const progress = computed(() => hatchProgress(s().value, nowTs.value))
  const hasUnclaimed = computed(() => s().value.stage === 'hatched' && !s().value.hatchedClaimed)

  /** 取一枚新蛋：重置孵化进度与产出（已领养或未领养都允许重开） */
  function takeEgg(form: EggForm): boolean {
    s().value = {
      ...s().value,
      stage: 'idle',
      eggForm: normalizeForm(form),
      incubateStartTs: 0,
      incubateAccumMs: 0,
      hatchedAtTs: 0,
      hatchedForm: null,
      hatchedClaimed: false,
    }
    persist()
    return true
  }

  /** 开始温蛋（idle → incubating） */
  function startIncubate(): boolean {
    if (s().value.stage !== 'idle') return false
    s().value.stage = 'incubating'
    s().value.incubateStartTs = nowTs.value
    persist()
    return true
  }

  /** 收手：结算已温时长，孵化中 → idle（可续温） */
  function stopIncubate(): boolean {
    if (s().value.stage !== 'incubating') return false
    const cur = s().value
    cur.incubateAccumMs = incubatedMs(cur, nowTs.value)
    cur.incubateStartTs = 0
    cur.stage = 'idle'
    persist()
    return true
  }

  /**
   * 温蛋一段（温蛋中每次点击 +固定毫秒，模拟照看）；
   * 达到需求即孵化完成（incubating → hatched）。
   */
  function warmOnce(stepMs = 1_500): boolean {
    const cur = s().value
    if (cur.stage === 'hatched') return false
    if (cur.stage === 'idle') cur.stage = 'incubating'
    if (cur.incubateStartTs === 0) cur.incubateStartTs = nowTs.value
    cur.incubateAccumMs = incubatedMs(cur, nowTs.value) + stepMs
    cur.incubateStartTs = nowTs.value
    if (incubatedMs(cur, nowTs.value) >= hatchMsFor(cur.eggForm)) {
      cur.stage = 'hatched'
      cur.hatchedAtTs = nowTs.value
      cur.hatchedForm = cur.eggForm
      cur.incubateStartTs = 0
    }
    persist()
    return true
  }

  /** 孵化完成判定（供轮询/节拍驱动） */
  function settle(): boolean {
    const cur = s().value
    if (cur.stage !== 'incubating') return false
    if (incubatedMs(cur, nowTs.value) < hatchMsFor(cur.eggForm)) return false
    cur.incubateAccumMs = hatchMsFor(cur.eggForm)
    cur.incubateStartTs = 0
    cur.stage = 'hatched'
    cur.hatchedAtTs = nowTs.value
    cur.hatchedForm = cur.eggForm
    persist()
    return true
  }

  /**
   * 领取孵化产物：返回待领养的精灵形态，交由 INCR-488 领养；
   * 未孵化或已领取返回 null。
   */
  function claimHatched(): EggFormMeta | null {
    const cur = s().value
    if (cur.stage !== 'hatched' || cur.hatchedClaimed) return null
    cur.hatchedClaimed = true
    persist()
    return EGG_FORMS.find((f) => f.id === (cur.hatchedForm ?? cur.eggForm)) ?? null
  }

  /** 采集建材：每日一次，每种 +2 */
  function gatherMaterials(): boolean {
    const cur = s().value
    const today = getLocalDateKey()
    if (cur.lastGatherDate === today) return false
    for (const m of MATERIAL_META) cur.materials[m.key] += 2
    cur.lastGatherDate = today
    persist()
    return true
  }

  /** 今日是否还可采集 */
  function canGatherToday(): boolean {
    return s().value.lastGatherDate !== getLocalDateKey()
  }

  /** 是否凑齐下一级建材 */
  function canBuild(): boolean {
    const cur = s().value
    const need = materialsForHouseLevel(cur.houseLevel)
    return MATERIAL_META.every((m) => (cur.materials[m.key] ?? 0) >= need[m.key])
  }

  /** 建造升级小窝：扣建材 + 等级 +1 */
  function buildHouse(): boolean {
    const cur = s().value
    if (!canBuild()) return false
    const need = materialsForHouseLevel(cur.houseLevel)
    for (const m of MATERIAL_META) cur.materials[m.key] -= need[m.key]
    cur.houseLevel += 1
    persist()
    return true
  }

  /** 某级奖励是否可领（该级已完成建造且未领过） */
  function canClaimReward(level: number): boolean {
    const cur = s().value
    return cur.houseLevel >= level && !cur.rewardsClaimed.includes(level)
  }

  /** 领取某级升级奖励 */
  function claimReward(level: number): { name: string; emoji: string; desc: string } | null {
    const cur = s().value
    if (!canClaimReward(level)) return null
    cur.rewardsClaimed.push(level)
    persist()
    return rewardForHouseLevel(level)
  }

  /** 已领取的最高等级奖励（展示用） */
  const latestReward = computed(() => {
    const claimed = s().value.rewardsClaimed
    if (claimed.length === 0) return null
    return rewardForHouseLevel(Math.max(...claimed))
  })

  /** 下一级建材需求（展示用） */
  const nextCost = computed(() => materialsForHouseLevel(s().value.houseLevel))

  /** 建筑/领取后收尾（放归重置） */
  function clearAll(): void {
    s().value = createDefaultState()
    persist()
  }

  /** 测试用：重置单例 + 时钟 */
  function reloadPetHatchState(): void {
    state = ref<PetHatchState>(load())
    nowTs = ref(Date.now())
  }

  return {
    state: s(),
    now,
    setNow,
    stage,
    progress,
    formMeta,
    hasUnclaimed,
    latestReward,
    nextCost,
    takeEgg,
    startIncubate,
    stopIncubate,
    warmOnce,
    settle,
    claimHatched,
    gatherMaterials,
    canGatherToday,
    canBuild,
    buildHouse,
    canClaimReward,
    claimReward,
    clearAll,
    reloadPetHatchState,
  }
}
