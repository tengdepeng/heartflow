import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from '../../../engine/storage'
import {
  setTransportAdapter,
  getTransportAdapter,
  exportSnapshot,
  importSnapshot,
  createLocalSnapshotAdapter,
  NO_TRANSPORT,
} from '../index'

const TEST_KEY = 'hf:test-b1-gate'

describe('跨端接续 · 传输通道默认关闭（守第1条）', () => {
  beforeEach(() => {
    storage.clear()
    // 每次用例复位为「默认关闭」：无传输通道
    setTransportAdapter(NO_TRANSPORT)
  })

  it('初始无任何传输通道', () => {
    expect(getTransportAdapter()).toBeNull()
  })

  it('无通道时 exportSnapshot 返回 null、importSnapshot 返回 false（不报错、不触网）', async () => {
    expect(await exportSnapshot()).toBeNull()
    expect(await importSnapshot({ format: 'hf-snapshot/v1', exportedAt: '', schema: {} })).toBe(false)
  })

  it('显式注册本地通道后，导出/导入可用', async () => {
    setTransportAdapter(createLocalSnapshotAdapter())
    expect(getTransportAdapter()).not.toBeNull()

    storage.setKV(TEST_KEY, { v: 42 })
    const blob = await exportSnapshot()
    expect(blob).not.toBeNull()

    storage.setKV(TEST_KEY, { v: 0 })
    const ok = await importSnapshot(blob!)
    expect(ok).toBe(true)
    expect(storage.getKV(TEST_KEY, null)).toEqual({ v: 42 })
  })

  it('注销通道（置 null）即回到默认关闭', async () => {
    setTransportAdapter(createLocalSnapshotAdapter())
    setTransportAdapter(null)
    expect(getTransportAdapter()).toBeNull()
    expect(await exportSnapshot()).toBeNull()
  })
})
