<template>
  <section class="hb-panel" aria-label="快乐盒子">
    <div class="hb-panel-head">
      <span class="hb-panel-title">🎁 快乐盒子</span>
      <span class="hb-panel-sub">收进微小而确定的快乐</span>
      <span class="hb-count">{{ total }} 件</span>
    </div>

    <div class="hb-block">
      <span class="hb-block-label">收集快乐</span>
      <textarea v-model="text" class="hb-textarea" rows="2" placeholder="今天有什么值得开心的小事？"></textarea>
      <div class="hb-row">
        <span v-for="t in HAPPY_TAGS" :key="t" class="hb-tag" :class="{ on: selectedTags.includes(t) }" @click="toggleTag(t)">
          {{ t }}
        </span>
      </div>
      <div class="hb-row">
        <button class="hb-btn hb-btn-primary" :disabled="!text.trim()" @click="captureNow">收进盒子</button>
        <button class="hb-btn" :disabled="!items.length" @click="recallNow">随机回顾</button>
        <span v-if="todayCount > 0" class="hb-hint">今日已收集 {{ todayCount }} 条</span>
      </div>
      <div v-if="recalled" class="hb-recalled">
        <span class="hb-recalled-icon">🍀</span>
        <p class="hb-recalled-text">{{ recalled.text }}</p>
        <span class="hb-recalled-meta">{{ recalled.createdAt.slice(0, 10) }} · 被回顾 {{ recalled.recalledCount }} 次</span>
      </div>
    </div>

    <div class="hb-block">
      <span class="hb-block-label">快乐收藏</span>
      <ul v-if="items.length" class="hb-list">
        <li v-for="item in items.slice(0, 20)" :key="item.id" class="hb-item">
          <p class="hb-item-text">{{ item.text }}</p>
          <div class="hb-item-foot">
            <span class="hb-item-date">{{ item.createdAt.slice(0, 10) }}</span>
            <span class="hb-item-tags">{{ item.tags.join(' · ') }}</span>
            <button class="hb-del" @click="remove(item.id)">×</button>
          </div>
        </li>
      </ul>
      <p v-else class="hb-empty">盒子还空着，去收集第一条快乐吧。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHappyBox, HAPPY_TAGS } from '../modules/emotion/happy-box'
import type { HappyItem } from '../modules/emotion/happy-box'

const { items, total, todayCount, load, capture, remove, recall } = useHappyBox()

onMounted(() => load())

const text = ref('')
const selectedTags = ref<string[]>([])
const recalled = ref<HappyItem | null>(null)

function toggleTag(t: string) {
  selectedTags.value = selectedTags.value.includes(t)
    ? selectedTags.value.filter(x => x !== t)
    : [...selectedTags.value, t]
}

function captureNow() {
  const item = capture(text.value, selectedTags.value)
  if (item) {
    text.value = ''
    selectedTags.value = []
  }
}

function recallNow() {
  recalled.value = recall()
}
</script>

<style scoped>
.hb-panel {
  margin: 22px auto 0;
  max-width: 720px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}
.hb-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.hb-panel-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high);
}
.hb-panel-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.hb-count {
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(240, 192, 64, 0.15);
  color: #f0c040;
}
.hb-block {
  padding: 12px 0;
  border-top: 1px dashed var(--border);
}
.hb-block:first-of-type {
  border-top: none;
}
.hb-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-medium);
  margin-bottom: 10px;
}
.hb-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-high);
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
}
.hb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.hb-tag {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.hb-tag.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.1);
}
.hb-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-medium);
  font-size: 13px;
  cursor: pointer;
}
.hb-btn:hover {
  border-color: var(--accent);
  color: var(--text-high);
}
.hb-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.hb-btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
  font-weight: 600;
}
.hb-btn-primary:hover {
  color: var(--bg);
  opacity: 0.9;
}
.hb-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
}
.hb-recalled {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(240, 192, 64, 0.3);
  background: rgba(240, 192, 64, 0.06);
}
.hb-recalled-icon {
  font-size: 18px;
}
.hb-recalled-text {
  margin: 6px 0 4px;
  font-size: 14px;
  color: var(--text-high);
}
.hb-recalled-meta {
  font-size: 11px;
  color: var(--text-dim);
}
.hb-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hb-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(232, 224, 216, 0.05);
  border: 1px solid transparent;
}
.hb-item:hover {
  border-color: var(--border);
}
.hb-item-text {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--text-high);
}
.hb-item-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--text-dim);
}
.hb-item-tags {
  flex: 1;
}
.hb-del {
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 14px;
  cursor: pointer;
}
.hb-del:hover {
  color: #ef4444;
}
.hb-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
}
</style>
