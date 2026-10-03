<template>
  <section class="tp-panel" aria-label="通话磁带">
    <div class="tp-panel-head">
      <span class="tp-panel-title">📼 通话磁带</span>
      <span class="tp-panel-sub">老式磁带盒 · 本地陈列</span>
    </div>

    <!-- 概览 -->
    <div class="tp-block">
      <div class="tp-stats">
        <div class="tp-stat">
          <span class="tp-stat-num">{{ overview.count }}</span>
          <span class="tp-stat-label">磁带</span>
        </div>
        <div class="tp-stat">
          <span class="tp-stat-num">{{ overview.totalLabel }}</span>
          <span class="tp-stat-label">总时长</span>
        </div>
        <div class="tp-stat">
          <span class="tp-stat-num">{{ overview.participatedPeople.length }}</span>
          <span class="tp-stat-label">参与人</span>
        </div>
        <div class="tp-stat">
          <span class="tp-stat-num">{{ overview.transcriptWords }}</span>
          <span class="tp-stat-label">转录字数</span>
        </div>
        <!-- INCR-451：recentTapes 此前引擎已算好却零 UI 消费 -->
        <div class="tp-stat">
          <span class="tp-stat-num">{{ recentCount }}</span>
          <span class="tp-stat-label">近30天新增</span>
        </div>
      </div>
    </div>

    <!-- 导入 -->
    <div class="tp-block">
      <span class="tp-block-label">导入磁带</span>
      <div class="tp-import-row">
        <input v-model="title" class="tp-input tp-title" placeholder="磁带标题" />
        <input v-model="participants" class="tp-input tp-participants" placeholder="参与人（逗号分隔）" />
        <input v-model.number="duration" type="number" min="0" class="tp-input tp-duration" placeholder="时长(秒)" />
      </div>
      <textarea v-model="transcript" class="tp-input tp-textarea" placeholder="转录文本（可选）" />
      <button class="tp-btn tp-btn-primary" :disabled="!title.trim()" @click="importTape">导入</button>
    </div>

    <!-- 列表 -->
    <div v-if="filteredTapes.length" class="tp-block">
      <div class="tp-list-head">
        <span class="tp-block-label">磁带架（{{ filteredTapes.length }}）</span>
        <input v-model="query" class="tp-input tp-search" placeholder="搜索标题/参与人/内容…" />
      </div>
      <div v-for="t in filteredTapes" :key="t.id" class="tp-tape">
        <div class="tp-tape-head">
          <span class="tp-tape-title">{{ t.title }}</span>
          <span class="tp-tape-duration">{{ formatTapeDuration(t.durationSeconds) }}</span>
          <button class="tp-btn tp-btn-danger" @click="remove(t.id)">删除</button>
        </div>
        <div class="tp-tape-meta">
          <span>{{ t.participants.join('、') || '—' }}</span>
          <span>{{ t.importDate.slice(0, 10) }}</span>
        </div>
        <button v-if="t.transcript" class="tp-expand" @click="expandedId = expandedId === t.id ? null : t.id">
          {{ expandedId === t.id ? '收起转录' : '展开转录' }}
        </button>
        <p v-if="expandedId === t.id && t.transcript" class="tp-transcript">{{ t.transcript }}</p>
      </div>
    </div>
    <p v-else class="tp-hint">还没有磁带。导入一段通话记录，收进磁带架。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTapes, tapeOverview, searchTapes, formatTapeDuration, recentTapes } from '../modules/study/tapes'

const tapesApi = useTapes()

const title = ref('')
const participants = ref('')
const duration = ref(0)
const transcript = ref('')
const query = ref('')
const expandedId = ref<string | null>(null)

const overview = computed(() => tapeOverview(tapesApi.tapes.value))
const recentCount = computed(() => recentTapes(tapesApi.tapes.value))
const filteredTapes = computed(() => searchTapes(tapesApi.tapes.value, query.value))

function importTape() {
  if (!title.value.trim()) return
  const people = participants.value
    .split(/[,，]/)
    .map(p => p.trim())
    .filter(Boolean)
  tapesApi.importTape(title.value, people, duration.value || 0, transcript.value.trim())
  title.value = ''
  participants.value = ''
  duration.value = 0
  transcript.value = ''
}

function remove(id: string) {
  tapesApi.removeTape(id)
  if (expandedId.value === id) expandedId.value = null
}
</script>

<style scoped>
.tp-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.tp-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.tp-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.tp-panel-sub {
  font-size: 12px;
  color: #8a97ad;
}
.tp-block { margin-bottom: 12px; }
.tp-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.tp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.tp-stat {
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.tp-stat-num {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.tp-stat-label {
  display: block;
  font-size: 11px;
  color: #8a97ad;
  margin-top: 2px;
}
.tp-import-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.tp-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 13px;
  min-width: 0;
  max-width: 100%;
}
.tp-title { flex: 2; }
.tp-participants { flex: 2; }
.tp-duration { flex: 1; }
.tp-textarea {
  width: 100%;
  min-height: 56px;
  resize: vertical;
  margin-bottom: 8px;
  font-family: inherit;
}
.tp-search { width: 180px; }
.tp-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.tp-btn-primary {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.tp-btn-danger {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.4);
}
.tp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.tp-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.tp-list-head .tp-block-label { margin-bottom: 0; }
.tp-tape {
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.tp-tape-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.tp-tape-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #9fc4e8;
}
.tp-tape-duration {
  font-size: 12px;
  color: #8a97ad;
}
.tp-tape-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #7a879c;
  margin-top: 4px;
}
.tp-expand {
  margin-top: 6px;
  background: none;
  border: none;
  color: #8a97ad;
  font-size: 12px;
  cursor: pointer;
}
.tp-expand:hover { color: #aab6c9; }
.tp-transcript {
  font-size: 12px;
  color: #c6d0e0;
  line-height: 1.6;
  margin: 6px 0 0;
  border-top: 1px solid rgba(140, 160, 190, 0.1);
  padding-top: 6px;
}
.tp-hint {
  font-size: 12px;
  color: #7a879c;
  margin: 8px 0 0;
}
@media (max-width: 640px) {
  .tp-import-row {
    flex-wrap: wrap;
  }
  .tp-title,
  .tp-participants,
  .tp-duration {
    flex: 1 1 100%;
  }
  .tp-search {
    width: 100%;
  }
}
</style>
