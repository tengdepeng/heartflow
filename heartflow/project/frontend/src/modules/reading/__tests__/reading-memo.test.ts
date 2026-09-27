// ============================================================
// 阅览殿 · 读书便签数据层（独立于 challenges 的书评笔记 useReadingNotes）
// 键 hf:reading:memos，本地私有、不触云。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { useReadingMemos } from '../reading-memo'
import { storage } from '../../../engine/storage'

const MEMO_KEY = 'hf:reading:memos'

describe('useReadingMemos · 读书便签', () => {
  beforeEach(() => {
    storage.setKV(MEMO_KEY, '[]')
  })

  it('addMemo 新增一条便签并落盘、返回新对象', () => {
    const { addMemo, memos } = useReadingMemos()
    const memo = addMemo('读到第三章，主角终于觉醒')
    expect(memo).not.toBeNull()
    expect(memo!.text).toBe('读到第三章，主角终于觉醒')
    expect(memo!.bookId).toBeNull()
    expect(memo!.createdAt).toBeTruthy()
    expect(memo!.updatedAt).toBeTruthy()
    expect(memos.value).toHaveLength(1)
    // 落盘：再次从存储加载仍可见
    const { memos: reloaded } = useReadingMemos()
    expect(reloaded.value).toHaveLength(1)
    expect(reloaded.value[0].text).toBe('读到第三章，主角终于觉醒')
  })

  it('addMemo 文本首尾空白被 trim 处理', () => {
    const { addMemo, memos } = useReadingMemos()
    addMemo('   带空格的念头   ')
    expect(memos.value[0].text).toBe('带空格的念头')
  })

  it('addMemo 空文本直接忽略不写入', () => {
    const { addMemo, memos } = useReadingMemos()
    expect(addMemo('   ')).toBeNull()
    expect(addMemo('')).toBeNull()
    expect(memos.value).toHaveLength(0)
    expect(storage.getKV<string>(MEMO_KEY, '[]')).toBe('[]')
  })

  it('addMemo 支持关联书目 id 与标题', () => {
    const { addMemo } = useReadingMemos()
    const m = addMemo('关联书的想法', 'book_A', '活着')
    expect(m!.bookId).toBe('book_A')
    expect(m!.bookTitle).toBe('活着')
  })

  it('updateMemo 修改文本并更新 updatedAt', () => {
    const { addMemo, updateMemo, memos } = useReadingMemos()
    const m = addMemo('旧内容')!
    const before = m.updatedAt
    // 让时间推进，确保 updatedAt 变化
    updateMemo(m.id, '  新内容  ')
    expect(memos.value[0].text).toBe('新内容')
    expect(memos.value[0].updatedAt >= before).toBe(true)
  })

  it('updateMemo 改不存在的 id 不报错', () => {
    const { updateMemo, memos } = useReadingMemos()
    expect(() => updateMemo('no_such', 'x')).not.toThrow()
    expect(memos.value).toHaveLength(0)
  })

  it('removeMemo 删除指定便签', () => {
    const { addMemo, removeMemo, memos } = useReadingMemos()
    const a = addMemo('甲')!
    const b = addMemo('乙')!
    removeMemo(a.id)
    expect(memos.value).toHaveLength(1)
    expect(memos.value[0].id).toBe(b.id)
    // 落盘同步
    const { memos: reloaded } = useReadingMemos()
    expect(reloaded.value).toHaveLength(1)
  })

  it('memosForBook 只返回该书便签', () => {
    const { addMemo, memosForBook, memos } = useReadingMemos()
    addMemo('通用念想')
    addMemo('活着相关', 'book_A', '活着')
    addMemo('平凡相关', 'book_B', '平凡的世界')
    expect(memos.value).toHaveLength(3)
    const onlyA = memosForBook('book_A')
    expect(onlyA).toHaveLength(1)
    expect(onlyA[0].bookId).toBe('book_A')
    expect(memosForBook('book_C')).toHaveLength(0)
    expect(memosForBook(null)).toHaveLength(0)
    expect(memosForBook(undefined)).toHaveLength(0)
  })

  it('最新便签置顶（倒序）', () => {
    const { addMemo, memos } = useReadingMemos()
    addMemo('先写')
    addMemo('后写')
    expect(memos.value[0].text).toBe('后写')
    expect(memos.value[1].text).toBe('先写')
  })
})
