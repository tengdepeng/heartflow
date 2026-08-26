import { ref } from 'vue'
// 注意：使用与 note/index、study/index 相同的 `../../engine/storage` 相对路径，
// 而非 `./index`，以确保所有以 `../../../engine/storage` 或 `../../engine/storage`
// 注册的 vi.mock 都能覆盖本模块的 storage 导入（解析为同一模块）。
import { storage } from '../../engine/storage'
import type { Note } from '../../types'

/**
 * 全局笔记单一状态源（P1/P2 完善 · 双笔记系统收敛）
 *
 * 此前 `study` 模块（思绪书房）与 `note` 模块（便签）各自维护独立的
 * `notes` ref，却都通过 `storage.setNotes` 全量覆写同一个全局笔记数组，
 * 二者在同一会话中先后新增笔记时会互相丢失对方的数据（双写覆盖隐患）。
 *
 * 这里把全局笔记收敛为唯一引用：两个模块共享同一个 `notes` ref，
 * 任一方对数组的增删改都作用于同一引用，persist 时不会再覆盖对方。
 * 仅依赖 getNotes/setNotes，不触发 note 模块的 sticky/rings 初始化。
 */
const notes = ref<Note[]>([])

export function loadNotesState(): void {
  try {
    notes.value = storage.getNotes()
  } catch {
    notes.value = []
  }
}

export function persistNotesState(): void {
  storage.setNotes(notes.value)
}

/** 测试隔离用：清空内存中的笔记引用（不影响持久化数据） */
export function resetNotesState(): void {
  notes.value = []
}

export { notes }

// 模块初始化时从存储加载一次
loadNotesState()
