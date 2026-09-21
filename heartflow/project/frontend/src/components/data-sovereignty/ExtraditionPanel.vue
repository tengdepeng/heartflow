<template>
  <div class="exp">
    <!-- ====== 引渡仪式总控 ====== -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">数据引渡仪式</h5>
      <p class="setting-hint">
        把选定模块的数据打包为加密引渡包，生成传输码，可供接收端无损恢复。
        六阶段仪式：准备 → 打包 → 传输 → 验证 → 完成。本地闭环，不经任何服务器。
      </p>

      <!-- 阶段指示 -->
      <div class="exp-phases">
        <div
          v-for="p in phases"
          :key="p.phase"
          class="exp-phase"
          :class="{
            'exp-phase--active': exp.state?.phase === p.phase,
            'exp-phase--done': phaseIndex(p.phase) < phaseIndex(exp.state?.phase ?? 'idle'),
            'exp-phase--fail': exp.state?.phase === 'failed' && p.phase === 'failed',
          }"
        >
          <span class="exp-phase-icon">{{ p.icon }}</span>
          <span class="exp-phase-label">{{ p.label }}</span>
        </div>
      </div>

      <!-- 冥想语 -->
      <p v-if="exp.meditation?.value" class="exp-meditation">{{ exp.meditation.value }}</p>
      <p v-if="exp.state?.currentModule" class="exp-current">正在 {{
        exp.state.currentModule }}</p>

      <!-- 进度条 -->
      <div v-if="exp.state && exp.state.progress > 0" class="exp-progress">
        <div class="exp-progress-bar" :style="{ width: exp.state.progress + '%' }"></div>
      </div>

      <!-- 错误 -->
      <p v-if="exp.state?.error" class="exp-error">{{ exp.state.error }}</p>
    </div>

    <!-- ====== 模块选择 ====== -->
    <div class="sub-card-section">
      <div class="exp-sec-head">
        <h5 class="sub-card-section-title">选择引渡模块</h5>
        <div class="exp-actions">
          <button class="guard-btn guard-btn--sm" @click="exp.selectAll(true)">全选</button>
          <button class="guard-btn guard-btn--sm" @click="exp.selectAll(false)">清空</button>
          <button class="guard-btn guard-btn--sm" @click="exp.refreshModules()">刷新</button>
        </div>
      </div>

      <div v-if="noModules" class="exp-empty">暂无可引渡模块 · 先把数据沉淀下来</div>
      <div v-else class="exp-module-list">
        <label
          v-for="m in exp.availableModules?.value ?? []"
          :key="m.moduleKey"
          class="exp-module"
          :class="{ 'exp-module--sel': exp.selectedModules?.value.has(m.moduleKey) }"
        >
          <input
            type="checkbox"
            :checked="exp.selectedModules?.value.has(m.moduleKey)"
            @change="exp.toggleModule(m.moduleKey)"
          />
          <span class="exp-module-name">{{ m.moduleName }}</span>
          <span v-if="m.sensitive" class="exp-badge exp-badge--sensitive">敏感</span>
          <span class="exp-module-count">{{ m.itemCount }} 项</span>
          <span class="exp-module-size">{{ fmtSize(m.sizeBytes) }}</span>
        </label>
      </div>

      <p v-if="exp.totalSize?.value !== undefined && exp.selectedModules?.value.size > 0" class="exp-total">
        已选 {{ exp.selectedModules.value.size }} 个模块 · 共 {{ fmtSize(exp.totalSize.value) }}
      </p>
    </div>

    <!-- ====== 导出（源端） ====== -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">封存引渡包（源端导出）</h5>
      <label class="setting-row">
        <span>加密密钥</span>
        <div class="exp-key-row">
          <input
            class="guard-input"
            v-model="keyInput"
            placeholder="自定义密钥，留空自动生成"
          />
          <button class="guard-btn guard-btn--sm" @click="handleGenerateKey">生成</button>
        </div>
      </label>
      <button
        class="guard-btn guard-btn--primary"
        :disabled="exp.selectedModules?.value.size === 0 || isBusy"
        @click="handleExport"
      >
        {{ isBusy ? '仪式进行中…' : '开始引渡' }}
      </button>

      <!-- 传输码结果 -->
      <div v-if="exp.currentPackage?.value && exp.state?.phase === 'completed'" class="exp-result">
        <p class="exp-result-title">引渡完成 · 传输码已生成</p>
        <div class="exp-transfer-box">
          <span class="exp-transfer-label">传输码</span>
          <span class="exp-transfer-code">{{ exp.currentPackage.value.transferCode }}</span>
          <button class="guard-del" @click="copyCode" title="复制传输码">⧉</button>
        </div>
        <p class="exp-result-meta">
          包 {{ exp.currentPackage.value.manifest.packageId }} · 含 {{ exp.currentPackage.value.manifest.modules.length }} 模块 · 引渡密码 {{ exp.currentPackage.value.manifest.passcode }} · {{ expiryText }}
        </p>
      </div>
    </div>

    <!-- ====== 导入（接收端） ====== -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">接收引渡包（目标端导入）</h5>
      <p class="setting-hint">在目标端输入源端传输码 + 引渡密码 + 解密密钥，把数据完整恢复到本地。</p>
      <div class="exp-import-grid">
        <label class="cd-field">
          <span>传输码</span>
          <textarea
            class="guard-input exp-import-code"
            v-model="importCode"
            placeholder="粘贴或扫码得到的传输码"
          ></textarea>
        </label>
        <label class="cd-field">
          <span>引渡密码</span>
          <input class="guard-input" v-model="importPass" type="text" placeholder="6 位引渡密码" />
        </label>
        <label class="cd-field">
          <span>解密密钥</span>
          <input class="guard-input" v-model="importKey" type="text" placeholder="与源端相同的密钥" />
        </label>
      </div>
      <button
        class="guard-btn guard-btn--primary"
        :disabled="isImportBusy"
        @click="handleImport"
      >
        {{ isImportBusy ? '恢复中…' : '恢复引渡数据' }}
      </button>
      <p v-if="importResult" class="exp-import-result">
        {{ importResult.success
          ? `✓ 已恢复 ${importResult.importedModules.length} 个模块：${importResult.importedModules.join('、')}`
          : `✗ ${importResult.error}` }}
      </p>
    </div>

    <!-- ====== 引渡历史 ====== -->
    <div class="sub-card-section">
      <div class="exp-sec-head">
        <h5 class="sub-card-section-title">引渡历史</h5>
        <button class="guard-btn guard-btn--sm" @click="handleClearHistory">清空</button>
      </div>
      <div v-if="histItems.length === 0" class="exp-empty">尚无引渡记录</div>
      <div v-else class="exp-history-list">
        <div v-for="h in histItems" :key="h.packageId" class="exp-history-row">
          <span class="exp-history-icon">✨</span>
          <span class="exp-history-id">{{ h.packageId }}</span>
          <span class="exp-history-modules">{{ h.modules.map((m) => m.moduleName).join('、') }}</span>
          <span class="exp-history-meta">{{ fmtTime(h.createdAt) }} · {{ h.sourceDevice }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useDataExtradition,
  EXTRADITION_PHASES,
} from '../../modules/data-sovereignty/composables/useDataExtradition'

const exp = useDataExtradition()
const phases = EXTRADITION_PHASES

// ---- 本地表单态 ----
const keyInput = ref('')
const importCode = ref('')
const importPass = ref('')
const importKey = ref('')
const importResult = ref<{ success: boolean; importedModules: string[]; error?: string } | null>(null)
const importError = ref('')

const noModules = computed(() => (exp.availableModules?.value?.length ?? 0) === 0)

const isBusy = computed(() => {
  const phase = exp.state?.phase
  return phase === 'preparing' || phase === 'packaging' || phase === 'transferring' || phase === 'verifying'
})

const isImportBusy = computed(() => exp.state?.phase === 'verifying' || exp.state?.phase === 'preparing')

const histItems = computed(() => exp.extraditionHistory?.value ?? [])

const expiryText = computed(() => {
  const pkg = exp.currentPackage?.value
  if (!pkg) return ''
  const remainMs = pkg.expiresAt - Date.now()
  if (remainMs <= 0) return '已过期'
  return `剩余 ${Math.ceil(remainMs / 60000)} 分钟有效`
})

function phaseIndex(p: string): number {
  const order = ['idle', 'preparing', 'packaging', 'transferring', 'verifying', 'completed', 'failed']
  const i = order.indexOf(p)
  return i < 0 ? 0 : i
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function handleGenerateKey() {
  const key = exp.generateKey()
  keyInput.value = key
}

async function handleExport() {
  if (!keyInput.value.trim()) {
    exp.generateKey()
    keyInput.value = exp.encryptionKey.value
  } else {
    exp.encryptionKey.value = keyInput.value
  }
  const pkg = await exp.executeExtradition()
  if (!pkg) {
    importError.value = exp.state?.error ?? '引渡失败'
  }
  importError.value = ''
}

async function handleImport() {
  importResult.value = null
  if (!importCode.value.trim() || !importPass.value.trim() || !importKey.value.trim()) {
    importResult.value = { success: false, importedModules: [], error: '请填写传输码、引渡密码与解密密钥' }
    return
  }
  const res = await exp.importExtradition(importCode.value.trim(), importPass.value.trim(), importKey.value)
  importResult.value = res
}

function handleClearHistory() {
  exp.clearHistory()
  exp.reset()
  keyInput.value = ''
  importCode.value = ''
  importPass.value = ''
  importKey.value = ''
  importResult.value = null
}

async function copyCode() {
  const code = exp.currentPackage?.value?.transferCode
  if (!code) return
  try {
    await navigator.clipboard?.writeText(code)
  } catch {
    /* 剪贴板不可用时静默 */
  }
}
</script>