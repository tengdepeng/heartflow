import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn((_t: string) => true),
}))

import { isTargetActive } from '../../engine/constitution-effect'
import {
  isShareLocalOnly,
  assertShareLocalOnly,
  canShareTo,
  type ShareDestination,
} from './share-local'

function setActive(active: boolean): void {
  vi.mocked(isTargetActive).mockImplementation(() => active)
}

beforeEach(() => { setActive(true) })

describe('第43条 分享的本地边界', () => {
  it('isShareLocalOnly 随 isTargetActive 翻转', () => {
    setActive(true)
    expect(isShareLocalOnly()).toBe(true)
    setActive(false)
    expect(isShareLocalOnly()).toBe(false)
  })

  it("本地分享('local') 始终放行，不抛错", () => {
    setActive(true)
    expect(() => assertShareLocalOnly('local')).not.toThrow()
    setActive(false)
    expect(() => assertShareLocalOnly('local')).not.toThrow()
  })

  it('本地边界开启时，云端目标被拒绝（抛出第43条）', () => {
    setActive(true)
    const dests: ShareDestination[] = ['community-cloud', 'account-cloud']
    for (const d of dests) {
      expect(() => assertShareLocalOnly(d)).toThrow(/第43条/)
      expect(canShareTo(d)).toBe(false)
    }
  })

  it('本地边界关闭时，云端目标被允许（不抛错）', () => {
    setActive(false)
    expect(() => assertShareLocalOnly('community-cloud')).not.toThrow()
    expect(canShareTo('community-cloud')).toBe(true)
  })
})
