<template>
  <section class="vcp" data-test="vault-credential" aria-label="凭证保险箱">
    <header class="vcp-head">
      <div class="vcp-head-titles">
        <span class="vcp-title">🗝️ 凭证保险箱</span>
        <span class="vcp-sub">密码条目 · 弱密审计 · 重复口令</span>
      </div>
    </header>

    <!-- 审计概览 + 洞察 -->
    <div v-if="overview.totalCredentials" class="vcp-ov" data-test="vcp-ov">
      <div class="vcp-ov-box"><strong class="vcp-ov-num">{{ overview.totalCredentials }}</strong><span class="vcp-ov-label">条目</span></div>
      <div class="vcp-ov-box"><strong class="vcp-ov-num">{{ overview.weakCount }}</strong><span class="vcp-ov-label">弱密</span></div>
      <div class="vcp-ov-box"><strong class="vcp-ov-num">{{ overview.reusedCount }}</strong><span class="vcp-ov-label">重复</span></div>
      <div class="vcp-ov-box"><strong class="vcp-ov-num">{{ overview.emptyCount }}</strong><span class="vcp-ov-label">空密</span></div>
      <div class="vcp-rate">
        <span class="vcp-chip">弱率 {{ overview.weakRate }}%</span>
        <span class="vcp-chip">复率 {{ overview.reusedRate }}%</span>
      </div>
    </div>
    <ul v-if="insights.length" class="vcp-insights" data-test="vcp-insights">
      <li v-for="(it, i) in insights" :key="i" class="vcp-insight">💡 {{ it }}</li>
    </ul>

    <p v-if="!overview.totalCredentials && !overview.totalAssets && !overview.totalArchives" class="vcp-empty" data-test="vcp-empty">
      保险库还空着。把常用账号的登录信息收进来，解锁后即可一键复制密码。
    </p>

    <!-- 新增凭证 -->
    <div class="vcp-card" data-test="vcp-card-new">
      <div class="vcp-card-head"><span class="vcp-card-title">✏️ 新增凭证</span></div>
      <form class="vcp-add" @submit.prevent="doCreate">
        <input v-model="form.title" class="vcp-input" data-test="vcp-title" placeholder="标题（如 邮箱）" required />
        <input v-model="form.username" class="vcp-input" data-test="vcp-username" placeholder="账号" required />
        <input v-model="form.password" class="vcp-input" data-test="vcp-password" placeholder="密码" required />
        <input v-model="form.url" class="vcp-input" data-test="vcp-url" placeholder="网址（可选）" />
        <select v-model="form.category" class="vcp-select" data-test="vcp-category">
          <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
        </select>
        <input v-model="form.notes" class="vcp-input vcp-input--wide" data-test="vcp-notes" placeholder="备注（可选）" />
        <button class="vcp-btn" data-test="vcp-create" type="submit">存入</button>
      </form>
    </div>

    <!-- 凭证分组列表 -->
    <div class="vcp-card" data-test="vcp-card-list">
      <div class="vcp-card-head">
        <span class="vcp-card-title">🔐 我的凭证</span>
        <input v-model.trim="query" class="vcp-input vcp-input--grow" data-test="vcp-query" placeholder="搜索标题 / 账号 / 网址" />
      </div>

      <p v-if="!credentials.length" class="vcp-empty">还没有密码条目，先在上面添加一条。</p>

      <div v-for="group in grouped" :key="group.category.id" class="vcp-group" :data-test="`vcp-group-${group.category.id}`">
        <div class="vcp-group-title">{{ group.category.icon }} {{ group.category.name }} · {{ group.items.length }}</div>
        <ul class="vcp-cr-list">
          <li v-for="c in group.items" :key="c.id" class="vcp-cr" :data-test="`vcp-cr-${c.id}`">
            <div class="vcp-cr-main">
              <div class="vcp-cr-name">
                <strong>{{ c.title || c.username }}</strong>
                <span class="vcp-strength" :class="`vcp-strength--${strengthTone(c.password)}`" :data-test="`vcp-strength-${c.id}`">
                  {{ strengthLabel(c.password) }}
                </span>
              </div>
              <div class="vcp-cr-meta">{{ c.username }}</div>
              <div class="vcp-pwd">
                <span :data-test="`vcp-pwdtext-${c.id}`">{{ revealId === c.id ? c.password || '(空)' : maskPassword(c.password) }}</span>
                <button class="vcp-mini" :data-test="`vcp-reveal-${c.id}`" type="button" @click="toggleReveal(c.id)">{{ revealId === c.id ? '隐藏' : '显示' }}</button>
                <button class="vcp-mini" :data-test="`vcp-copy-${c.id}`" type="button" @click="copyText(c.password)">复制</button>
              </div>
              <div v-if="c.url" class="vcp-cr-meta">{{ c.url }}</div>
              <div v-if="c.notes" class="vcp-cr-note">{{ c.notes }}</div>
            </div>
            <div class="vcp-cr-ops">
              <button class="vcp-mini" :data-test="`vcp-remove-${c.id}`" type="button" @click="removeCredential(c.id)">删除</button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- 安全审计：弱密 / 重复 -->
    <div v-if="weakList.length" class="vcp-card" data-test="vcp-card-weak">
      <div class="vcp-card-head"><span class="vcp-card-title">⚠️ 弱密码</span><span class="vcp-card-count">{{ weakList.length }} 条</span></div>
      <ul class="vcp-audit-list">
        <li v-for="w in weakList" :key="w.id" class="vcp-audit" :data-test="`vcp-weak-${w.id}`">
          <span class="vcp-audit-dot vcp-audit-dot--weak"></span>
          <span class="vcp-audit-name">{{ w.title }}</span>
          <span class="vcp-score">{{ w.score }}分 · {{ w.label }}</span>
        </li>
      </ul>
    </div>

    <div v-if="reusedList.length" class="vcp-card" data-test="vcp-card-reused">
      <div class="vcp-card-head"><span class="vcp-card-title">🔁 重复密码</span><span class="vcp-card-count">{{ reusedList.length }} 条</span></div>
      <ul class="vcp-audit-list">
        <li v-for="r in reusedList" :key="r.id" class="vcp-audit" :data-test="`vcp-reused-${r.id}`">
          <span class="vcp-audit-dot vcp-audit-dot--reused"></span>
          <span class="vcp-audit-name">{{ r.title }}</span>
          <span class="vcp-score">同密 ×{{ r.count }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../engine/storage'
import { createCredential, searchCredentials, credentialsByCategory, maskPassword, DEFAULT_VAULT_CATEGORIES } from '../modules/vault/vault-entries'
import type { Credential, CredentialInput, VaultCategory } from '../modules/vault/vault-entries'
import { vaultOverview, weakPasswords, reusedPasswords, vaultInsights } from '../modules/vault/vault-analytics'
import { evaluatePasswordStrength } from '../modules/vault/password-generator'

const CREDENTIALS_KEY = 'hf:vault_credentials'
const CATEGORIES: VaultCategory[] = DEFAULT_VAULT_CATEGORIES

const credentials = ref<Credential[]>([])
const query = ref('')
const revealId = ref('')

const form = ref<CredentialInput>({
  title: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  category: 'login',
})

function load(): void {
  const list = storage.getKV<Credential[]>(CREDENTIALS_KEY, [])
  credentials.value = Array.isArray(list) ? [...list] : []
}
function persist(): void {
  storage.setKV(CREDENTIALS_KEY, credentials.value)
}
onMounted(load)

const overview = computed(() => vaultOverview(credentials.value))
const insights = computed(() => vaultInsights(credentials.value, [], []))
const weakList = computed(() => weakPasswords(credentials.value))
const reusedList = computed(() => reusedPasswords(credentials.value))
const grouped = computed(() => credentialsByCategory(searchCredentials(credentials.value, query.value), CATEGORIES))

function doCreate(): void {
  const t = form.value.title.trim()
  const u = form.value.username.trim()
  const pw = form.value.password
  if (!t || !u || !pw) return
  credentials.value = [...credentials.value, createCredential({ ...form.value })]
  persist()
  form.value.title = ''
  form.value.username = ''
  form.value.password = ''
  form.value.url = ''
  form.value.notes = ''
  form.value.category = 'login'
}

function removeCredential(id: string): void {
  credentials.value = credentials.value.filter(c => c.id !== id)
  persist()
}

function toggleReveal(id: string): void {
  revealId.value = revealId.value === id ? '' : id
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    }
  } catch {
    /* 剪贴板不可用时静默忽略 */
  }
}

function strengthLabel(password: string): string {
  if (!password) return '空密码'
  return evaluatePasswordStrength(password).label
}
function strengthTone(password: string): string {
  if (!password) return 'empty'
  const s = evaluatePasswordStrength(password).score
  if (s >= 60) return 'ok'
  return 'weak'
}
</script>

<style scoped>
.vcp {
  border-radius: 16px;
  padding: 18px 20px 20px;
  background: linear-gradient(180deg, rgba(var(--accent-rgb, 212, 165, 116), 0.05), rgba(var(--accent-rgb, 212, 165, 116), 0.02));
  border: 1px solid color-mix(in srgb, var(--accent, #d4a574) 22%, transparent);
}
.vcp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.vcp-head-titles { display: flex; flex-direction: column; }
.vcp-title { font-size: 1.05rem; font-weight: 700; color: var(--text, #2b2b35); }
.vcp-sub { font-size: 0.78rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin-top: 2px; }

.vcp-ov { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
.vcp-ov-box { display: flex; flex-direction: column; align-items: center; min-width: 56px; padding: 8px 10px; background: rgba(255,255,255,0.5); border-radius: 10px; }
.vcp-ov-num { font-size: 1.15rem; font-weight: 700; color: var(--accent, #d4a574); }
.vcp-ov-label { font-size: 0.72rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin-top: 2px; }
.vcp-rate { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
.vcp-chip, .vcp-score { font-size: 0.72rem; padding: 3px 8px; border-radius: 999px; background: rgba(var(--accent-rgb, 212, 165, 116), 0.1); color: var(--accent, #d4a574); }

.vcp-insights { list-style: none; padding: 0; margin: 0 0 12px; display: flex; flex-direction: column; gap: 6px; }
.vcp-insight { font-size: 0.8rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }

.vcp-empty { font-size: 0.82rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); padding: 8px 0; }
.vcp-card { margin-top: 12px; padding: 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12); }
.vcp-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.vcp-card-title { font-weight: 700; color: var(--text, #2b2b35); }
.vcp-card-count { font-size: 0.74rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }

.vcp-add { display: flex; gap: 8px; flex-wrap: wrap; }
.vcp-input, .vcp-select { padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.25); background: #fff; font-size: 0.82rem; color: var(--text, #2b2b35); }
.vcp-input { flex: 1; min-width: 110px; }
.vcp-input--wide { min-width: 180px; }
.vcp-input--grow { flex: 1 1 auto; max-width: 260px; }
.vcp-select { min-width: 120px; }
.vcp-btn { padding: 7px 14px; border: none; border-radius: 8px; background: var(--accent, #d4a574); color: #fff; font-size: 0.82rem; cursor: pointer; }
.vcp-mini { padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb, 212, 165, 116),0.25); background: transparent; font-size: 0.76rem; color: var(--accent, #d4a574); cursor: pointer; }

.vcp-group { margin-top: 10px; }
.vcp-group-title { font-size: 0.78rem; font-weight: 600; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin-bottom: 4px; }
.vcp-cr-list { list-style: none; padding: 0; margin: 0; }
.vcp-cr { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 6px; border-bottom: 1px dashed rgba(var(--accent-rgb, 212, 165, 116),0.15); }
.vcp-cr:last-child { border-bottom: none; }
.vcp-cr-main { min-width: 0; }
.vcp-cr-name { display: flex; align-items: center; gap: 6px; }
.vcp-cr-name strong { font-size: 0.86rem; color: var(--text, #2b2b35); }
.vcp-cr-meta, .vcp-cr-note { font-size: 0.74rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }
.vcp-strength { font-size: 0.68rem; padding: 1px 6px; border-radius: 999px; }
.vcp-strength--ok { background: #3aa06a22; color: #2f8a58; }
.vcp-strength--weak { background: #c46a5a22; color: #b55544; }
.vcp-strength--empty { background: #9a9aab22; color: #8a8a9a; }
.vcp-pwd { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text, #2b2b35); margin-top: 2px; flex-wrap: wrap; }
.vcp-cr-ops { display: flex; gap: 4px; }

.vcp-audit-list { list-style: none; padding: 0; margin: 0; }
.vcp-audit { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px dashed rgba(var(--accent-rgb, 212, 165, 116),0.15); }
.vcp-audit:last-child { border-bottom: none; }
.vcp-audit { align-items: center; }
.vcp-audit-dot { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 50%; }
.vcp-audit-dot--weak { background: #c46a5a; }
.vcp-audit-dot--reused { background: #d9a03c; }
.vcp-audit-name { font-size: 0.82rem; color: var(--text, #2b2b35); min-width: 0; flex: 1; }
</style>