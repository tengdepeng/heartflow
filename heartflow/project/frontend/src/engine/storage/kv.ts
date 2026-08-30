import { loadSchema, saveSchema } from './core'
/**
 * 读取 KV。
 * 单向类型守卫：仅当「调用方明确期望数组（默认值为 []）而存储被写脏成非数组」
 * 时才回退默认值，避免调用方的 for...of / 解构把对象当数组迭代而当场抛出
 * （崩点离真正写脏处很远、极难排查）。
 * 注意：默认值为 null 属中性占位（表示"可能没有"），不触发回退；
 * 反向（期望非数组、实际是数组）也保持原行为。因此 getKV(key, null)
 * 在真实存了数组时能正确返回数组，不会被误伤。
 */
export function getKV<T>(key: string, defaultValue: T): T {
  const s = loadSchema()
  const val = s.kvStore?.[key]
  if (val === undefined) return defaultValue
  if (Array.isArray(defaultValue) && !Array.isArray(val)) return defaultValue
  return val as T
}
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