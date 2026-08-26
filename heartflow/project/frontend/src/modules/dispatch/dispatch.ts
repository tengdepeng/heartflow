// ============================================================
// dispatch · 镜我 · 幕僚调度（模块七 P1 深度）
// 用户下达调令 → 镜我解析 → 判断需调度幕僚 → 选择策略
// （单一/并行/串行）→ 分配执行 → 任务状态追踪 → 汇总结果。
// 宪法约束：本地执行，不主动调度，陈列而非叙事。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export type DispatchStrategy = 'single' | 'parallel' | 'serial'

export interface DispatchStep {
  advisorId: string
  detail: string
  status: 'pending' | 'working' | 'done' | 'skipped'
}

export interface DispatchRecord {
  id: string
  order: string
  strategy: DispatchStrategy
  advisorIds: string[]
  steps: DispatchStep[]
  stepIndex: number
  status: 'queued' | 'running' | 'collecting' | 'done' | 'halted'
  result: Record<string, string>
  createdAt: string
}

export interface DispatchSummary {
  total: number
  running: number
  done: number
  halted: number
  increments: string[]
}

export const DISPATCH_STORAGE_KEYS = {
  records: 'mirror.dispatch.records',
} as const

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 判断调度策略：
 * 单幕僚 = 单一；多幕僚且调令含先后依赖（先/再/然后/随后/接着）= 串行；否则 = 并行。
 * 依据调令文本而非幕僚名单，若调令分句已按幕僚归属，则视为可并行收集。
 */
export function detectStrategy(order: string, advisorIds: string[]): DispatchStrategy {
  if (advisorIds.length <= 1) return 'single'
  return dependencyOrder(order) ? 'serial' : 'parallel'
}

/** 依据调令分句归属：若单个幕僚只负责其中一部分，则视为可并行的收集式调度 */
export function hasPerAdvisorClauses(order: string, advisorIds: string[]): boolean {
  if (advisorIds.length <= 1) return false
  const clauses = order.split(/(?:，|,|。|；|;)/).map((s) => s.trim()).filter(Boolean)
  return clauses.length >= advisorIds.length && advisorIds.some((a) => order.includes(a))
}

function dependencyOrder(text: string): string | null {
  const keywords = ['然后', '再', '先', '随后', '接着']
  for (const k of keywords) if (text.includes(k)) return k
  return null
}

export function createDispatch(order: string, advisorIds: string[]): DispatchRecord {
  const now = new Date().toISOString()
  const strategy = detectStrategy(order, advisorIds)
  return {
    id: genId(),
    order,
    strategy,
    advisorIds,
    steps: advisorIds.map((advisorId) => ({ advisorId, detail: '', status: 'pending' })),
    stepIndex: 0,
    status: 'queued',
    result: {},
    createdAt: now,
  }
}

export function splitOrderDetail(order: string, advisorId: string): string {
  // 若调令含多个由“负责/处理”绑定到具体幕僚的分句，则按幕僚归属拆解
  const patterns = order.split(/(?:，|,|。|；|;)/).map((s) => s.trim()).filter(Boolean)
  const mine = patterns.find((p) => p.includes(advisorId))
  return mine ?? patterns[patterns.length - 1] ?? ''
}

/** 汇总结果（陈列不叙事：只拼接各幕僚的产出） */
export function summarize(record: DispatchRecord, results: Record<string, string>): DispatchSummary {
  const running = record.steps.filter((s) => s.status === 'working').length
  const done = record.steps.filter((s) => s.status === 'done').length
  const halted = record.status === 'halted' ? 1 : 0
  return {
    total: record.steps.length,
    running,
    done,
    halted,
    increments: record.steps.map((s) => results[s.advisorId] ?? '').filter(Boolean),
  }
}

export function useDispatch() {
  const records = ref<DispatchRecord[]>(load())

  function load(): DispatchRecord[] {
    const raw = storage.getKV<string>(DISPATCH_STORAGE_KEYS.records, '[]')
    try { return JSON.parse(raw) as DispatchRecord[] } catch { return [] }
  }

  function save(next: DispatchRecord[]): void {
    records.value = next
    storage.setKV(DISPATCH_STORAGE_KEYS.records, JSON.stringify(next))
  }

  function issue(order: string, advisorIds: string[]): DispatchRecord {
    const rec = createDispatch(order, advisorIds)
    save([rec, ...records.value])
    return rec
  }

  function begin(id: string): boolean {
    const rec = records.value.find((r) => r.id === id)
    if (!rec || rec.status !== 'queued') return false
    rec.status = 'running'
    if (rec.steps[0]) rec.steps[0].status = 'working'
    save([...records.value])
    return true
  }

  function finishStep(id: string, result: string): boolean {
    const rec = records.value.find((r) => r.id === id)
    if (!rec || rec.status === 'done' || rec.status === 'halted') return false
    const cur = rec.steps[rec.stepIndex]
    if (!cur) return false
    cur.status = 'done'
    cur.detail = result
    rec.result[cur.advisorId] = result
    if (rec.strategy === 'serial') {
      rec.stepIndex += 1
      const next = rec.steps[rec.stepIndex]
      if (next) {
        next.status = 'working'
        rec.status = 'running'
      } else {
        rec.status = 'done'
      }
    } else {
      const pending = rec.steps.filter((s) => s.status === 'pending')
      if (pending.length) {
        pending[0].status = 'working'
        rec.status = 'running'
      } else {
        rec.status = 'done'
      }
    }
    save([...records.value])
    return true
  }

  function halt(id: string, note?: string): boolean {
    const rec = records.value.find((r) => r.id === id)
    if (!rec || rec.status === 'halted') return false
    rec.status = 'halted'
    rec.result[rec.steps[rec.stepIndex]?.advisorId ?? 'halt'] = note ?? '调度中止'
    save([...records.value])
    return true
  }

  function remove(id: string): void {
    save(records.value.filter((r) => r.id !== id))
  }

  function summary(visit: (r: DispatchRecord) => DispatchSummary): Record<string, DispatchSummary> {
    const out: Record<string, DispatchSummary> = {}
    for (const r of records.value) out[r.id] = visit(r)
    return out
  }

  return { records, issue, begin, finishStep, halt, remove, summary }
}