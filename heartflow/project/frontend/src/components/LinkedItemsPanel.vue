<template>
  <div class="lip" data-test="linked-items-panel">
    <div class="lip-head">
      <span class="lip-head-title">连链条目 · {{ items.length }}</span>
      <button type="button" class="lip-select-all" data-test="lip-select-all" @click="onSelectAll">
        整链加入封存
      </button>
    </div>
    <EmptyState v-if="items.length === 0" icon="🔗" title="起点笔记暂无连链" :glow="false" cta-label="" />
    <ul v-else class="lip-list">
      <li
        v-for="it in items"
        :key="it.id"
        class="lip-item"
        :class="{ selected: selectedIds.includes(it.id) }"
        :data-test="`lip-item-${it.id}`"
        :data-relation="it.relation"
        @click="emit('toggle', it.id)"
      >
        <span class="lip-badge">{{ relationLabel(it.relation) }}</span>
        <span class="lip-title">{{ titleOf(it.id) }}</span>
        <span v-if="it.archived" class="lip-archived">已归档</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from './EmptyState.vue'
import { useNoteLinks, type LinkedItem } from '../modules/study/note-links'
import type { Note } from '../types'

const props = defineProps<{
  /** 起点笔记 id（连链聚合的锚点） */
  noteId: string
  /** 全量笔记集（死链判定与标题回填用） */
  notes: Note[]
  /** 已选中的笔记 id 集（与胶囊封存选择共享） */
  selectedIds: string[]
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'select-all', ids: string[]): void
}>()

const { getLinkedItemsForNote } = useNoteLinks()

const items = computed<LinkedItem[]>(() =>
  props.noteId
    ? getLinkedItemsForNote(props.noteId, props.notes, { includeBacklinks: true })
    : [],
)

const RELATION_LABEL: Record<LinkedItem['relation'], string> = {
  self: '本笔记',
  outgoing: '出链',
  backlink: '反链',
}

function relationLabel(relation: LinkedItem['relation']): string {
  return RELATION_LABEL[relation]
}

function titleOf(id: string): string {
  return props.notes.find(n => n.id === id)?.title?.trim() || '未命名笔记'
}

function onSelectAll() {
  emit('select-all', items.value.map(i => i.id))
}
</script>

<style scoped>
.lip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
}
.lip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.lip-head-title { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
.lip-select-all {
  padding: 4px 10px;
  border: 1px solid rgba(160, 124, 140, 0.4);
  border-radius: 6px;
  background: rgba(160, 124, 140, 0.1);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  cursor: pointer;
}
.lip-select-all:hover { background: rgba(160, 124, 140, 0.2); }

.lip-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
}
.lip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.lip-item:hover { background: rgba(255, 255, 255, 0.06); }
.lip-item.selected { border-color: #a07c8c; background: rgba(160, 124, 140, 0.14); }

.lip-badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(124, 108, 240, 0.16);
}
.lip-item[data-relation='self'] .lip-badge { background: rgba(52, 211, 153, 0.18); }
.lip-item[data-relation='backlink'] .lip-badge { background: rgba(245, 158, 11, 0.18); }

.lip-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lip-archived {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}
</style>