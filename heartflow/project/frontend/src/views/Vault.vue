<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance vt">
    <!-- 锁定 / 初始化 -->
    <div v-if="!unlocked" class="vt-lock">
      <div class="vt-lock-card">
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-diamond">✦</span>
          <span class="orn-line"></span>
        </div>
        <h1 class="vt-title">{{ phase === 'locked' ? '保险库已锁定' : '创建保险库口令' }}</h1>
        <p class="vt-lock-kicker">{{ phase === 'locked' ? '输入口令以解密你的资产与档案' : '设置口令后，资产与档案将以 AES-GCM 本地加密存储' }}</p>

        <template v-if="phase === 'setup'">
          <input v-model="passInput" type="password" placeholder="口令（至少 4 位）" class="vt-input vt-lock-input" />
          <input v-model="passConfirm" type="password" placeholder="确认口令" class="vt-input vt-lock-input" />
          <p v-if="hasLegacy" class="vt-lock-hint">检测到已有明文数据，设置口令后将自动加密迁移。</p>
          <p v-if="setupError" class="vt-lock-error">{{ setupError }}</p>
          <button class="vt-btn vt-lock-btn" type="button" :disabled="busy" @click="setupVault">启用加密保险库</button>
        </template>

        <template v-else>
          <input v-model="unlockInput" type="password" placeholder="保险库口令" class="vt-input vt-lock-input" @keyup.enter="unlockVault" />
          <p v-if="unlockError" class="vt-lock-error">{{ unlockError }}</p>
          <button class="vt-btn vt-lock-btn" type="button" :disabled="busy" @click="unlockVault">解锁</button>
        </template>
      </div>
    </div>

    <!-- 已解锁：原有内容 -->
    <RoomLayout
      v-else
      title="保险库"
      kicker="保管你的财富与珍贵档案"
      align="center"
      data-enter
    >
      <template #meta>
        <div class="vt-lock-row"><button class="vt-btn vt-lock-btn--ghost" type="button" @click="lockVault">🔒 锁定保险库</button></div>
        <div class="vt-overview">
          <div class="vt-ov-card">
            <span class="vt-ov-value">{{ totalValue }}</span>
            <span class="vt-ov-label">总价值</span>
          </div>
          <div class="vt-ov-card">
            <span class="vt-ov-value">{{ categoriesCount }}</span>
            <span class="vt-ov-label">分类</span>
          </div>
          <div class="vt-ov-card">
            <span class="vt-ov-value">{{ archives.length }}</span>
            <span class="vt-ov-label">档案</span>
          </div>
        </div>
      </template>

    <!-- 自动锁定（vault auto-lock 模块） -->
    <VaultAutoLockPanel :settings="autoLockSettings" @update="handleAutoLockUpdate" />

    <!-- 备份恢复与安全报告（safety·useBackupRecovery / useSecurityReports） -->
    <BackupRecoveryPanel :passphrase="activePass" />

    <!-- 安全审计（INCR-12）资产集中度/完整度/陈旧/洞察 -->
    <VaultAuditPanel :assets="assets" :archives="archives" />

    <!-- 资产分布 -->
    <section data-enter class="vt-section">
      <h3 class="vt-section-title">📊 资产分布</h3>
      <div class="vt-dist-chart" v-if="categoryDist.length">
        <div v-for="d in categoryDist" :key="d.cat" class="vt-dist-row">
          <span class="vt-dist-label">{{ catIcon(d.cat) }} {{ d.cat }}</span>
          <div class="vt-dist-track">
            <div class="vt-dist-fill" :style="{ width: d.pct + '%', background: catColor(d.cat) }" />
          </div>
          <span class="vt-dist-value">{{ d.total }}</span>
        </div>
      </div>
      <EmptyState v-else icon="💰" title="还没有资产记录" :glow="false" cta-label="" />
    </section>

    <!-- 添加资产 -->
    <section data-enter class="vt-section">
      <h3 class="vt-section-title">✏️ 记录资产</h3>
      <div class="vt-add-row">
        <input v-model="form.name" placeholder="资产名称" class="vt-input" />
        <input v-model="form.value" type="number" min="0" placeholder="价值" class="vt-input" style="width:70px" />
        <select v-model="form.category" class="vt-select">
          <option value="financial">💰 金融</option><option value="realestate">🏠 房产</option>
          <option value="digital">💻 数字</option><option value="physical">📦 实物</option>
          <option value="intangible">✨ 无形</option><option value="other">📋 其他</option>
        </select>
        <button @click="addAsset" class="vt-btn" :disabled="!form.name">+</button>
      </div>
      <input v-model="form.note" placeholder="备注（可选）" class="vt-input" style="margin-top:8px;width:100%" />
    </section>

    <!-- 月度趋势 -->
    <section data-enter class="vt-section">
      <h3 class="vt-section-title">📈 月度趋势</h3>
      <div class="vt-trend-chart" v-if="monthlyTrend.length">
        <div class="vt-trend-bar-area">
          <div v-for="m in monthlyTrend" :key="m.label" class="vt-trend-bar-wrap">
            <div class="vt-trend-bar" :style="{ height: m.pct + '%' }" :title="`${m.label} ${m.total}`" />
          </div>
        </div>
        <div class="vt-trend-labels">
          <span v-for="m in monthlyTrend.slice(-6)" :key="m.label" class="vt-trend-label">{{ m.label.slice(5) }}</span>
        </div>
      </div>
      <EmptyState v-else icon="📈" title="资产记录满一个月后开始显示趋势" :glow="false" cta-label="" />
    </section>

    <!-- 重要档案 -->
    <section data-enter class="vt-section">
      <h3 class="vt-section-title">🔐 重要档案</h3>
      <div class="vt-archive-list">
        <div v-for="a in archives" :key="a.id" class="vt-archive-card">
          <div class="vt-archive-header">
            <span class="vt-archive-icon">📄</span>
            <strong>{{ a.name }}</strong>
            <button class="vt-del" @click="removeArchive(a.id)">×</button>
          </div>
          <p v-if="a.detail">{{ a.detail }}</p>
          <span class="vt-archive-date">{{ a.at }}</span>
        </div>
        <div class="vt-add-row" style="margin-top:8px">
          <input v-model="archiveForm.name" placeholder="档案名称" class="vt-input" />
          <button @click="addArchive" class="vt-btn" :disabled="!archiveForm.name">+</button>
        </div>
        <input v-model="archiveForm.detail" placeholder="备注（存放位置、密码提示等）" class="vt-input" style="margin-top:6px;width:100%" />
      </div>
    </section>

    <!-- 资产清单 -->
    <section data-enter class="vt-section">
      <h3 class="vt-section-title">📜 资产清单</h3>
      <div class="vt-asset-list">
        <div v-for="a in sortedAssets" :key="a.id" class="vt-asset-card" :class="{ expanded: a._expanded }" :style="{ borderLeftColor: catColor(a.category) }" @click="a._expanded = !a._expanded">
          <div class="vt-asset-card-header">
            <span class="vt-asset-icon">{{ catIcon(a.category) }}</span>
            <div class="vt-asset-info">
              <span class="vt-asset-name">{{ a.name }}</span>
              <span class="vt-asset-cat">{{ a.category }}</span>
            </div>
            <span class="vt-asset-value">{{ a.value }}</span>
            <button class="vt-del" @click.stop="removeAsset(a.id)">×</button>
          </div>
          <div v-if="a._expanded && a.note" class="vt-asset-detail"><p>{{ a.note }}</p><span class="vt-asset-date">{{ fmt(a.at) }}</span></div>
        </div>
      </div>
    </section>

    <!-- 密码生成器（INCR-364）本地强密码 / 口令短语 -->
    <VaultPasswordPanel />

    <!-- 凭证保险箱（INCR-371 补挂载孤儿引擎 vault-entries/vault-analytics：密码条目/弱密审计/重复口令） -->
    <VaultCredentialPanel />
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, onUnmounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import {
  encryptWithPassphrase,
  decryptWithPassphrase,
  VaultDecryptError,
} from '../modules/safety/vault-cipher'
import { useVault, type Asset, type Archive, type VaultData } from '../modules/vault'
import { useVaultAutoLock, type AutoLockSettings } from '../modules/vault/auto-lock'
import VaultAutoLockPanel from '../components/VaultAutoLockPanel.vue'
import BackupRecoveryPanel from '../components/BackupRecoveryPanel.vue'
import VaultAuditPanel from '../components/VaultAuditPanel.vue'
import VaultPasswordPanel from '../components/VaultPasswordPanel.vue'
import VaultCredentialPanel from '../components/VaultCredentialPanel.vue'
import EmptyState from '../components/EmptyState.vue'
import RoomLayout from '../components/RoomLayout.vue'

const { entranceRef, entranceClass } = useViewEntrance()

const vault = useVault()

const assets = ref<Asset[]>([])
const archives = ref<Archive[]>([])
const form = reactive({ name: '', value: 0, category: 'financial', note: '' })
const archiveForm = reactive({ name: '', detail: '' })

// ---- 口令锁状态 ----
type Phase = 'setup' | 'locked' | 'unlocked'
const phase = ref<Phase>('setup')
const hasLegacy = ref(false)
const activePass = ref('')       // 仅驻留内存，解锁后存在
const passInput = ref('')
const passConfirm = ref('')
const unlockInput = ref('')
const setupError = ref('')
const unlockError = ref('')
const busy = ref(false)
const unlocked = computed(() => phase.value === 'unlocked')

const catIcons: Record<string, string> = { financial: '💰', realestate: '🏠', digital: '💻', physical: '📦', intangible: '✨', other: '📋' }
function catIcon(c: string) { return catIcons[c] || '📋' }
function catColor(c: string) {
  const map: Record<string, string> = { financial: '#8a9a7a', realestate: '#e0a96d', digital: '#6b9fc4', physical: '#d98c7a', intangible: '#a07c8c', other: '#6b7280' }
  return map[c] || '#6b7280'
}

const totalValue = computed(() => assets.value.reduce((s, a) => s + a.value, 0))
const categoriesCount = computed(() => new Set(assets.value.map(a => a.category)).size)

const sortedAssets = computed(() => [...assets.value].sort((a, b) => b.value - a.value))

const categoryDist = computed(() => {
  const map = new Map<string, { count: number; total: number }>()
  assets.value.forEach(a => {
    const cur = map.get(a.category) || { count: 0, total: 0 }
    cur.count++; cur.total += a.value
    map.set(a.category, cur)
  })
  const max = Math.max(...[...map.values()].map(v => v.total), 1)
  return [...map.entries()]
    .map(([cat, { count, total }]) => ({ cat, count, total, pct: (total / (max || 1)) * 100 }))
    .sort((a, b) => b.total - a.total)
})

const monthlyTrend = computed(() => {
  const map = new Map<string, number>()
  assets.value.forEach(a => {
    const month = a.at.slice(0, 7)
    map.set(month, (map.get(month) || 0) + a.value)
  })
  const max = Math.max(...map.values(), 1)
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([label, total]) => ({ label, total, pct: (total / (max || 1)) * 100 }))
})

// ---- 加密持久化（密文落盘） ----
async function persist() {
  if (!unlocked.value) return
  const blob: VaultData = {
    assets: assets.value.map(({ _expanded, ...rest }) => rest) as VaultData['assets'],
    archives: archives.value,
  }
  const cipherPayload = await encryptWithPassphrase(JSON.stringify(blob), activePass.value)
  vault.save(cipherPayload)
}

function applyData(d: VaultData | null) {
  assets.value = (d?.assets ?? []).map((a) => ({ ...a, _expanded: false }))
  archives.value = d?.archives ?? []
}

function addAsset() {
  if (!form.name.trim()) return
  assets.value.unshift({
    id: `as${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    name: form.name.trim(), value: form.value || 0, category: form.category,
    note: form.note, at: new Date().toISOString(), _expanded: false,
  })
  form.name = ''; form.value = 0; form.category = 'financial'; form.note = ''
  void persist()
}

function removeAsset(id: string) { assets.value = assets.value.filter(a => a.id !== id); void persist() }

function addArchive() {
  if (!archiveForm.name.trim()) return
  archives.value.unshift({ id: `ar${Date.now()}`, name: archiveForm.name.trim(), detail: archiveForm.detail.trim(), at: new Date().toISOString() })
  archiveForm.name = ''; archiveForm.detail = ''
  void persist()
}

function removeArchive(id: string) { archives.value = archives.value.filter(a => a.id !== id); void persist() }

async function setupVault() {
  setupError.value = ''
  const p = passInput.value
  if (p.length < 4) { setupError.value = '口令至少 4 位'; return }
  if (p !== passConfirm.value) { setupError.value = '两次输入不一致'; return }
  busy.value = true
  try {
    if (hasLegacy.value) {
      const legacy = vault.readLegacy()
      if (legacy) applyData(legacy)
    }
    activePass.value = p
    phase.value = 'unlocked'
    passInput.value = ''; passConfirm.value = ''
    await persist()
  } finally {
    busy.value = false
  }
}

async function unlockVault() {
  unlockError.value = ''
  busy.value = true
  try {
    vault.load()
    const payload = vault.payload.value
    if (!payload) { unlockError.value = '保险库尚未初始化'; return }
    const json = await decryptWithPassphrase(payload, unlockInput.value)
    activePass.value = unlockInput.value
    applyData(JSON.parse(json))
    phase.value = 'unlocked'
    unlockInput.value = ''
  } catch (e) {
    unlockError.value = e instanceof VaultDecryptError ? '口令错误' : '解密失败'
  } finally {
    busy.value = false
  }
}

function lockVault() {
  assets.value = []
  archives.value = []
  activePass.value = ''
  unlockInput.value = ''
  phase.value = 'locked'
}

// ---- 自动锁定（空闲计时 + 切页保护） ----
const autoLock = useVaultAutoLock(lockVault)
const autoLockSettings = computed(() => autoLock.settings.value)
watch(unlocked, (u) => {
  if (u) autoLock.arm()
  else autoLock.disarm()
})
onUnmounted(() => autoLock.disarm())
function handleAutoLockUpdate(patch: Partial<AutoLockSettings>) {
  autoLock.updateSettings(patch)
}

function fmt(iso: string) { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}` }

onMounted(() => {
  vault.load()
  if (vault.payload.value) {
    phase.value = 'locked'
  } else {
    hasLegacy.value = !!vault.readLegacy()
    phase.value = 'setup'
  }
})
</script>

<style scoped>
/* ============================================================
   容器 & 氛围
   ============================================================ */
.vt {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100%;
  position: relative;
  background: transparent;
  color: var(--text-high);
}

/* 解锁态包 RoomLayout：根 32px + section 20px 已是水平内边距，body 让位防三重叠加；
   头部 36px 间距平移到 body 顶部，保持与 bespoke 头部一致的视觉落差 */
.vt :deep(.room-layout__body) {
  padding: 0;
  gap: 0;
  margin-top: 36px;
}

/* 环境光晕 */
.vt::before {
  content: '';
  position: fixed;
  top: 0;
  left: var(--sidebar-w, 220px);
  width: 30vw;
  height: 100dvh;
  background: radial-gradient(ellipse at left center, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.vt::after {
  content: '';
  position: fixed;
  top: 0;
  right: 0;
  width: 30vw;
  height: 100dvh;
  background: radial-gradient(ellipse at right center, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ============================================================
   头部
   ============================================================ */
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.orn-line {
  display: inline-block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent);
}

.orn-diamond {
  font-size: 12px;
  color: var(--accent);
  opacity: 0.7;
}

.vt-title {
  font-family: var(--font-heading-zh);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--text-high);
  margin-bottom: 24px;
}

/* 概览卡片 */
.vt-overview {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.vt-ov-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.vt-ov-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.vt-ov-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* ============================================================
   Sections
   ============================================================ */
.vt-section {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
  padding: 20px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.vt-section-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-high);
}

/* ============================================================
   分布图
   ============================================================ */
.vt-dist-chart {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vt-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.vt-dist-label {
  width: 90px;
  color: var(--text-bright);
}

.vt-dist-track {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.vt-dist-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s;
}

.vt-dist-value {
  width: 60px;
  text-align: right;
  color: var(--text-medium);
  font-variant-numeric: tabular-nums;
}

/* ============================================================
   趋势图
   ============================================================ */
.vt-trend-chart {
  padding: 14px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.vt-trend-bar-area {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 80px;
}

.vt-trend-bar-wrap {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.vt-trend-bar {
  width: 100%;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.4s;
  background: var(--accent);
}

.vt-trend-labels {
  display: flex;
  margin-top: 6px;
  gap: 4px;
}

.vt-trend-label {
  flex: 1;
  text-align: center;
  font-size: 10px;
  color: var(--text-dim);
}

/* ============================================================
   输入 & 按钮
   ============================================================ */
.vt-add-row {
  display: flex;
  gap: 6px;
}

.vt-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.vt-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.vt-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.vt-select {
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.vt-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.vt-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.vt-btn:hover {
  background: rgba(var(--accent-rgb), 0.14);
}

.vt-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.vt-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vt-asset-card:hover .vt-del,
.vt-archive-card:hover .vt-del {
  opacity: 0.5;
}

.vt-del:hover {
  color: #e06b6b;
  opacity: 1 !important;
}

/* ============================================================
   档案列表
   ============================================================ */
.vt-archive-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vt-archive-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: all 0.2s;
}

.vt-archive-card:hover {
  background: rgba(55, 48, 40, 0.45);
}

.vt-archive-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vt-archive-header strong {
  font-size: 13px;
  flex: 1;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.vt-archive-card p {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
  margin: 4px 0 0;
}

.vt-archive-date {
  font-size: 10px;
  color: var(--text-secondary);
}

.vt-archive-icon {
  font-size: 16px;
}

/* ============================================================
   资产清单
   ============================================================ */
.vt-asset-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vt-asset-card {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  border-left: 3px solid;
  cursor: pointer;
  transition: all 0.2s;
}

.vt-asset-card:hover {
  background: rgba(55, 48, 40, 0.45);
}

.vt-asset-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vt-asset-icon {
  font-size: 16px;
}

.vt-asset-info {
  flex: 1;
}

.vt-asset-name {
  font-size: 13px;
  display: block;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.vt-asset-cat {
  font-size: 10px;
  color: var(--text-low);
}

.vt-asset-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.vt-asset-detail {
  margin-top: 4px;
  padding-left: 24px;
}

.vt-asset-detail p {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(var(--text-primary-rgb), 0.45);
  margin: 0;
}

.vt-asset-date {
  font-size: 10px;
  color: var(--text-secondary);
}

/* ============================================================
   空状态
   ============================================================ */

/* ============================================================
   锁定 / 初始化
   ============================================================ */
.vt-lock {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.vt-lock-card {
  width: 100%;
  max-width: 380px;
  padding: 36px 28px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  text-align: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.vt-lock .vt-title {
  font-size: 22px;
  margin-bottom: 10px;
}

.vt-lock-kicker {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 22px;
  line-height: 1.6;
}

.vt-lock-input {
  width: 100%;
  margin-bottom: 10px;
  text-align: center;
  letter-spacing: 1px;
}

.vt-lock-hint {
  font-size: 11px;
  color: var(--accent);
  opacity: 0.85;
  margin: 4px 0 12px;
}

.vt-lock-error {
  font-size: 12px;
  color: #e06b6b;
  margin: 6px 0 12px;
}

.vt-lock-btn {
  width: 100%;
  padding: 11px;
  margin-top: 6px;
  font-size: 14px;
}

.vt-lock-row {
  margin-top: 18px;
  text-align: center;
}

.vt-lock-btn--ghost {
  width: auto;
  padding: 6px 14px;
  font-size: 12px;
  opacity: 0.8;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .vt { padding: 32px 20px 64px; }
  .vt-overview { gap: 12px; }
  .vt-ov-card { min-width: 0; }
  .vt-dist-label { width: 70px; }
  .vt-dist-value { width: 50px; }
}

@media (max-width: 640px) {
  .vt { padding: 24px 14px 56px; }
  .vt-overview { flex-direction: column; gap: 8px; }
  .vt-add-row { flex-direction: column; }
  .vt-add-row .vt-input { width: 100%; }
  .vt-add-row .vt-select { width: 100%; }
  .vt-add-row .vt-btn { width: 100%; }
  .vt-trend-bar-area { height: 90px; }
  .vt-dist-label { width: 60px; font-size: 11px; }
  .vt-dist-value { width: 40px; font-size: 11px; }
}
</style>