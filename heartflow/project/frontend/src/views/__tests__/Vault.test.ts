// ============================================================
// 保险库 · 口令锁 + 静态加密 集成测试
// ------------------------------------------------------------
// 本测试只验证「锁定 / 初始化 / 解锁 / 错误提示」的 UI 流程，
// 以及 encryptWithPassphrase 是否正确接入持久化。
// 真实 PBKDF2 + AES-GCM 加密正确性由 vault-cipher.test.ts 覆盖。
// 这里用确定性即时桩替换 crypto 模块，避免 150k 迭代耗时导致的
// 全量测试时序抖动。
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { invalidateCache } from '../../engine/storage/core'

// 确定性即时加密桩：将明文与口令一并编码进 data，解密时校验口令。
vi.mock('../../modules/safety/vault-cipher', () => {
  class VaultDecryptError extends Error {
    constructor() {
      super('VAULT_DECRYPT_FAILED')
      this.name = 'VaultDecryptError'
    }
  }
  function encryptWithPassphrase(plaintext: string, passphrase: string) {
    return Promise.resolve({
      v: 1 as const,
      salt: 'mock-salt',
      iv: 'mock-iv',
      // 测试桩：明文与口令一同编码（非真实密文）
      data: JSON.stringify({ p: passphrase, t: plaintext }),
    })
  }
  function decryptWithPassphrase(payload: any, passphrase: string) {
    const decoded = JSON.parse(payload.data)
    if (decoded.p !== passphrase) throw new VaultDecryptError()
    return Promise.resolve(decoded.t)
  }
  return { VaultDecryptError, encryptWithPassphrase, decryptWithPassphrase }
})

const store: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  },
  writable: true,
  configurable: true,
})

function readSchema(): Record<string, any> {
  return JSON.parse(store['heartflow:storage'] || '{}')
}

async function settle() {
  await flushPromises()
}

async function getWrapper() {
  const { default: Vault } = await import('../Vault.vue')
  return mount(Vault)
}

describe('Vault 口令锁', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
    invalidateCache()
  })

  it('未初始化时显示创建口令界面', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('创建保险库口令')
    expect(wrapper.find('.vt-lock-input').exists()).toBe(true)
  })

  it('设置口令后进入已解锁状态并可记录资产', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('.vt-lock-input')
    await inputs[0].setValue('secret123')
    await inputs[1].setValue('secret123')
    await wrapper.find('.vt-lock-btn').trigger('click')
    await settle()

    expect(wrapper.find('.vt-lock-btn--ghost').exists()).toBe(true)

    const nameInput = wrapper.find('input[placeholder="资产名称"]')
    await nameInput.setValue('房产证')
    const addBtn = wrapper.findAll('button.vt-btn').find((b) => b.text() === '+')
    await addBtn!.trigger('click')
    await settle()

    // 资产已记录
    expect(wrapper.text()).toContain('房产证')

    // 落盘为密文（单 schema 键内），遗留明文键被清除
    const schema = readSchema()
    expect(schema.kvStore?.['hf:vault_cipher']).toBeTruthy()
    expect(schema.kvStore?.['hf:vault_assets_v2']).toBeUndefined()
    expect(schema.kvStore?.['hf:vault_archives']).toBeUndefined()
  })

  it('锁定后正确口令可解锁、错误口令提示错误', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('.vt-lock-input')
    await inputs[0].setValue('secret123')
    await inputs[1].setValue('secret123')
    await wrapper.find('.vt-lock-btn').trigger('click')
    await settle()

    // 锁定
    await wrapper.find('.vt-lock-btn--ghost').trigger('click')
    await settle()
    expect(wrapper.text()).toContain('保险库已锁定')

    // 错误口令
    const unlockInput = wrapper.find('input[placeholder="保险库口令"]')
    await unlockInput.setValue('wrong')
    await wrapper.find('.vt-lock-btn').trigger('click')
    await settle()
    expect(wrapper.text()).toContain('口令错误')

    // 正确口令
    await unlockInput.setValue('secret123')
    await wrapper.find('.vt-lock-btn').trigger('click')
    await settle()
    expect(wrapper.text()).not.toContain('口令错误')
    expect(wrapper.find('.vt-lock-btn--ghost').exists()).toBe(true)
  })
})
