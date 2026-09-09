import { describe, it, expect, vi } from 'vitest'
import { executeForgetting } from '../sovereignty-engine'

vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn((t: string) => t === 'data:forget'),
}))

import { isTargetActive } from '../../../engine/constitution-effect'

describe('executeForgetting · 第45条遗忘的权利', () => {
  it('遗忘权关闭时拦截并返回 success:false（不触达存储层）', () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    const res = executeForgetting('note', '思绪书房', 'hf:note', 'seal')
    expect(res.success).toBe(false)
    expect(res.affectedCount).toBe(0)
    expect(res.freedBytes).toBe(0)
    expect(res.record.recoverable).toBe(false)
    expect(res.record.id.startsWith('forget-blocked-')).toBe(true)
  })

  it('遗忘权生效时进入正常执行分支（不早返回拦截）', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    // 仅验证未触发「权利关闭」早返回：该分支 record.id 以 forget-blocked- 开头
    const res = executeForgetting('note', '思绪书房', 'hf:note', 'natural-aging')
    expect(res.record.id.startsWith('forget-blocked-')).toBe(false)
  })
})
