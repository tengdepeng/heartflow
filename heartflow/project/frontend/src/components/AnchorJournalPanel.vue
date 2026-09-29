<template>
  <section class="ajp" aria-label="手札档案">
    <div class="ajp-head">
      <span class="ajp-title">📖 手札档案</span>
      <span class="ajp-sub">日记 · 复盘 · 洞见 · 感恩</span>
    </div>

    <!-- 手札统计 -->
    <div class="ajp-block">
      <div class="ajp-block-title">📊 手札统计</div>
      <div class="ajp-stats">
        <div class="ajp-stat">
          <span class="ajp-stat-value">{{ stats.total }}</span>
          <span class="ajp-stat-label">总手札</span>
        </div>
        <div class="ajp-stat">
          <span class="ajp-stat-value">{{ stats.diary }}</span>
          <span class="ajp-stat-label">日记</span>
        </div>
        <div class="ajp-stat">
          <span class="ajp-stat-value">{{ stats.review }}</span>
          <span class="ajp-stat-label">复盘</span>
        </div>
        <div class="ajp-stat">
          <span class="ajp-stat-value">{{ stats.insight + stats.gratitude }}</span>
          <span class="ajp-stat-label">洞见+感恩</span>
        </div>
      </div>
    </div>

    <!-- 新建手札 -->
    <div class="ajp-block">
      <div class="ajp-block-title">✍️ 新建手札</div>
      <div class="ajp-form">
        <select v-model="form.anchorId" class="ajp-input ajp-select">
          <option value="">选择关联锚点</option>
          <option v-for="a in props.anchors" :key="a.id" :value="a.id">{{ a.text }}</option>
        </select>
        <input v-model="form.title" type="text" class="ajp-input" placeholder="标题（可选）" />
        <div class="ajp-type-row">
          <button
            v-for="t in TYPE_ORDER"
            :key="t"
            :class="['ajp-type-chip', { on: form.type === t }]"
            @click="form.type = t"
          >
            {{ JOURNAL_TYPE_ICONS[t] }} {{ JOURNAL_TYPE_LABELS[t] }}
          </button>
        </div>
        <textarea v-model="form.content" class="ajp-textarea" placeholder="写下与这个锚点相关的思绪…" rows="3"></textarea>
        <div class="ajp-row">
          <input v-model="form.mood" type="text" class="ajp-input" placeholder="情绪标签（可选）" />
          <button class="ajp-btn ajp-btn--primary" :disabled="!canCreate" @click="createJournal">
            保存手札
          </button>
        </div>
      </div>
    </div>

    <!-- 手札列表 -->
    <div class="ajp-block">
      <div class="ajp-block-title">🗂️ 手札列表</div>
      <div v-if="journalList.length" class="ajp-list">
        <div v-for="j in journalList" :key="j.id" class="ajp-item">
          <div class="ajp-item-head">
            <span class="ajp-item-icon">{{ JOURNAL_TYPE_ICONS[j.type] }}</span>
            <div class="ajp-item-info">
              <span class="ajp-item-title">{{ j.title || '（无标题）' }}</span>
              <span class="ajp-item-meta">
                {{ JOURNAL_TYPE_LABELS[j.type] }} · {{ anchorText(j.anchorId) }} · {{ dateLabel(j.createdAt) }}{{ j.mood ? ' · ' + j.mood : '' }}
              </span>
            </div>
            <button class="ajp-btn ajp-btn--danger" @click="removeJournal(j)">删除</button>
          </div>
          <p class="ajp-item-content">{{ j.content }}</p>
        </div>
      </div>
      <div v-else class="ajp-empty">暂无手札，为锚点写下第一篇手札吧。</div>
    </div>

    <!-- 光丝连接 -->
    <div class="ajp-block">
      <div class="ajp-block-title">🔗 光丝连接</div>
      <div v-if="threads.length" class="ajp-thread-list">
        <div v-for="(t, i) in threads" :key="i" class="ajp-thread">
          <span class="ajp-thread-strength" :style="{ background: strengthColor(t.strength) }">
            {{ Math.round(t.strength * 100) }}
          </span>
          <div class="ajp-thread-info">
            <span class="ajp-thread-pair">{{ anchorText(t.sourceId) }} ↔ {{ anchorText(t.targetId) }}</span>
            <span class="ajp-thread-reason">{{ t.reason }}</span>
          </div>
        </div>
      </div>
      <div v-else class="ajp-empty">暂无光丝连接，锚点间共享标签或同日安放会产生连接。</div>
    </div>

    <!-- 年尺度摘要 -->
    <div class="ajp-block">
      <div class="ajp-block-title">📅 {{ currentYear }} 年尺度摘要</div>
      <div v-if="yearSummary.totalAnchors > 0" class="ajp-year">
        <div class="ajp-year-stats">
          <span class="ajp-year-chip">总锚点 {{ yearSummary.totalAnchors }}</span>
          <span class="ajp-year-chip">完成率 {{ yearSummary.completionRate }}%</span>
        </div>
        <div v-if="yearSummary.topTags.length" class="ajp-year-tags">
          <span class="ajp-year-label">高频标签</span>
          <span v-for="t in yearSummary.topTags.slice(0, 5)" :key="t.tag" class="ajp-tag">{{ t.tag }} ×{{ t.count }}</span>
        </div>
        <div v-if="yearSummary.topCategories.length" class="ajp-year-cats">
          <span class="ajp-year-label">高频分类</span>
          <span v-for="c in yearSummary.topCategories.slice(0, 5)" :key="c.category" class="ajp-tag">{{ c.category }} ×{{ c.count }}</span>
        </div>
      </div>
      <div v-else class="ajp-empty">今年暂无锚点数据。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  useAnchorJournal,
  JOURNAL_TYPE_LABELS,
  JOURNAL_TYPE_ICONS,
} from '../modules/anchor/anchor-journal'
import type { JournalType } from '../modules/anchor/anchor-journal'
import type { Anchor } from '../modules/anchor/types'

const props = defineProps<{ anchors: Anchor[] }>()

const {
  load,
  getAll,
  create,
  remove,
  computeLightThreads,
  getYearScaleSummary,
} = useAnchorJournal()

const TYPE_ORDER: JournalType[] = ['diary', 'review', 'insight', 'gratitude']

const currentYear = new Date().getFullYear()

const form = ref<{ anchorId: string; title: string; content: string; type: JournalType; mood: string }>({
  anchorId: '',
  title: '',
  content: '',
  type: 'diary',
  mood: '',
})

const journalList = computed(() => getAll())

const stats = computed(() => {
  const all = getAll()
  return {
    total: all.length,
    diary: all.filter(j => j.type === 'diary').length,
    review: all.filter(j => j.type === 'review').length,
    insight: all.filter(j => j.type === 'insight').length,
    gratitude: all.filter(j => j.type === 'gratitude').length,
  }
})

const threads = computed(() => computeLightThreads(props.anchors, getAll()))

const yearSummary = computed(() => getYearScaleSummary(currentYear, props.anchors, getAll()))

const canCreate = computed(() => Boolean(form.value.anchorId && form.value.content.trim()))

onMounted(() => {
  load()
})

function anchorText(id: string): string {
  const a = props.anchors.find(x => x.id === id)
  return a ? a.text : '未知锚点'
}

function dateLabel(iso: string): string {
  return iso.slice(0, 10)
}

function strengthColor(s: number): string {
  if (s >= 0.6) return '#8a9a7a'
  if (s >= 0.3) return '#f0c040'
  return '#c46a5a'
}

function createJournal() {
  if (!canCreate.value) return
  create({
    anchorId: form.value.anchorId,
    title: form.value.title.trim() || '手札',
    content: form.value.content.trim(),
    type: form.value.type,
    mood: form.value.mood.trim() || undefined,
  })
  form.value = { anchorId: '', title: '', content: '', type: 'diary', mood: '' }
}

function removeJournal(j: { id: string }) {
  remove(j.id)
}
</script>

<style scoped>
.ajp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--bg-panel, #1a1612);
}
.ajp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ajp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.ajp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ajp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.06);
  border: 1px solid rgba(138, 154, 122, 0.16);
}
.ajp-block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.ajp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ajp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.ajp-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #f0c040;
}
.ajp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ajp-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ajp-input {
  padding: 6px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
  outline: none;
}
.ajp-input::placeholder {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ajp-select {
  appearance: none;
}
.ajp-textarea {
  padding: 6px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}
.ajp-textarea::placeholder {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ajp-type-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ajp-type-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.ajp-type-chip.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.ajp-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ajp-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.ajp-btn:hover {
  border-color: #f0c040;
  color: #f0c040;
}
.ajp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ajp-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
}
.ajp-btn--danger {
  border-color: rgba(196, 106, 90, 0.4);
  color: #c46a5a;
}
.ajp-btn--danger:hover {
  border-color: #c46a5a;
  color: #c46a5a;
}
.ajp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ajp-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.ajp-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ajp-item-icon {
  font-size: 16px;
}
.ajp-item-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ajp-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.ajp-item-meta {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ajp-item-head .ajp-btn {
  margin-left: auto;
}
.ajp-item-content {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  white-space: pre-wrap;
  word-break: break-word;
}
.ajp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ajp-thread-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ajp-thread {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.ajp-thread-strength {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #1a1a1a;
}
.ajp-thread-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ajp-thread-pair {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.ajp-thread-reason {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ajp-year {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ajp-year-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ajp-year-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(240, 192, 64, 0.08);
  border: 1px solid rgba(240, 192, 64, 0.25);
  color: #f0c040;
  font-size: 11px;
}
.ajp-year-tags,
.ajp-year-cats {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ajp-year-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.ajp-tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.12);
  border: 1px solid rgba(138, 154, 122, 0.25);
  color: #8a9a7a;
  font-size: 11px;
}
</style>
