<template>
  <section class="pp" aria-label="文本速识">
    <div class="pp-head">
      <span class="pp-title">🔍 文本速识</span>
      <span class="pp-sub">剪贴板历史 · 实体速识 · 快捷卡片</span>
    </div>

    <!-- 操作栏 -->
    <div class="pp-actions">
      <button type="button" class="pp-btn" :class="{ on: listening }" @click="toggleListening">
        {{ listening ? '⏸ 停止监听' : '▶ 监听剪贴板' }}
      </button>
      <button type="button" class="pp-btn" @click="capture">📋 读取剪贴板</button>
      <button type="button" class="pp-btn pp-btn--danger" :disabled="!clips.length" @click="clearAll">
        清空
      </button>
    </div>

    <!-- 手动录入 -->
    <div class="pp-block">
      <div class="pp-input-row">
        <input v-model="draft" class="pp-input" placeholder="粘贴或输入一段文本，识别其中的链接 / 邮箱 / 电话…" @keyup.enter="addManual" />
        <button type="button" class="pp-btn" :disabled="!draft.trim()" @click="addManual">识别</button>
      </div>
      <p v-if="lastCaptured" class="pp-last">最近捕获：{{ lastCaptured.text.slice(0, 60) }}{{ lastCaptured.text.length > 60 ? '…' : '' }}</p>
    </div>

    <!-- 剪贴板历史 -->
    <div class="pp-block">
      <span class="pp-block-label">剪贴板历史 · {{ clips.length }} 条</span>
      <div v-if="clips.length" class="pp-list">
        <div v-for="c in clips" :key="c.id" class="pp-item">
          <div class="pp-item-head">
            <span class="pp-item-time">{{ fmtTime(c.capturedAt) }}</span>
            <span class="pp-item-len">{{ c.length }} 字</span>
            <button type="button" class="pp-item-del" @click="remove(c.id)">✕</button>
          </div>
          <p class="pp-item-text">{{ c.text }}</p>
          <div v-if="c.entityTypes.length" class="pp-item-tags">
            <span v-for="t in c.entityTypes" :key="t" class="pp-tag">
              {{ ENTITY_TYPE_META[t].icon }} {{ ENTITY_TYPE_META[t].label }}
            </span>
          </div>
          <p v-else class="pp-item-none">未识别到常见实体</p>
        </div>
      </div>
      <p v-else class="pp-empty">暂无剪贴板记录。开启监听后，复制文本会自动收录。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import {
  useTextSense,
  ENTITY_TYPE_META,
} from '../modules/text-sense'

const sense = useTextSense()

const clips = computed(() => sense.clips.value)
const listening = computed(() => sense.listening.value)
const lastCaptured = computed(() => sense.lastCaptured.value)

const draft = ref('')

function toggleListening() {
  if (listening.value) sense.stopListening()
  else sense.startListening()
}

async function capture() {
  await sense.captureFromNavigator()
}

function addManual() {
  const text = draft.value.trim()
  if (!text) return
  try {
    sense.addClip(text)
    draft.value = ''
  } catch {
    /* 空文本已拦截 */
  }
}

function remove(id: string) {
  sense.removeClip(id)
}

function clearAll() {
  sense.clearClips()
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onUnmounted(() => {
  sense.stopListening()
})
</script>

<style scoped>
.pp {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.pp-title {
  font-size: 16px;
  font-weight: 700;
}
.pp-sub {
  font-size: 12px;
  opacity: 0.6;
}
.pp-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pp-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.35);
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}
.pp-btn.on {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: var(--accent);
}
.pp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pp-btn--danger {
  border-color: rgba(196, 106, 90, 0.5);
  color: #c46a5a;
}
.pp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
}
.pp-block-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}
.pp-input-row {
  display: flex;
  gap: 8px;
}
.pp-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: transparent;
  color: inherit;
  font-size: 12px;
}
.pp-last {
  font-size: 11px;
  opacity: 0.6;
  margin: 0;
}
.pp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pp-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}
.pp-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pp-item-time {
  font-size: 11px;
  opacity: 0.6;
}
.pp-item-len {
  font-size: 11px;
  opacity: 0.5;
}
.pp-item-del {
  margin-left: auto;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  font-size: 12px;
}
.pp-item-text {
  font-size: 12px;
  margin: 0;
  word-break: break-all;
  line-height: 1.5;
}
.pp-item-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pp-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.12);
}
.pp-item-none {
  font-size: 11px;
  opacity: 0.5;
  margin: 0;
}
.pp-empty {
  font-size: 12px;
  opacity: 0.55;
  margin: 0;
}
</style>
