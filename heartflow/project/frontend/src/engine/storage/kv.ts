import { loadSchema, saveSchema } from './core'
export function getKV<T>(key: string, defaultValue: T): T { const s = loadSchema(); const val = s.kvStore?.[key]; return val !== undefined ? val : defaultValue }
export function setKV(key: string, value: any): void { const s = loadSchema(); if (!s.kvStore) s.kvStore = {}; s.kvStore[key] = value; saveSchema(s) }
export function removeKV(key: string): void {
  const s = loadSchema()
  if (s.kvStore && key in s.kvStore) {
    delete s.kvStore[key]
    saveSchema(s)
  }
}

/**
 * 导出完整存储快照（深拷贝，避免外部修改影响运行态）。
 * 用于跨端接续的「本地快照」回路：把当前设备的全部用户数据（kvStore + 结构化域）
 * 序列化为可迁移的快照，绝不触网，符合宪法第1条「本地私有·默认关闭」。
 */
export function exportAllData(): ReturnType<typeof loadSchema> {
  return structuredClone(loadSchema())
}

/**
 * 导入完整存储快照。
 * 仅接受对象形态；写入前做轻量校验，避免把垃圾数据灌入运行态。
 * 落盘后由 loadSchema 在下次读取时统一执行版本迁移（migrate），填平缺失字段。
 */
export function importAllData(data: unknown): void {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('importAllData: 快照数据非法（需为对象）')
  }
  saveSchema(structuredClone(data) as ReturnType<typeof loadSchema>)
}