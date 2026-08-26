// ============================================================
// 思绪书房 · 探索（标签云 / 随机回顾）
// 纯函数：无副作用、可在视图与测试中复用
// ============================================================

/** 带 tags 字段的对象（笔记/条目均满足） */
export interface Taggable {
  tags: string[]
}

/**
 * 统计一组条目中每个标签出现的词频。
 * 同一标签在一篇条目内只计一次（去重），空标签跳过。
 * 返回 { 标签: 次数 }，无重复无排序保证（调用方按需排序）。
 */
export function tagFrequencies(items: Taggable[]): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const item of items) {
    const seen = new Set<string>()
    for (const raw of item.tags) {
      const tag = (raw ?? '').trim()
      if (!tag) continue
      if (seen.has(tag)) continue
      seen.add(tag)
      freq[tag] = (freq[tag] ?? 0) + 1
    }
  }
  return freq
}

/**
 * 从数组中随机抽取一个元素。
 * 空数组返回 null（绝不抛错）；原数组不被修改。
 */
export function pickRandom<T>(arr: readonly T[]): T | null {
  if (arr.length === 0) return null
  const idx = Math.floor(Math.random() * arr.length)
  return arr[idx]
}
