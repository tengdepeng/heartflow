import { describe, it, expect } from 'vitest'
import { parseCommandIntent } from '../commandIntent'
import { getAllRooms } from '../../../engine/room-graph'

// 房间导航覆盖回归：动词形式「去X / 打开X」必须能跳到 X 的真实路由；
// 同时验证「无动词的领域词短语」不被误判为跳转（防回归）。
describe('房间导航覆盖', () => {
  const rooms = getAllRooms().filter((r) => r.path && !r.path.includes(':'))
  const roomPaths = new Set(rooms.map((r) => r.path))
  // 重名房间（房间图数据洁净度问题，如「更漏」映射 /worklog 与 /clepsydra）
  const nameCount = new Map<string, number>()
  for (const r of rooms) nameCount.set(r.name, (nameCount.get(r.name) ?? 0) + 1)
  const dupNames = new Set([...nameCount.entries()].filter(([, n]) => n > 1).map(([k]) => k))

  for (const room of rooms) {
    it(`动词形式「去${room.name}」应导航到 ${room.path}`, () => {
      const intent = parseCommandIntent('去' + room.name)
      expect(intent.taskType).toBe('navigate')
      expect(intent.targetRoute).toBeTruthy()
      if (dupNames.has(room.name)) {
        // 重名房间：只断言跳到了该名字对应的某个合法路由
        expect(roomPaths.has(intent.targetRoute!)).toBe(true)
      } else {
        expect(intent.targetRoute).toBe(room.path)
      }
    })
  }

  it('无动词的领域词短语不被误判为跳转', () => {
    expect(parseCommandIntent('帮我设个锚点').taskType).toBe('anchor')
    expect(parseCommandIntent('记录一下今天的事').taskType).toBe('note')
    expect(parseCommandIntent('记一笔账 20').taskType).toBe('finance')
    expect(parseCommandIntent('我最近很焦虑想聊聊').taskType).toBe('emotion')
    expect(parseCommandIntent('回顾一下这周的专注').taskType).toBe('review')
    // 裸房名若无动词且不撞领域词 → 仍走 general/导航兜底，但不应误判成领域动作
    const r = parseCommandIntent('逸趣阁')
    expect(['navigate', 'general']).toContain(r.taskType)
  })
})
