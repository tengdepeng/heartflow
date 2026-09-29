<template>
  <section class="lcp" aria-label="外部应用启动台">
    <div class="lcp-head">
      <span class="lcp-title">🚀 启动台</span>
      <span class="lcp-sub">外部应用 · 启动 · 管理</span>
    </div>

    <!-- 添加 / 编辑表单 -->
    <div class="lcp-form">
      <div class="lcp-form-row">
        <input
          v-model="form.name"
          class="lcp-input lcp-input--name"
          placeholder="名称（如 网易云音乐）"
          aria-label="应用名称"
        />
        <input
          v-model="form.icon"
          class="lcp-input lcp-input--icon"
          placeholder="图标（emoji）"
          aria-label="图标"
        />
        <input
          v-model="form.category"
          class="lcp-input lcp-input--cat"
          placeholder="分类（如 音乐）"
          aria-label="分类"
        />
      </div>
      <div class="lcp-form-row">
        <input
          v-model="form.launch"
          class="lcp-input lcp-input--launch"
          placeholder="启动路径或 URI（如 C:\\app.exe / weixin://）"
          aria-label="启动路径"
        />
        <input
          v-model="form.deepLink"
          class="lcp-input lcp-input--deeplink"
          placeholder="深链（可选）"
          aria-label="深链"
        />
        <label class="lcp-check">
          <input v-model="form.useDeepLink" type="checkbox" />
          优先深链
        </label>
      </div>
      <div class="lcp-form-actions">
        <button
          class="lcp-btn lcp-btn--primary"
          :disabled="!form.name.trim() || !form.launch.trim()"
          @click="submit"
        >{{ editingId ? '保存更新' : '添加' }}</button>
        <button v-if="editingId" class="lcp-btn" @click="resetForm">取消</button>
      </div>
    </div>

    <p v-if="launchMsg" class="lcp-msg" :class="{ err: launchErr }">{{ launchMsg }}</p>

    <!-- 分组列表 -->
    <div v-if="groups.length" class="lcp-groups">
      <div v-for="([cat, list]) in groups" :key="cat" class="lcp-group">
        <div class="lcp-group-head">
          <template v-if="renamingCat === cat">
            <input
              v-model="catRenameInput"
              class="lcp-input lcp-input--rename"
              @keyup.enter="doRenameCat(cat)"
              aria-label="重命名分类"
            />
            <button class="lcp-btn lcp-btn--sm" @click="doRenameCat(cat)">确定</button>
            <button class="lcp-btn lcp-btn--sm" @click="renamingCat = null; catRenameInput = ''">取消</button>
          </template>
          <template v-else>
            <span class="lcp-group-cat">{{ cat }}</span>
            <span class="lcp-group-count">{{ list.length }} 项</span>
            <button class="lcp-btn lcp-btn--sm lcp-btn--ghost" @click="startRenameCat(cat)">重命名</button>
          </template>
        </div>
        <div class="lcp-list">
          <div v-for="(entry, idx) in list" :key="entry.id" class="lcp-item">
            <span class="lcp-item-icon">{{ entry.iconImage || entry.icon || '📦' }}</span>
            <div class="lcp-item-info">
              <span class="lcp-item-name">{{ entry.name }}</span>
              <span class="lcp-item-meta">启动 {{ entry.launchCount }} 次{{ entry.lastLaunchedAt ? ' · ' + shortTime(entry.lastLaunchedAt) : '' }}</span>
            </div>
            <button class="lcp-btn lcp-btn--sm lcp-btn--up" :disabled="idx === 0" @click="moveUp(cat, entry.id, idx)">↑</button>
            <button class="lcp-btn lcp-btn--sm lcp-btn--down" :disabled="idx === list.length - 1" @click="moveDown(cat, entry.id, idx)">↓</button>
            <button class="lcp-btn lcp-btn--sm" @click="startEdit(entry, cat)">编辑</button>
            <button class="lcp-btn lcp-btn--sm lcp-btn--danger" @click="doDelete(entry.id)">删除</button>
            <button class="lcp-btn lcp-btn--sm lcp-btn--launch" @click="doLaunch(entry)">启动</button>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="lcp-empty">还没有启动条目。添加一个外部应用开始吧。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useLauncher } from '../modules/launcher/useLauncher'
import type { ExternalAppEntry } from '../modules/launcher/types'

const { grouped, addEntry, updateEntry, removeEntry, moveEntry, renameCategory, launchEntry } = useLauncher()

const groups = computed<Array<[string, ExternalAppEntry[]]>>(() => grouped.value)

const editingId = ref<string | null>(null)
const editingCat = ref('')
const launchMsg = ref('')
const launchErr = ref(false)
const renamingCat = ref<string | null>(null)
const catRenameInput = ref('')

const form = reactive({
  name: '',
  icon: '',
  category: '',
  launch: '',
  deepLink: '',
  useDeepLink: false,
})

function resetForm(): void {
  editingId.value = null
  editingCat.value = ''
  form.name = ''
  form.icon = ''
  form.category = ''
  form.launch = ''
  form.deepLink = ''
  form.useDeepLink = false
  launchMsg.value = ''
  launchErr.value = false
}

function submit(): void {
  const input = {
    name: form.name.trim(),
    icon: form.icon.trim(),
    category: form.category.trim() || '常用',
    launch: form.launch.trim(),
    deepLink: form.deepLink.trim() || undefined,
    useDeepLink: form.useDeepLink,
  }
  if (editingId.value) {
    updateEntry(editingId.value, {
      name: input.name,
      icon: input.icon,
      category: input.category,
      launch: input.launch,
      deepLink: input.deepLink,
      useDeepLink: input.useDeepLink,
    })
    if (renamingCat.value === editingCat.value) renamingCat.value = null
  } else {
    addEntry(input)
  }
  resetForm()
}

function startEdit(entry: ExternalAppEntry, cat: string): void {
  editingId.value = entry.id
  editingCat.value = cat
  form.name = entry.name
  form.icon = entry.icon
  form.category = entry.category
  form.launch = entry.launch
  form.deepLink = entry.deepLink ?? ''
  form.useDeepLink = entry.useDeepLink
}

function startRenameCat(cat: string): void {
  renamingCat.value = cat
  catRenameInput.value = cat
}

function doRenameCat(cat: string): void {
  const next = catRenameInput.value.trim()
  if (next && next !== cat) renameCategory(cat, next)
  renamingCat.value = null
  catRenameInput.value = ''
}

function doDelete(id: string): void {
  removeEntry(id)
}

function moveUp(cat: string, id: string, idx: number): void {
  const list = groups.value.find(([c]) => c === cat)?.[1]
  if (list && idx > 0) moveEntry(id, list[idx - 1].id)
}

function moveDown(cat: string, id: string, idx: number): void {
  const list = groups.value.find(([c]) => c === cat)?.[1]
  if (list && idx < list.length - 1) moveEntry(list[idx + 1].id, id)
}

async function doLaunch(entry: ExternalAppEntry): Promise<void> {
  const res = await launchEntry(entry)
  launchErr.value = !res.ok
  launchMsg.value = res.ok
    ? res.degraded
      ? `已尝试打开 ${res.target}（降级）`
      : `已启动 ${entry.name}`
    : `无法打开：${res.target || entry.name}`
}

function shortTime(iso: string): string {
  return iso.slice(5, 16).replace('T', ' ')
}
</script>

<style scoped>
.lcp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--bg-panel, #1a1612);
}
.lcp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.lcp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.lcp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.lcp-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.lcp-form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.lcp-input {
  padding: 6px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
}
.lcp-input--name { flex: 2; min-width: 140px;
}
.lcp-input--icon { flex: 1; min-width: 90px;
}
.lcp-input--cat { flex: 1; min-width: 90px;
}
.lcp-input--launch { flex: 2; min-width: 200px;
}
.lcp-input--deeplink { flex: 1; min-width: 140px;
}
.lcp-input--rename { width: 160px; }
.lcp-check {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  cursor: pointer;
}
.lcp-form-actions {
  display: flex;
  gap: 8px;
}
.lcp-btn {
  padding: 5px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.lcp-btn:hover {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
}
.lcp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.lcp-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.lcp-btn--danger {
  border-color: rgba(196, 106, 90, 0.4);
  color: #c46a5a;
}
.lcp-btn--launch {
  border-color: rgba(138, 154, 122, 0.5);
  color: #8a9a7a;
}
.lcp-btn--sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 8px;
  font-size: 11px;

  min-height: 26px;
}
.lcp-btn--ghost {
  border-color: transparent;
}
.lcp-msg {
  font-size: 12px;
  color: var(--text-primary, #e8e0d8);
  padding: 0 2px;
}
.lcp-msg.err {
  color: #c46a5a;
}
.lcp-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lcp-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lcp-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lcp-group-cat {
  font-size: 13px;
  font-weight: 600;
  color: #f0c040;
}
.lcp-group-count {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  flex: 1;
}
.lcp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lcp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
}
.lcp-item-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.lcp-item-info {
  flex: 1;
  min-width: 0;
}
.lcp-item-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
}
.lcp-item-meta {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-top: 1px;
}
.lcp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  padding: 16px 0;
  text-align: center;
}
</style>