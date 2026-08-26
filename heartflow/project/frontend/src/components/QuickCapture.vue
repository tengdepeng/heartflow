<template>
  <div class="qc">
    <textarea
      v-model="draft"
      class="qc-input"
      rows="2"
      :placeholder="placeholder"
      @keydown.enter.exact.prevent="commit"
      @blur="commit"
    />
    <div class="qc-foot">
      <div class="qc-tags">
        <span v-for="t in previewTags" :key="t" class="qc-tag">#{{ t }}</span>
        <span v-if="previewTags.length === 0" class="qc-hint">输入即记录 · #标签 自动涌现</span>
      </div>
      <button class="qc-btn" type="button" :disabled="!canCommit" @click="commit">记录</button>
    </div>
    <transition name="qc-toast">
      <span v-if="justSaved" class="qc-toast">已记录 ✓</span>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

withDefaults(
  defineProps<{
    placeholder?: string
  }>(),
  {
    placeholder: '此刻想到什么？回车即记录…',
  },
)

const emit = defineEmits<{
  (e: 'capture', raw: string): void
}>()

const draft = ref('')
const justSaved = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

/** 实时预告将涌现的标签 */
const previewTags = computed(() => {
  const matches = draft.value.match(/(?:^|\s)#([\p{L}\p{N}_]+)/gu) || []
  return [...new Set(matches.map(m => m.replace(/^\s*#/, '').trim()))].filter(Boolean)
})

const canCommit = computed(() => draft.value.trim().length > 0)

function commit() {
  const raw = draft.value.trim()
  if (!raw) return
  emit('capture', raw)
  draft.value = ''
  justSaved.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { justSaved.value = false }, 1600)
}
</script>

<style scoped>
.qc {
  position: relative;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.qc-input {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text-high);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
}

.qc-input::placeholder {
  color: var(--text-secondary);
}

.qc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
}

.qc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-height: 20px;
}

.qc-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.qc-hint {
  font-size: 11px;
  color: var(--text-faint);
}

.qc-btn {
  padding: 5px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.qc-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.18);
}

.qc-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.qc-toast {
  position: absolute;
  right: 12px;
  bottom: -8px;
  font-size: 11px;
  color: var(--accent);
  background: var(--card-bg);
  padding: 1px 8px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
}

.qc-toast-enter-active,
.qc-toast-leave-active {
  transition: opacity 0.3s;
}

.qc-toast-enter-from,
.qc-toast-leave-to {
  opacity: 0;
}
</style>
