import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getKV, setKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const getKV = vi.fn((k: string, d: any) => (k in store ? store[k] : d))
  const setKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { getKV, setKV, store }
})

vi.mock('../../../engine/storage', () => ({ storage: { getKV, setKV } }))

import { useSanctuary, SANCTUARY_NOTES_KEY, SANCTUARY_LOGS_KEY } from '../useSanctuary'

describe('useSanctuary 模块（安全岛便签与访问记录）', () => {
  beforeEach(() => {
    getKV.mockClear()
    setKV.mockClear()
    Object.keys(store).forEach(k => delete store[k])
    useSanctuary().loadNotes()
    useSanctuary().loadLogs()
  })

  it('addNote 持久化并置顶', () => {
    const { addNote, notes } = useSanctuary()
    addNote('今天松了一口气')
    expect(notes.value.length).toBe(1)
    expect(notes.value[0].text).toBe('今天松了一口气')
    expect(setKV).toHaveBeenCalledWith(SANCTUARY_NOTES_KEY, expect.any(Array))
  })

  it('clearNotes 清空便签', () => {
    const s = useSanctuary()
    s.addNote('a')
    s.addNote('b')
    expect(s.notes.value.length).toBe(2)
    s.clearNotes()
    expect(s.notes.value.length).toBe(0)
  })

  it('loadNotes 归一化并排除空文本', () => {
    store[SANCTUARY_NOTES_KEY] = [
      { id: 'x', text: '   ', at: '2026-01-01T00:00:00.000Z' },
      { id: 'y', text: '留下一句话', at: '2026-01-02T00:00:00.000Z' },
    ]
    const { loadNotes, notes } = useSanctuary()
    loadNotes()
    expect(notes.value.length).toBe(1)
    expect(notes.value[0].id).toBe('y')
  })

  it('createLog + updateLog + removeLog 维护访问记录', () => {
    const s = useSanctuary()
    const log = s.createLog()
    expect(s.logs.value.length).toBe(1)
    expect(setKV).toHaveBeenCalledWith(SANCTUARY_LOGS_KEY, expect.any(Array))
    s.updateLog(log.id, { durationSec: 120, breathCount: 3, notesReleased: 1 })
    const updated = s.logs.value.find(l => l.id === log.id)!
    expect(updated.durationSec).toBe(120)
    s.removeLog(log.id)
    expect(s.logs.value.length).toBe(0)
  })
})
