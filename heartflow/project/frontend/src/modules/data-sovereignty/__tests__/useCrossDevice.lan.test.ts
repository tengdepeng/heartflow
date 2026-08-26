// ============================================================
// LAN 扫码即配对 · 单元验证（B1.4 延伸）
// 验证：
//   ① buildLanQrPayload / parseLanQrPayload 的载荷结构与本地边界守门；
//   ② receiveFromLanUrl 经 mock 的 createLanTransportAdapter 拉取并导入；
//   ③ 公网地址在入口即被拒绝（守宪法第1条本地私有·fail-closed）。
// 保留真实的 isLocalBoundaryUrl / SNAPSHOT_FORMAT，仅替换 createLanTransportAdapter
// 为可控 mock，避免触发真实 fetch / 真实 storage 写入。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

// ---- Mock localStorage（storage 是 localStorage-backed 单例） ----
vi.stubGlobal('localStorage', {
  _data: {} as Record<string, string>,
  get length() { return Object.keys((this as any)._data).length },
  key(i: number) { return Object.keys((this as any)._data)[i] ?? null },
  getItem(k: string) { return (this as any)._data[k] ?? null },
  setItem(k: string, v: string) { (this as any)._data[k] = v },
  removeItem(k: string) { delete (this as any)._data[k] },
  clear() { (this as any)._data = {} },
})

// 保留真实 isLocalBoundaryUrl / SNAPSHOT_FORMAT，仅替换 createLanTransportAdapter 为可控 mock
// 注意：本测试文件位于 __tests__/ 下，故相对路径比源文件多一层 → ../../sync
vi.mock('../../sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../sync')>()
  const adapterMock = vi.fn(() => makeAdapter())
  return {
    ...actual,
    createLanTransportAdapter: adapterMock,
  }
})

import { storage } from '../../../engine/storage'
import {
  useCrossDevice,
  buildLanQrPayload,
  parseLanQrPayload,
} from '../composables/useCrossDevice'
import { createLanTransportAdapter, SNAPSHOT_FORMAT } from '../../sync'

/** 生成一个 LAN 适配器 mock；importImpl 可定制以模拟拉取失败 */
function makeAdapter(importImpl: () => Promise<void> = async () => {}) {
  return {
    kind: 'network' as const,
    export: vi.fn(async () => ({
      format: SNAPSHOT_FORMAT,
      exportedAt: new Date().toISOString(),
      schema: {},
    })),
    import: vi.fn(importImpl),
  }
}

const CONTINUITY_KEYS = [
  'hf:continuity_devices',
  'hf:continuity_sessions',
  'hf:continuity_config',
]
const VALID_CONFIG = {
  enabled: true,
  sessionTTLMinutes: 10,
  autoDiscover: false,
  preserveState: true,
  maxHistorySessions: 20,
}

beforeEach(() => {
  for (const key of CONTINUITY_KEYS) {
    storage.setKV(key, key === 'hf:continuity_config' ? VALID_CONFIG : [])
  }
  localStorage.removeItem('hf:current_device_id')
  // 每用例重置适配器：清空调用历史 + 一次性实现残留，再设回默认（成功）实现
  vi.mocked(createLanTransportAdapter).mockReset()
  vi.mocked(createLanTransportAdapter).mockImplementation(() => makeAdapter())
})

describe('LAN 扫码载荷 · 构建与解析', () => {
  it('buildLanQrPayload 编码本地端点 + 令牌 + 类型标记', () => {
    const payload = JSON.parse(
      buildLanQrPayload('http://192.168.1.20:54321', 'ABCD-1234-WXYZ-5678'),
    )
    expect(payload.type).toBe('heartflow-lan')
    expect(payload.url).toBe('http://192.168.1.20:54321')
    expect(payload.token).toBe('ABCD-1234-WXYZ-5678')
    expect(payload.version).toBe(1)
  })

  it('parseLanQrPayload 还原合法本地边界载荷', () => {
    const text = buildLanQrPayload('http://192.168.1.20:54321', 'TOK-EN')
    const parsed = parseLanQrPayload(text)
    expect(parsed).not.toBeNull()
    expect(parsed!.url).toBe('http://192.168.1.20:54321')
    expect(parsed!.token).toBe('TOK-EN')
  })

  it('parseLanQrPayload 对公网 URL 返回 null（守宪法第1条）', () => {
    const text = JSON.stringify({
      type: 'heartflow-lan',
      url: 'http://8.8.8.8:54321',
      token: 'X',
    })
    expect(parseLanQrPayload(text)).toBeNull()
  })

  it('parseLanQrPayload 对非 heartflow-lan 类型返回 null', () => {
    const text = JSON.stringify({ type: 'other', url: 'http://192.168.1.20:54321' })
    expect(parseLanQrPayload(text)).toBeNull()
  })

  it('parseLanQrPayload 对非法 JSON 返回 null', () => {
    expect(parseLanQrPayload('{not json')).toBeNull()
  })
})

describe('LAN 接收 · receiveFromLanUrl', () => {
  it('合法本地 URL 调用适配器 import 并返回成功', async () => {
    const cd = useCrossDevice()
    const res = await cd.receiveFromLanUrl('http://192.168.1.20:54321')
    expect(res.success).toBe(true)
    expect(createLanTransportAdapter).toHaveBeenCalledWith({
      peerUrl: 'http://192.168.1.20:54321',
    })
    const adapter = vi.mocked(createLanTransportAdapter).mock.results[0].value
    expect(adapter.import).toHaveBeenCalledTimes(1)
    expect(adapter.import).toHaveBeenCalledWith(
      expect.objectContaining({ format: SNAPSHOT_FORMAT }),
    )
  })

  it('公网 URL 在入口被拒绝，绝不创建适配器（fail-closed）', async () => {
    const cd = useCrossDevice()
    const res = await cd.receiveFromLanUrl('http://8.8.8.8:54321')
    expect(res.success).toBe(false)
    expect(res.error).toContain('本地')
    expect(createLanTransportAdapter).not.toHaveBeenCalled()
  })

  it('适配器 import 抛错时返回失败并透传错误信息', async () => {
    vi.mocked(createLanTransportAdapter).mockImplementationOnce(() =>
      makeAdapter(async () => {
        throw new Error('连接被拒绝')
      }),
    )
    const cd = useCrossDevice()
    const res = await cd.receiveFromLanUrl('http://192.168.1.20:54321')
    expect(res.success).toBe(false)
    expect(res.error).toBe('连接被拒绝')
  })
})
