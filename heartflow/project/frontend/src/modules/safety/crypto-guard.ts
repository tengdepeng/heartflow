// ============================================================
// 守护室 · Web Crypto 端到端加密 (P16-15)
// AES-GCM 对称加密 + RSA-OAEP 非对称加密 + 密钥管理
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ---- 类型定义 ----

/** 加密算法 */
export type CryptoAlgorithm = 'AES-GCM' | 'RSA-OAEP'

/** 密钥用途 */
export type KeyUsage = 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'wrapKey' | 'unwrapKey' | 'deriveKey' | 'deriveBits'

/** 密钥元数据 */
export interface CryptoKeyMeta {
  /** 密钥ID */
  id: string
  /** 算法 */
  algorithm: CryptoAlgorithm
  /** 密钥长度（位） */
  keyLength: number
  /** 创建时间 */
  createdAt: string
  /** 过期时间 */
  expiresAt?: string
  /** 是否已撤销 */
  revoked: boolean
  /** 撤销时间 */
  revokedAt?: string
  /** 用途 */
  usages: KeyUsage[]
  /** 标签 */
  label: string
  /** 指纹（SHA-256） */
  fingerprint: string
  /** 轮换次数 */
  rotationCount: number
  /** 上一代密钥ID */
  previousKeyId?: string
}

/** 加密结果 */
export interface EncryptionResult {
  /** 密文（Base64） */
  ciphertext: string
  /** 初始化向量（Base64） */
  iv: string
  /** 使用的密钥ID */
  keyId: string
  /** 算法 */
  algorithm: CryptoAlgorithm
  /** 加密时间 */
  encryptedAt: string
  /** 附加认证数据（可选） */
  aad?: string
}

/** 解密结果 */
export interface DecryptionResult {
  /** 明文 */
  plaintext: string
  /** 使用的密钥ID */
  keyId: string
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
}

/** 签名结果 */
export interface SignatureResult {
  /** 签名（Base64） */
  signature: string
  /** 使用的密钥ID */
  keyId: string
  /** 算法 */
  algorithm: string
  /** 签名时间 */
  signedAt: string
}

/** 密钥对 */
export interface CryptoKeyPairMeta {
  /** 密钥对ID */
  id: string
  /** 公钥元数据 */
  publicKey: CryptoKeyMeta
  /** 私钥元数据 */
  privateKey: CryptoKeyMeta
  /** 算法 */
  algorithm: 'RSA-OAEP'
  /** 密钥长度 */
  keyLength: number
  /** 创建时间 */
  createdAt: string
}

/** 密钥导出格式 */
export type KeyExportFormat = 'jwk' | 'raw' | 'pkcs8' | 'spki'

export interface KeyExportResult {
  /** 格式 */
  format: KeyExportFormat
  /** 密钥数据 */
  data: string
  /** 密钥ID */
  keyId: string
}

/** 密钥导入参数 */
export interface KeyImportParams {
  /** 格式 */
  format: KeyExportFormat
  /** 密钥数据 */
  data: string
  /** 算法 */
  algorithm: CryptoAlgorithm
  /** 用途 */
  usages: KeyUsage[]
  /** 是否可导出 */
  extractable: boolean
}

/** 加密状态 */
export interface CryptoStatus {
  /** 是否支持 Web Crypto API */
  isSupported: boolean
  /** 活跃密钥数 */
  activeKeyCount: number
  /** 已撤销密钥数 */
  revokedKeyCount: number
  /** 上次加密时间 */
  lastEncryptionAt: string | null
  /** 上次解密时间 */
  lastDecryptionAt: string | null
  /** 加密操作计数 */
  encryptionCount: number
  /** 解密操作计数 */
  decryptionCount: number
  /** 是否已初始化 */
  initialized: boolean
}

/** 加密配置 */
export interface CryptoConfig {
  /** 默认对称算法 */
  defaultSymmetricAlgorithm: 'AES-GCM'
  /** AES密钥长度 */
  aesKeyLength: 128 | 256
  /** RSA密钥长度 */
  rsaKeyLength: 2048 | 4096
  /** 自动轮换间隔（天） */
  autoRotationDays: number
  /** 密钥过期天数 */
  keyExpirationDays: number
  /** 是否启用自动轮换 */
  autoRotationEnabled: boolean
}

// ---- 存储键 ----

const KEY_META_KEY = 'hf:safety:key_meta'
const KEY_STORE_PREFIX = 'hf:safety:key_'
const CRYPTO_CONFIG_KEY = 'hf:safety:crypto_config'
const CRYPTO_STATUS_KEY = 'hf:safety:crypto_status'

// ---- 默认配置 ----

const DEFAULT_CRYPTO_CONFIG: CryptoConfig = {
  defaultSymmetricAlgorithm: 'AES-GCM',
  aesKeyLength: 256,
  rsaKeyLength: 4096,
  autoRotationDays: 30,
  keyExpirationDays: 365,
  autoRotationEnabled: true,
}

// ---- 工具函数 ----

/** 将 ArrayBuffer 转为 Base64 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** 将 Base64 转为 ArrayBuffer */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/** 将字符串转为 ArrayBuffer */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(str).buffer as ArrayBuffer
}

/** 将 ArrayBuffer 转为字符串 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder()
  return decoder.decode(buffer)
}

/** 生成随机IV（12字节用于AES-GCM） */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12))
}

/** 生成随机盐值 */
function generateSalt(length: number = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/** 计算SHA-256指纹 */
async function computeFingerprint(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(data))
  return arrayBufferToBase64(hash).slice(0, 32)
}

// ============================================================
// Web Crypto 端到端加密
// ============================================================

export function useCryptoGuard() {
  const config = ref<CryptoConfig>(loadConfig())
  const keyMetaMap = ref<Map<string, CryptoKeyMeta>>(new Map(loadKeyMetas()))
  const status = ref<CryptoStatus>(loadStatus())

  // 内存中的密钥缓存（不持久化到 localStorage）
  const keyCache = new Map<string, CryptoKey>()

  // ---- 持久化 ----

  function loadConfig(): CryptoConfig {
    return storage.getKV<CryptoConfig>(CRYPTO_CONFIG_KEY, DEFAULT_CRYPTO_CONFIG)
  }

  function saveConfig() {
    storage.setKV(CRYPTO_CONFIG_KEY, config.value)
  }

  function loadKeyMetas(): [string, CryptoKeyMeta][] {
    const metas = storage.getKV<CryptoKeyMeta[]>(KEY_META_KEY, [])
    return metas.map(m => [m.id, m] as [string, CryptoKeyMeta])
  }

  function saveKeyMetas() {
    const metas = Array.from(keyMetaMap.value.values())
    storage.setKV(KEY_META_KEY, metas)
  }

  function loadStatus(): CryptoStatus {
    return storage.getKV<CryptoStatus>(CRYPTO_STATUS_KEY, {
      isSupported: typeof crypto !== 'undefined' && !!crypto.subtle,
      activeKeyCount: 0,
      revokedKeyCount: 0,
      lastEncryptionAt: null,
      lastDecryptionAt: null,
      encryptionCount: 0,
      decryptionCount: 0,
      initialized: false,
    })
  }

  function saveStatus() {
    storage.setKV(CRYPTO_STATUS_KEY, status.value)
  }

  async function persistKey(keyId: string, key: CryptoKey): Promise<void> {
    try {
      const jwk = await crypto.subtle.exportKey('jwk', key)
      storage.setKV(`${KEY_STORE_PREFIX}${keyId}`, jwk)
    } catch {
      // 密钥不可导出，仅缓存在内存中
    }
  }

  async function loadKey(keyId: string): Promise<CryptoKey | null> {
    // 先从内存缓存查找
    if (keyCache.has(keyId)) {
      return keyCache.get(keyId)!
    }

    const meta = keyMetaMap.value.get(keyId)
    if (!meta) return null

    const stored = storage.getKV<JsonWebKey | null>(`${KEY_STORE_PREFIX}${keyId}`, null)
    if (!stored) return null

    try {
      const key = await (crypto.subtle as any).importKey(
        'jwk' as KeyFormat,
        stored,
        getAlgorithmParams(meta.algorithm, meta.keyLength),
        true,
        meta.usages as KeyUsage[],
      )
      keyCache.set(keyId, key)
      return key
    } catch {
      return null
    }
  }

  function getAlgorithmParams(
    algorithm: CryptoAlgorithm,
    keyLength: number,
  ): AesKeyGenParams | RsaHashedKeyGenParams {
    if (algorithm === 'AES-GCM') {
      return { name: 'AES-GCM', length: keyLength }
    }
    return {
      name: 'RSA-OAEP',
      modulusLength: keyLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    }
  }

  // ---- 密钥管理 ----

  /** 生成AES-GCM对称密钥 */
  async function generateAESKey(
    label: string = 'default',
    length?: 128 | 256,
  ): Promise<CryptoKeyMeta> {
    const keyLength = length || config.value.aesKeyLength
    const algorithm: AesKeyGenParams = {
      name: 'AES-GCM',
      length: keyLength,
    }

    const key = await crypto.subtle.generateKey(
      algorithm,
      true, // 可导出
      ['encrypt', 'decrypt'],
    )

    const keyId = `aes_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const fingerprint = await computeFingerprint(keyId)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + config.value.keyExpirationDays)

    const meta: CryptoKeyMeta = {
      id: keyId,
      algorithm: 'AES-GCM',
      keyLength,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      revoked: false,
      usages: ['encrypt', 'decrypt'],
      label,
      fingerprint,
      rotationCount: 0,
    }

    keyMetaMap.value.set(keyId, meta)
    keyCache.set(keyId, key)
    await persistKey(keyId, key)
    saveKeyMetas()

    status.value.activeKeyCount++
    saveStatus()

    return meta
  }

  /** 生成RSA-OAEP非对称密钥对 */
  async function generateRSAKeyPair(
    label: string = 'default',
    length?: 2048 | 4096,
  ): Promise<CryptoKeyPairMeta> {
    const keyLength = length || config.value.rsaKeyLength
    const algorithm: RsaHashedKeyGenParams = {
      name: 'RSA-OAEP',
      modulusLength: keyLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    }

    const keyPair = await (crypto.subtle as any).generateKey(
      algorithm,
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
    ) as CryptoKeyPair

    const pairId = `rsa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const publicKeyId = `${pairId}_pub`
    const privateKeyId = `${pairId}_priv`

    const publicFingerprint = await computeFingerprint(publicKeyId)
    const privateFingerprint = await computeFingerprint(privateKeyId)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + config.value.keyExpirationDays * 2)

    const now = new Date().toISOString()

    const publicMeta: CryptoKeyMeta = {
      id: publicKeyId,
      algorithm: 'RSA-OAEP',
      keyLength,
      createdAt: now,
      expiresAt: expiresAt.toISOString(),
      revoked: false,
      usages: ['encrypt', 'wrapKey'],
      label: `${label} (公钥)`,
      fingerprint: publicFingerprint,
      rotationCount: 0,
    }

    const privateMeta: CryptoKeyMeta = {
      id: privateKeyId,
      algorithm: 'RSA-OAEP',
      keyLength,
      createdAt: now,
      expiresAt: expiresAt.toISOString(),
      revoked: false,
      usages: ['decrypt', 'unwrapKey'],
      label: `${label} (私钥)`,
      fingerprint: privateFingerprint,
      rotationCount: 0,
    }

    keyMetaMap.value.set(publicKeyId, publicMeta)
    keyMetaMap.value.set(privateKeyId, privateMeta)
    keyCache.set(publicKeyId, keyPair.publicKey)
    keyCache.set(privateKeyId, keyPair.privateKey)
    await persistKey(publicKeyId, keyPair.publicKey)
    await persistKey(privateKeyId, keyPair.privateKey)
    saveKeyMetas()

    status.value.activeKeyCount += 2
    saveStatus()

    return {
      id: pairId,
      publicKey: publicMeta,
      privateKey: privateMeta,
      algorithm: 'RSA-OAEP',
      keyLength,
      createdAt: now,
    }
  }

  /** 密钥轮换 */
  async function rotateKey(keyId: string): Promise<CryptoKeyMeta | null> {
    const oldMeta = keyMetaMap.value.get(keyId)
    if (!oldMeta) return null

    let newMeta: CryptoKeyMeta

    if (oldMeta.algorithm === 'AES-GCM') {
      newMeta = await generateAESKey(
        `${oldMeta.label} (轮换${oldMeta.rotationCount + 1})`,
        oldMeta.keyLength as 128 | 256,
      )
    } else {
      const pair = await generateRSAKeyPair(
        `${oldMeta.label} (轮换${oldMeta.rotationCount + 1})`,
        oldMeta.keyLength as 2048 | 4096,
      )
      newMeta = oldMeta.usages.includes('encrypt') ? pair.publicKey : pair.privateKey
    }

    newMeta.previousKeyId = keyId
    keyMetaMap.value.set(newMeta.id, { ...newMeta })

    // 撤销旧密钥
    oldMeta.revoked = true
    oldMeta.revokedAt = new Date().toISOString()
    keyMetaMap.value.set(keyId, { ...oldMeta })

    // 清理旧密钥缓存
    keyCache.delete(keyId)

    saveKeyMetas()
    status.value.activeKeyCount--
    status.value.revokedKeyCount++
    saveStatus()

    return newMeta
  }

  /** 撤销密钥 */
  function revokeKey(keyId: string): boolean {
    const meta = keyMetaMap.value.get(keyId)
    if (!meta || meta.revoked) return false

    meta.revoked = true
    meta.revokedAt = new Date().toISOString()
    keyMetaMap.value.set(keyId, { ...meta })
    keyCache.delete(keyId)

    saveKeyMetas()
    status.value.activeKeyCount--
    status.value.revokedKeyCount++
    saveStatus()

    return true
  }

  /** 导出密钥 */
  async function exportKey(
    keyId: string,
    format: KeyExportFormat = 'jwk',
  ): Promise<KeyExportResult | null> {
    const meta = keyMetaMap.value.get(keyId)
    if (!meta || meta.revoked) return null

    const key = await loadKey(keyId)
    if (!key) return null

    try {
      const exported = await (crypto.subtle as any).exportKey(format, key)

      let data: string
      if (format === 'jwk') {
        data = JSON.stringify(exported)
      } else {
        data = arrayBufferToBase64(exported as ArrayBuffer)
      }

      return { format, data, keyId }
    } catch {
      return null
    }
  }

  /** 导入密钥 */
  async function importKey(params: KeyImportParams): Promise<CryptoKeyMeta | null> {
    let keyData: JsonWebKey | BufferSource

    if (params.format === 'jwk') {
      keyData = JSON.parse(params.data)
    } else {
      keyData = base64ToArrayBuffer(params.data)
    }

    const algParams = getAlgorithmParams(
      params.algorithm,
      params.algorithm === 'AES-GCM' ? 256 : 4096,
    )

    try {
      const key = await (crypto.subtle as any).importKey(
        params.format,
        keyData,
        algParams,
        params.extractable,
        params.usages,
      )

      const keyId = `imported_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const fingerprint = await computeFingerprint(keyId)

      const meta: CryptoKeyMeta = {
        id: keyId,
        algorithm: params.algorithm,
        keyLength: params.algorithm === 'AES-GCM' ? 256 : 4096,
        createdAt: new Date().toISOString(),
        revoked: false,
        usages: params.usages,
        label: '导入密钥',
        fingerprint,
        rotationCount: 0,
      }

      keyMetaMap.value.set(keyId, meta)
      keyCache.set(keyId, key)
      if (params.extractable) {
        await persistKey(keyId, key)
      }
      saveKeyMetas()

      status.value.activeKeyCount++
      saveStatus()

      return meta
    } catch {
      return null
    }
  }

  // ---- 加密/解密 ----

  /** AES-GCM 加密 */
  async function encryptAES(
    plaintext: string,
    keyId: string,
    aad?: string,
  ): Promise<EncryptionResult | null> {
    const key = await loadKey(keyId)
    if (!key) return null

    const iv = generateIV()
    const encodedData = stringToArrayBuffer(plaintext)

    const algorithm: AesGcmParams = {
      name: 'AES-GCM',
      iv,
      additionalData: aad ? stringToArrayBuffer(aad) : undefined,
    }

    try {
      const ciphertext = await crypto.subtle.encrypt(algorithm, key, encodedData)

      const result: EncryptionResult = {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv),
        keyId,
        algorithm: 'AES-GCM',
        encryptedAt: new Date().toISOString(),
        aad,
      }

      status.value.lastEncryptionAt = result.encryptedAt
      status.value.encryptionCount++
      saveStatus()

      return result
    } catch (err) {
      console.error('[CryptoGuard] AES加密失败:', err)
      return null
    }
  }

  /** AES-GCM 解密 */
  async function decryptAES(
    encryptionResult: EncryptionResult,
  ): Promise<DecryptionResult> {
    const key = await loadKey(encryptionResult.keyId)
    if (!key) {
      return {
        plaintext: '',
        keyId: encryptionResult.keyId,
        success: false,
        error: '密钥未找到或已撤销',
      }
    }

    const iv = base64ToArrayBuffer(encryptionResult.iv)
    const ciphertext = base64ToArrayBuffer(encryptionResult.ciphertext)

    const algorithm: AesGcmParams = {
      name: 'AES-GCM',
      iv,
      additionalData: encryptionResult.aad
        ? stringToArrayBuffer(encryptionResult.aad)
        : undefined,
    }

    try {
      const plaintext = await crypto.subtle.decrypt(algorithm, key, ciphertext)

      status.value.lastDecryptionAt = new Date().toISOString()
      status.value.decryptionCount++
      saveStatus()

      return {
        plaintext: arrayBufferToString(plaintext),
        keyId: encryptionResult.keyId,
        success: true,
      }
    } catch (err) {
      return {
        plaintext: '',
        keyId: encryptionResult.keyId,
        success: false,
        error: `解密失败: ${err}`,
      }
    }
  }

  /** 端到端加密（自动选择算法） */
  async function encrypt(
    plaintext: string,
    keyId?: string,
  ): Promise<EncryptionResult | null> {
    // 查找或生成AES密钥
    let targetKeyId = keyId
    if (!targetKeyId) {
      const aesKeys = getActiveKeysByAlgorithm('AES-GCM')
      if (aesKeys.length > 0) {
        targetKeyId = aesKeys[0].id
      } else {
        const newKey = await generateAESKey('auto')
        targetKeyId = newKey.id
      }
    }

    return encryptAES(plaintext, targetKeyId)
  }

  /** 端到端解密 */
  async function decrypt(
    encryptionResult: EncryptionResult,
  ): Promise<DecryptionResult> {
    return decryptAES(encryptionResult)
  }

  /** 批量加密 */
  async function encryptBatch(
    items: { plaintext: string; keyId?: string }[],
  ): Promise<(EncryptionResult | null)[]> {
    return Promise.all(items.map(item => encrypt(item.plaintext, item.keyId)))
  }

  /** 批量解密 */
  async function decryptBatch(
    items: EncryptionResult[],
  ): Promise<DecryptionResult[]> {
    return Promise.all(items.map(item => decrypt(item)))
  }

  // ---- 数字签名 ----

  /** 生成HMAC签名 */
  async function signHMAC(
    data: string,
    keyId: string,
  ): Promise<SignatureResult | null> {
    const key = await loadKey(keyId)
    if (!key) return null

    try {
      // 使用 AES-GCM 密钥进行 HMAC（需要派生）
      const hmacKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.exportKey('raw', key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      )

      const signature = await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        stringToArrayBuffer(data),
      )

      return {
        signature: arrayBufferToBase64(signature),
        keyId,
        algorithm: 'HMAC-SHA256',
        signedAt: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  /** 验证HMAC签名 */
  async function verifyHMAC(
    data: string,
    signature: SignatureResult,
  ): Promise<boolean> {
    const key = await loadKey(signature.keyId)
    if (!key) return false

    try {
      const hmacKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.exportKey('raw', key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      )

      return crypto.subtle.verify(
        'HMAC',
        hmacKey,
        base64ToArrayBuffer(signature.signature),
        stringToArrayBuffer(data),
      )
    } catch {
      return false
    }
  }

  // ---- 密钥派生 ----

  /** 从密码派生密钥（PBKDF2） */
  async function deriveKeyFromPassword(
    password: string,
    salt?: Uint8Array,
    iterations: number = 100000,
  ): Promise<CryptoKeyMeta> {
    const saltBytes = salt || generateSalt()
    const encodedPassword = stringToArrayBuffer(password)

    const baseKey = await crypto.subtle.importKey(
      'raw',
      encodedPassword,
      'PBKDF2',
      false,
      ['deriveKey'],
    )

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    )

    const keyId = `derived_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const fingerprint = await computeFingerprint(keyId)

    const meta: CryptoKeyMeta = {
      id: keyId,
      algorithm: 'AES-GCM',
      keyLength: 256,
      createdAt: new Date().toISOString(),
      revoked: false,
      usages: ['encrypt', 'decrypt'],
      label: '密码派生密钥',
      fingerprint,
      rotationCount: 0,
    }

    keyMetaMap.value.set(keyId, meta)
    keyCache.set(keyId, derivedKey)
    await persistKey(keyId, derivedKey)
    saveKeyMetas()

    status.value.activeKeyCount++
    saveStatus()

    return meta
  }

  // ---- 安全数据存储 ----

  /** 安全存储数据（自动加密） */
  async function secureSet(
    storageKey: string,
    value: unknown,
    keyId?: string,
  ): Promise<boolean> {
    const json = JSON.stringify(value)
    const result = await encrypt(json, keyId)
    if (!result) return false

    storage.setKV(storageKey, result)
    return true
  }

  /** 安全读取数据（自动解密） */
  async function secureGet<T = unknown>(
    storageKey: string,
  ): Promise<{ data: T | null; success: boolean; error?: string }> {
    const encrypted = storage.getKV<EncryptionResult | null>(storageKey, null)
    if (!encrypted) {
      return { data: null, success: false, error: '数据不存在' }
    }

    const result = await decrypt(encrypted)
    if (!result.success) {
      return { data: null, success: false, error: result.error }
    }

    try {
      return { data: JSON.parse(result.plaintext) as T, success: true }
    } catch {
      return { data: null, success: false, error: 'JSON解析失败' }
    }
  }

  // ---- 查询与状态 ----

  /** 获取活跃密钥 */
  function getActiveKeys(): CryptoKeyMeta[] {
    return Array.from(keyMetaMap.value.values()).filter(k => !k.revoked)
  }

  /** 获取指定算法的活跃密钥 */
  function getActiveKeysByAlgorithm(algorithm: CryptoAlgorithm): CryptoKeyMeta[] {
    return getActiveKeys().filter(k => k.algorithm === algorithm)
  }

  /** 获取已撤销密钥 */
  function getRevokedKeys(): CryptoKeyMeta[] {
    return Array.from(keyMetaMap.value.values()).filter(k => k.revoked)
  }

  /** 获取密钥元数据 */
  function getKeyMeta(keyId: string): CryptoKeyMeta | undefined {
    return keyMetaMap.value.get(keyId)
  }

  /** 检查密钥是否过期 */
  function isKeyExpired(keyId: string): boolean {
    const meta = keyMetaMap.value.get(keyId)
    if (!meta || !meta.expiresAt) return false
    return new Date(meta.expiresAt) < new Date()
  }

  /** 获取即将过期的密钥 */
  function getExpiringKeys(withinDays: number = 7): CryptoKeyMeta[] {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + withinDays)
    return getActiveKeys().filter(
      k => k.expiresAt && new Date(k.expiresAt) <= deadline
    )
  }

  /** 自动轮换过期密钥 */
  async function autoRotateExpiredKeys(): Promise<CryptoKeyMeta[]> {
    const rotated: CryptoKeyMeta[] = []
    const expired = getActiveKeys().filter(k => isKeyExpired(k.id))

    for (const key of expired) {
      const newKey = await rotateKey(key.id)
      if (newKey) rotated.push(newKey)
    }

    return rotated
  }

  /** 初始化加密系统 */
  async function initialize(): Promise<void> {
    if (status.value.initialized) return

    // 检查是否已有密钥
    const existingAES = getActiveKeysByAlgorithm('AES-GCM')
    if (existingAES.length === 0) {
      await generateAESKey('系统默认')
    }

    status.value.initialized = true
    status.value.isSupported = typeof crypto !== 'undefined' && !!crypto.subtle
    saveStatus()
  }

  /** 清除所有密钥（危险操作） */
  function clearAllKeys(): void {
    for (const [keyId] of keyMetaMap.value) {
      keyCache.delete(keyId)
      storage.setKV(`${KEY_STORE_PREFIX}${keyId}`, null)
    }
    keyMetaMap.value.clear()
    saveKeyMetas()

    status.value.activeKeyCount = 0
    status.value.revokedKeyCount = 0
    saveStatus()
  }

  // ---- 响应式计算 ----

  const activeKeys = computed(() => getActiveKeys())
  const revokedKeys = computed(() => getRevokedKeys())
  const isReady = computed(() => status.value.initialized && status.value.isSupported)

  return {
    // 状态
    config,
    status,
    activeKeys,
    revokedKeys,
    isReady,

    // 密钥管理
    generateAESKey,
    generateRSAKeyPair,
    rotateKey,
    revokeKey,
    exportKey,
    importKey,
    deriveKeyFromPassword,

    // 加密/解密
    encrypt,
    decrypt,
    encryptAES,
    decryptAES,
    encryptBatch,
    decryptBatch,

    // 签名
    signHMAC,
    verifyHMAC,

    // 安全存储
    secureSet,
    secureGet,

    // 查询
    getActiveKeys,
    getActiveKeysByAlgorithm,
    getRevokedKeys,
    getKeyMeta,
    isKeyExpired,
    getExpiringKeys,

    // 维护
    autoRotateExpiredKeys,
    initialize,
    clearAllKeys,
    updateConfig: (partial: Partial<CryptoConfig>) => {
      config.value = { ...config.value, ...partial }
      saveConfig()
    },
  }
}

// ---- 存储键 ----

export const CRYPTO_GUARD_STORAGE_KEYS = {
  KEY_META: KEY_META_KEY,
  KEY_STORE_PREFIX,
  CRYPTO_CONFIG: CRYPTO_CONFIG_KEY,
  CRYPTO_STATUS: CRYPTO_STATUS_KEY,
} as const