<template>
  <section class="rfl-panel" aria-label="专注联动">
    <!-- 面板头 -->
    <div class="rfl-head">
      <div class="rfl-head-left">
        <span class="rfl-title">🔗 专注联动</span>
        <span class="rfl-sub">{{ links.length }} 条关联 · {{ pendingRest.length }} 条待休息</span>
      </div>
      <span class="rfl-badge" :class="{ 'rfl-badge-low': restRate < 50 }">
        执行率 {{ restRate }}%
      </span>
    </div>

    <!-- 建议预览 -->
    <div class="rfl-block">
      <h3 class="rfl-block-title">休息建议</h3>
      <p class="rfl-hint">输入专注时长，预览建议的休息安排。</p>
      <div class="rfl-sim">
        <label class="rfl-field">
          <span class="rfl-field-label">专注分钟</span>
          <input v-model.number="simFocus" type="number" min="1" class="rfl-input" />
        </label>
        <button class="rfl-btn" @click="previewSuggestion">预览建议</button>
      </div>
      <div v-if="suggestion" class="rfl-suggestion">
        <span class="rfl-sug-icon">{{ activityMeta(suggestion.activity).icon }}</span>
        <span class="rfl-sug-text">建议休息 <strong>{{ suggestion.duration }}</strong> 分钟 · {{ activityMeta(suggestion.activity).label }}</span>
      </div>
    </div>

    <!-- 新建关联 -->
    <div class="rfl-block">
      <h3 class="rfl-block-title">新建关联</h3>
      <p class="rfl-hint">记录一次专注会话，并生成对应的休息建议。</p>
      <div class="rfl-create">
        <label class="rfl-field">
          <span class="rfl-field-label">会话标识</span>
          <input v-model="sessionId" type="text" placeholder="如 focus-001" class="rfl-input" />
        </label>
        <label class="rfl-field">
          <span class="rfl-field-label">专注分钟</span>
          <input v-model.number="createFocus" type="number" min="1" class="rfl-input" />
        </label>
        <button class="rfl-btn rfl-btn--primary" :disabled="!canCreate" @click="handleCreate">
          创建关联
        </button>
      </div>
      <p v-if="createdMsg" class="rfl-created">{{ createdMsg }}</p>
    </div>

    <!-- 待休息列表 -->
    <div class="rfl-block">
      <h3 class="rfl-block-title">待休息</h3>
      <div v-if="pendingRest.length > 0" class="rfl-list">
        <div v-for="l in pendingRest" :key="l.focusSessionId" class="rfl-card">
          <div class="rfl-card-top">
            <span class="rfl-card-id">{{ l.focusSessionId }}</span>
            <span class="rfl-card-dur">专注 {{ l.focusDuration }} 分钟</span>
          </div>
          <div class="rfl-card-meta">
            <span class="rfl-meta-item">{{ activityMeta(l.suggestedActivity).icon }} {{ activityMeta(l.suggestedActivity).label }}</span>
            <span class="rfl-meta-item">建议休息 {{ l.suggestedRestDuration }} 分钟</span>
          </div>
          <button class="rfl-btn rfl-btn--small" @click="markTaken(l.focusSessionId)">
            标记已休息
          </button>
        </div>
      </div>
      <p v-else class="rfl-empty">没有待休息的关联，专注与休息已平衡。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFocusRestLink } from '../modules/rest/rest-advanced'
import type { RestActivityType } from '../modules/rest'

const { links, pendingRest, restRate, suggestRest, createLink, markRestTaken } = useFocusRestLink()

const ACTIVITY_META: Record<RestActivityType, { label: string; icon: string }> = {
  meditation: { label: '冥想', icon: '🧘' },
  nap: { label: '小憩', icon: '😴' },
  walk: { label: '散步', icon: '🚶' },
  music: { label: '音乐', icon: '🎵' },
  reading: { label: '闲读', icon: '📖' },
  tea: { label: '品茶', icon: '🍵' },
  stretch: { label: '拉伸', icon: '🤸' },
  vacation: { label: '休假', icon: '🏖' },
  breathing: { label: '深呼吸', icon: '🌬' },
  journal: { label: '日记', icon: '📔' },
  gardening: { label: '园艺', icon: '🌱' },
  social: { label: '社交', icon: '💬' },
}

function activityMeta(a: RestActivityType) {
  return ACTIVITY_META[a] ?? ACTIVITY_META.stretch
}

// ---- 建议预览 ----
const simFocus = ref(25)
const suggestion = ref<{ duration: number; activity: RestActivityType } | null>(null)

function previewSuggestion() {
  if (!simFocus.value || simFocus.value < 1) return
  suggestion.value = suggestRest(simFocus.value)
}

// ---- 新建关联 ----
const sessionId = ref('')
const createFocus = ref(25)
const createdMsg = ref('')

const canCreate = computed(() => sessionId.value.trim().length > 0 && (createFocus.value ?? 0) > 0)

function handleCreate() {
  if (!canCreate.value) return
  const link = createLink(sessionId.value.trim(), createFocus.value)
  createdMsg.value = `已创建「${link.focusSessionId}」关联，建议休息 ${link.suggestedRestDuration} 分钟`
  sessionId.value = ''
  createFocus.value = 25
}

// ---- 标记已休息 ----
function markTaken(id: string) {
  markRestTaken(id, `rest-${Date.now()}`)
}

onMounted(() => {
  previewSuggestion()
})
</script>

<style scoped>
.rfl-panel {
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.10), rgba(138, 154, 122, 0.03));
  border: 1px solid rgba(138, 154, 122, 0.28);
  border-radius: 16px;
  padding: 18px 20px;
  margin-top: 16px;
  color: var(--text-primary, #e8e0d8);
}

.rfl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.rfl-head-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.rfl-title {
  font-size: 16px;
  font-weight: 700;
}

.rfl-sub {
  font-size: 12px;
  opacity: 0.65;
}

.rfl-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.22);
  color: #8a9a7a;
}

.rfl-badge-low {
  background: rgba(196, 106, 90, 0.22);
  color: #c46a5a;
}

.rfl-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(138, 154, 122, 0.2);
}

.rfl-block-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.rfl-hint {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 10px;
}

.rfl-sim,
.rfl-create {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.rfl-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rfl-field-label {
  font-size: 11px;
  opacity: 0.65;
}

.rfl-input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(138, 154, 122, 0.3);
  border-radius: 8px;
  color: inherit;
  padding: 6px 10px;
  font-size: 13px;
  width: 130px;
}

.rfl-btn {
  background: rgba(138, 154, 122, 0.18);
  border: 1px solid rgba(138, 154, 122, 0.4);
  color: inherit;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
}

.rfl-btn--primary {
  background: rgba(138, 154, 122, 0.35);
}

.rfl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.rfl-btn--small {
  padding: 5px 10px;
  font-size: 12px;
}

.rfl-suggestion {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  background: rgba(138, 154, 122, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
}

.rfl-sug-icon {
  font-size: 18px;
}

.rfl-created {
  margin-top: 8px;
  font-size: 12px;
  color: #8a9a7a;
}

.rfl-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rfl-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(138, 154, 122, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
}

.rfl-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.rfl-card-id {
  font-weight: 600;
  font-size: 13px;
}

.rfl-card-dur {
  font-size: 12px;
  opacity: 0.65;
}

.rfl-card-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.rfl-empty {
  font-size: 13px;
  opacity: 0.6;
  padding: 10px 0;
}
</style>
