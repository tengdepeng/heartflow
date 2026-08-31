<script setup lang="ts">
// ============================================================
// 外链房 · 云同步面板
// 同步目录选择（Tauri 对话框 / 浏览器手填或 FS Access）→ 口令 →
// 立即同步（推送）/ 拉取合并。不支持直写的环境降级为手动导出/导入加密 JSON。
// 所有快照经同步口令 AES-GCM 加密落盘，零后端、零出网（宪法第 1 条）。
// ============================================================
import { ref, computed } from 'vue'
import { download as dataPortDownload } from '../../engine/data-port'
import {
  getSyncStatus,
  getSyncDirectory,
  setSyncDirectory,
  pickSyncDirectory,
  pushSnapshot,
  pullSnapshot,
  downloadEncrypted,
  applyUploaded,
  type SyncStatus,
} from '../../modules/external-room/sync'
import type { SyncTarget } from '../../modules/external-room/sync-fs'

const status = ref<SyncStatus>(getSyncStatus())
const supported = computed(() => status.value.supported)

const passphrase = ref('')
const dirInput = ref<string>(getSyncDirectory() ?? '')
const notice = ref<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null)
const busy = ref(false)

const lastPush = computed(() => fmt(status.value.lastPushAt))
const lastPull = computed(() => fmt(status.value.lastPullAt))
const lastRemote = computed(() => fmt(status.value.lastRemoteAt))

function fmt(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-CN')
  } catch {
    return iso
  }
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined
function flash(kind: 'ok' | 'warn' | 'err', text: string): void {
  notice.value = { kind, text }
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 4200)
}

function refresh(): void {
  status.value = getSyncStatus()
  dirInput.value = getSyncDirectory() ?? ''
}

async function chooseDir(): Promise<void> {
  const target: SyncTarget = await pickSyncDirectory()
  if (!target) {
    flash('warn', '未选择目录，可手动粘贴同步文件夹路径')
    return
  }
  if (target.kind === 'path') {
    dirInput.value = target.path
    setSyncDirectory(target.path)
    flash('ok', `已选定同步目录：${target.path}`)
  } else {
    // 浏览器句柄形态：本次会话有效，不持久化
    dirInput.value = '（本会话已授权浏览器目录）'
    flash('ok', '已授权浏览器同步目录')
  }
  refresh()
}

function applyDirInput(): void {
  const v = dirInput.value.trim()
  if (!v || v.startsWith('（')) {
    setSyncDirectory(null)
    flash('warn', '已清除已保存的同步目录')
  } else {
    setSyncDirectory(v)
    flash('ok', '已保存同步目录路径')
  }
  refresh()
}

async function push(): Promise<void> {
  if (!passphrase.value) {
    flash('warn', '请先填写同步口令')
    return
  }
  busy.value = true
  try {
    const target: SyncTarget = supported.value
      ? (dirInput.value && !dirInput.value.startsWith('（')
          ? { kind: 'path', path: dirInput.value.trim() }
          : null)
      : null
    const r = await pushSnapshot(target, passphrase.value, deviceLabel())
    if (r.ok) flash('ok', `已加密同步到目录（${fmt(r.syncedAt)}）`)
    else if (r.reason === 'fs-unavailable') flash('err', '当前环境不支持直写，请用下方导出/导入')
    else if (r.reason === 'empty-passphrase') flash('warn', '请先填写同步口令')
    else flash('err', '同步失败，详见状态栏')
  } finally {
    busy.value = false
    refresh()
  }
}

async function pull(): Promise<void> {
  if (!passphrase.value) {
    flash('warn', '请先填写同步口令')
    return
  }
  busy.value = true
  try {
    const target: SyncTarget = supported.value
      ? (dirInput.value && !dirInput.value.startsWith('（')
          ? { kind: 'path', path: dirInput.value.trim() }
          : null)
      : null
    const r = await pullSnapshot(target, passphrase.value)
    if (r.ok) flash('ok', `已拉取并合并远端快照（${fmt(r.syncedAt ?? null)}）`)
    else if (r.reason === 'no-file') flash('warn', '同步目录里还没有快照文件，先在一台设备推送')
    else if (r.reason === 'wrong-passphrase') flash('err', '口令错误，无法解密远端快照')
    else if (r.reason === 'fs-unavailable') flash('err', '当前环境不支持直写，请用下方导出/导入')
    else flash('err', '拉取失败，详见状态栏')
  } finally {
    busy.value = false
    refresh()
  }
}

function deviceLabel(): string {
  try {
    return (navigator.platform || navigator.userAgent || 'device').slice(0, 24)
  } catch {
    return 'device'
  }
}

// ---- 浏览器降级：手动导出 / 导入 ----

async function exportManual(): Promise<void> {
  if (!passphrase.value) {
    flash('warn', '请先填写同步口令')
    return
  }
  try {
    const text = await downloadEncrypted(passphrase.value, deviceLabel())
    dataPortDownload(text, `heartflow-sync-${new Date().toISOString().slice(0, 10)}.json`)
    flash('ok', '已生成加密快照，请存入你的同步盘')
  } catch (e) {
    flash('err', e instanceof Error ? e.message : '导出失败')
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
function triggerImport(): void {
  fileInput.value?.click()
}
async function onFile(e: Event): Promise<void> {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (!passphrase.value) {
    flash('warn', '请先填写同步口令')
    return
  }
  try {
    const text = await f.text()
    const r = await applyUploaded(text, passphrase.value)
    flash('ok', `已导入并合并远端快照（${fmt(r.syncedAt)}）`)
  } catch (err) {
    if (String(err).includes('VAULT_DECRYPT')) flash('err', '口令错误，无法解密该快照')
    else flash('err', '导入失败：文件不是有效的加密快照')
  } finally {
    ;(e.target as HTMLInputElement).value = ''
    refresh()
  }
}
</script>

<template>
  <div class="cs">
    <!-- 环境能力提示 -->
    <div class="cs-banner" :class="supported ? 'is-on' : 'is-off'">
      <span class="cs-dot"></span>
      <span>{{ supported ? '当前环境支持直写（桌面端 / 支持 FS Access 的浏览器）' : '当前环境不支持直写，请用下方「导出 / 导入」手动同步' }}</span>
    </div>

    <!-- 同步目录 -->
    <div class="cs-block">
      <span class="cs-title">① 同步文件夹</span>
      <p class="cs-hint">选一个你自己的本地目录（建议放在 OneDrive / 坚果云同步盘里）。数据只落这个目录，零后端。</p>
      <div class="cs-row">
        <input
          v-model="dirInput"
          class="cs-input"
          :placeholder="supported ? '点击右侧选择，或粘贴路径' : '手动粘贴同步目录路径'"
        />
        <button v-if="supported" class="cs-btn cs-btn--ghost" @click="chooseDir">选择目录</button>
        <button class="cs-btn cs-btn--ghost" @click="applyDirInput">保存路径</button>
      </div>
    </div>

    <!-- 同步口令 -->
    <div class="cs-block">
      <span class="cs-title">② 同步口令</span>
      <p class="cs-hint">快照用此口令 AES-GCM 加密。换设备时填<strong>同一个口令</strong>才能解密——它不存服务器，忘了无法找回。</p>
      <input v-model="passphrase" type="password" class="cs-input" placeholder="输入同步口令" />
    </div>

    <!-- 操作 -->
    <div class="cs-block">
      <span class="cs-title">③ 同步</span>
      <div class="cs-actions">
        <button class="cs-btn cs-btn--primary" :disabled="busy" @click="push">⬆ 立即同步（推送）</button>
        <button class="cs-btn cs-btn--primary" :disabled="busy" @click="pull">⬇ 拉取合并</button>
      </div>
    </div>

    <!-- 状态条 -->
    <div class="cs-status">
      <div class="cs-stat"><span>最近推送</span><b>{{ lastPush }}</b></div>
      <div class="cs-stat"><span>最近拉取</span><b>{{ lastPull }}</b></div>
      <div class="cs-stat"><span>已知远端</span><b>{{ lastRemote }}</b></div>
      <div v-if="status.lastError" class="cs-stat cs-stat--err"><span>上次错误</span><b>{{ status.lastError }}</b></div>
    </div>

    <!-- 浏览器降级 -->
    <div v-if="!supported" class="cs-fallback">
      <span class="cs-title">手动导出 / 导入（降级）</span>
      <p class="cs-hint">把加密快照文件存进你的同步盘，在另一台设备用「导入」读回。</p>
      <div class="cs-actions">
        <button class="cs-btn cs-btn--ghost" @click="exportManual">⬇ 导出加密快照</button>
        <button class="cs-btn cs-btn--ghost" @click="triggerImport">⬆ 导入加密快照</button>
        <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFile" />
      </div>
    </div>

    <Transition name="cs-fade">
      <span v-if="notice" class="cs-notice" :class="`cs-notice--${notice.kind}`">{{ notice.text }}</span>
    </Transition>
  </div>
</template>

<style scoped>
.cs {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text-primary, #e9e0d0);
}
.cs-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  align-self: flex-start;
}
.cs-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.cs-banner.is-on .cs-dot { background: #7fd0bb; }
.cs-banner.is-off .cs-dot { background: #e0a06a; }

.cs-block { display: flex; flex-direction: column; gap: 8px; }
.cs-title { font-size: 12px; letter-spacing: 1px; opacity: 0.55; }
.cs-hint { margin: 0; font-size: 12px; opacity: 0.5; line-height: 1.6; }
.cs-row { display: flex; gap: 8px; flex-wrap: wrap; }
.cs-input {
  flex: 1 1 240px; min-width: 0;
  padding: 8px 11px; border-radius: 9px; font-size: 13px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e9e0d0); font-family: inherit;
}
.cs-input::placeholder { opacity: 0.4; }

.cs-btn {
  padding: 8px 16px; border-radius: 9px; font-size: 13px; cursor: pointer;
  background: rgba(255, 255, 255, 0.05); color: var(--text-primary, #e9e0d0);
  border: 1px solid rgba(255, 255, 255, 0.1); transition: border-color 0.2s ease, background 0.2s ease;
  white-space: nowrap;
}
.cs-btn:hover:not(:disabled) { border-color: rgba(212, 165, 116, 0.35); }
.cs-btn:disabled { opacity: 0.45; cursor: default; }
.cs-btn--primary { background: rgba(212, 165, 116, 0.18); color: var(--accent, #d4a574); border-color: rgba(212, 165, 116, 0.35); }
.cs-btn--ghost { background: transparent; }

.cs-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.cs-status {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px; padding: 12px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
}
.cs-stat { display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
.cs-stat > span { opacity: 0.5; }
.cs-stat > b { font-weight: 500; font-size: 13px; }
.cs-stat--err > b { color: #e08a7a; opacity: 0.9; }

.cs-fallback { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: rgba(212, 165, 116, 0.05); border: 1px solid rgba(212, 165, 116, 0.22); }

.cs-notice {
  position: fixed; left: 50%; bottom: 64px; transform: translateX(-50%);
  padding: 9px 18px; border-radius: 999px; font-size: 13px; z-index: 210;
  background: #211b15; border: 1px solid rgba(212, 165, 116, 0.35);
}
.cs-notice--ok { color: #7fd0bb; }
.cs-notice--warn { color: #e0a06a; }
.cs-notice--err { color: #e08a7a; }

.cs-fade-enter-active, .cs-fade-leave-active { transition: opacity 0.2s ease; }
.cs-fade-enter-from, .cs-fade-leave-to { opacity: 0; }
</style>
