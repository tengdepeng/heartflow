// ============================================================
// 全我镜 · 自我对话模块测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((key: string, def: any) => (key in mockStore ? mockStore[key] : def))
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { useSelfTalks, SELF_TALKS_KEY } from '../index'

describe('useSelfTalks 自我对话', () => {
  beforeEach(() => {
    mockStore[SELF_TALKS_KEY] = []
    mockGetKV.mockClear()
    mockSetKV.mockClear()
    // 同步模块级单例到（清空后的）mock，保证测试间隔离
    useSelfTalks().loadTalks()
  })

  it('addTalk 保存文本并携带 roomContext', () => {
    const { talks, addTalk } = useSelfTalks()
    const t = addTalk('今天的感悟', '情绪花房')
    expect(t).not.toBeNull()
    expect(talks.value.length).toBe(1)
    expect(talks.value[0].text).toBe('今天的感悟')
    expect(talks.value[0].roomContext).toBe('情绪花房')
    expect(mockSetKV).toHaveBeenCalledWith(SELF_TALKS_KEY, expect.any(Array))
  })

  it('addTalk 空/纯空白文本返回 null 且不写入', () => {
    const { talks, addTalk } = useSelfTalks()
    expect(addTalk('   ')).toBeNull()
    expect(talks.value.length).toBe(0)
    expect(mockSetKV).not.toHaveBeenCalled()
  })

  it('addTalk 最多保留 50 条（新在最前）', () => {
    const { talks, addTalk } = useSelfTalks()
    for (let i = 0; i < 60; i++) addTalk(`t${i}`)
    expect(talks.value.length).toBe(50)
    expect(talks.value[0].text).toBe('t59')
  })

  it('removeTalk 删除指定条目', () => {
    const { talks, addTalk, removeTalk } = useSelfTalks()
    const t = addTalk('待删')!
    removeTalk(t.id)
    expect(talks.value.find(x => x.id === t.id)).toBeUndefined()
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('clearTalks 清空所有对话', () => {
    const { talks, addTalk, clearTalks } = useSelfTalks()
    addTalk('a')
    addTalk('b')
    clearTalks()
    expect(talks.value.length).toBe(0)
  })

  it('loadTalks 读取已存记录并归一化旧字段名', () => {
    mockStore[SELF_TALKS_KEY] = [{ id: 'x1', text: '旧记录', room_context: '留光阁' }]
    const { talks, loadTalks } = useSelfTalks()
    loadTalks()
    expect(talks.value.length).toBe(1)
    expect(talks.value[0].roomContext).toBe('留光阁')
    expect(typeof talks.value[0].at).toBe('string')
  })
})
