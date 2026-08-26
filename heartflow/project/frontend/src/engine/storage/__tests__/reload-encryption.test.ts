// ============================================================
// B0 加密存储 · reload 回归测试
// ------------------------------------------------------------
// 用 vi.resetModules() 重新加载 core 模块模拟「刷新页面」，
// 复用同一份全局 localStorage 模拟磁盘持久化，验证：
//  1) enable 后 reload，磁盘信封不被明文覆盖；
//  2) 启动期正确挂起解锁态（isUnlockRequired=true）；
//  3) 口令解锁 / 设备兜底解锁 / 关闭加密 全链路。
// ============================================================

import { beforeEach, describe, it, expect, vi } from 'vitest'

// 跨 reload 共享的「磁盘」：同一 Map 模拟 localStorage 持久化
let disk = new Map<string, string>()
function installLS() {
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (disk.has(k) ? disk.get(k)! : null),
    setItem: (k: string, v: string) => {
      disk.set(k, String(v))
    },
    removeItem: (k: string) => {
      disk.delete(k)
    },
    clear: () => disk.clear(),
  }
}

async function freshCore() {
  vi.resetModules()
  return (await import('../core')) as typeof import('../core')
}

describe('B0 加密存储 · reload 回归', () => {
  beforeEach(() => {
    disk = new Map<string, string>()
    installLS()
  })

  it('enable 后 reload：信封保留 + 启动期挂起解锁', async () => {
    // --- Boot #1：明文初始化 ---
    const c1 = await freshCore()
    await c1.initStorage()
    expect(c1.isUnlockRequired()).toBe(false)

    // --- 启用加密 ---
    await c1.enableEncryption('test1234')
    const ls = (globalThis as any).localStorage
    const raw1 = JSON.parse(ls.getItem('heartflow:storage'))
    expect(raw1.__hf_enc).toBe(1) // 磁盘已是信封

    // --- Reload（重新加载模块 = 刷新页面）---
    const c2 = await freshCore()
    await c2.initStorage()

    // 启动期检测到信封 → 需解锁
    expect(c2.isUnlockRequired()).toBe(true)
    // 磁盘仍应为信封（未被明文覆盖）
    const raw2 = JSON.parse(ls.getItem('heartflow:storage'))
    expect(raw2.__hf_enc).toBe(1)

    // --- 口令解锁 ---
    const ok = await c2.unlockWithPassphrase('test1234')
    expect(ok).toBe(true)
    expect(c2.isUnlockRequired()).toBe(false)
    const schema = c2.loadSchema()
    expect(schema.config.theme).toBe('dark')
  })

  it('reload 后启动期若有明文写，不得覆盖信封（防护网）', async () => {
    // Boot #1：启用加密
    const c1 = await freshCore()
    await c1.initStorage()
    await c1.enableEncryption('pw1234')

    // 模拟 reload 后、initStorage 之前应用层触发一次明文 save
    // （极端时序：encActive 仍为 false，磁盘已是信封）
    const ls = (globalThis as any).localStorage
    const envBefore = ls.getItem('heartflow:storage')
    expect(JSON.parse(envBefore).__hf_enc).toBe(1)

    // Reload
    const c2 = await freshCore()
    // 在 initStorage 之前，模拟一次 loadSchema（触发装饰层明文 save 路径）
    c2.loadSchema()
    // 即便如此，磁盘信封必须保持
    const envAfter = JSON.parse(ls.getItem('heartflow:storage'))
    expect(envAfter.__hf_enc).toBe(1)
  })

  it('设备兜底解锁：忘记口令也能用本机恢复', async () => {
    const c1 = await freshCore()
    await c1.initStorage()
    await c1.enableEncryption('forgetme')
    // Reload
    const c2 = await freshCore()
    await c2.initStorage()
    expect(c2.isUnlockRequired()).toBe(true)
    // 用错误口令 → 失败
    expect(await c2.unlockWithPassphrase('wrong')).toBe(false)
    // 设备兜底 → 成功
    expect(await c2.unlockWithDevice()).toBe(true)
    expect(c2.isUnlockRequired()).toBe(false)
    expect(c2.loadSchema().config.theme).toBe('dark')
  })

  it('关闭加密：回明文且后续保存为明文', async () => {
    const c1 = await freshCore()
    await c1.initStorage()
    await c1.enableEncryption('closeme')
    await c1.disableEncryption()

    const ls = (globalThis as any).localStorage
    const raw = JSON.parse(ls.getItem('heartflow:storage'))
    expect(raw.__hf_enc).toBeUndefined() // 已回明文
    expect(raw.config).toBeDefined()

    // Reload 后应为明文态、无需解锁
    const c2 = await freshCore()
    await c2.initStorage()
    expect(c2.isUnlockRequired()).toBe(false)
  })

  it('修改口令：旧口令失效、新口令可用', async () => {
    const c1 = await freshCore()
    await c1.initStorage()
    await c1.enableEncryption('oldpw')
    expect(await c1.changePassphrase('oldpw', 'newpw')).toBe(true)

    const c2 = await freshCore()
    await c2.initStorage()
    expect(await c2.unlockWithPassphrase('oldpw')).toBe(false)
    expect(await c2.unlockWithPassphrase('newpw')).toBe(true)
  })
})
