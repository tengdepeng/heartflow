import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

// 注意：本测试位于 __tests__/ 子目录，相对路径需多一层 ../ 才能命中
// transport.ts 实际 import 的 '../../engine/storage'（即 src/engine/storage）。
const h = vi.hoisted(() => {
  const sampleSchema = { kvStore: { 'hf:note': [{ id: 'n1' }] } }
  return {
    sampleSchema,
    exportAllData: vi.fn(() => structuredClone(sampleSchema)),
    importAllData: vi.fn(),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    exportAllData: h.exportAllData,
    importAllData: h.importAllData,
  },
}))

import {
  createLanTransportAdapter,
  isLocalBoundaryUrl,
} from '../transport'

describe('B1.4 局域网边界传输适配器', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('isLocalBoundaryUrl 放行本地/私有地址，拒绝公网', () => {
    expect(isLocalBoundaryUrl('http://localhost:54321')).toBe(true)
    expect(isLocalBoundaryUrl('http://127.0.0.1:54321')).toBe(true)
    expect(isLocalBoundaryUrl('http://192.168.1.20:54321')).toBe(true)
    expect(isLocalBoundaryUrl('http://10.0.0.5:54321')).toBe(true)
    expect(isLocalBoundaryUrl('http://172.16.0.1:54321')).toBe(true)
    expect(isLocalBoundaryUrl('http://169.254.1.1:54321')).toBe(true)
    expect(isLocalBoundaryUrl('http://example.com:54321')).toBe(false)
    expect(isLocalBoundaryUrl('http://8.8.8.8:54321')).toBe(false)
    expect(isLocalBoundaryUrl('ftp://192.168.1.1')).toBe(false)
    // 阻断级：0.0.0.0（监听全部网卡）与公网/链路本地 IPv6 一律拒绝（fail-closed）
    expect(isLocalBoundaryUrl('http://0.0.0.0:54321')).toBe(false)
    expect(isLocalBoundaryUrl('http://2001:db8::1:54321')).toBe(false)
    expect(isLocalBoundaryUrl('http://fe80::1:54321')).toBe(false)
  })

  it('export() 推送快照到本地 peer（PUT）', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createLanTransportAdapter({ peerUrl: 'http://192.168.1.20:54321' })
    const blob = await adapter.export()
    expect(blob.format).toBe('hf-snapshot/v1')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.20:54321/snapshot',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('export() 遇公网地址直接抛错，绝不发起 fetch（守第1条）', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const bad = createLanTransportAdapter({ peerUrl: 'http://example.com:54321' })
    await expect(bad.export()).rejects.toThrow(/本地私有/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('import() 从本地 peer 拉取快照并导入本机', async () => {
    const remote = { format: 'hf-snapshot/v1', exportedAt: '', schema: { kvStore: {} } }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => remote,
    })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createLanTransportAdapter({ peerUrl: 'http://192.168.1.20:54321' })
    await adapter.import({ format: 'hf-snapshot/v1', exportedAt: '', schema: {} })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.20:54321/snapshot',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(h.importAllData).toHaveBeenCalledWith(remote.schema)
  })

  it('import() 拒绝非法快照格式', async () => {
    const remote = { format: 'evil/x', exportedAt: '', schema: {} }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => remote,
    }))
    const adapter = createLanTransportAdapter({ peerUrl: 'http://192.168.1.20:54321' })
    await expect(adapter.import({ format: 'hf-snapshot/v1', exportedAt: '', schema: {} }))
      .rejects.toThrow(/格式/)
  })
})
