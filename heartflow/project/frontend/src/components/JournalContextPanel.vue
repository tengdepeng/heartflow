<template>
  <section class="jcp" aria-label="手札建议">
    <div class="jcp-head">
      <span class="jcp-title">📓 今日手札建议</span>
      <span class="jcp-sub">数据驱动 · 点一张卡即预填，零输入成本</span>
    </div>

    <!-- 元数据条（Day One 式：紧凑只读、本地生成） -->
    <div v-if="metadataBar.length" class="jcp-meta" data-test="jcp-meta">
      <span
        v-for="c in metadataBar"
        :key="c.key"
        class="jcp-chip"
        :class="`jcp-chip--${c.tone}`"
        :data-test="`jcp-chip-${c.key}`"
      >
        <span class="jcp-chip-icon">{{ c.icon }}</span>
        <span class="jcp-chip-label">{{ c.label }}</span>
        <span class="jcp-chip-value">{{ c.value }}</span>
      </span>
    </div>
    <p v-else class="jcp-meta-empty" data-test="jcp-meta-empty">
      今日暂无运行数据 —— 仍可直接书写。
    </p>

    <!-- 建议卡（Apple Journal 式：点选即预填脚手架） -->
    <div class="jcp-cards" data-test="jcp-cards">
      <button
        v-for="card in suggestions"
        :key="card.id"
        type="button"
        class="jcp-card"
        :class="`jcp-card--${card.priority}`"
        :data-test="`jcp-card-${card.id}`"
        @click="apply(card)"
      >
        <span class="jcp-card-icon">{{ card.icon }}</span>
        <span class="jcp-card-body">
          <span class="jcp-card-title">{{ card.title }}</span>
          <span class="jcp-card-hint">{{ card.hint }}</span>
        </span>
        <span class="jcp-card-cta">记一笔</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, toRef } from 'vue'
import { useJournalContext } from '../modules/anchor/journal-context'
import type { SuggestionCard } from '../modules/anchor/journal-context'
import type { Anchor } from '../modules/anchor/types'
import type { JournalType } from '../modules/anchor/anchor-journal'

const props = defineProps<{ anchors: Anchor[] }>()

const emit = defineEmits<{
  (e: 'apply', payload: { prefill: string; type: JournalType }): void
}>()

const { metadataBar, suggestions, refresh } = useJournalContext(toRef(props, 'anchors'))

onMounted(() => refresh())

function apply(card: SuggestionCard): void {
  emit('apply', { prefill: card.prefill, type: card.type })
}
</script>

<style scoped>
.jcp {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(138, 154, 122, 0.2);
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.08), rgba(255, 255, 255, 0.015));
}
.jcp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.jcp-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.jcp-sub {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

/* 元数据条 */
.jcp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.jcp-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e0d8);
}
.jcp-chip-icon {
  font-size: 12px;
  line-height: 1;
}
.jcp-chip-label {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.jcp-chip-value {
  font-weight: 600;
}
.jcp-chip--focus { border-color: rgba(240, 192, 64, 0.4); }
.jcp-chip--focus .jcp-chip-value { color: #f0c040; }
.jcp-chip--emotion { border-color: rgba(200, 138, 160, 0.4); }
.jcp-chip--emotion .jcp-chip-value { color: #c88aa0; }
.jcp-chip--weather { border-color: rgba(128, 184, 208, 0.4); }
.jcp-chip--weather .jcp-chip-value { color: #80b8d0; }
.jcp-chip--body { border-color: rgba(138, 154, 122, 0.4); }
.jcp-chip--body .jcp-chip-value { color: #8a9a7a; }
.jcp-chip--anchor { border-color: rgba(196, 106, 90, 0.4); }
.jcp-chip--anchor .jcp-chip-value { color: #c46a5a; }
.jcp-chip--memory { border-color: rgba(144, 128, 184, 0.4); }
.jcp-chip--memory .jcp-chip-value { color: #9080b8; }
.jcp-meta-empty {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.45));
}

/* 建议卡 */
.jcp-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.jcp-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  background: rgba(255, 255, 255, 0.025);
  color: var(--text-primary, #e8e0d8);
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.jcp-card:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.05);
}
.jcp-card--high {
  border-color: rgba(240, 192, 64, 0.4);
}
.jcp-card--medium {
  border-color: rgba(138, 154, 122, 0.32);
}
.jcp-card--low {
  border-color: rgba(255, 255, 255, 0.1);
}
.jcp-card-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}
.jcp-card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.jcp-card-title {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jcp-card-hint {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jcp-card-cta {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #f0c040;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(240, 192, 64, 0.1);
}
</style>
