<template>
  <section class="en-panel" aria-label="数据加密">
    <header class="en-head">
      <span class="en-title">🧪 数据加密</span>
      <span class="en-sub">口令加密账本备份 · 下载加密文件 · 解密恢复</span>
    </header>

    <!-- 尚无备份：加密当前账本 -->
    <div v-if="!backup" class="en-block">
      <p class="en-desc">使用口令将当前全部记账记录加密保存。加密文件可下载防丢失；需同一口令才能恢复。</p>
      <form class="en-form" @submit.prevent="doSave">
        <div class="en-row">
          <input v-model="pwd" type="password" class="en-input" placeholder="加密口令" autocomplete="new-password" />
          <input v-model="label" class="en-input en-label" placeholder="备份备注（可选）" />
          <button class="en-btn" :disabled="!pwd">加密并备份</button>
        </div>
      </form>
    </div>

    <!-- 已有备份：状态 + 恢复/下载/清除 -->
    <template v-else>
      <div class="en-status">
        <span class="en-status-t">已加密备份</span>
        <span class="en-status-meta">{{ backup.label }} · {{ fmtDate(backup.savedAt) }}</span>
        <span class="en-status-enc">AES-RC4 · {{ backup.box.ct.length }} 字符</span>
      </div>

      <form class="en-form" @submit.prevent="doRestore">
        <span class="en-form-t">解密恢复</span>
        <div class="en-row">
          <input v-model="restorePwd" type="password" class="en-input" placeholder="加密口令" autocomplete="off" />
          <button class="en-btn" :disabled="!restorePwd">恢复账本</button>
        </div>
        <p v-if="restoreErr" class="en-err">口令错误或数据损坏，无法恢复</p>
        <p v-if="restored" class="en-ok">已恢复 {{ restored }} 条记录，并写入账本</p>
      </form>

      <div class="en-actions">
        <button class="en-mini" @click="download">⬇ 下载加密文件(.json)</button>
        <button class="en-mini en-mini--danger" @click="clear">🗑 清除备份</button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDataEncryption } from '../modules/reward/data-encryption'
import type { RewardRecord } from '../modules/reward/reward-list'

const props = defineProps<{ records: RewardRecord[] }>()
const emit = defineEmits<{ (e: 'update:records', list: RewardRecord[]): void }>()

const enc = useDataEncryption()
const backup = computed(() => enc.backup.value)
const pwd = ref('')
const label = ref('')
const restorePwd = ref('')
const restoreErr = ref(false)
const restored = ref<number | null>(null)

function doSave(): void {
  if (!pwd.value) return
  if (!props.records.length) {
    alert('当前账本还没有记录，无需加密备份')
    return
  }
  enc.saveBackup(props.records, pwd.value, label.value.trim() || undefined)
  pwd.value = ''
  label.value = ''
}
function doRestore(): void {
  const list = enc.restoreBackup(restorePwd.value)
  if (!list) {
    restoreErr.value = true
    return
  }
  restoreErr.value = false
  restored.value = list.length
  emit('update:records', list)
}
function download(): void {
  const text = enc.backupText()
  if (!text) return
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '心流账本-加密备份.json'
  a.click()
  URL.revokeObjectURL(url)
}
function clear(): void {
  if (window.confirm('清除加密备份？该操作不可撤销。')) {
    enc.clearBackup()
    restored.value = null
    restorePwd.value = ''
  }
}
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.en-panel { background: #20241f; border: 1px solid #333a33; border-radius: 12px; padding: 14px; margin-top: 14px; color: #d9decf; }
.en-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.en-title { font-weight: 600; }
.en-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.en-desc { font-size: 12px; color: #b7c0a8; line-height: 1.6; margin: 0 0 10px; }
.en-form { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
.en-form-t { font-size: 12px; color: #e8c060; }
.en-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.en-input { flex: 1; min-width: 100px; background: #101310; border: 1px solid #374136; border-radius: 8px; color: #d9decf; padding: 6px 9px; font-size: 12px; font-family: inherit; }
.en-label { flex: 0 1 180px; }
.en-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 6px 14px; font-weight: 600; font-size: 12px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.en-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.en-err { font-size: 11px; color: #c46a5a; margin: 0; }
.en-ok { font-size: 11px; color: #8aca70; margin: 0; }

.en-status { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 3px; }
.en-status-t { font-size: 12px; font-weight: 600; color: #e8c060; }
.en-status-meta { font-size: 12px; color: #b7c0a8; }
.en-status-enc { font-size: 11px; color: #6b7563; }

.en-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.en-mini { background: transparent; border: 1px solid #4a5243; color: #d9decf; border-radius: 8px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: inherit; }
.en-mini:hover { border-color: #6b9fc4; color: #6b9fc4; }
.en-mini--danger:hover { border-color: #c46a5a; color: #c46a5a; }
</style>