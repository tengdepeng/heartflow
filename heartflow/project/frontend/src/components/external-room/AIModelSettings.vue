<script setup lang="ts">
// ============================================================
// 外链房 · AI 模型与接口设置
//
// 背景（实证）：engine/ai 有 3035 行完整实现，config.ts 提供完整 CRUD，
// 但 .vue 侧零消费 —— 用户此前根本无法配置 API Key / baseUrl / 模型。
// 本面板即补上这层：直接调用 engine/ai/config 的既有 API，不另造存储。
//
// 合规：所有非本地端点受 external-gate 出口闸约束（宪法第 1 条 fail-closed），
// 面板只做「状态可见 + 引导去宪法页开启」，不擅自放行。
// ============================================================
import { ref, computed } from 'vue'
import {
  getAIEngineConfig,
  setProviderConfig,
  removeProviderConfig,
  switchActiveProvider,
  setAIEngineEnabled,
  patchAIEngineConfig,
} from '../../engine/ai/config'
import {
  isLocalAIModelHost,
  isExternalAIConsented,
} from '../../engine/ai/external-gate'
// 注意：aiEngine 走动态 import，不静态引入 engine/ai 的 index。
// index 会拉起 provider / tauri-provider / prompt 一整条重链，把外链房的
// 静态模块图撑大，还会让只 mock 了 useRouter 的测试因缺 createRouter 而崩。
async function pingProvider(providerId: string): Promise<boolean> {
  const mod = await import('../../engine/ai')
  return mod.aiEngine.checkConnection(providerId)
}
import type { AIProviderConfig, AIProviderType } from '../../engine/ai/types'

interface ProviderRow {
  id: string
  cfg: AIProviderConfig
}

const cfg = ref(getAIEngineConfig())

/** 记忆配置兜底：存储被外部改脏时不应让整块面板白屏 */
const memory = computed(() => cfg.value.memory ?? { maxRounds: 10, enableSummarization: false })

const showForm = ref(false)
const editingId = ref<string | null>(null)
const testingId = ref<string | null>(null)
const testResult = ref<{ id: string; ok: boolean; text: string } | null>(null)
const notice = ref<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null)

const providers = computed<ProviderRow[]>(() =>
  Object.entries(cfg.value.providers).map(([id, p]) => ({ id, cfg: p })),
)

const externalConsented = computed(() => isExternalAIConsented())

/** 该提供商的端点是否会被出口闸拦截（非本地且未同意） */
function isBlocked(row: ProviderRow): boolean {
  return !isLocalAIModelHost(row.cfg.baseUrl) && !externalConsented.value
}

const TYPE_LABELS: Record<AIProviderType, string> = {
  openai: 'OpenAI 兼容',
  local: '本地推理',
  custom: '自定义',
}

function blankCfg(): AIProviderConfig {
  return {
    type: 'local',
    name: '',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    model: {
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      contextWindow: 8192,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    timeout: 30000,
    maxRetries: 2,
    retryDelay: 1000,
  }
}

const formId = ref('')
const form = ref<AIProviderConfig>(blankCfg())

let noticeTimer: ReturnType<typeof setTimeout> | undefined
function flash(kind: 'ok' | 'warn' | 'err', text: string): void {
  notice.value = { kind, text }
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 4200)
}

function reload(): void {
  cfg.value = getAIEngineConfig()
}

function openAdd(): void {
  editingId.value = null
  formId.value = ''
  form.value = blankCfg()
  showForm.value = true
}

function openEdit(row: ProviderRow): void {
  editingId.value = row.id
  formId.value = row.id
  form.value = {
    ...row.cfg,
    model: { ...row.cfg.model },
    fallbackModels: row.cfg.fallbackModels ? [...row.cfg.fallbackModels] : undefined,
  }
  showForm.value = true
}

function save(): void {
  const id = formId.value.trim()
  if (!id) {
    flash('warn', '请填写标识（英文/数字/短横线）')
    return
  }
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    flash('warn', '标识只能包含英文、数字、下划线与短横线')
    return
  }
  if (!form.value.baseUrl.trim()) {
    flash('warn', '请填写 API 基础地址')
    return
  }
  if (form.value.type !== 'local' && !form.value.apiKey.trim()) {
    flash('warn', '非本地推理类型需要填写 API Key')
    return
  }
  if (!form.value.model.model.trim()) {
    flash('warn', '请填写模型名称')
    return
  }
  setProviderConfig(id, {
    ...form.value,
    name: form.value.name?.trim() || undefined,
    baseUrl: form.value.baseUrl.trim(),
    apiKey: form.value.apiKey.trim(),
    model: { ...form.value.model, model: form.value.model.model.trim() },
  })
  // 首个提供商自动激活，避免配完还要手动切
  if (providers.value.length === 0) switchActiveProvider(id)
  reload()
  showForm.value = false
  editingId.value = null
  flash('ok', `已保存「${id}」`)
}

function del(row: ProviderRow): void {
  removeProviderConfig(row.id)
  reload()
  flash('ok', `已删除「${row.id}」`)
}

function activate(row: ProviderRow): void {
  if (switchActiveProvider(row.id)) {
    reload()
    flash('ok', `已切换到「${row.id}」`)
  }
}

async function test(row: ProviderRow): Promise<void> {
  testingId.value = row.id
  testResult.value = null
  try {
    const ok = await pingProvider(row.id)
    testResult.value = {
      id: row.id,
      ok,
      text: ok ? '连接成功' : '连接失败：请检查地址、密钥与模型名',
    }
  } catch (e) {
    testResult.value = {
      id: row.id,
      ok: false,
      text: `连接异常：${e instanceof Error ? e.message : String(e)}`,
    }
  } finally {
    testingId.value = null
  }
}

function toggleEngine(e: Event): void {
  setAIEngineEnabled((e.target as HTMLInputElement).checked)
  reload()
}

function patchMemory(patch: { maxRounds?: number; enableSummarization?: boolean }): void {
  patchAIEngineConfig({ memory: { ...memory.value, ...patch } })
  reload()
}
</script>

<template>
  <div class="ai-settings">
    <!-- 引擎总开关 -->
    <div class="ai-block">
      <label class="ai-master">
        <input type="checkbox" :checked="cfg.enabled" @change="toggleEngine" />
        <span class="ai-master-text">
          启用 AI 引擎
          <em>关闭时所有 AI 能力（幕僚 / 字镜 / 年度对话）都不外呼</em>
        </span>
      </label>
    </div>

    <!-- 提供商列表 -->
    <div class="ai-block">
      <div class="ai-block-head">
        <span class="ai-title">提供商</span>
        <button class="ai-btn ai-btn--primary" @click="openAdd">+ 新增</button>
      </div>

      <div v-if="providers.length === 0" class="ai-empty">
        还没有配置任何提供商。点「新增」，本地 Ollama 填
        <code>http://localhost:11434/v1</code> 即可起步。
      </div>

      <div v-for="row in providers" :key="row.id" class="ai-card" :class="{ 'is-active': cfg.activeProviderId === row.id }">
        <div class="ai-card-head">
          <span class="ai-card-name">{{ row.id }}</span>
          <span class="ai-tag">{{ TYPE_LABELS[row.cfg.type] }}</span>
          <span v-if="cfg.activeProviderId === row.id" class="ai-tag ai-tag--on">当前</span>
          <span v-if="isBlocked(row)" class="ai-tag ai-tag--warn">会被出口闸拦截</span>
        </div>
        <div class="ai-card-meta">
          <span class="ai-mono">{{ row.cfg.baseUrl }}</span>
          <span class="ai-dot">·</span>
          <span class="ai-mono">{{ row.cfg.model.model || '（未填模型）' }}</span>
        </div>

        <div v-if="isBlocked(row)" class="ai-gated">
          非本地端点：需在宪法页开启「允许远程 AI 端点」后才会真正发出请求（宪法第 1 条 · 默认拦截）。
        </div>

        <div class="ai-card-actions">
          <button class="ai-btn" :disabled="testingId === row.id" @click="test(row)">
            {{ testingId === row.id ? '测试中' : '测试连接' }}
          </button>
          <button
            v-if="cfg.activeProviderId !== row.id"
            class="ai-btn"
            @click="activate(row)"
          >
            设为当前
          </button>
          <button class="ai-btn ai-btn--ghost" @click="openEdit(row)">编辑</button>
          <button class="ai-btn ai-btn--ghost ai-btn--danger" @click="del(row)">删除</button>
        </div>

        <p
          v-if="testResult && testResult.id === row.id"
          class="ai-test"
          :class="testResult.ok ? 'ai-test--ok' : 'ai-test--err'"
        >
          {{ testResult.text }}
        </p>
      </div>
    </div>

    <!-- 对话记忆 -->
    <div class="ai-block">
      <span class="ai-title">对话记忆</span>
      <label class="ai-row">
        <span class="ai-label">保留最近轮数</span>
        <input
          type="number"
          min="1"
          max="100"
          class="ai-input ai-input--num"
          :value="memory.maxRounds"
          @change="patchMemory({ maxRounds: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>
      <label class="ai-check">
        <input
          type="checkbox"
          :checked="memory.enableSummarization"
          @change="patchMemory({ enableSummarization: ($event.target as HTMLInputElement).checked })"
        />
        <span>超出轮数后启用摘要压缩（省 token，但会丢细节）</span>
      </label>
    </div>

    <!-- 新增 / 编辑表单 -->
    <div v-if="showForm" class="ai-modal-mask" @click.self="showForm = false">
      <div class="ai-modal" role="dialog" aria-modal="true">
        <div class="ai-modal-head">
          <span>{{ editingId ? '编辑提供商' : '新增提供商' }}</span>
          <button class="ai-x" @click="showForm = false">✕</button>
        </div>

        <div class="ai-form">
          <label class="ai-row">
            <span class="ai-label">标识 *</span>
            <input
              v-model="formId"
              class="ai-input"
              placeholder="如 ollama-local"
              :disabled="!!editingId"
            />
          </label>

          <label class="ai-row">
            <span class="ai-label">类型</span>
            <select v-model="form.type" class="ai-input">
              <option value="local">本地推理（Ollama / LM Studio 等）</option>
              <option value="openai">OpenAI 兼容</option>
              <option value="custom">自定义</option>
            </select>
          </label>

          <label class="ai-row">
            <span class="ai-label">API 基础地址 *</span>
            <input v-model="form.baseUrl" class="ai-input" placeholder="http://localhost:11434/v1" />
          </label>

          <label class="ai-row">
            <span class="ai-label">API 密钥{{ form.type === 'local' ? '（本地可留空）' : ' *' }}</span>
            <input v-model="form.apiKey" type="password" class="ai-input" autocomplete="off" />
          </label>

          <label class="ai-row">
            <span class="ai-label">模型名称 *</span>
            <input v-model="form.model.model" class="ai-input" placeholder="如 qwen2.5:7b / deepseek-chat" />
          </label>

          <div class="ai-row ai-row--split">
            <label class="ai-sub">
              <span class="ai-label">温度</span>
              <input
                v-model.number="form.model.temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                class="ai-input ai-input--num"
              />
            </label>
            <label class="ai-sub">
              <span class="ai-label">最大输出</span>
              <input
                v-model.number="form.model.maxTokens"
                type="number"
                step="256"
                min="256"
                class="ai-input ai-input--num"
              />
            </label>
          </div>

          <label class="ai-row">
            <span class="ai-label">超时（毫秒）</span>
            <input v-model.number="form.timeout" type="number" step="1000" min="1000" class="ai-input ai-input--num" />
          </label>
        </div>

        <div class="ai-modal-foot">
          <button class="ai-btn ai-btn--ghost" @click="showForm = false">取消</button>
          <button class="ai-btn ai-btn--primary" @click="save">保存</button>
        </div>
      </div>
    </div>

    <Transition name="ai-fade">
      <span v-if="notice" class="ai-notice" :class="`ai-notice--${notice.kind}`">{{ notice.text }}</span>
    </Transition>
  </div>
</template>

<style scoped>
.ai-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text-primary, #e9e0d0);
}

.ai-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ai-title {
  font-size: 12px;
  letter-spacing: 1px;
  opacity: 0.5;
}

.ai-master {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.ai-master-text {
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ai-master-text em {
  font-style: normal;
  font-size: 11px;
  opacity: 0.5;
}

.ai-empty {
  font-size: 13px;
  opacity: 0.55;
  line-height: 1.7;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}
.ai-empty code {
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 12px;
}

.ai-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: border-color 0.2s ease;
}
.ai-card:hover {
  border-color: rgba(212, 165, 116, 0.28);
}
.ai-card.is-active {
  border-color: rgba(212, 165, 116, 0.5);
  background: rgba(212, 165, 116, 0.06);
}

.ai-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ai-card-name {
  font-size: 14px;
  font-weight: 500;
}
.ai-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  opacity: 0.7;
}
.ai-tag--on {
  background: rgba(212, 165, 116, 0.2);
  color: var(--accent, #d4a574);
  opacity: 1;
}
.ai-tag--warn {
  background: rgba(224, 122, 106, 0.16);
  color: #e08a7a;
  opacity: 1;
}

.ai-card-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  opacity: 0.6;
  flex-wrap: wrap;
}
.ai-mono {
  font-family: var(--font-mono, ui-monospace, monospace);
  word-break: break-all;
}
.ai-dot {
  opacity: 0.4;
}

.ai-gated {
  font-size: 11px;
  line-height: 1.6;
  padding: 8px 10px;
  border-radius: 9px;
  color: #e0a06a;
  background: rgba(224, 160, 106, 0.1);
}

.ai-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ai-test {
  margin: 0;
  font-size: 12px;
}
.ai-test--ok {
  color: #7fd0bb;
}
.ai-test--err {
  color: #e08a7a;
}

.ai-btn {
  padding: 7px 15px;
  border-radius: 9px;
  font-size: 13px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary, #e9e0d0);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.2s ease, background 0.2s ease;
}
.ai-btn:hover:not(:disabled) {
  border-color: rgba(212, 165, 116, 0.35);
}
.ai-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.ai-btn--primary {
  background: rgba(212, 165, 116, 0.18);
  color: var(--accent, #d4a574);
  border-color: rgba(212, 165, 116, 0.35);
}
.ai-btn--ghost {
  background: transparent;
}
.ai-btn--danger {
  color: #e08a7a;
}

.ai-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ai-row--split {
  flex-direction: row;
  gap: 12px;
}
.ai-sub {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ai-label {
  font-size: 12px;
  opacity: 0.6;
}
.ai-input {
  padding: 8px 11px;
  border-radius: 9px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e9e0d0);
}
.ai-input:disabled {
  opacity: 0.5;
}
.ai-input--num {
  max-width: 160px;
}
.ai-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  opacity: 0.85;
}

.ai-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background: rgba(8, 6, 5, 0.6);
}
.ai-modal {
  width: min(460px, 92vw);
  max-height: 86vh;
  overflow-y: auto;
  border-radius: 18px;
  padding: 18px 20px 20px;
  background: #1e1913;
  border: 1px solid rgba(212, 165, 116, 0.25);
}
.ai-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 14px;
}
.ai-x {
  background: none;
  border: none;
  color: var(--text-primary, #e9e0d0);
  opacity: 0.5;
  cursor: pointer;
  font-size: 16px;
}
.ai-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.ai-notice {
  position: fixed;
  left: 50%;
  bottom: 64px;
  transform: translateX(-50%);
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 13px;
  z-index: 210;
  background: #211b15;
  border: 1px solid rgba(212, 165, 116, 0.35);
}
.ai-notice--ok {
  color: #7fd0bb;
}
.ai-notice--warn {
  color: #e0a06a;
}
.ai-notice--err {
  color: #e08a7a;
}

.ai-fade-enter-active,
.ai-fade-leave-active {
  transition: opacity 0.2s ease;
}
.ai-fade-enter-from,
.ai-fade-leave-to {
  opacity: 0;
}
</style>
