import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from '../../../engine/storage'
import {
  createLocalSnapshotAdapter,
  SNAPSHOT_FORMAT,
  type SnapshotBlob,
} from '../transport'

const TEST_KEY = 'hf:test-b1-snapshot'

describe('createLocalSnapshotAdapter', () => {
  beforeEach(() => {
    storage.clear()
  })

  it('导出的快照格式正确且为本地通道（零网络）', async () => {
    storage.setKV(TEST_KEY, { a: 1 })
    const adapter = createLocalSnapshotAdapter()
    const blob = await adapter.export()

    expect(adapter.kind).toBe('local')
    expect(blob.format).toBe(SNAPSHOT_FORMAT)
    expect(typeof blob.exportedAt).toBe('string')
    expect((blob.schema as Record<string, unknown>).kvStore).toHaveProperty(TEST_KEY)
  })

  it('导出→导入 完整还原 kvStore（跨端接续本地回路）', async () => {
    storage.setKV(TEST_KEY, { a: 1, name: 'alpha' })
    const adapter = createLocalSnapshotAdapter()
    const blob = await adapter.export()

    // 模拟本设备数据被改动
    storage.setKV(TEST_KEY, { a: 999, name: 'corrupted' })

    await adapter.import(blob)

    expect(storage.getKV(TEST_KEY, null)).toEqual({ a: 1, name: 'alpha' })
  })

  it('拒绝非法快照格式', async () => {
    const adapter = createLocalSnapshotAdapter()
    const bad = { format: 'evil/v9', exportedAt: '', schema: {} } as unknown as SnapshotBlob
    await expect(adapter.import(bad)).rejects.toThrow(/不支持的快照格式/)
  })

  it('导入非对象数据抛错（防灌入垃圾）', async () => {
    // importAllData 的校验在适配器之下；这里验证适配器透传非法 schema 时底层拦截
    const adapter = createLocalSnapshotAdapter()
    const bad = { format: SNAPSHOT_FORMAT, exportedAt: '', schema: 'not-an-object' } as unknown as SnapshotBlob
    await expect(adapter.import(bad)).rejects.toThrow()
  })
})
