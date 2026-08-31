// ============================================================
// 协调权测试（蓝图第四部分·二）
//   验证三种模式确有行为差异，而不是一个存着不看的开关：
//   jingwo → 镜我接手；custom → 指定幕僚接手；off → 无协调者
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  getCoordinatorConfig,
  setCoordinatorConfig,
  resolveCoordinator,
  DEFAULT_COORDINATOR,
  JINGWO_ID,
} from '../coordinator'
import type { AdvisorProfile } from '../../../types'

const db = vi.hoisted(() => ({
  kv: {} as Record<string, any>,
  advisors: [] as any[],
}))

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in db.kv ? db.kv[k] : def),
    setKV: (k: string, v: any) => {
      db.kv[k] = v
    },
    getAdvisors: () => db.advisors,
  },
}))

function mk(id: string, name: string, over: Partial<AdvisorProfile> = {}): AdvisorProfile {
  return {
    id,
    name,
    role: 'guardian',
    personality: 'steady',
    state: 'awake',
    retired: false,
    ...over,
  } as unknown as AdvisorProfile
}

const jingwo = mk(JINGWO_ID, '镜我')
const other = mk('adv_a', '守夜人')
const third = mk('adv_b', '书童')

beforeEach(() => {
  db.kv = {}
  db.advisors = [jingwo, other, third]
})

describe('协调权配置 · 读写与防脏数据', () => {
  it('缺省为镜我任协调者', () => {
    expect(getCoordinatorConfig()).toEqual(DEFAULT_COORDINATOR)
  })

  it('三种模式可持久化往返', () => {
    setCoordinatorConfig({ mode: 'custom', advisorId: 'adv_a' })
    expect(getCoordinatorConfig()).toEqual({ mode: 'custom', advisorId: 'adv_a' })

    setCoordinatorConfig({ mode: 'off' })
    expect(getCoordinatorConfig()).toEqual({ mode: 'off' })
  })

  it('custom 却没有 id → 回退默认（不许出现空头协调者）', () => {
    db.kv['advisor:coordinator'] = { mode: 'custom' }
    expect(getCoordinatorConfig()).toEqual(DEFAULT_COORDINATOR)
  })

  it('脏数据（非对象 / 未知模式）→ 回退默认', () => {
    db.kv['advisor:coordinator'] = 'garbage'
    expect(getCoordinatorConfig()).toEqual(DEFAULT_COORDINATOR)
    db.kv['advisor:coordinator'] = { mode: 'who-knows' }
    expect(getCoordinatorConfig()).toEqual(DEFAULT_COORDINATOR)
  })
})

describe('resolveCoordinator · 三种模式的行为差异', () => {
  it('默认（jingwo）→ 镜我接手', () => {
    expect(resolveCoordinator()?.id).toBe(JINGWO_ID)
  })

  it('custom → 指定幕僚接手', () => {
    setCoordinatorConfig({ mode: 'custom', advisorId: 'adv_b' })
    expect(resolveCoordinator()?.name).toBe('书童')
  })

  it('off → 无协调者（关闭集中协调）', () => {
    setCoordinatorConfig({ mode: 'off' })
    expect(resolveCoordinator()).toBeNull()
  })

  it('指定目标已退休 / 沉睡 → 回退镜我，协调不中断', () => {
    setCoordinatorConfig({ mode: 'custom', advisorId: 'adv_a' })
    db.advisors = [jingwo, mk('adv_a', '守夜人', { retired: true })]
    expect(resolveCoordinator()?.id).toBe(JINGWO_ID)

    db.advisors = [jingwo, mk('adv_a', '守夜人', { state: 'slumber' })]
    expect(resolveCoordinator()?.id).toBe(JINGWO_ID)
  })

  it('镜我不在位 → 回退第一位在位的幕僚', () => {
    db.advisors = [mk(JINGWO_ID, '镜我', { retired: true }), other, third]
    expect(resolveCoordinator()?.id).toBe('adv_a')
  })

  it('无人可用 → null', () => {
    db.advisors = []
    expect(resolveCoordinator()).toBeNull()

    db.advisors = [mk('x', '睡着的', { state: 'slumber' })]
    expect(resolveCoordinator()).toBeNull()
  })
})
