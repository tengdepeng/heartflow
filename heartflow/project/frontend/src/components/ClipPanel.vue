<template>
  <section class="cl-panel" aria-label="网页剪藏">
    <div class="cl-panel-head">
      <span class="cl-panel-title">✂️ 网页剪藏</span>
      <span class="cl-panel-sub">粘贴 URL · 抓取元信息 · 存入书签</span>
    </div>

    <!-- 抓取 -->
    <div class="cl-block">
      <div class="cl-row">
        <input v-model="urlInput" class="cl-input" placeholder="https://example.com/article" @keydown.enter="doFetch" />
        <button class="cl-btn cl-btn-primary" @click="doFetch" :disabled="fetching || !urlInput.trim()">
          {{ fetching ? '抓取中…' : '抓取元信息' }}
        </button>
      </div>
      <p v-if="fetchMsg" class="cl-msg">{{ fetchMsg }}</p>
    </div>

    <!-- 预览 -->
    <div v-if="clip" class="cl-block cl-preview">
      <div class="cl-preview-head">
        <span v-if="favicon" class="cl-favicon" :style="{ backgroundImage: `url(${favicon})` }"></span>
        <span v-else class="cl-favicon cl-favicon-fallback">📎</span>
        <div class="cl-preview-info">
          <span class="cl-preview-title">{{ clip.title || '（无标题）' }}</span>
          <span class="cl-preview-url">{{ normalizedUrl }}</span>
        </div>
        <span class="cl-badge">{{ typeLabel(clip.contentType) }}</span>
      </div>
      <p v-if="clip.description" class="cl-desc">{{ clip.description }}</p>
      <p v-if="clip.excerpt" class="cl-excerpt">{{ clip.excerpt }}</p>
      <div class="cl-row cl-actions">
        <span class="cl-hint">{{ clip.readingTime ? `约 ${clip.readingTime} 分钟阅读` : '未知阅读时长' }}</span>
        <button class="cl-btn" @click="saveClip" :disabled="!normalizedUrl">存入书签架</button>
      </div>
    </div>

    <p class="cl-note">站点禁止跨域读取时自动降级，可手动在书签架填写标题与描述</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { fetchClipMeta, faviconUrl, normalizeUrl } from '../modules/bookmarks/clip'
import { useBookmarks } from '../modules/bookmarks'
import type { Bookmark } from '../modules/bookmarks'
import type { ClipMeta } from '../modules/bookmarks/clip'

const { bookmarks, add } = useBookmarks()

const urlInput = ref('')
const fetching = ref(false)
const fetchMsg = ref('')
const clip = ref<ClipMeta | null>(null)

const normalizedUrl = computed(() => normalizeUrl(urlInput.value))
const favicon = computed(() => (clip.value ? faviconUrl(normalizedUrl.value) : ''))

const TYPE_LABEL: Record<ClipMeta['contentType'], string> = {
  article: '文章',
  video: '视频',
  image: '图片',
  audio: '音频',
  other: '其他',
}

function typeLabel(t: ClipMeta['contentType']) {
  return TYPE_LABEL[t] ?? '其他'
}

async function doFetch() {
  const url = normalizeUrl(urlInput.value)
  if (!url || fetching.value) return
  fetching.value = true
  fetchMsg.value = ''
  try {
    clip.value = await fetchClipMeta(url)
    if (!clip.value.title && !clip.value.description) {
      fetchMsg.value = '未能读取到元信息（可能被站点跨域限制），可手动存入书签'
    }
  } finally {
    fetching.value = false
  }
}

function saveClip() {
  const url = normalizedUrl.value
  if (!url) return
  const now = new Date().toISOString()
  const item: Bookmark = {
    bookmark_id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    url,
    title: clip.value?.title?.trim() || url,
    description: clip.value?.description?.trim() || '',
    folder: '',
    folder_color: '',
    favicon: clip.value?.previewImage || '📎',
    tags: [],
    created_at: now,
    last_visited_at: '',
    visit_count: 0,
    related_room_ids: [],
    related_note_ids: [],
    note: '',
    status: 'active',
    excerpt: clip.value?.excerpt || '',
    preview_image: clip.value?.previewImage || '',
    content_type: clip.value?.contentType || 'other',
    reading_time: clip.value?.readingTime || 0,
    is_read: false,
    clipped_at: now,
  }
  add(item)
  fetchMsg.value = `已存入书签架（现有 ${bookmarks.value.length} 条）`
}
</script>

<style scoped>
.cl-panel {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.cl-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.cl-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.cl-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.cl-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.cl-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cl-input {
  flex: 1;
  min-width: 180px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.cl-btn {
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.2s ease;
}
.cl-btn:hover {
  background: rgba(255, 255, 255, 0.09);
}
.cl-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cl-btn-primary {
  background: rgba(138, 154, 122, 0.18);
  border-color: rgba(138, 154, 122, 0.35);
  color: #b8c4a0;
}
.cl-msg {
  margin: 0;
  font-size: 11px;
  color: #b8c4a0;
}
.cl-note {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
}
.cl-preview-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cl-favicon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-color: rgba(255, 255, 255, 0.06);
  flex: none;
}
.cl-favicon-fallback {
  display: grid;
  place-items: center;
  font-size: 16px;
}
.cl-preview-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cl-preview-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cl-preview-url {
  font-size: 11px;
  color: var(--text-low);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cl-badge {
  font-size: 10px;
  padding: 2px 9px;
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.16);
  color: #b8c4a0;
  flex: none;
}
.cl-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-medium);
}
.cl-excerpt {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-low);
}
.cl-actions {
  justify-content: space-between;
}
.cl-hint {
  font-size: 11px;
  color: var(--text-low);
}
</style>
