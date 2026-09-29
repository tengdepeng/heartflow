<template>
  <section class="saa" data-enter aria-label="就地写作助手">
    <header class="saa-head">
      <span class="saa-title">✍️ 就地写作助手</span>
      <span class="saa-sub">本地续写 · 扩写 · 总结 · 改语气 —— 不联网、不落盘</span>
    </header>

    <div class="saa-body">
      <!-- 输入 -->
      <div class="saa-field">
        <label class="saa-field-t" for="saa-src">原文</label>
        <textarea id="saa-src" v-model="source" class="saa-input" rows="5"
          placeholder="粘贴或写入一段文字，助手会在本地为你续写、扩写、总结或调整语气……" data-test="source" />
      </div>

      <!-- 操作 -->
      <div class="saa-actions">
        <button class="saa-act" type="button" :disabled="!source.trim()" data-test="continue" @click="run('continue')">▶ 续写</button>
        <button class="saa-act" type="button" :disabled="!source.trim()" data-test="expand" @click="run('expand')">⇲ 扩写</button>
        <button class="saa-act" type="button" :disabled="!source.trim()" data-test="summarize" @click="run('summarize')">☰ 总结</button>
        <button class="saa-act" type="button" :disabled="!source.trim()" data-test="rewrite" @click="run('rewrite')">✎ 改语气</button>
      </div>

      <!-- 语气选择（仅改语气） -->
      <div v-if="toneVisible" class="saa-tones" data-test="tones">
        <span class="saa-tones-label">语气</span>
        <button v-for="t in TONES" :key="t.key" type="button"
          :class="['saa-tone', { active: tone === t.key }]" @click="tone = t.key">{{ t.label }}</button>
      </div>

      <!-- 结果 -->
      <div v-if="result !== null" class="saa-result" data-test="result">
        <div class="saa-result-head">
          <label class="saa-field-t" for="saa-out">结果</label>
          <span class="saa-mode">{{ result.append ? '已追加到原文末尾' : '已替换原文' }}</span>
        </div>
        <textarea id="saa-out" :value="result.text" class="saa-output" rows="5" readonly data-test="output" />
        <div class="saa-result-ops">
          <button class="saa-op" type="button" data-test="copy" @click="copy(result.text)">{{ copied ? '✓ 已复制' : '复制' }}</button>
          <button class="saa-op saa-op--ghost" type="button" data-test="clear" @click="reset">清空</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { aiAssist } from '../modules/study/ai-assist'
import type { AiAssistAction, AiAssistResult, RewriteTone } from '../modules/study/ai-assist'

const TONES: { key: RewriteTone; label: string }[] = [
  { key: 'formal', label: '正式' },
  { key: 'gentle', label: '温和' },
  { key: 'concise', label: '简洁' },
  { key: 'casual', label: '随性' },
]

const source = ref('')
const tone = ref<RewriteTone>('formal')
const result = ref<AiAssistResult | null>(null)
const copied = ref(false)

const toneVisible = computed(() => !!(result.value && result.value.action === 'rewrite'))

function run(action: AiAssistAction) {
  const r = aiAssist(action, source.value, tone.value)
  result.value = r
  copied.value = false
}

function reset() {
  source.value = ''
  result.value = null
  copied.value = false
}

function copy(text: string) {
  try {
    navigator.clipboard?.writeText(text)
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>

<style scoped>
.saa {
  padding: 4px 2px 16px;
  color: var(--text-primary, #e8e0d8));
}
.saa-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 4px 2px 12px;
  flex-wrap: wrap;
}
.saa-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--accent, #d4a574);
}
.saa-sub {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  letter-spacing: 0.5px;
}
.saa-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.saa-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.saa-field-t {
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.saa-input, .saa-output {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.12));
  color: var(--text-primary, #e8e0d8));
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
}
.saa-input::placeholder {
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}
.saa-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.saa-act {
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.14));
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
  color: var(--accent, #d4a574);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.saa-act:hover:not(:disabled) {
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.12);
}
.saa-act:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.saa-tones {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.saa-tones-label {
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  letter-spacing: 1px;
}
.saa-tone {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.12));
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.saa-tone.active {
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
  border-color: var(--accent, #d4a574);
  color: var(--accent, #d4a574);
}
.saa-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.saa-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.saa-mode {
  font-size: 10px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}
.saa-result-ops {
  display: flex;
  gap: 8px;
}
.saa-op {
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.14));
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
  color: var(--accent, #d4a574);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}
.saa-op--ghost {
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
</style>