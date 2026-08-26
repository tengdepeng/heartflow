// ============================================================
// 保险库 · 加密载荷数据层
// 把 Vault.vue 内裸 storage 的「密文载荷读写 + 遗留明文键清理」
// 下沉为组合式函数。加密 / 解密算法与密钥派生保留在
// modules/safety/vault-cipher，本层不改动任何加密行为，
// 仅负责「读 / 写 / 删除 cipher 载荷」与「清理 legacy 明文键」。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { VaultCipherPayload } from '../safety/vault-cipher'

// 存储键：必须与原视图中使用的字符串原值保持一致
export const VAULT_CIPHER_KEY = 'hf:vault_cipher'
export const VAULT_LEGACY_K = 'hf:vault_assets_v2'
export const VAULT_LEGACY_KA = 'hf:vault_archives'

export interface Asset {
  id: string
  name: string
  value: number
  category: string
  note: string
  at: string
  _expanded: boolean
}

export interface Archive {
  id: string
  name: string
  detail: string
  at: string
}

export interface VaultData {
  assets: Omit<Asset, '_expanded'>[]
  archives: Archive[]
}

// 模块级单例：跨组件实例共享同一份密文载荷
const payload = ref<VaultCipherPayload | null>(null)

/**
 * 保险库加密数据层：密文载荷的读取 / 写入 / 锁定，及遗留明文键清理。
 */
export function useVault() {
  /** 从存储读取密文载荷 */
  function load(): void {
    payload.value = storage.getKV<VaultCipherPayload | null>(VAULT_CIPHER_KEY, null)
  }

  /** 写入密文载荷，并清除迁移前的遗留明文键 */
  function save(p: VaultCipherPayload): void {
    payload.value = p
    storage.setKV(VAULT_CIPHER_KEY, p)
    // 迁移完成后清除遗留明文
    storage.removeKV(VAULT_LEGACY_K)
    storage.removeKV(VAULT_LEGACY_KA)
  }

  /** 锁定：仅清空内存中的密文（不触碰持久化存储） */
  function lock(): void {
    payload.value = null
  }

  /** 读取迁移前的遗留明文数据（用于首次设置口令时迁移） */
  function readLegacy(): VaultData | null {
    const la = storage.getKV<Asset[]>(VAULT_LEGACY_K, [])
    const lar = storage.getKV<Archive[]>(VAULT_LEGACY_KA, [])
    if ((la && la.length) || (lar && lar.length)) {
      return {
        assets: (la || []).map((a: Asset) => ({ ...a, _expanded: false })),
        archives: lar || [],
      }
    }
    return null
  }

  return { payload, load, save, lock, readLegacy }
}
