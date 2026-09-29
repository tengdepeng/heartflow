<template>
  <section class="cleanup-panel" aria-label="数据整理">
    <!-- 宪法门控关闭：仅展示说明，不提供任何动作入口（绝不静默动数据） -->
    <div v-if="!enabled" class="cleanup-panel__locked">
      <span class="cleanup-panel__lock-icon" aria-hidden="true">🔒</span>
      <div class="cleanup-panel__locked-text">
        <h3 class="cleanup-panel__title">整理旧数据（超期归档·可恢复）</h3>
        <p class="cleanup-panel__desc">
          此工具默认关闭。仅在宪法中显式启用 <code>data:cleanup</code>（覆盖「不自动清理历史数据」默认约束）后，
          才会出现「逐项勾选 + 显式确认」的整理入口。整理为软归档（标记归档、可还原、非硬删）、纯本地零网络、绝不自动运行。
        </p>
      </div>
    </div>

    <!-- 宪法门控开启：提供手动整理入口 -->
    <div v-else class="cleanup-panel__active">
      <div class="cleanup-panel__head">
        <h3 class="cleanup-panel__title">整理旧数据（超期归档·可恢复）</h3>
        <p class="cleanup-panel__desc">
          列出超过 {{ retentionDays }} 天、已完成且未归档的专注会话。逐项勾选后需<strong>显式确认</strong>才会软归档——
          标记归档、可还原、非硬删、纯本地零网络。本工具<strong>不会自动运行</strong>。
        </p>
      </div>

      <!-- 候选列表 -->
      <div v-if="candidates.length" class="cleanup-panel__body">
        <label class="cleanup-panel__selectall">
          <input
            type="checkbox"
            :checked="allSelected"
            @change="toggleAll"
          />
          <span>全选（共 {{ candidates.length }} 项超期会话）</span>
        </label>

        <ul class="cleanup-panel__list">
          <li v-for="s in candidates" :key="s.id" class="cleanup-panel__item">
            <label class="cleanup-panel__item-label">
              <input
                type="checkbox"
                :value="s.id"
                v-model="selectedIds"
              />
              <span class="cleanup-panel__item-main">
                <span class="cleanup-panel__item-date">{{ formatDate(s.completedAt) }}</span>
                <span class="cleanup-panel__item-meta">
                  {{ formatDuration(s.elapsed) }}<template v-if="s.tags.length"> · {{ s.tags.join(' / ') }}</template>
                </span>
              </span>
            </label>
          </li>
        </ul>

        <div class="cleanup-panel__actions">
          <span class="cleanup-panel__count">已选 {{ selectedIds.length }} 项</span>
          <button
            type="button"
            class="cleanup-panel__confirm"
            :disabled="!selectedIds.length"
            @click="confirmCleanup"
          >归档选中（可还原）</button>
        </div>
      </div>

      <p v-else class="cleanup-panel__empty">没有超过 {{ retentionDays }} 天的可整理会话，无需整理。</p>

      <!-- 已归档（可还原） -->
      <div v-if="archived.length" class="cleanup-panel__restore">
        <h4 class="cleanup-panel__restore-title">已归档（可还原）</h4>
        <ul class="cleanup-panel__list">
          <li v-for="s in archived" :key="s.id" class="cleanup-panel__item cleanup-panel__item--archived">
            <span class="cleanup-panel__item-main">
              <span class="cleanup-panel__item-date">{{ formatDate(s.completedAt) }}</span>
              <span class="cleanup-panel__item-meta">
                {{ formatDuration(s.elapsed) }}<template v-if="s.tags.length"> · {{ s.tags.join(' / ') }}</template>
              </span>
            </span>
            <button type="button" class="cleanup-panel__restore-btn" @click="restore(s.id)">还原</button>
          </li>
        </ul>
      </div>

      <p v-if="lastMessage" class="cleanup-panel__msg">{{ lastMessage }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { FocusSession } from '../types'
import {
  isCleanupEnabled,
  softCleanup,
  restoreCleanup,
  CLEANUP_RETENTION_DAYS,
} from '../modules/data-sovereignty/manual-cleanup'
import { getSessions } from '../engine/storage/session'

const retentionDays = CLEANUP_RETENTION_DAYS
const enabled = computed(() => isCleanupEnabled())

const candidates = ref<FocusSession[]>([])
const archived = ref<FocusSession[]>([])
const selectedIds = ref<string[]>([])
const lastMessage = ref('')

function refresh() {
  const all = getSessions()
  candidates.value = all.filter(
    (s) => !s.archived && s.status === 'completed' && s.completedAt,
  )
  archived.value = all.filter((s) => s.archived)
  // 清除已不存在的勾选
  const valid = new Set(candidates.value.map((s) => s.id))
  selectedIds.value = selectedIds.value.filter((id) => valid.has(id))
}

const allSelected = computed(
  () => candidates.value.length > 0 && selectedIds.value.length === candidates.value.length,
)

function toggleAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedIds.value = checked ? candidates.value.map((s) => s.id) : []
}

function confirmCleanup() {
  if (!selectedIds.value.length) return
  const n = softCleanup([...selectedIds.value])
  lastMessage.value = `已软归档 ${n} 项（标记归档、可在下方还原，非硬删）。`
  selectedIds.value = []
  refresh()
}

function restore(id: string) {
  const n = restoreCleanup([id])
  lastMessage.value = n ? '已还原 1 项。' : '还原失败。'
  refresh()
}

function formatDate(iso: string | null): string {
  if (!iso) return '未知日期'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '未知日期'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  return `${h} 小时 ${min % 60} 分`
}

onMounted(refresh)
</script>

<style scoped>
.cleanup-panel {
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  margin-top: 18px;
  padding-top: 18px;
}
.cleanup-panel__locked {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  opacity: 0.72;
}
.cleanup-panel__lock-icon {
  font-size: 18px;
  line-height: 1.4;
}
.cleanup-panel__title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.cleanup-panel__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cleanup-panel__desc code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(127, 127, 127, 0.18);
  color: var(--text-primary, #e8e0d8);
}
.cleanup-panel__head {
  margin-bottom: 14px;
}
.cleanup-panel__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cleanup-panel__selectall {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  cursor: pointer;
}
.cleanup-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}
.cleanup-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
}
.cleanup-panel__item--archived {
  opacity: 0.7;
}
.cleanup-panel__item-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
}
.cleanup-panel__item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cleanup-panel__item-date {
  font-size: 13px;
  color: var(--text-primary, #e8e0d8);
}
.cleanup-panel__item-meta {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cleanup-panel__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
}
.cleanup-panel__count {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cleanup-panel__confirm {
  border: none;
  border-radius: 10px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #5b7cfa, #8a5bfa);
  transition: opacity 0.15s ease;
}
.cleanup-panel__confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cleanup-panel__empty {
  font-size: 13px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin: 4px 0 0;
}
.cleanup-panel__restore {
  margin-top: 18px;
}
.cleanup-panel__restore-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cleanup-panel__restore-btn {
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}
.cleanup-panel__restore-btn:hover {
  color: var(--text-primary, #e8e0d8);
  border-color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.cleanup-panel__msg {
  margin: 12px 0 0;
  font-size: 12px;
  color: #7fd6a0;
}
</style>
