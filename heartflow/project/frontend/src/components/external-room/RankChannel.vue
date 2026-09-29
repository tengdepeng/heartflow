<script setup lang="ts">
// ============================================================
// 外链房 · 榜单通道面板
// 宪法禁竞速 / 排行类 UI：本通道只提供「外部数据源接入位」，接进来的
// 数据不渲染任何名次，仅作下游（镜我 / 顾问）参照供给。
// 默认关闭；启用需出口闸（出网）同意；关闭时零渲染、零网络开销。
// ============================================================
import { ref, computed } from 'vue'
import { isExternalAIConsented } from '../../engine/ai/external-gate'
import {
  getSources,
  addSource,
  removeSource,
  isEnabled,
  setEnabled,
  type RankSource,
} from '../../modules/external-room/rank-feed'

const enabled = ref(isEnabled())
const sources = ref<RankSource[]>(getSources())
const urlInput = ref('')
const labelInput = ref('')
const notice = ref<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null)

const consented = computed(() => isExternalAIConsented())
const canEdit = computed(() => enabled.value && consented.value)

function reload(): void {
  sources.value = getSources()
  enabled.value = isEnabled()
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined
function flash(kind: 'ok' | 'warn' | 'err', text: string): void {
  notice.value = { kind, text }
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 4200)
}

function tryToggle(): void {
  if (enabled.value) {
    setEnabled(false)
    reload()
    flash('ok', '已关闭榜单通道（不渲染、零网络）')
    return
  }
  if (!consented.value) {
    flash('err', '需先在宪法页开启「允许外部端点」，方可启用榜单通道')
    return
  }
  setEnabled(true)
  reload()
  flash('ok', '已启用榜单通道（仅作下游参照，不呈现名次）')
}

function add(): void {
  if (!canEdit.value) {
    flash('warn', '请先启用且通过出口闸同意，再添加数据源')
    return
  }
  if (!urlInput.value.trim()) {
    flash('warn', '请填写外部数据源地址')
    return
  }
  const s = addSource({ url: urlInput.value, label: labelInput.value })
  if (!s) {
    flash('warn', '地址为空或已存在')
    return
  }
  urlInput.value = ''
  labelInput.value = ''
  reload()
  flash('ok', `已接入「${s.label}」`)
}

function del(id: string): void {
  removeSource(id)
  reload()
  flash('ok', '已移除该数据源')
}
</script>

<template>
  <div class="rc">
    <!-- 出口闸状态 -->
    <div class="rc-banner" :class="consented ? 'is-open' : 'is-closed'">
      <span class="rc-dot"></span>
      <span>出口闸：{{ consented ? '已允许外部端点（可启用）' : '仅本地端点放行（默认，启用前需开启）' }}</span>
    </div>

    <!-- 启用开关 -->
    <div class="rc-block">
      <div class="rc-row">
        <span class="rc-title">启用榜单通道</span>
        <button
          class="rc-switch"
          :class="{ 'is-on': enabled }"
          role="switch"
          :aria-checked="enabled"
          @click="tryToggle"
        >
          <span class="rc-knob"></span>
        </button>
      </div>
      <p class="rc-hint">
        {{ enabled ? '已启用：下游（镜我 / 顾问）可取的参照源；本面板不渲染任何名次。' : '关闭：不渲染、零网络开销。' }}
      </p>
    </div>

    <!-- 外部数据源接入位 -->
    <div class="rc-block">
      <span class="rc-title">① 外部数据源接入位</span>
      <p class="rc-hint">
        填一个外部源地址（RSS / JSON feed / 自建 API）。接进来后<strong>不呈现排行</strong>，
        仅作下游参照供给。关闭或未经出口闸同意时不可编辑、不发起请求。
      </p>
      <div class="rc-row">
        <input
          v-model="urlInput"
          class="rc-input"
          :disabled="!canEdit"
          placeholder="https://your-source.example/feed.json"
        />
        <input
          v-model="labelInput"
          class="rc-input rc-input--label"
          :disabled="!canEdit"
          placeholder="备注（可空）"
        />
        <button class="rc-btn rc-btn--primary" :disabled="!canEdit" @click="add">添加</button>
      </div>

      <div v-if="sources.length === 0" class="rc-empty">
        还没有接入任何外部数据源。
      </div>
      <div v-else class="rc-list">
        <div v-for="s in sources" :key="s.id" class="rc-card">
          <div class="rc-card-main">
            <span class="rc-name">{{ s.label }}</span>
            <span class="rc-url">{{ s.url }}</span>
          </div>
          <button class="rc-btn rc-btn--ghost rc-danger" :disabled="!canEdit" @click="del(s.id)">移除</button>
        </div>
        <p class="rc-count">已接入 {{ sources.length }} 个源（仅供下游参照，不在本面板排名）</p>
      </div>
    </div>

    <Transition name="rc-fade">
      <span v-if="notice" class="rc-notice" :class="`rc-notice--${notice.kind}`">{{ notice.text }}</span>
    </Transition>
  </div>
</template>

<style scoped>
.rc {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text-primary, #e8e0d8);
}
.rc-banner {
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
.rc-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.rc-banner.is-closed .rc-dot { background: #7fd0bb; }
.rc-banner.is-open .rc-dot { background: #e0a06a; }

.rc-block { display: flex; flex-direction: column; gap: 8px; }
.rc-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.rc-title { font-size: 12px; letter-spacing: 1px; opacity: 0.55; }
.rc-hint { margin: 0; font-size: 12px; opacity: 0.5; line-height: 1.6; }
.rc-hint strong { color: var(--accent, #d4a574); opacity: 0.9; font-weight: 500; }

.rc-input {
  flex: 1 1 220px; min-width: 0;
  padding: 8px 11px; border-radius: 9px; font-size: 13px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e8e0d8); font-family: inherit;
}
.rc-input:disabled { opacity: 0.4; cursor: default; }
.rc-input--label { flex: 1 1 120px; }
.rc-input::placeholder { opacity: 0.4; }

.rc-btn {
  padding: 8px 16px; border-radius: 9px; font-size: 13px; cursor: pointer;
  background: rgba(255, 255, 255, 0.05); color: var(--text-primary, #e8e0d8);
  border: 1px solid rgba(255, 255, 255, 0.1); transition: border-color 0.2s ease, background 0.2s ease;
  white-space: nowrap;
}
.rc-btn:hover:not(:disabled) { border-color: rgba(212, 165, 116, 0.35); }
.rc-btn:disabled { opacity: 0.4; cursor: default; }
.rc-btn--primary { background: rgba(212, 165, 116, 0.18); color: var(--accent, #d4a574); border-color: rgba(212, 165, 116, 0.35); }
.rc-btn--ghost { background: transparent; }
.rc-danger { color: #e08a7a; }

.rc-switch {
  position: relative; width: 46px; height: 26px; border-radius: 13px; cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.14); background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s ease, border-color 0.2s ease; flex: none;
}
.rc-switch.is-on { background: rgba(212, 165, 116, 0.35); border-color: rgba(212, 165, 116, 0.5); }
.rc-knob {
  position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%;
  background: #b4b2a9; transition: transform 0.2s ease, background 0.2s ease;
}
.rc-switch.is-on .rc-knob { transform: translateX(20px); background: var(--accent, #d4a574); }

.rc-empty { font-size: 13px; opacity: 0.55; padding: 12px 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); }
.rc-list { display: flex; flex-direction: column; gap: 8px; }
.rc-card {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 11px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
}
.rc-card-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rc-name { font-size: 13px; font-weight: 500; }
.rc-url { font-size: 11px; opacity: 0.45; word-break: break-all; }
.rc-count { margin: 0; font-size: 11px; opacity: 0.45; }

.rc-notice {
  position: fixed; left: 50%; bottom: 64px; transform: translateX(-50%);
  padding: 9px 18px; border-radius: 999px; font-size: 13px; z-index: 210;
  background: #211b15; border: 1px solid rgba(212, 165, 116, 0.35);
}
.rc-notice--ok { color: #7fd0bb; }
.rc-notice--warn { color: #e0a06a; }
.rc-notice--err { color: #e08a7a; }

.rc-fade-enter-active, .rc-fade-leave-active { transition: opacity 0.2s ease; }
.rc-fade-enter-from, .rc-fade-leave-to { opacity: 0; }
</style>
