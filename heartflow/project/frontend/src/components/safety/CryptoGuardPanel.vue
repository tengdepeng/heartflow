<template>
  <section class="cgp" aria-label="加密守护">
    <div class="cgp-head">
      <span class="cgp-title">🔐 加密守护</span>
      <span class="cgp-sub">AES-GCM 对称加密 · RSA-OAEP 非对称 · 密钥生命周期</span>
    </div>

    <!-- 状态总览 -->
    <div class="cgp-stats">
      <div class="cgp-stat" :class="{ ok: isReady }"><b>{{ isReady ? '就绪' : '未就绪' }}</b><span>加密状态</span></div>
      <div class="cgp-stat"><b>{{ activeKeys.length }}</b><span>活跃密钥</span></div>
      <div class="cgp-stat"><b>{{ revokedKeys.length }}</b><span>已撤销</span></div>
      <div class="cgp-stat"><b>{{ status.encryptionCount }}</b><span>加密次数</span></div>
    </div>

    <!-- 密钥生成 -->
    <div class="cgp-block">
      <span class="cgp-block-label">密钥生成</span>
      <div class="cgp-create">
        <input v-model="keyLabel" class="cgp-input" placeholder="密钥标签，如：日记加密" />
        <button class="cgp-btn cgp-btn--primary cgp-aes-btn" :disabled="!isReady" @click="genAES">＋ AES 密钥</button>
        <button class="cgp-btn cgp-rsa-btn" :disabled="!isReady" @click="genRSA">＋ RSA 密钥对</button>
      </div>
    </div>

    <!-- 活跃密钥 -->
    <div class="cgp-block">
      <span class="cgp-block-label">活跃密钥 · {{ activeKeys.length }}</span>
      <div v-if="activeKeys.length" class="cgp-key-list">
        <div v-for="k in activeKeys" :key="k.id" class="cgp-key">
          <span class="cgp-key-icon">{{ k.algorithm === 'AES-GCM' ? '🔑' : '🗝️' }}</span>
          <div class="cgp-key-body">
            <strong class="cgp-key-label">{{ k.label }}</strong>
            <span class="cgp-key-meta">
              {{ k.algorithm }} · {{ k.keyLength }} 位 · {{ fmtTime(k.createdAt) }}
            </span>
          </div>
          <span class="cgp-key-fp">{{ shortFp(k.fingerprint) }}</span>
          <button class="cgp-btn cgp-btn--sm cgp-rotate-btn" @click="rotate(k.id)">轮换</button>
          <button class="cgp-btn cgp-btn--sm cgp-revoke-btn" @click="revoke(k.id)">撤销</button>
        </div>
      </div>
      <div v-else class="cgp-empty">还没有活跃密钥。生成一个 AES 或 RSA 密钥。</div>
    </div>

    <!-- 已撤销密钥 -->
    <div v-if="revokedKeys.length" class="cgp-block">
      <span class="cgp-block-label">已撤销密钥 · {{ revokedKeys.length }}</span>
      <div class="cgp-key-list">
        <div v-for="k in revokedKeys" :key="k.id" class="cgp-key cgp-key--revoked">
          <span class="cgp-key-icon">🚫</span>
          <div class="cgp-key-body">
            <strong class="cgp-key-label">{{ k.label }}</strong>
            <span class="cgp-key-meta">{{ k.algorithm }} · {{ fmtTime(k.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 加密测试 -->
    <div class="cgp-block">
      <span class="cgp-block-label">加密测试</span>
      <div class="cgp-test">
        <textarea v-model="plaintext" class="cgp-textarea" placeholder="输入要加密的文本…"></textarea>
        <div class="cgp-test-actions">
          <button class="cgp-btn cgp-btn--primary cgp-encrypt-btn" :disabled="!isReady || !plaintext.trim()" @click="doEncrypt">🔒 加密</button>
          <button class="cgp-btn cgp-decrypt-btn" :disabled="!ciphertext" @click="doDecrypt">🔓 解密</button>
        </div>
        <div v-if="ciphertext" class="cgp-cipher">
          <span class="cgp-cipher-label">密文</span>
          <code class="cgp-cipher-text">{{ ciphertext }}</code>
        </div>
        <div v-if="decrypted" class="cgp-plain">
          <span class="cgp-cipher-label">解密结果</span>
          <code class="cgp-cipher-text">{{ decrypted }}</code>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCryptoGuard } from '../../modules/safety'
import type { EncryptionResult } from '../../modules/safety'

const cryptoApi = useCryptoGuard()

const keyLabel = ref('')
const plaintext = ref('')
const ciphertext = ref('')
const decrypted = ref('')
const lastEncryption = ref<EncryptionResult | null>(null)

const isReady = cryptoApi.isReady
const status = cryptoApi.status
const activeKeys = cryptoApi.activeKeys
const revokedKeys = cryptoApi.revokedKeys

onMounted(async () => {
  await cryptoApi.initialize()
})

async function genAES() {
  await cryptoApi.generateAESKey(keyLabel.value.trim() || '自定义密钥')
  keyLabel.value = ''
}

async function genRSA() {
  await cryptoApi.generateRSAKeyPair(keyLabel.value.trim() || '自定义密钥对')
  keyLabel.value = ''
}

async function rotate(id: string) {
  await cryptoApi.rotateKey(id)
}

async function revoke(id: string) {
  await cryptoApi.revokeKey(id)
}

async function doEncrypt() {
  let keys = cryptoApi.getActiveKeysByAlgorithm('AES-GCM')
  if (!keys.length) {
    await cryptoApi.generateAESKey('加密测试')
    keys = cryptoApi.getActiveKeysByAlgorithm('AES-GCM')
  }
  const keyId = keys[0]?.id
  if (!keyId) return
  const result = await cryptoApi.encryptAES(plaintext.value, keyId)
  if (result) {
    ciphertext.value = result.ciphertext
    lastEncryption.value = result
  }
  decrypted.value = ''
}

async function doDecrypt() {
  if (!lastEncryption.value) return
  const result = await cryptoApi.decryptAES(lastEncryption.value)
  if (result.success) {
    decrypted.value = result.plaintext
  } else {
    decrypted.value = `解密失败：${result.error ?? '未知错误'}`
  }
}

function shortFp(fp: string) {
  return fp.length > 12 ? `${fp.slice(0, 6)}…${fp.slice(-4)}` : fp
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.cgp {
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border, rgba(var(--accent-rgb), 0.12));
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
}
.cgp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}
.cgp-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
}
.cgp-sub {
  font-size: 11px;
  color: var(--text-low);
}
.cgp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.cgp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.cgp-stat b {
  font-size: 16px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.cgp-stat span {
  font-size: 11px;
  color: var(--text-low);
}
.cgp-stat.ok b { color: #2ecc71; }
.cgp-block {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.25);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.cgp-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(var(--text-primary-rgb), 0.55);
  margin-bottom: 10px;
}
.cgp-create {
  display: flex;
  gap: 8px;
}
.cgp-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
}
.cgp-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--text-primary-rgb), 0.75);
  font-size: 12px;
  cursor: pointer;
}
.cgp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cgp-btn--primary {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.35);
}
.cgp-btn--sm {
  padding: 5px 10px;
  font-size: 11px;
}
.cgp-rsa-btn {
  border-color: rgba(52, 152, 219, 0.3);
  color: #3498db;
}
.cgp-key-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cgp-key {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.3);
}
.cgp-key--revoked { opacity: 0.55; }
.cgp-key-icon { font-size: 16px; }
.cgp-key-body { flex: 1; min-width: 0; }
.cgp-key-label {
  display: block;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.cgp-key-meta {
  display: block;
  font-size: 10px;
  color: var(--text-low);
  margin-top: 2px;
}
.cgp-key-fp {
  font-size: 10px;
  color: var(--text-low);
  font-family: monospace;
}
.cgp-rotate-btn {
  border-color: rgba(52, 152, 219, 0.3);
  color: #3498db;
}
.cgp-revoke-btn {
  border-color: rgba(231, 76, 60, 0.3);
  color: #e74c3c;
}
.cgp-test {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cgp-textarea {
  width: 100%;
  min-height: 60px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
  resize: vertical;
}
.cgp-test-actions {
  display: flex;
  gap: 8px;
}
.cgp-cipher,
.cgp-plain {
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.35);
}
.cgp-cipher-label {
  display: block;
  font-size: 10px;
  color: var(--text-low);
  margin-bottom: 4px;
}
.cgp-cipher-text {
  display: block;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.7);
  word-break: break-all;
  font-family: monospace;
}
.cgp-empty {
  font-size: 12px;
  color: var(--text-low);
}
</style>
