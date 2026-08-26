// ============================================================
// 镜我 · 对话归档测试（第34条：允许遗忘，归档而非删除）
// ============================================================
import { describe, expect, it } from 'vitest'
import { useDialoguePersistence } from '../dialogue-persistence'

describe('镜我 对话归档', () => {
  const dp = useDialoguePersistence()

  it('新建会话默认未归档，出现在 activeSessions', () => {
    const s = dp.createSession()
    expect(s.archived).toBe(false)
    expect(dp.activeSessions.value.some(x => x.id === s.id)).toBe(true)
    expect(dp.archivedSessions.value.some(x => x.id === s.id)).toBe(false)
  })

  it('archiveSession 将会话移入 archivedSessions 并生成摘要', () => {
    const s = dp.createSession()
    expect(dp.archiveSession(s.id)).toBe(true)
    const archived = dp.archivedSessions.value.find(x => x.id === s.id)
    expect(archived).toBeTruthy()
    expect(archived!.archived).toBe(true)
    expect(archived!.summary.length).toBeGreaterThan(0)
    expect(dp.activeSessions.value.some(x => x.id === s.id)).toBe(false)
  })

  it('archiveSession 对不存在的 id 返回 false', () => {
    expect(dp.archiveSession('missing-id')).toBe(false)
  })
})
