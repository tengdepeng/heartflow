// ============================================================
// 标签分类树存储模块
// ============================================================

import { loadSchema, saveSchema } from './core'
import type { TagCategory } from '../../types'

export function getTagCategories(): TagCategory[] {
  return loadSchema().tagCategories ?? []
}

export function setTagCategories(categories: TagCategory[]): void {
  const s = loadSchema()
  s.tagCategories = categories
  saveSchema(s)
}