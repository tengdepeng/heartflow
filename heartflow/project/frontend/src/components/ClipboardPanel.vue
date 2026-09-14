<template>
  <section class="clp-panel" data-enter aria-label="快贴剪贴板">
    <header class="clp-header">
      <h4 class="clp-title">📋 快贴 · 剪贴板</h4>
      <p class="clp-subtitle">历史 · 片段 · 清理</p>
    </header>

    <!-- 统计概览 -->
    <div class="clp-stats">
      <div class="clp-stat">
        <span class="clp-stat-num">{{ stats.total }}</span>
        <span class="clp-stat-label">历史</span>
      </div>
      <div class="clp-stat">
        <span class="clp-stat-num clp-stat-pinned">{{ stats.pinned }}</span>
        <span class="clp-stat-label">固定</span>
      </div>
      <div class="clp-stat">
        <span class="clp-stat-num">{{ stats.snippets }}</span>
        <span class="clp-stat-label">片段</span>
      </div>
      <div class="clp-stat">
        <span class="clp-stat-num clp-stat-top">{{ stats.topUsed.length }}</span>
        <span class="clp-stat-label">高频片段</span>
      </div>
    </div>

    <!-- 留存新内容 -->
    <div class="clp-add">
      <textarea v-model="newText" class="clp-textarea" placeholder="粘贴或输入要留存的文本…" @keydown.ctrl.enter="addItem"></textarea>
      <div class="clp-add-row">
        <input v-model="newTags" class="clp-input clp-input-inline" placeholder="标签（逗号分隔，可选）" @keyup.enter="addItem" />
        <button class="clp-btn clp-btn-primary" :disabled="!newText.trim()" @click="addItem">留存</button>
      </div>
    </div>

    <!-- 历史 -->
    <div class="clp-history">
      <span class="clp-block-label">历史（{{ filteredItems.length }}）</span>
      <input v-model="query" class="clp-input" placeholder="搜索历史正文 / 标签…" />
      <div v-if="filteredItems.length" class="clp-list">
        <div v-for="item in filteredItems" :key="item.id" class="clp-item" :class="{ 'is-pinned': item.isPinned }">
          <div class="clp-item-main">
            <span class="clp-item-text">{{ item.text }}</span>
            <span class="clp-item-meta">
              {{ fmtTime(item.copiedAt) }}
              <template v-if="item.tags.length"> · {{ item.tags.join('、') }}</template>
              <template v-if="item.isPinned"> · 📌</template>
            </span>
          </div>
          <div class="clp-item-actions">
            <button class="clp-mini" :class="{ 'is-on': item.isPinned }" title="固定 / 取消固定" @click="togglePin(item)">📌</button>
            <button class="clp-mini" title="复制回剪贴板" @click="copyBack(item)">📋</button>
            <button class="clp-mini" title="升级为片段" @click="promote(item)">⭐</button>
            <button class="clp-mini clp-mini-danger" title="删除" @click="remove(item)">🗑</button>
          </div>
        </div>
      </div>
      <p v-else class="clp-hint">还没有剪贴板历史。留存一段文本试试。</p>
    </div>

    <!-- 片段库 -->
    <div class="clp-snippets">
      <span class="clp-block-label">片段库（{{ snippets.length }}）</span>
      <div class="clp-snip-add">
        <input v-model="snipTitle" class="clp-input clp-input-inline" placeholder="片段标题…" />
        <input v-model="snipContent" class="clp-input clp-input-inline" placeholder="片段内容…" @keyup.enter="addSnippet" />
        <button class="clp-btn clp-btn-primary" :disabled="!snipContent.trim()" @click="addSnippet">保存片段</button>
      </div>
      <div v-if="snippets.length" class="clp-snip-list">
        <div v-for="s in snippets" :key="s.id" class="clp-snip">
          <div class="clp-snip-main">
            <span class="clp-snip-title">{{ s.title }}</span>
            <span class="clp-snip-content">{{ s.content }}</span>
            <span class="clp-snip-meta">复用 {{ s.usageCount }} 次 · {{ fmtTime(s.updatedAt) }}</span>
          </div>
          <div class="clp-snip-actions">
            <button class="clp-mini" title="复制到剪贴板" @click="useSnippet(s)">📋 取用</button>
            <button class="clp-mini clp-mini-danger" title="删除" @click="removeSnippet(s)">🗑</button>
          </div>
        </div>
      </div>
      <p v-else class="clp-hint">还没有片段。把常用文本点「⭐」升级为片段，随时一键取用。</p>
    </div>

    <!-- 清理策略 -->
    <div class="clp-clean">
      <span class="clp-block-label">清理策略</span>
      <div class="clp-clean-row">
        <label class="clp-clean-field">
          <span>条数上限</span>
          <input v-model.number="policyMaxItems" type="number" min="10" class="clp-input clp-input-num" />
        </label>
        <label class="clp-clean-field">
          <span>保留天数</span>
          <input v-model.number="policyMaxDays" type="number" min="1" class="clp-input clp-input-num" />
        </label>
        <label class="clp-clean-check">
          <input v-model="policyClearPinned" type="checkbox" />
          <span>固定条目一并清理</span>
        </label>
        <button class="clp-btn" @click="applyPolicy">保存策略</button>
        <button class="clp-btn clp-btn-clean" @click="cleanNow">立即清理</button>
      </div>
      <p v-if="lastCleaned" class="clp-hint">上次清理：{{ lastCleaned }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClipboard } from '../modules/output/clipboard'
import type { ClipItem, Snippet } from '../modules/output/clipboard'

const clip = useClipboard()

const newText = ref('')
const newTags = ref('')
const query = ref('')
const snipTitle = ref('')
const snipContent = ref('')

const initialPolicy = clip.getPolicy()
const policyMaxItems = ref(initialPolicy.maxItems)
const policyMaxDays = ref(initialPolicy.maxDays)
const policyClearPinned = ref(initialPolicy.clearPinned)
const lastCleaned = ref(initialPolicy.lastCleanedAt ? fmtTime(initialPolicy.lastCleanedAt) : '')

const stats = computed(() => clip.stats.value)
const snippets = computed(() => clip.snippets.value)
const filteredItems = computed(() => clip.search(query.value))

function addItem() {
  const text = newText.value.trim()
  if (!text) return
  const tags = newTags.value.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
  clip.add(text, { tags })
  newText.value = ''
  newTags.value = ''
}

function togglePin(item: ClipItem) {
  clip.togglePin(item.id)
}

async function copyBack(item: ClipItem) {
  await clip.copyBack(item.id)
}

function promote(item: ClipItem) {
  clip.promoteToSnippet(item.id)
}

function remove(item: ClipItem) {
  clip.remove(item.id)
}

function addSnippet() {
  const content = snipContent.value.trim()
  if (!content) return
  clip.addSnippet({ title: snipTitle.value.trim(), content })
  snipTitle.value = ''
  snipContent.value = ''
}

async function useSnippet(s: Snippet) {
  await clip.useSnippet(s.id)
}

function removeSnippet(s: Snippet) {
  clip.removeSnippet(s.id)
}

function applyPolicy() {
  clip.updatePolicy({
    maxItems: policyMaxItems.value,
    maxDays: policyMaxDays.value,
    clearPinned: policyClearPinned.value,
  })
}

function cleanNow() {
  const removed = clip.clean()
  const policy = clip.getPolicy()
  lastCleaned.value = policy.lastCleanedAt ? fmtTime(policy.lastCleanedAt) : ''
  if (removed > 0) {
    alert(`已清理 ${removed} 条过期剪贴板内容。`)
  } else {
    alert('没有需要清理的内容。')
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.clp-panel {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.clp-header {
  margin-bottom: 10px;
}

.clp-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.clp-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.clp-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.clp-stat {
  flex: 1;
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.clp-stat-num {
  font-size: 16px;
  font-weight: 600;
  color: rgba(var(--text-primary-rgb), 0.9);
}

.clp-stat-pinned {
  color: #d9a441;
}

.clp-stat-top {
  color: #8a9a7a;
}

.clp-stat-label {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.clp-add {
  margin-bottom: 12px;
}

.clp-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 56px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.6);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 6px;
}

.clp-textarea:focus,
.clp-input:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.35);
}

.clp-add-row {
  display: flex;
  gap: 8px;
}

.clp-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.6);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
  margin-bottom: 8px;
}

.clp-input-inline {
  flex: 1;
  margin-bottom: 0;
}

.clp-input-num {
  width: 72px;
  margin-bottom: 0;
}

.clp-btn {
  padding: 6px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.clp-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
}

.clp-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.clp-btn-primary {
  background: rgba(196, 106, 90, 0.14);
  border-color: rgba(196, 106, 90, 0.3);
  color: #c46a5a;
}

.clp-btn-primary:hover:not(:disabled) {
  background: rgba(196, 106, 90, 0.2);
}

.clp-btn-clean {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.3);
}

.clp-block-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.clp-history,
.clp-snippets,
.clp-clean {
  margin-bottom: 12px;
}

.clp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.clp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.35);
}

.clp-item.is-pinned {
  border-color: rgba(217, 164, 65, 0.3);
  background: rgba(217, 164, 65, 0.06);
}

.clp-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.clp-item-text {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.85);
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.clp-item-meta {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.clp-item-actions,
.clp-snip-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.clp-mini {
  padding: 3px 7px;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.6);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.clp-mini:hover {
  background: rgba(var(--accent-rgb), 0.08);
}

.clp-mini.is-on {
  color: #d9a441;
  border-color: rgba(217, 164, 65, 0.4);
}

.clp-mini-danger:hover {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.4);
}

.clp-snip-add {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.clp-snip-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.clp-snip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(138, 154, 122, 0.2);
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.05);
}

.clp-snip-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.clp-snip-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--text-primary-rgb), 0.9);
}

.clp-snip-content {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.65);
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.clp-snip-meta {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.clp-clean-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.clp-clean-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.clp-clean-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.6);
  padding-bottom: 9px;
}

.clp-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.4);
}
</style>
