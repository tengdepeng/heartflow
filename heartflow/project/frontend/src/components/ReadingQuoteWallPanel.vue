<template>
  <section class="rqw-panel" aria-label="金句墙">
    <div class="rqw-head">
      <span class="rqw-title">💬 金句墙</span>
      <span class="rqw-sub">摘录的字句，是阅读留下的回声</span>
    </div>

    <div v-if="excerpts.length === 0" class="rqw-empty">
      <p>金句墙还空着。</p>
      <p class="rqw-empty-hint">在书卷中阅读时选中文字，即可把心动的句子摘录上墙。</p>
    </div>

    <div v-else class="rqw-wall">
      <article
        v-for="ex in excerpts"
        :key="ex.id"
        class="rqw-card"
        :data-test="'rqw-card-' + ex.id"
      >
        <p class="rqw-quote">“{{ ex.text }}”</p>
        <p v-if="ex.note" class="rqw-note">{{ ex.note }}</p>
        <div class="rqw-meta">
          <span class="rqw-source">{{ ex.source || '未命名文本' }}</span>
          <span class="rqw-time">{{ formatTime(ex.createdAt) }}</span>
        </div>
        <button class="rqw-del" type="button" :data-test="'rqw-del-' + ex.id" @click="remove(ex.id)">删除</button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useReading } from '../modules/reading'

const { excerpts, saveExcerpts } = useReading()

function remove(id: string) {
  excerpts.value = excerpts.value.filter(e => e.id !== id)
  saveExcerpts()
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.rqw-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  margin-bottom: 18px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.rqw-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rqw-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
  letter-spacing: 1px;
}

.rqw-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

.rqw-empty {
  text-align: center;
  padding: 48px 20px;
  color: var(--text-secondary);
}

.rqw-empty p {
  margin: 0 0 6px;
  font-size: 14px;
}

.rqw-empty-hint {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.18);
}

.rqw-wall {
  column-count: 2;
  column-gap: 12px;
}

.rqw-card {
  display: inline-block;
  width: 100%;
  break-inside: avoid;
  margin-bottom: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.5);
  border-left: 3px solid rgba(var(--accent-rgb), 0.3);
  transition: background 0.2s, transform 0.15s;
}

.rqw-card:hover {
  background: var(--bg-card);
  transform: translateY(-2px);
}

.rqw-quote {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-bright);
  font-style: italic;
}

.rqw-note {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--accent);
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.06);
}

.rqw-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.25);
}

.rqw-source {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rqw-del {
  margin-top: 8px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(224, 112, 80, 0.4);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.rqw-del:hover {
  color: rgba(224, 112, 80, 0.7);
  background: rgba(224, 112, 80, 0.06);
}

@media (min-width: 640px) {
  .rqw-wall {
    column-count: 3;
  }
}

@media (min-width: 900px) {
  .rqw-wall {
    column-count: 4;
  }
}

@media (max-width: 480px) {
  .rqw-panel {
    padding: 14px 14px;
  }

  .rqw-quote {
    font-size: 13px;
  }
}
</style>
