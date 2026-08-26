// ============================================================
// 全局标签管理 + 树形分类体系
// 统一管理笔记、结晶、专注记录的标签与分类
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'
import type { TagCategory } from '../types'

/** 标签颜色映射 */
const TAG_COLORS = [
  '#a07c8c', '#6b9fc4', '#5ab8a0', '#8a9a7a',
  '#e0a96d', '#d98c7a', '#c46a5a', '#a07c8c',
  '#5ab8a0', '#8a9a7a', '#e0a96d', '#d98c7a',
]

export const useTagsStore = defineStore('tags', () => {
  const customTags = ref<string[]>([])

  /** 树形分类（持久化） */
  const categories = ref<TagCategory[]>(storage.getTagCategories())

  /** 自动持久化分类树 */
  function persistCategories() {
    storage.setTagCategories(categories.value)
  }

  /** 所有标签（含从数据中提取的） */
  const allTags = computed(() => {
    const set = new Set(customTags.value)
    // 从笔记中提取
    for (const n of storage.getNotes()) {
      for (const t of n.tags) set.add(t)
    }
    // 从专注记录中提取
    for (const s of storage.getSessions()) {
      for (const t of s.tags) set.add(t)
    }
    // 从分类树中提取
    function collectTags(nodes: TagCategory[]) {
      for (const n of nodes) {
        for (const t of n.tags) set.add(t)
        collectTags(n.children)
      }
    }
    collectTags(categories.value)
    return [...set].sort()
  })

  function getTagColor(tag: string): string {
    const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return TAG_COLORS[hash % TAG_COLORS.length]
  }

  function addTag(tag: string) {
    if (!customTags.value.includes(tag)) {
      customTags.value.push(tag)
    }
  }

  function removeTag(tag: string) {
    customTags.value = customTags.value.filter(t => t !== tag)
  }

  // ---- 树形分类操作 ----

  function addCategory(name: string, color: string, parentId?: string): TagCategory {
    const node: TagCategory = { id: `cat_${Date.now()}`, name, color, children: [], tags: [] }
    if (parentId) {
      const parent = findCategory(parentId, categories.value)
      if (parent) { parent.children.push(node); persistCategories(); return node }
    }
    categories.value.push(node)
    persistCategories()
    return node
  }

  function removeCategory(id: string) {
    categories.value = removeFromTree(id, categories.value)
    persistCategories()
  }

  function renameCategory(id: string, name: string) {
    const node = findCategory(id, categories.value)
    if (node) { node.name = name; persistCategories() }
  }

  function recolorCategory(id: string, color: string) {
    const node = findCategory(id, categories.value)
    if (node) { node.color = color; persistCategories() }
  }

  function assignTagToCategory(categoryId: string, tag: string) {
    const node = findCategory(categoryId, categories.value)
    if (node && !node.tags.includes(tag)) { node.tags.push(tag); persistCategories() }
  }

  function unassignTagFromCategory(categoryId: string, tag: string) {
    const node = findCategory(categoryId, categories.value)
    if (node) { node.tags = node.tags.filter(t => t !== tag); persistCategories() }
  }

  /** 获取标签所属的分类名称（优先返回最具体的子分类） */
  function getCategoryForTag(tag: string): string | null {
    function search(nodes: TagCategory[]): string | null {
      for (const n of nodes) {
        if (n.tags.includes(tag)) return n.name
        const child = search(n.children)
        if (child) return child
      }
      return null
    }
    return search(categories.value)
  }

  return {
    allTags,
    categories,
    getTagColor,
    addTag,
    removeTag,
    addCategory,
    removeCategory,
    renameCategory,
    recolorCategory,
    assignTagToCategory,
    unassignTagFromCategory,
    getCategoryForTag,
  }
})

// ---- 辅助函数 ----

function findCategory(id: string, nodes: TagCategory[]): TagCategory | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findCategory(id, n.children)
    if (found) return found
  }
  return null
}

function removeFromTree(id: string, nodes: TagCategory[]): TagCategory[] {
  return nodes.filter(n => {
    if (n.id === id) return false
    n.children = removeFromTree(id, n.children)
    return true
  })
}
