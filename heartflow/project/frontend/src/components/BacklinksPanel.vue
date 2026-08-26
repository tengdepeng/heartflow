<template>
  <div v-if="hasLinks" class="backlinks-panel">
    <section v-if="outgoing.length" class="bl-section">
      <h4 class="bl-title">本笔记引用</h4>
      <ul class="bl-list">
        <li
          v-for="l in outgoing"
          :key="l.id"
          class="bl-item"
          @click="open(l.targetId)"
        >
          <span class="bl-dir">→</span>{{ titleOf(l.targetId) }}
          <span v-if="blockText(l)" class="bl-block">「{{ blockText(l) }}」</span>
        </li>
      </ul>
    </section>

    <section v-if="backlinks.length" class="bl-section">
      <h4 class="bl-title">被引用 · 反向链接</h4>
      <ul class="bl-list">
        <li
          v-for="l in backlinks"
          :key="l.id"
          class="bl-item"
          @click="open(l.sourceId)"
        >
          <span class="bl-dir">←</span>{{ titleOf(l.sourceId) }}
          <span v-if="blockText(l)" class="bl-block">「{{ blockText(l) }}」</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNoteLinks, getBlockContent, type NoteLink } from '../modules/study/note-links'
import { useStudy } from '../modules/study'

const props = defineProps<{ noteId: string }>()
const emit = defineEmits<{ (e: 'open', noteId: string): void }>()

const { getBacklinks, getOutgoingLinks } = useNoteLinks()
const study = useStudy()

const backlinks = computed(() => getBacklinks(props.noteId))
const outgoing = computed(() => getOutgoingLinks(props.noteId))
const hasLinks = computed(() => backlinks.value.length > 0 || outgoing.value.length > 0)

function titleOf(id: string): string {
  const n = study.notes.value.find(x => x.id === id)
  return n ? (n.title || '未命名笔记') : '（已不存在的笔记）'
}

/** 引用了哪一段：取出链/反链携带的块锚点对应文本片段 */
function blockText(l: NoteLink): string | null {
  if (!l.blockId) return null
  // 出链：锚点写在本笔记正文；反链：锚点写在来源笔记正文
  const ownerId = l.sourceId === props.noteId ? props.noteId : l.sourceId
  const n = study.notes.value.find(x => x.id === ownerId)
  if (!n) return null
  const raw = getBlockContent(n.content, l.blockId)
  if (!raw) return null
  return raw.length > 40 ? raw.slice(0, 40) + '…' : raw
}

function open(id: string) {
  emit('open', id)
}
</script>

<style scoped>
.backlinks-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.bl-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bl-title {
  margin: 0;
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 500;
}

.bl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bl-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.bl-item:hover {
  background: rgba(124, 92, 252, 0.12);
  color: #fff;
}

.bl-dir {
  color: var(--accent, #d4a574);
  font-weight: 600;
}

.bl-block {
  margin-left: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}
</style>
