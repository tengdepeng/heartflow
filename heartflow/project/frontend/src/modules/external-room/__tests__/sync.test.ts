// ============================================================
// 云同步（sync）模块测试
// 隔离 storage / vault-cipher / data-port / sync-fs，验证加密快照的
// 构建、解析、解密、导入合并、推送/拉取与状态持久化。
// 直写 I/O 由 sync-fs mock 接管，不触碰真实 Tauri / 浏览器 fs。
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'

const hoisted = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  const files = new Map<string, string>() // path -> 快照文本
  return { store, files }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (k: string, d: unknown) => (hoisted.store.has(k) ? hoisted.store.get(k) : d),
    setKV: (k: string, v: unknown) => void hoisted.store.set(k, v),
    removeKV: (k: string) => void hoisted.store.delete(k),
  },
}))

vi.mock('../../../modules/safety/vault-cipher', () => {
  class VaultDecryptError extends Error {
    constructor() {
      super('VAULT_DECRYPT_FAILED')
      this.name = 'VaultDecryptError'
    }
  }
  // 可逆伪加密：明文 + 口令一起编码，口令不符即解密失败
  function encode(plaintext: string, passphrase: string): string {
    return btoa(unescape(encodeURIComponent(JSON.stringify({ t: plaintext, p: passphrase }))))
  }
  return {
    VaultDecryptError,
    encryptWithPassphrase: async (plaintext: string, passphrase: string) => ({
      v: 1,
      salt: 's',
      iv: 'i',
      data: encode(plaintext, passphrase),
    }),
    decryptWithPassphrase: async (payload: any, passphrase: string) => {
      const obj = JSON.parse(decodeURIComponent(escape(atob(payload.data))))
      if (obj.p !== passphrase) throw new VaultDecryptError()
      return obj.t
    },
  }
})

vi.mock('../../../engine/data-port', () => {
  let lastImported = ''
  return {
    exportAllJSON: () => JSON.stringify({ sessions: [{ id: 's1' }], notes: [] }),
    importJSON: (json: string) => {
      lastImported = json
      return { sessions: 1, notes: 0 }
    },
    __getLastImported: () => lastImported,
  }
})

vi.mock('../sync-fs', () => {
  class SyncFsUnavailableError extends Error {
    constructor() {
      super('SYNC_FS_UNAVAILABLE')
      this.name = 'SyncFsUnavailableError'
    }
  }
  return {
    SYNC_FILENAME: 'heartflow-sync-latest.json',
    isDirectWriteSupported: () => true,
    pickSyncDirectory: async () => ({ kind: 'path', path: '/sync' }),
    writeSyncFile: async (target: any, text: string) => {
      if (!target || target.kind !== 'path') throw new SyncFsUnavailableError()
      hoisted.files.set(target.path, text)
    },
    readSyncFile: async (target: any) => {
      if (!target || target.kind !== 'path') throw new SyncFsUnavailableError()
      return hoisted.files.has(target.path) ? hoisted.files.get(target.path)! : null
    },
    SyncFsUnavailableError,
  }
})

import {
  buildSnapshot,
  serializeSnapshot,
  parseSnapshot,
  decryptSnapshot,
  applyUploaded,
  pushSnapshot,
  pullSnapshot,
  getSyncStatus,
  getSyncDirectory,
  setSyncDirectory,
  type SyncTarget,
} from '../sync'
import * as dataPortModule from '../../../engine/data-port'

const { exportAllJSON } = dataPortModule
// __getLastImported 是 vi.mock 工厂注入的测试专用钩子，真实 data-port 不导出它，
// 因此走命名空间断言取值：运行时仍拿到 mock，类型层不再报 TS2305。
const { __getLastImported } = dataPortModule as unknown as {
  __getLastImported: () => string
}

beforeEach(() => {
  hoisted.store.clear()
  hoisted.files.clear()
})

describe('buildSnapshot / parseSnapshot', () => {
  it('用 exportAllJSON 输出加密并把密文嵌进载荷', async () => {
    const p = await buildSnapshot('pw123', 'mylap')
    expect(p.appId).toBe('heartflow')
    expect(p.format).toBe('sync-v1')
    expect(p.device).toBe('mylap')
    expect(p.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(p.ciphertext.data).toBeTruthy()
  })

  it('序列化后再解析得到等价载荷', async () => {
    const p = await buildSnapshot('pw')
    const back = parseSnapshot(serializeSnapshot(p))
    expect(back.ciphertext).toEqual(p.ciphertext)
    expect(back.syncedAt).toBe(p.syncedAt)
  })

  it('解析非法结构抛错', () => {
    expect(() => parseSnapshot('not json')).toThrow()
    expect(() => parseSnapshot(JSON.stringify({ appId: 'x' }))).toThrow()
  })
})

describe('decryptSnapshot', () => {
  it('正确口令还原明文', async () => {
    const p = await buildSnapshot('pw')
    const plain = await decryptSnapshot(p, 'pw')
    expect(plain).toBe(exportAllJSON())
  })

  it('错误口令抛 VaultDecryptError', async () => {
    const p = await buildSnapshot('pw')
    await expect(decryptSnapshot(p, 'wrong')).rejects.toThrow()
  })
})

describe('applyUploaded（浏览器导入路径）', () => {
  it('解析+解密+合并，并持久化拉取时间', async () => {
    const p = await buildSnapshot('pw')
    const r = await applyUploaded(serializeSnapshot(p), 'pw')
    expect(r.syncedAt).toBe(p.syncedAt)
    expect(__getLastImported()).toBe(exportAllJSON())
    expect(getSyncStatus().lastPullAt).toBeTruthy()
    expect(getSyncStatus().lastError).toBeNull()
  })

  it('错误口令导入返回 VaultDecryptError 风格失败', async () => {
    const p = await buildSnapshot('pw')
    await expect(applyUploaded(serializeSnapshot(p), 'bad')).rejects.toThrow()
  })
})

describe('pushSnapshot', () => {
  it('写入同步目录并持久化 lastPush / lastRemote / dir', async () => {
    const target: SyncTarget = { kind: 'path', path: '/sync' }
    const r = await pushSnapshot(target, 'pw', 'lap')
    expect(r.ok).toBe(true)
    expect(hoisted.files.get('/sync')).toBeTruthy()
    const st = getSyncStatus()
    expect(st.lastPushAt).toBe(r.syncedAt)
    expect(st.lastRemoteAt).toBe(r.syncedAt)
    expect(st.directory).toBe('/sync')
    expect(st.lastError).toBeNull()
  })

  it('空口令返回 empty-passphrase 且不落盘', async () => {
    const r = await pushSnapshot({ kind: 'path', path: '/sync' }, '')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('empty-passphrase')
    expect(hoisted.files.has('/sync')).toBe(false)
  })

  it('无 target 时复用已持久化目录', async () => {
    setSyncDirectory('/persisted')
    const r = await pushSnapshot(null, 'pw')
    expect(r.ok).toBe(true)
    expect(hoisted.files.get('/persisted')).toBeTruthy()
  })
})

describe('pullSnapshot', () => {
  it('目录无快照文件返回 no-file', async () => {
    const r = await pullSnapshot({ kind: 'path', path: '/empty' }, 'pw')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('no-file')
  })

  it('存在快照则解密合并并持久化 lastPull', async () => {
    const built = await buildSnapshot('pw', 'lap')
    hoisted.files.set('/sync', serializeSnapshot(built))
    const r = await pullSnapshot({ kind: 'path', path: '/sync' }, 'pw')
    expect(r.ok).toBe(true)
    expect(r.imported).toBe(true)
    expect(r.syncedAt).toBe(built.syncedAt)
    expect(__getLastImported()).toBe(exportAllJSON())
    expect(getSyncStatus().lastPullAt).toBeTruthy()
  })

  it('口令错误返回 wrong-passphrase', async () => {
    const built = await buildSnapshot('pw')
    hoisted.files.set('/sync', serializeSnapshot(built))
    const r = await pullSnapshot({ kind: 'path', path: '/sync' }, 'bad')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('wrong-passphrase')
  })
})

describe('getSyncStatus', () => {
  it('默认 supported=true（sync-fs mock），其余空', () => {
    const st = getSyncStatus()
    expect(st.supported).toBe(true)
    expect(st.lastPushAt).toBeNull()
    expect(st.lastError).toBeNull()
    expect(st.directory).toBe(getSyncDirectory())
  })
})
