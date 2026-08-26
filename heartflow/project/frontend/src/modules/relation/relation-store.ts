// ============================================================
// 羁绊之厅 · 状态管理（叶子模块）
// 从 index.ts 抽取，消除 index ↔ bond-bridge 的 barrel 循环依赖。
// index.ts 仍再导出本模块，公共 API 不变。
// ============================================================

import { ref, computed } from 'vue'
import type { Person } from './types'
import { storage } from '../../engine/storage'
import { CATEGORY_PALETTE } from '../../theme/categoryColors'
import {
  buildRelationNetwork,
  createFamilyTree,
  createMemorialSeat,
  markAsDeceased,
  computeNetworkStats,
  type MemorialSeat,
} from './relation-network'

function load(): Person[] {
  return storage.getRelations()
}

function save(persons: Person[]) {
  storage.setRelations(persons)
}

const persons = ref<Person[]>(load())

export function useRelation() {
  function create(name: string, relation: Person['relation']): Person {
    const now = new Date().toISOString()
    const colors = [CATEGORY_PALETTE[12], CATEGORY_PALETTE[5], CATEGORY_PALETTE[8], CATEGORY_PALETTE[11], CATEGORY_PALETTE[7], CATEGORY_PALETTE[10]]
    const p: Person = {
      id: `person_${Date.now()}`,
      name: name.trim(),
      relation,
      tags: [],
      notes: '',
      closeness: 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      lastContact: null,
      importantDates: [],
      createdAt: now,
      updatedAt: now,
    }
    persons.value.push(p)
    save(persons.value)
    return p
  }

  function update(id: string, data: Partial<Pick<Person, 'name'|'relation'|'tags'|'notes'|'closeness'|'lastContact'>>) {
    const p = persons.value.find(p => p.id === id)
    if (!p) return
    Object.assign(p, data, { updatedAt: new Date().toISOString() })
    save(persons.value)
  }

  function remove(id: string) {
    persons.value = persons.value.filter(p => p.id !== id)
    save(persons.value)
  }

  function addDate(id: string, label: string, date: string) {
    const p = persons.value.find(p => p.id === id)
    if (!p) return
    p.importantDates.push({ label, date })
    save(persons.value)
  }

  /** 删除某个重要日期 */
  function removeDate(personId: string, dateIndex: number) {
    const p = persons.value.find(p => p.id === personId)
    if (!p || dateIndex < 0 || dateIndex >= p.importantDates.length) return false
    p.importantDates.splice(dateIndex, 1)
    save(persons.value)
    return true
  }

  /** 更新某个重要日期 */
  function updateDate(personId: string, dateIndex: number, data: { label?: string; date?: string }) {
    const p = persons.value.find(p => p.id === personId)
    if (!p || dateIndex < 0 || dateIndex >= p.importantDates.length) return false
    const d = p.importantDates[dateIndex]
    if (data.label) d.label = data.label
    if (data.date) d.date = data.date
    save(persons.value)
    return true
  }

  const count = computed(() => persons.value.length)

  // ---- 关系网络 ----

  /** 关系网络图 */
  const network = computed(() => buildRelationNetwork(persons.value))

  /** 家脉全图 */
  const familyTree = computed(() => createFamilyTree(persons.value))

  /** 网络统计 */
  const networkStats = computed(() => computeNetworkStats(persons.value))

  /** 标记人物为逝者 */
  function setDeceased(id: string, memorial?: string): Person | undefined {
    const p = persons.value.find(p => p.id === id)
    if (!p) return undefined
    const updated = markAsDeceased(p, memorial)
    const idx = persons.value.indexOf(p)
    persons.value[idx] = updated
    save(persons.value)
    return updated
  }

  /** 创建留座 */
  function addSeat(name: string, reason: MemorialSeat['reason'], memorial?: string): MemorialSeat {
    const seat = createMemorialSeat(name, reason, memorial)
    persons.value.push(seat)
    save(persons.value)
    return seat
  }

  return { persons, count, network, familyTree, networkStats, setDeceased, addSeat, load: () => { persons.value = load() }, create, update, remove, addDate, removeDate, updateDate }
}
