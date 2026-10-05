<template>
  <section class="abk-panel" aria-label="AI 问书">
    <header class="abk-head">
      <div class="abk-title-wrap">
        <span class="abk-title">AI 问书</span>
        <span class="abk-sub">{{ bookTitle ? `《${bookTitle}》` : '当前读物' }}</span>
      </div>
      <div class="abk-head-tools">
        <span v-if="available" class="abk-badge on">本地推理 · 不外发</span>
        <span v-else class="abk-badge off">本地模型未就绪</span>
        <button class="abk-close" type="button" title="关闭" @click="emit('close')">×</button>
      </div>
    </header>

    <blockquote v-if="passage" class="abk-passage">{{ passage }}</blockquote>

    <p v-if="!available" class="abk-hint">
      问书由本地 AI 引擎完成，原文与提问均不外发。请先在「AI 模型设置」中配置本地推理端点（如
      localhost）后再来提问。
    </p>

    <template v-else>
      <div class="abk-quick">
        <button
          v-for="q in QUICK_QUESTIONS"
          :key="q"
          class="abk-chip"
          type="button"
          @click="draft = q"
        >{{ q }}</button>
      </div>

      <div class="abk-ask-row">
        <textarea
          v-model="draft"
          class="abk-input"
          rows="2"
          placeholder="就这段原文提问，例如「作者为什么这样说？」"
          @keydown.enter.exact.prevent="submit"
        ></textarea>
        <button
          class="abk-send"
          type="button"
          :disabled="asking || !draft.trim()"
          @click="submit"
        >{{ asking ? '思考中…' : '提问' }}</button>
      </div>

      <div v-if="error" class="abk-error">{{ error }}</div>

      <div v-if="answer" class="abk-answer">
        <span class="abk-answer-label">伴读</span>
        <p class="abk-answer-text">{{ answer }}</p>
      </div>

      <div v-if="history.length" class="abk-foot">
        <button class="abk-reset" type="button" @click="onReset">清空对话</button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAskBook, ASK_BOOK_QUICK_QUESTIONS } from '../modules/reading/ask-book'

const props = withDefaults(
  defineProps<{
    /** 选中的原文段落（作为提问上下文） */
    passage?: string
    /** 书名（展示用） */
    bookTitle?: string
  }>(),
  {
    passage: '',
    bookTitle: '',
  },
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const QUICK_QUESTIONS = ASK_BOOK_QUICK_QUESTIONS
const { available, asking, answer, error, history, refreshAvailability, ask, reset } = useAskBook()
const draft = ref('')

async function submit(): Promise<void> {
  const q = draft.value.trim()
  if (!q) return
  await ask(q, { bookTitle: props.bookTitle, passage: props.passage })
}

function onReset(): void {
  reset()
}

onMounted(() => {
  void refreshAvailability()
})
</script>

<style scoped>
.abk-panel {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: color-mix(in srgb, var(--accent) 4%, transparent);
}

.abk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.abk-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.abk-title {
  font-size: 13px;
  font-weight: 600;
}

.abk-sub {
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.abk-head-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.abk-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.abk-badge.on {
  color: #6f8a63;
  border: 1px solid color-mix(in srgb, #6f8a63 34%, transparent);
}

.abk-badge.off {
  color: #a8865a;
  border: 1px dashed color-mix(in srgb, #a8865a 40%, transparent);
}

.abk-close {
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
}

.abk-close:hover {
  opacity: 1;
}

.abk-passage {
  margin: 10px 0 0;
  padding: 6px 10px;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06);
  font-size: 12px;
  line-height: 1.6;
  opacity: 0.85;
  max-height: 96px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.abk-hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.7;
  opacity: 0.72;
}

.abk-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.abk-chip {
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.28);
  background: transparent;
  color: inherit;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}

.abk-chip:hover {
  background: rgba(var(--accent-rgb), 0.12);
}

.abk-ask-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.abk-input {
  flex: 1 1 auto;
  min-width: 0;
  resize: vertical;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  background: transparent;
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
}

.abk-input:focus {
  outline: none;
  border-color: var(--accent);
}

.abk-send {
  flex: 0 0 auto;
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}

.abk-send:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.22);
}

.abk-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.abk-error {
  margin-top: 10px;
  font-size: 12px;
  color: #c46a5a;
}

.abk-answer {
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: 8px;
  border-left: 2px solid var(--accent);
  background: rgba(var(--accent-rgb), 0.07);
}

.abk-answer-label {
  font-size: 11px;
  opacity: 0.65;
}

.abk-answer-text {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.abk-foot {
  margin-top: 10px;
  text-align: right;
}

.abk-reset {
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

.abk-reset:hover {
  opacity: 1;
  color: var(--accent);
}
</style>
