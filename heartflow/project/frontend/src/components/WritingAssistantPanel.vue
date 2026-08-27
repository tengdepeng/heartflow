<template>
  <section class="wa-panel" aria-label="写作辅助">
    <div class="wa-panel-head">
      <span class="wa-panel-title">✍️ 写作辅助</span>
      <span class="wa-panel-sub">每日提示 · 写作记录 · 生词沉淀</span>
    </div>

    <!-- 概览 -->
    <div class="wa-block">
      <span class="wa-block-label">写作概览</span>
      <div class="wa-stats">
        <div class="wa-stat">
          <span class="wa-stat-num">{{ stats?.totalRecords ?? 0 }}</span>
          <span class="wa-stat-label">篇数</span>
        </div>
        <div class="wa-stat">
          <span class="wa-stat-num">{{ stats?.totalWordCount ?? 0 }}</span>
          <span class="wa-stat-label">总字数</span>
        </div>
        <div class="wa-stat">
          <span class="wa-stat-num">{{ stats?.currentStreak ?? 0 }}</span>
          <span class="wa-stat-label">连续天数</span>
        </div>
        <div class="wa-stat">
          <span class="wa-stat-num">{{ stats?.totalNewWords ?? 0 }}</span>
          <span class="wa-stat-label">新词沉淀</span>
        </div>
      </div>
      <p v-if="stats && stats.favoriteStyle" class="wa-hint">最常用风格：{{ stats.favoriteStyle }}</p>
    </div>

    <!-- 今日提示 -->
    <div class="wa-block">
      <span class="wa-block-label">今日提示</span>
      <div class="wa-prompt">
        <span class="wa-prompt-title">{{ dailyPrompt?.title }}</span>
        <p class="wa-prompt-desc">{{ dailyPrompt?.description }}</p>
        <span class="wa-prompt-meta">难度 {{ DIFFICULTY_LABELS[dailyPrompt?.difficulty ?? 'medium'] }} · 建议 {{ dailyPrompt?.suggestedLength }} 字</span>
      </div>
    </div>

    <!-- 记录写作 -->
    <div class="wa-block">
      <span class="wa-block-label">记录写作</span>
      <textarea v-model="content" class="wa-textarea" rows="4" placeholder="写下你的文字…"></textarea>
      <div class="wa-row">
        <input v-model.number="duration" type="number" min="0" class="wa-input wa-num" placeholder="时长(分)" />
        <button class="wa-btn wa-btn-primary" :disabled="!content.trim()" @click="record">记录</button>
      </div>
    </div>

    <!-- 写作记录 -->
    <div v-if="assistant.records.value.length" class="wa-block">
      <span class="wa-block-label">写作记录 · {{ assistant.records.value.length }}</span>
      <div v-for="r in assistant.records.value.slice(0, 8)" :key="r.id" class="wa-record">
        <p class="wa-record-content">{{ r.content.slice(0, 80) }}{{ r.content.length > 80 ? '…' : '' }}</p>
        <div class="wa-record-meta">
          <span class="wa-record-num">{{ r.wordCount }} 字</span>
          <span v-if="r.usedWords.length" class="wa-record-used">用词 {{ r.usedWords.join('、') }}</span>
          <span v-if="r.newWords.length" class="wa-record-new">新词 {{ r.newWords.slice(0, 5).join('、') }}</span>
          <span class="wa-record-time">{{ fmt(r.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 自定义提示 -->
    <div class="wa-block">
      <span class="wa-block-label">自定义提示</span>
      <div class="wa-row">
        <select v-model="promptForm.type" class="wa-select">
          <option value="daily">日常</option>
          <option value="themed">主题</option>
          <option value="reflection">反思</option>
          <option value="challenge">挑战</option>
          <option value="vocabulary">词汇</option>
        </select>
        <input v-model="promptForm.title" class="wa-input wa-grow" placeholder="标题…" />
      </div>
      <div class="wa-row">
        <input v-model="promptForm.description" class="wa-input wa-grow" placeholder="描述…" />
        <select v-model="promptForm.difficulty" class="wa-select">
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
        <input v-model.number="promptForm.suggestedLength" type="number" min="0" class="wa-input wa-num" placeholder="字数" />
      </div>
      <button class="wa-btn" :disabled="!promptForm.title.trim()" @click="addPrompt">添加提示</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useWritingAssistant } from '../modules/word-mirror/text-analysis'
import type { WritingPrompt } from '../modules/word-mirror/text-analysis'
import type { WordEntry } from '../modules/word-mirror/types'

const props = defineProps<{ words: WordEntry[] }>()

const DIFFICULTY_LABELS: Record<WritingPrompt['difficulty'], string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const assistant = useWritingAssistant()
onMounted(() => assistant.loadAll())

const content = ref('')
const duration = ref(0)
const promptForm = reactive({
  type: 'daily' as WritingPrompt['type'],
  title: '',
  description: '',
  difficulty: 'medium' as WritingPrompt['difficulty'],
  suggestedLength: 200,
})

const dailyPrompt = computed(() => assistant.getDailyPrompt())
const stats = computed(() => assistant.getWritingStats())

function record() {
  assistant.recordWriting(content.value, props.words, undefined, duration.value)
  content.value = ''
  duration.value = 0
}

function addPrompt() {
  assistant.addPrompt({
    type: promptForm.type,
    title: promptForm.title.trim(),
    description: promptForm.description.trim(),
    difficulty: promptForm.difficulty,
    suggestedLength: promptForm.suggestedLength || 200,
  })
  promptForm.title = ''
  promptForm.description = ''
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.wa-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.wa-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.wa-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.wa-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.wa-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.wa-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.wa-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.wa-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.wa-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #c9d6b8;
}
.wa-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.wa-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
  margin: 8px 0 0;
}
.wa-prompt {
  border-left: 3px solid rgba(138, 154, 122, 0.6);
  padding: 4px 12px;
}
.wa-prompt-title {
  font-size: 14px;
  font-weight: 600;
  color: #e8e4d8;
}
.wa-prompt-desc {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.7);
  margin: 4px 0;
}
.wa-prompt-meta {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.wa-textarea {
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 155, 122, 0.2);
  border-radius: 8px;
  color: #e8e4d8;
  font-size: 13px;
  padding: 10px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}
.wa-textarea::placeholder {
  color: rgba(232, 228, 216, 0.4);
}
.wa-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.wa-grow {
  flex: 1;
  min-width: 120px;
}
.wa-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 155, 122, 0.2);
  border-radius: 6px;
  color: #e8e4d8;
  font-size: 12px;
  padding: 6px 10px;
  outline: none;
}
.wa-input::placeholder {
  color: rgba(232, 228, 216, 0.4);
}
.wa-num {
  width: 80px;
}
.wa-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 155, 122, 0.2);
  border-radius: 6px;
  color: #e8e4d8;
  font-size: 12px;
  padding: 6px 8px;
  outline: none;
}
.wa-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 6px;
  color: rgba(232, 228, 216, 0.85);
  font-size: 12px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.wa-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}
.wa-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.wa-btn-primary {
  background: rgba(138, 154, 122, 0.3);
  border-color: rgba(138, 154, 122, 0.6);
  color: #e8e4d8;
}
.wa-record {
  padding: 8px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.12);
}
.wa-record:last-child {
  border-bottom: none;
}
.wa-record-content {
  font-size: 13px;
  color: rgba(232, 228, 216, 0.85);
  margin: 0 0 4px;
}
.wa-record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
}
.wa-record-num {
  color: rgba(232, 228, 216, 0.5);
}
.wa-record-used {
  color: rgba(138, 154, 122, 0.9);
}
.wa-record-new {
  color: rgba(240, 192, 64, 0.9);
}
.wa-record-time {
  color: rgba(232, 228, 216, 0.4);
}
</style>
