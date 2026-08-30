// ============================================================
// 数据加密引擎测试（INCR-31）
// 覆盖 加密/解密往返、口令错误、记录加解密、备份存储
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, unknown> = {}
  return {
    store,
    mockGetKV: vi.fn((k: string, d?: unknown): unknown => store[k] ?? d),
    mockSetKV: vi.fn((k: string, v: unknown): void => {
      store[k] = v
    }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: mockGetKV,
    setKV: mockSetKV,
  },
}))

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
})

import {
  encryptText,
  decryptText,
  encryptRecords,
  decryptRecords,
  boxToJson,
  boxFromJson,
  useDataEncryption,
  type EncryptedBox,
} from '../data-encryption'

describe('encryptText / decryptText', () => {
  it('往返一致且非明文', () => {
    const box = encryptText('月度项目奖金8000元', 'safe-password')
    expect(box.ct).not.toContain('奖金')
    expect(decryptText(box, 'safe-password')).toBe('月度项目奖金8000元')
  })

  it('同口令同盐确定性，不同盐密文不同', () => {
    const a = encryptText('hello', 'pw', 'fixed-salt')
    const b = encryptText('hello', 'pw', 'fixed-salt')
    const c = encryptText('hello', 'pw', 'other-salt')
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(a.ct).not.toBe(c.ct)
  })

  it('错误口令返回 null', () => {
    const box = encryptText('秘密', 'right')
    expect(decryptText(box, 'wrong')).toBeNull()
  })

  it('空/invalid box 返回 null', () => {
    expect(decryptText(null as unknown as EncryptedBox, 'pw')).toBeNull()
    expect(decryptText({ v: 1, algo: 'rc4', salt: 'x', ct: '!!!!' }, 'pw')).toBeNull()
  })
})

describe('encryptRecords / decryptRecords', () => {
  const recs = [
    {
      id: '1',
      type: 'income' as const,
      category: 'salary',
      amount: 8000,
      description: '工资',
      at: '2026-08-01T12:00:00.000Z',
    },
    {
      id: '2',
      type: 'expense' as const,
      category: 'social',
      amount: 88,
      description: '咖啡',
      at: '2026-08-02T12:00:00.000Z',
    },
  ]

  it('记录列表加解密往返一致', () => {
    const box = encryptRecords(recs, 'pw')
    const dec = decryptRecords(box, 'pw')
    expect(dec).toEqual(recs)
  })

  it('错误口令解密记录返回 null', () => {
    const box = encryptRecords(recs, 'pw')
    expect(decryptRecords(box, 'bad')).toBeNull()
  })
})

describe('box 序列化', () => {
  it('boxToJson / boxFromJson 往返', () => {
    const box = encryptText('数据', 'pw', 'salt')
    const json = boxToJson(box)
    expect(boxFromJson(json)).toEqual(box)
  })

  it('非法 JSON / 缺字段返回 null', () => {
    expect(boxFromJson('not-json')).toBeNull()
    expect(boxFromJson('{"a":1}')).toBeNull()
  })
})

describe('useDataEncryption 存储', () => {
  it('saveBackup 落库并可恢复', () => {
    const enc = useDataEncryption()
    const recs = [{ id: 'a', type: 'income' as const, category: 'salary' as const, amount: 1, description: 'x', at: '2026-08-01' }]
    expect(enc.saveBackup(recs, 'pw', '快照A')).toBe(true)
    expect(enc.backup.value?.label).toBe('快照A')
    expect(enc.restoreBackup('pw')).toEqual(recs)
    expect(enc.restoreBackup('bad')).toBeNull()
  })

  it('空口令不保存', () => {
    const enc = useDataEncryption()
    expect(enc.saveBackup([], '')).toBe(false)
    expect(enc.backup.value).toBeNull()
  })

  it('clearBackup 清除', () => {
    const enc = useDataEncryption()
    enc.saveBackup([], 'pw')
    expect(enc.backup.value).not.toBeNull()
    enc.clearBackup()
    expect(enc.backup.value).toBeNull()
  })
})