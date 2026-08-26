// ============================================================
// 共鸣协议层 · Note 桥接器
// 将笔记状态通过共振层暴露，替代直接 import useNote
// ============================================================

import { useNote } from '../../modules/note'

/**
 * 笔记状态 composable
 * 模块通过此 composable 获取响应式的笔记数据，
 * 而无需直接 import useNote
 */
export function useNoteBridge() {
  const note = useNote()

  return {
    // 响应式状态
    allNotes: note.allNotes,
    allStickyNotes: note.allStickyNotes,
    boardNotes: note.boardNotes,
    noteCount: note.noteCount,
    archivedNotes: note.archivedNotes,
    deletedNotes: note.deletedNotes,
    // CRUD
    create: note.create.bind(note),
    update: note.update.bind(note),
    remove: note.remove.bind(note),
    hardRemove: note.hardRemove.bind(note),
    restore: note.restore.bind(note),
    clearTrash: note.clearTrash.bind(note),
    // 查询
    searchNotes: note.searchNotes.bind(note),
    getRecentNotes: note.getRecentNotes.bind(note),
    getNotesByTag: note.getNotesByTag.bind(note),
    getNoteById: note.getNoteById.bind(note),
    getStickyById: note.getStickyById.bind(note),
    // 便签操作
    updateStickyPosition: note.updateStickyPosition.bind(note),
    updateStickyMode: note.updateStickyMode.bind(note),
    togglePin: note.togglePin.bind(note),
    updateStickyColor: note.updateStickyColor.bind(note),
    moveToSticky: note.moveToSticky.bind(note),
    moveToBoard: note.moveToBoard.bind(note),
    // 加载
    load: note.load.bind(note),
  }
}