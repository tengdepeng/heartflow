// ============================================================
// 房间分类体系 · 侧栏重分类引擎
// ----------------------------------------------------------
// 把导航树的聚合维度参数化为多套"分类体系"：
//   domain  按七领域（向内/向外/身体/知识/工作/时间/系统，默认）
//   group   按物理分组（引力场/主链路/世界/系统）
//   slot    按宅院分区（屏风/前院/正堂/后院/厢房/角门）
//   custom  按用户自定义分组（可新建/改名/删除）
// 同时托管用户自定义分组数据（CRUD）与所选体系持久化。
// ============================================================

import { ref, watch } from 'vue'
import { storage } from '../../engine/storage'
import type { RoomDomain, RoomGroup, RoomSlot } from '../../engine/room-graph'

/** 分类体系类型 */
export type NavTaxonomy = 'domain' | 'group' | 'slot' | 'custom'

export const TAXONOMY_ORDER: NavTaxonomy[] = ['domain', 'group', 'slot', 'custom']

export const TAXONOMY_LABELS: Record<NavTaxonomy, string> = {
  domain: '按领域',
  group: '按分组',
  slot: '按宅院',
  custom: '自定义',
}

// ---- 各维度标签 ----
export const DOMAIN_LABELS: Record<RoomDomain, string> = {
  inward: '向内 · 自我',
  outward: '向外 · 关系',
  body: '身体 · 践行',
  knowledge: '知识 · 创造',
  work: '工作 · 收入',
  time: '时间 · 记忆',
  system: '系统 · 安全',
}

export const GROUP_LABELS: Record<RoomGroup, string> = {
  gravity: '引力场 · 原点',
  'main-path': '主链路 · 每日',
  world: '世界空间',
  system: '系统边界 · 安全',
}

export const SLOT_LABELS: Record<RoomSlot, string> = {
  screen: '屏风',
  'front-yard': '前院',
  hall: '正堂',
  'back-yard': '后院',
  'side-wing': '厢房',
  corner: '角门',
}

/** 自定义体系下无归属房间的兜底分组 key */
export const UNGROUPED_KEY = 'ungrouped'

// ---- 分组头 key 全集 ----
/**
 * 计算某分类体系下「应当渲染的分组头 key 全集」= 维度固有全集 ∪ 实际有房间的桶。
 *
 * 历史上分组头集合只取「当前有房间的桶」，空桶不生成头，导致两个真实故障：
 *   (a) 把某个分组的房间全部拖到别的组后，该桶变空 → 分组头从 DOM 消失 →
 *       拖拽落点不存在，房间再也拖不回去（用户反馈「从屏风移到前院后就移不回去」）；
 *   (b) createCustomGroup() 建出来的是 roomIds: [] 的空组，没有任何房间 → 不进任何桶 →
 *       建完的分组在侧栏完全不显示（用户反馈「新建分组也有问题」）。
 *
 * @param t               分类体系
 * @param occupied        实际有房间的桶 key（迭代顺序即其追加顺序）
 * @param customGroupIds  自定义分组 id 列表（仅 custom 体系使用，追加「未分组」兜底桶）
 * @returns 有序去重的分组头 key 列表：体系固有定义序在前，实际占用的额外 key 追加在后
 */
export function collectTaxonomyKeys(
  t: NavTaxonomy,
  occupied: Iterable<string>,
  customGroupIds: string[] = [],
): string[] {
  const canonical: string[] =
    t === 'domain' ? Object.keys(DOMAIN_LABELS)
      : t === 'group' ? Object.keys(GROUP_LABELS)
        : t === 'slot' ? Object.keys(SLOT_LABELS)
          : [...customGroupIds, UNGROUPED_KEY]

  const out: string[] = []
  const seen = new Set<string>()
  const push = (key: string): void => {
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(key)
  }
  canonical.forEach(push)
  // 兜底：用户 pinned 过的自定义 domain/slot 值、或已删组残留的 groupId，
  // 不在固有标签表内，但确实有房间落在里面，必须保留头，否则房间会「凭空消失」。
  for (const key of occupied) push(key)
  return out
}

// ---- 所选分类体系（持久化） ----
const TAXONOMY_KEY = 'hf:nav_taxonomy'
const selectedTaxonomy = ref<NavTaxonomy>(
  storage.getKV<NavTaxonomy>(TAXONOMY_KEY, 'domain') || 'domain',
)
watch(selectedTaxonomy, (v) => storage.setKV(TAXONOMY_KEY, v))

// ---- 用户自定义分组（持久化，深监听） ----
export interface CustomGroup {
  id: string
  name: string
  roomIds: string[]
}

const CUSTOM_GROUPS_KEY = 'hf:nav_custom_groups'
const customGroups = ref<CustomGroup[]>(
  storage.getKV<CustomGroup[]>(CUSTOM_GROUPS_KEY, []) || [],
)
watch(customGroups, (v) => storage.setKV(CUSTOM_GROUPS_KEY, v), { deep: true })

// ---- 分组头用户排序覆盖（持久化，深监听） ----
// Item 1：让「预设分组」(domain/group/slot) 与「自定义分组」的分组头顺序都可被用户拖动重排。
// 存维度 key（如 'time' / 'world' / 自定义分组 id），不含 tax- 前缀。
const GROUP_ORDER_OVERRIDE_KEY = 'hf:nav_group_order_override'
const groupOrderOverride = ref<Record<NavTaxonomy, string[]>>(
  storage.getKV<Record<NavTaxonomy, string[]>>(GROUP_ORDER_OVERRIDE_KEY, {} as Record<NavTaxonomy, string[]>) || ({} as Record<NavTaxonomy, string[]>),
)
watch(groupOrderOverride, (v) => storage.setKV(GROUP_ORDER_OVERRIDE_KEY, v), { deep: true })

/**
 * 将某分类体系下的分组头 key 按用户覆盖顺序重排。
 * 覆盖里有的 key 优先按覆盖序；其余（新出现的维度 key）保持原序追加在后。
 */
function applyGroupOrderOverride(tax: NavTaxonomy, keys: string[]): string[] {
  const ov = groupOrderOverride.value[tax] ?? []
  const set = new Set(keys)
  const kept = ov.filter((k) => set.has(k))
  const rest = keys.filter((k) => !kept.includes(k))
  return [...kept, ...rest]
}

/** 整体写入某分类体系的分组头顺序（拖拽重排后由 App 计算好全序再写入）。空数组忽略。 */
function setGroupOrder(tax: NavTaxonomy, ordered: string[]): void {
  if (!ordered.length) return
  groupOrderOverride.value = { ...groupOrderOverride.value, [tax]: ordered }
}

/** 房间所属自定义分组 id（null=未分组） */
function groupIdOf(roomId: string): string | null {
  const g = customGroups.value.find((g) => g.roomIds.includes(roomId))
  return g ? g.id : null
}

/**
 * 生成不重复的自定义分组 id。
 *
 * 修复：原实现只用 `Date.now().toString(36)`，同一毫秒内连建两个分组会拿到**同一个 id**
 * （已由单测复现）。后果是 v-for 的 :key 重复 → 侧栏分组头渲染错乱，
 * 且 `find(g => g.id === id)` 永远命中第一个，改名/删除/拖入全部落在错误的分组上
 * —— 这是「新建分组也有问题」的另一半根因。
 */
function newGroupId(): string {
  const taken = new Set(customGroups.value.map((g) => g.id))
  for (let i = 0; i < 8; i++) {
    const id = `ug-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    if (!taken.has(id)) return id
  }
  // 极小概率兜底：追加进程内自增序号，保证唯一
  let n = taken.size + 1
  let id = `ug-${Date.now().toString(36)}-${n}`
  while (taken.has(id)) {
    n += 1
    id = `ug-${Date.now().toString(36)}-${n}`
  }
  return id
}

export function useRoomTaxonomy() {
  function setTaxonomy(t: NavTaxonomy) {
    selectedTaxonomy.value = t
  }

  // ---- 自定义分组 CRUD ----
  function createCustomGroup(name = '新分组'): string {
    const id = newGroupId()
    customGroups.value.push({ id, name, roomIds: [] })
    return id
  }
  function renameCustomGroup(id: string, name: string) {
    const g = customGroups.value.find((g) => g.id === id)
    if (g) g.name = name
  }
  function deleteCustomGroup(id: string) {
    // 仅解除归属（房间路由保留），成员回到未分组
    customGroups.value = customGroups.value.filter((g) => g.id !== id)
  }
  /** 把一个房间移入指定分组（自动从其他分组移除） */
  function addRoomToGroup(groupId: string, roomId: string) {
    for (const g of customGroups.value) {
      g.roomIds = g.roomIds.filter((r) => r !== roomId)
    }
    const g = customGroups.value.find((g) => g.id === groupId)
    if (g && !g.roomIds.includes(roomId)) g.roomIds.push(roomId)
  }
  /** 把房间从所有自定义分组移除（回到未分组） */
  function removeRoomFromGroups(roomId: string) {
    for (const g of customGroups.value) {
      g.roomIds = g.roomIds.filter((r) => r !== roomId)
    }
  }
  /** 调整自定义分组顺序（拖拽排序用）。from/to 为目标数组下标；越界或相同则 no-op。
   *  s p l i c e 后 deep watch 自动持久化，侧栏「自定义」视图按此顺序渲染分组。 */
  function reorderCustomGroups(from: number, to: number) {
    const arr = customGroups.value
    if (from < 0 || to < 0 || from >= arr.length || to >= arr.length || from === to) return
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
  }

  return {
    selectedTaxonomy,
    customGroups,
    groupOrderOverride,
    TAXONOMY_ORDER,
    TAXONOMY_LABELS,
    DOMAIN_LABELS,
    GROUP_LABELS,
    SLOT_LABELS,
    groupIdOf,
    setTaxonomy,
    createCustomGroup,
    renameCustomGroup,
    deleteCustomGroup,
    addRoomToGroup,
    removeRoomFromGroups,
    reorderCustomGroups,
    applyGroupOrderOverride,
    setGroupOrder,
  }
}
