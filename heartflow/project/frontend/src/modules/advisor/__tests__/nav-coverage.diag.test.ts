import { describe, it, expect } from 'vitest'
import { parseCommandIntent } from '../commandIntent'
import { getAllRooms } from '../../../engine/room-graph'

// 诊断脚本（非永久用例）：枚举房间图每个房间名，看调令能否导航到正确路由。
describe('NAV 覆盖诊断', () => {
  const rooms = getAllRooms().filter((r) => r.path && !r.path.includes(':'))
  it('逐房间枚举', () => {
    const fail: string[] = []
    const ok: string[] = []
    for (const room of rooms) {
      for (const phrasing of [room.name, `去${room.name}`, `打开${room.name}`]) {
        const intent = parseCommandIntent(phrasing)
        if (intent.taskType === 'navigate' && intent.targetRoute === room.path) {
          ok.push(`${phrasing} -> ${room.path}`)
        } else {
          fail.push(
            `${phrasing} -> type=${intent.taskType} route=${intent.targetRoute ?? '-'} (期望 ${room.path})`,
          )
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(`\n=== OK(${ok.length}) ===`)
    ok.forEach((x) => console.log('  ' + x))
    console.log(`\n=== FAIL(${fail.length}) ===`)
    fail.forEach((x) => console.log('  ' + x))
    // 阈值断言：三说法（裸名 / 去X / 打开X）已覆盖全房间、缺口归零 → 锁 0，
    // 防止覆盖率劣化被「永远绿」掩盖(R2)。
    expect(fail.length).toBe(0)
  })
})
