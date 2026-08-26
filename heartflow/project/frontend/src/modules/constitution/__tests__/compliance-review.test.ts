// ============================================================
// C3 合规自动检测真实化 · 回归测试
// 覆盖：
//   1. autoCheckItem 不再硬编码返回 true（杜绝"假自动通过"）
//   2. 导入/导出项已由 auto 降级为 manual
//   3. initChecklist 对旧版"假自动通过"残留做纠正并清除不可信 passed
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

function makeStorageMock() {
  return {
    storage: {
      getKV: <T,>(key: string, def: T): T => {
        const store = getKvStore()
        return store[key] !== undefined ? (store[key] as T) : def
      },
      setKV: (key: string, val: any) => {
        const store = getKvStore()
        store[key] = val
      },
    },
  }
}

vi.mock('@/engine/storage', () => makeStorageMock())
vi.mock('../../../engine/storage', () => makeStorageMock())

async function importComplianceReview() {
  const mod = await import('../compliance-review')
  return mod.useComplianceReview()
}

describe('C3 · 合规自动检测真实化', () => {
  beforeEach(() => {
    resetKvStore()
  })

  it('导入/导出项已从 auto 降级为 manual，运行后 passed 为 null（杜绝假自动通过）', async () => {
    const { initChecklist, runChecklist } = await importComplianceReview()
    initChecklist()
    const items = runChecklist()

    const importItem = items.find(i => i.id === 'cl-int-01')!
    const exportItem = items.find(i => i.id === 'cl-int-02')!

    expect(importItem.checkMethod).toBe('manual')
    expect(exportItem.checkMethod).toBe('manual')
    expect(importItem.passed).toBeNull()
    expect(exportItem.passed).toBeNull()
  })

  it('no-push-notifications 自动项返回真实检测结果（非硬编码 true）', async () => {
    const { initChecklist, runChecklist } = await importComplianceReview()
    initChecklist()
    const items = runChecklist()

    const flow = items.find(i => i.id === 'cl-flow-01')!
    expect(flow.checkMethod).toBe('auto')
    // 测试环境无活动 Pinia → useConfigStore 抛错 → isOsNotificationBlocked() 返回 false
    // → 该项判定为"未通过"（保守默认值），而非伪造的 true。
    expect(flow.passed).toBe(false)
  })

  it('initChecklist 纠正旧版 auto→manual 残留并清除不可信 passed', async () => {
    // 模拟旧版持久化清单：cl-int-01 仍为 auto 且 passed 被硬编码 true 伪造
    getKvStore()['hf:constitution:checklist'] = [
      {
        id: 'cl-int-01',
        category: 'interoperability',
        title: '数据导入功能可用',
        description: '支持从其他工具导入数据',
        coreValue: 'super-custom',
        weight: 3,
        checkMethod: 'auto',
        autoRule: 'import-available',
        passed: true,
      },
    ]

    const { initChecklist } = await importComplianceReview()
    const items = initChecklist()

    const importItem = items.find(i => i.id === 'cl-int-01')!
    expect(importItem.checkMethod).toBe('manual')
    expect(importItem.autoRule).toBeUndefined()
    expect(importItem.passed).toBeNull()
  })
})
