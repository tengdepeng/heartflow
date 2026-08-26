// ============================================================
// 保险库 · barrel export
// ============================================================

export {
  useVault,
  VAULT_CIPHER_KEY,
  VAULT_LEGACY_K,
  VAULT_LEGACY_KA,
} from './vault'
export type { Asset, Archive, VaultData } from './vault'

// ---- 自动锁定（Auto-Lock） ----
export { useVaultAutoLock, DEFAULT_AUTO_LOCK, IDLE_OPTIONS, AUTO_LOCK_KEY } from './auto-lock'
export type { AutoLockSettings } from './auto-lock'
