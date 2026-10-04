<template>
  <section class="pd-panel" aria-label="照片日记">
    <div class="pd-panel-head">
      <span class="pd-panel-title">📷 照片日记</span>
      <span class="pd-panel-sub">本地私有 · 图片降采样后不离开设备</span>
    </div>

    <!-- 概览 -->
    <div class="pd-block">
      <div class="pd-stats">
        <div class="pd-stat">
          <span class="pd-stat-num">{{ photoCount }}</span>
          <span class="pd-stat-label">照片</span>
        </div>
        <div class="pd-stat">
          <span class="pd-stat-num">{{ diary.entries.value.length }}</span>
          <span class="pd-stat-label">日期</span>
        </div>
        <div class="pd-stat">
          <span class="pd-stat-num">{{ remaining }}</span>
          <span class="pd-stat-label">本日余量</span>
        </div>
      </div>
    </div>

    <!-- 上传 -->
    <div class="pd-block">
      <span class="pd-block-label">记录此刻</span>
      <div class="pd-upload-row">
        <input v-model="date" type="date" class="pd-input pd-date" />
        <button class="pd-btn pd-today" @click="date = todayKey()">今天</button>
        <input ref="fileInput" type="file" accept="image/*" multiple class="pd-file" @change="onFiles" />
        <button class="pd-btn pd-btn-primary" :disabled="!pendingFiles.length || uploading" @click="confirmUpload">
          {{ uploading ? '处理中…' : '上传' }}
        </button>
      </div>

      <!-- 与逐日心锚的日期绑定：所选日期的心锚情况，以及可快速跳转的心锚日期 -->
      <p class="pd-anchor-hint">
        该日心锚：<b>{{ anchorsOnDate }}</b> 项
        <template v-if="recentAnchorDates.length">
          · 跳到
          <button
            v-for="d in recentAnchorDates"
            :key="d"
            class="pd-date-chip"
            :class="{ active: d === date }"
            @click="date = d"
          >{{ d.slice(5) }}</button>
        </template>
      </p>

      <input v-model="caption" class="pd-input pd-caption" placeholder="整条日记说明（可选）" />
      <p v-if="pendingFiles.length" class="pd-pending">
        已选 {{ pendingFiles.length }} 张 · 本日还可放 {{ remaining }} 张 · 压缩至 {{ PHOTO_FULL_DIM }}px 后本地保存
      </p>
      <p v-if="noticeMsg" class="pd-notice">{{ noticeMsg }}</p>
      <p v-if="errorMsg" class="pd-error">{{ errorMsg }}</p>
    </div>

    <!-- 备份 -->
    <div class="pd-block pd-backup">
      <button class="pd-btn" @click="exportBackup">导出备份</button>
      <button class="pd-btn" @click="pickImport">导入备份</button>
      <input ref="importInput" type="file" accept="application/json,.json" class="pd-file" @change="onImport" />
    </div>

    <!-- 画廊：模式切换（长廊 / 按月 / 收藏册） -->
    <div v-if="diary.entries.value.length" class="pd-block">
      <div class="pd-mode-bar">
        <button class="pd-mode" :class="{ active: viewMode === 'corridor' }" data-test="pd-mode-corridor" @click="viewMode = 'corridor'">长廊</button>
        <button class="pd-mode" :class="{ active: viewMode === 'month' }" data-test="pd-mode-month" @click="viewMode = 'month'">按月</button>
        <button class="pd-mode" :class="{ active: viewMode === 'album' }" data-test="pd-mode-album" @click="viewMode = 'album'">收藏册</button>
      </div>

      <!-- 长廊：全部照片扁平画廊（相册长廊） -->
      <div v-if="viewMode === 'corridor'" class="pd-corridor">
        <div
          v-for="p in corridorPhotos"
          :key="`${p.date}-${p.index}`"
          class="pd-corridor-item"
          @click="openViewer(p.date, p.index)"
        >
          <PhotoTile class="pd-img" :src="p.thumb" alt="照片" />
        </div>
        <p v-if="!corridorPhotos.length" class="pd-hint">还没有照片。</p>
      </div>

      <!-- 按月 / 选中相册：条目墙 -->
      <template v-else-if="viewMode === 'month' || (viewMode === 'album' && selectedAlbumId)">
        <!-- 选中相册时的管理条 -->
        <div v-if="viewMode === 'album' && selectedAlbumId" class="pd-album-head">
          <button class="pd-btn pd-mini" data-test="pd-album-back" @click="selectedAlbumId = null">‹ 返回</button>
          <span class="pd-album-title">{{ currentAlbumName }}</span>
          <input v-model="renameAlbumName" class="pd-input pd-caption pd-album-rename-input" data-test="pd-album-rename-input" />
          <button class="pd-btn pd-mini" data-test="pd-album-rename" @click="renameCurrentAlbum">改名</button>
          <button class="pd-btn pd-mini pd-danger" data-test="pd-album-del" @click="deleteCurrentAlbum">删除相册</button>
        </div>
        <span class="pd-block-label">照片墙 <small class="pd-tip">拖动缩略图可排序 · 点击可写单图说明</small></span>
        <template v-for="group in visibleGroups" :key="group.key">
          <div class="pd-month">{{ group.label }}</div>
          <div v-for="entry in group.entries" :key="entry.id" class="pd-entry">
          <div class="pd-entry-head">
            <span class="pd-entry-date">{{ entry.date }}</span>
            <span class="pd-entry-count">{{ entry.images.length }} / {{ PHOTO_MAX_PER_ENTRY }} 张</span>
            <select class="pd-album-select" data-test="pd-album-select" :value="entry.albumId || ''" @change="onAssignAlbum(entry, $event)">
              <option value="">未分类</option>
              <option v-for="a in albums" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
            <span class="pd-entry-actions">
              <button class="pd-btn pd-mini" data-test="pd-edit-cap" @click="startEditCaption(entry)">编辑说明</button>
              <button class="pd-btn pd-mini pd-danger" data-test="pd-del-day" @click="removeDay(entry)">删除本日</button>
            </span>
          </div>
          <p v-if="editingCaptionId === entry.id" class="pd-entry-cap-edit">
            <input v-model="editCaptionText" class="pd-input pd-caption" placeholder="整条日记说明" data-test="pd-cap-input" />
            <button class="pd-btn pd-mini" data-test="pd-cap-save" @click="saveCaption(entry)">保存</button>
            <button class="pd-btn pd-mini pd-ghost" data-test="pd-cap-cancel" @click="cancelEditCaption">取消</button>
          </p>
          <p v-else-if="entry.caption" class="pd-entry-caption">{{ entry.caption }}</p>
          <div class="pd-grid">
            <div
              v-for="(img, i) in entry.images"
              :key="`${entry.id}-${i}`"
              class="pd-img-wrap"
              :class="{
                'is-dragging': drag.date === entry.date && drag.from === i,
                'is-drop-target': drag.date === entry.date && drag.over === i && drag.from !== i,
              }"
              draggable="true"
              @dragstart="onDragStart(entry.date, i)"
              @dragover.prevent="onDragOver(entry.date, i)"
              @drop.prevent="onDrop(entry.date, i)"
              @dragend="onDragEnd"
            >
              <PhotoTile
                class="pd-img"
                :src="entry.thumbs[i] || img"
                alt="照片日记"
                @click="openViewer(entry.date, i)"
              />
              <span class="pd-img-order">{{ i + 1 }}</span>
              <button class="pd-img-remove" @click="removeImage(entry.date, i)">×</button>
              <p v-if="entry.captions[i]" class="pd-img-caption">{{ entry.captions[i] }}</p>
            </div>
          </div>
        </div>
        </template>
        <p v-if="viewMode === 'album' && selectedAlbumId && !visibleGroups.length" class="pd-hint">这个相册还没有照片。在照片上点「归入相册」即可加入。</p>
      </template>

      <!-- 收藏册列表 -->
      <template v-else>
        <div class="pd-album-new">
          <input v-model="newAlbumName" class="pd-input pd-caption" data-test="pd-new-album-input" placeholder="新建相册名称" />
          <button class="pd-btn pd-btn-primary" data-test="pd-new-album" @click="createAlbum">新建</button>
        </div>
        <div v-if="albumList.length" class="pd-album-grid">
          <div
            v-for="a in albumList"
            :key="a.id"
            class="pd-album-card"
            data-test="pd-album-card"
            @click="openAlbum(a.id)"
          >
            <div class="pd-album-cover">
              <PhotoTile v-if="a.cover" class="pd-img" :src="a.cover" alt="封面" rounded="md" />
              <span v-else class="pd-album-cover-empty">📷</span>
            </div>
            <div class="pd-album-meta">
              <span class="pd-album-name">{{ a.name }}</span>
              <span class="pd-album-count">{{ a.count }} 张</span>
            </div>
          </div>
        </div>
        <p v-else class="pd-hint">还没有相册。新建一个，把照片归入收藏吧。</p>
      </template>
    </div>
    <p v-else class="pd-hint">还没有照片日记。选几张图片记录今天吧。</p>

    <!-- 全屏查看（含逐图说明编辑 / 排序 / 删除） -->
    <Teleport to="body">
      <div v-if="viewer.open && viewerEntry" class="pd-viewer" @click="closeViewer">
        <img :src="viewerEntry.images[viewer.index]" class="pd-viewer-img" alt="照片日记全屏" />
        <div class="pd-viewer-bar" @click.stop>
          <span class="pd-viewer-idx">{{ viewer.index + 1 }} / {{ viewerEntry.images.length }}</span>
          <button class="pd-btn" :disabled="viewerEntry.images.length < 2" @click="step(-1)">‹ 上一张</button>
          <button class="pd-btn" :disabled="viewerEntry.images.length < 2" @click="step(1)">下一张 ›</button>
          <button class="pd-btn" :disabled="viewer.index === 0" @click="shift(-1)">前移</button>
          <button class="pd-btn" :disabled="viewer.index >= viewerEntry.images.length - 1" @click="shift(1)">后移</button>
          <button class="pd-btn pd-danger" @click="removeCurrent">删除此图</button>
          <button class="pd-btn pd-journal" data-test="pd-send-journal" @click.stop="sendToJournal(viewer.date, viewer.index)">📔 收入手札</button>
          <button v-if="viewMode === 'album' && selectedAlbumId && !isCurrentCover" class="pd-btn pd-cover" data-test="pd-set-cover" @click.stop="setCurrentAsCover">⭐ 设为封面</button>
          <button v-if="viewMode === 'album' && selectedAlbumId && isCurrentCover" class="pd-btn pd-cover-clear" data-test="pd-clear-cover" @click.stop="clearAlbumCover">取消封面</button>
          <button class="pd-btn" @click="closeViewer">关闭</button>
        </div>
        <div class="pd-viewer-cap-row" @click.stop>
          <input
            :key="`cap-${viewer.date}-${viewer.index}`"
            :value="viewerEntry.captions[viewer.index]"
            class="pd-input pd-viewer-cap-input"
            placeholder="给这张照片写点说明（本地保存）"
            @change="onViewerCaption"
          />
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  usePhotoDiary,
  todayKey,
  photoDiaryError,
  photoDiaryNotice,
  clearPhotoDiaryMessages,
  PHOTO_FULL_DIM,
  PHOTO_MAX_PER_ENTRY,
  PHOTO_THUMB_DIM,
  type PhotoEntry,
} from '../modules/anchor/photo-diary'
import { fileToDownscaledDataUrl } from '../utils/image'
import PhotoTile from './PhotoTile.vue'

const props = defineProps<{
  /** 逐日心锚中「有心锚」的日期（YYYY-MM-DD），用于日期强绑定与快速跳转 */
  anchorDates?: string[]
}>()

const emit = defineEmits<{
  /** 把某日某张照片收入手札（由宿主按时写入锚点手札） */
  (e: 'send-to-journal', payload: { date: string; index: number }): void
}>()

const diary = usePhotoDiary()
diary.load()

const date = ref(todayKey())
const caption = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const pendingFiles = ref<File[]>([])
const uploading = ref(false)
const localError = ref<string | null>(null)

const viewer = reactive({ open: false, date: '', index: 0 })
const drag = reactive({ date: '', from: -1, over: -1 })

const errorMsg = computed(() => localError.value || photoDiaryError.value)
const noticeMsg = computed(() => photoDiaryNotice.value)

const photoCount = computed(() => diary.entries.value.reduce((s, e) => s + e.images.length, 0))
const remaining = computed(() => PHOTO_MAX_PER_ENTRY - (diary.getByDate(date.value)?.images.length ?? 0))

const sortedEntries = computed(() => [...diary.entries.value].sort((a, b) => b.date.localeCompare(a.date)))

// 按月份分组（续13）：抽为可复用 helper，按月模式与选中相册共用
function groupByMonth(list: PhotoEntry[]): { key: string; label: string; entries: PhotoEntry[] }[] {
  const byMonth = new Map<string, PhotoEntry[]>()
  for (const e of list) {
    const ym = e.date.slice(0, 7)
    if (!byMonth.has(ym)) byMonth.set(ym, [])
    byMonth.get(ym)!.push(e)
  }
  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, entries]) => ({ key, label: formatMonthLabel(key), entries }))
}
const groupedEntries = computed(() => groupByMonth(sortedEntries.value))

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y} 年 ${Number(m)} 月`
}

// ---- 相册（收藏册）视图状态 ----
const viewMode = ref<'corridor' | 'month' | 'album'>('month')
const selectedAlbumId = ref<string | null>(null)
const newAlbumName = ref('')
const renameAlbumName = ref('')
const albums = diary.albums

// 长廊：全部照片扁平画廊（相册长廊），点击开灯箱
const corridorPhotos = computed(() => {
  const out: { date: string; index: number; thumb: string; image: string; caption: string }[] = []
  for (const e of sortedEntries.value) {
    for (let i = 0; i < e.images.length; i++) {
      out.push({ date: e.date, index: i, thumb: e.thumbs[i] || e.images[i], image: e.images[i], caption: e.captions[i] || '' })
    }
  }
  return out
})

// 选中相册时的月份分组（否则用全量按月）
const visibleGroups = computed(() =>
  viewMode.value === 'album' && selectedAlbumId.value
    ? groupByMonth(sortedEntries.value.filter(e => e.albumId === selectedAlbumId.value))
    : groupedEntries.value,
)

// 相册卡片列表（封面优先取自定义封面，否则首张缩略图 + 数量）
const albumList = computed(() =>
  albums.value.map(a => {
    const ents = sortedEntries.value.filter(e => e.albumId === a.id)
    const count = ents.reduce((s, e) => s + e.images.length, 0)
    let cover = ''
    // 自定义封面：coverDate + coverIndex 同时有效
    if (a.coverDate && typeof a.coverIndex === 'number') {
      const target = diary.getByDate(a.coverDate)
      const img = target?.images[a.coverIndex]
      if (img) cover = target!.thumbs[a.coverIndex] || img
    }
    // 回退：该相册首张照片
    if (!cover) {
      const first = ents[0]
      if (first) cover = first.thumbs[0] || first.images[0]
    }
    return { ...a, count, cover }
  }),
)

// 当前全屏查看的照片是否为所选相册的封面（用于切换按钮文案）
const isCurrentCover = computed(() => {
  if (viewMode.value !== 'album' || !selectedAlbumId.value) return false
  const a = albums.value.find(x => x.id === selectedAlbumId.value)
  return !!a && !!a.coverDate && typeof a.coverIndex === 'number' && a.coverDate === viewer.date && a.coverIndex === viewer.index
})
function setCurrentAsCover() {
  if (viewMode.value !== 'album' || !selectedAlbumId.value) return
  diary.setAlbumCover(selectedAlbumId.value, viewer.date, viewer.index)
}
function clearAlbumCover() {
  if (selectedAlbumId.value) diary.setAlbumCover(selectedAlbumId.value, null, null)
}
const currentAlbumName = computed(() => albums.value.find(a => a.id === selectedAlbumId.value)?.name ?? '')

function openAlbum(id: string) {
  selectedAlbumId.value = id
  renameAlbumName.value = currentAlbumName.value
}
function createAlbum() {
  const a = diary.addAlbum(newAlbumName.value)
  if (a) {
    newAlbumName.value = ''
    selectedAlbumId.value = a.id
    renameAlbumName.value = a.name
  }
}
function renameCurrentAlbum() {
  if (selectedAlbumId.value) diary.renameAlbum(selectedAlbumId.value, renameAlbumName.value)
}
function deleteCurrentAlbum() {
  if (!selectedAlbumId.value) return
  if (typeof window !== 'undefined' && !window.confirm('删除相册会将其下照片归为「未分类」，确定？')) return
  diary.removeAlbum(selectedAlbumId.value)
  selectedAlbumId.value = null
  renameAlbumName.value = ''
}
function onAssignAlbum(entry: PhotoEntry, e: Event) {
  const val = (e.target as HTMLSelectElement).value
  diary.setEntryAlbum(entry.date, val || null)
}

const anchorDateSet = computed(() => new Set(props.anchorDates ?? []))
const anchorsOnDate = computed(() => (anchorDateSet.value.has(date.value) ? '有' : 0))
const recentAnchorDates = computed(() =>
  [...new Set(props.anchorDates ?? [])].sort((a, b) => b.localeCompare(a)).slice(0, 4),
)

const viewerEntry = computed(() => (viewer.open ? diary.getByDate(viewer.date) : undefined))

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) pendingFiles.value = Array.from(input.files)
  localError.value = null
  clearPhotoDiaryMessages()
}

async function confirmUpload() {
  if (pendingFiles.value.length === 0) return
  uploading.value = true
  localError.value = null
  clearPhotoDiaryMessages()

  // 先按剩余额度裁掉多余的，避免白做 canvas 压缩
  const room = Math.max(0, remaining.value)
  const picked = pendingFiles.value.slice(0, room)
  if (picked.length < pendingFiles.value.length) {
    localError.value = `单日上限 ${PHOTO_MAX_PER_ENTRY} 张，本日还可放 ${room} 张，多余已忽略`
  }

  const fulls: string[] = []
  const thumbs: string[] = []
  let skipped = 0
  for (const f of picked) {
    try {
      // 展示图 + 缩略图，均本地 canvas 完成
      fulls.push(await fileToDownscaledDataUrl(f, PHOTO_FULL_DIM, 0.82))
      thumbs.push(await fileToDownscaledDataUrl(f, PHOTO_THUMB_DIM, 0.72))
    } catch {
      skipped++
    }
  }
  if (fulls.length > 0) {
    diary.addImages(date.value, fulls, caption.value.trim() || undefined, thumbs)
  }
  if (skipped > 0) localError.value = `${skipped} 张图片无法读取，已跳过`
  pendingFiles.value = []
  caption.value = ''
  uploading.value = false
  if (fileInput.value) fileInput.value.value = ''
}

// ---- 拖拽排序（桌面）；移动端可用全屏浮层的「前移 / 后移」 ----
function onDragStart(d: string, i: number) {
  drag.date = d
  drag.from = i
}
function onDragOver(d: string, i: number) {
  if (drag.date === d) drag.over = i
}
function onDrop(d: string, i: number) {
  if (drag.date === d && drag.from >= 0 && drag.from !== i) diary.moveImage(d, drag.from, i)
  onDragEnd()
}
function onDragEnd() {
  drag.date = ''
  drag.from = -1
  drag.over = -1
}

// ---- 全屏查看 ----
function openViewer(d: string, i: number) {
  viewer.date = d
  viewer.index = i
  viewer.open = true
}
function closeViewer() {
  viewer.open = false
}

/** 把当前查看的照片收入手札（不直接写锚点，交由宿主按时写入） */
function sendToJournal(d: string, i: number) {
  emit('send-to-journal', { date: d, index: i })
}
function step(delta: number) {
  const total = viewerEntry.value?.images.length ?? 0
  if (total < 2) return
  viewer.index = (viewer.index + delta + total) % total
}
function shift(delta: number) {
  const to = viewer.index + delta
  if (diary.moveImage(viewer.date, viewer.index, to)) viewer.index = to
}
function removeCurrent() {
  const total = viewerEntry.value?.images.length ?? 0
  diary.removeImage(viewer.date, viewer.index)
  const left = total - 1
  if (left <= 0) closeViewer()
  else viewer.index = Math.min(viewer.index, left - 1)
}
function onViewerCaption(e: Event) {
  const input = e.target as HTMLInputElement
  diary.setImageCaption(viewer.date, viewer.index, input.value)
}

function removeImage(d: string, index: number) {
  diary.removeImage(d, index)
}

// ---- 整条（按日）日记说明：编辑孤儿 API setEntryCaption ----
const editingCaptionId = ref<string | null>(null)
const editCaptionText = ref('')
function startEditCaption(entry: PhotoEntry) {
  editingCaptionId.value = entry.id
  editCaptionText.value = entry.caption ?? ''
}
function saveCaption(entry: PhotoEntry) {
  diary.setEntryCaption(entry.date, editCaptionText.value)
  editingCaptionId.value = null
  editCaptionText.value = ''
}
function cancelEditCaption() {
  editingCaptionId.value = null
  editCaptionText.value = ''
}

// ---- 整日删除：孤儿 API removeEntry ----
function removeDay(entry: PhotoEntry) {
  diary.removeEntry(entry.id)
}

function exportBackup() {
  const json = diary.exportJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `photo-diary-backup-${todayKey()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function pickImport() {
  importInput.value?.click()
}

async function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  localError.value = null
  clearPhotoDiaryMessages()
  try {
    const text = await file.text()
    const r = diary.importJson(text)
    if (r.error) localError.value = r.error
    else if (r.added === 0) localError.value = '没有新的条目可导入'
  } catch {
    localError.value = '备份文件读取失败'
  }
  input.value = ''
}
</script>

<style scoped>
.pd-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.pd-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.pd-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.pd-panel-sub {
  font-size: 12px;
  color: #8a97ad;
}
.pd-block { margin-bottom: 12px; }
.pd-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.pd-tip {
  font-size: 11px;
  color: #6d7a90;
}
.pd-stats {
  display: flex;
  gap: 8px;
}
.pd-stat {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.pd-stat-num {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #dce4f0;
}
.pd-stat-label {
  display: block;
  font-size: 11px;
  color: #8a97ad;
  margin-top: 2px;
}
.pd-upload-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.pd-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 13px;
}
.pd-date { width: 150px; }
.pd-caption { width: 100%; margin-bottom: 8px; box-sizing: border-box; }
.pd-file {
  flex: 1;
  font-size: 12px;
  color: #8a97ad;
}
.pd-anchor-hint {
  font-size: 12px;
  color: #8a97ad;
  margin: 0 0 8px;
}
.pd-anchor-hint b { color: #9fc4e8; }
.pd-date-chip {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(140, 170, 220, 0.35);
  background: transparent;
  color: #9fc4e8;
  font-size: 11px;
  cursor: pointer;
}
.pd-date-chip.active {
  background: rgba(120, 150, 200, 0.25);
  color: #dce4f0;
}
.pd-backup {
  display: flex;
  gap: 8px;
}
.pd-backup .pd-file { display: none; }
.pd-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.pd-btn-primary {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.pd-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pd-danger { color: #ff9b8a; border-color: rgba(255, 155, 138, 0.35); }
.pd-pending {
  font-size: 12px;
  color: #9fc4e8;
  margin: 4px 0 0;
}
.pd-notice {
  font-size: 12px;
  color: #f0c040;
  margin: 6px 0 0;
}
.pd-error {
  font-size: 12px;
  color: #ff9b8a;
  margin: 6px 0 0;
}
.pd-entry {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.pd-month {
  font-size: 12px;
  font-weight: 600;
  color: #9fc4e8;
  margin: 12px 0 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(140, 160, 190, 0.12);
  letter-spacing: 0.5px;
}
.pd-month:first-child { margin-top: 0; }
.pd-entry-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.pd-entry-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.pd-mini {
  padding: 3px 10px;
  font-size: 11px;
}
.pd-ghost {
  background: transparent;
  color: #8a97ad;
  border-color: rgba(140, 160, 190, 0.18);
}
.pd-entry-cap-edit {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 0 0 8px;
}
.pd-entry-cap-edit .pd-caption { margin-bottom: 0; }
.pd-entry-date {
  font-size: 13px;
  font-weight: 600;
  color: #9fc4e8;
}
.pd-entry-count {
  font-size: 11px;
  color: #7a879c;
}
.pd-entry-caption {
  font-size: 12px;
  color: #aab6c9;
  margin: 0 0 8px;
}
.pd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
}
.pd-img-wrap {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  cursor: grab;
}
.pd-img-wrap.is-dragging { opacity: 0.45; }
.pd-img-wrap.is-drop-target { outline: 2px solid rgba(140, 190, 255, 0.8); outline-offset: -2px; }
.pd-img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  display: block;
  cursor: zoom-in;
}
.pd-img-order {
  position: absolute;
  left: 4px;
  bottom: 4px;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #e6ecf6;
  font-size: 10px;
  text-align: center;
}
.pd-img-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 3px 6px 3px 24px;
  font-size: 10px;
  color: #e6ecf6;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}
.pd-img-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;

  min-height: 24px;
  min-width: 24px;
}
.pd-hint {
  font-size: 12px;
  color: #7a879c;
  margin: 8px 0 0;
}
.pd-viewer {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(8, 10, 14, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  /* 移动端避让系统栏，桌面 env=0 渲染不变 */
  padding-top: calc(24px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}
.pd-viewer-img {
  max-width: min(92vw, 1100px);
  max-height: 68vh;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  object-fit: contain;
}
.pd-viewer-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  color: #c6d0e0;
  font-size: 13px;
}
.pd-viewer-idx { color: #7a879c; }
.pd-viewer-cap-row { width: min(92vw, 720px); }
.pd-viewer-cap-input { width: 100%; box-sizing: border-box; }

.pd-mode-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.pd-mode {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.pd-mode.active {
  background: rgba(120, 150, 200, 0.22);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.pd-corridor {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 6px;
}
.pd-corridor-item {
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.pd-corridor-item .pd-img {
  height: 84px;
}
.pd-album-select {
  padding: 3px 6px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 11px;
  max-width: 120px;
}
.pd-album-new {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.pd-album-new .pd-caption { margin-bottom: 0; }
.pd-album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.pd-album-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
}
.pd-album-cover {
  position: relative;
  width: 100%;
  height: 96px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pd-album-cover .pd-img {
  width: 100%;
  height: 96px;
}
.pd-album-cover-empty {
  font-size: 26px;
  opacity: 0.5;
}
.pd-album-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
}
.pd-album-name {
  font-size: 13px;
  font-weight: 600;
  color: #dce4f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pd-album-count {
  font-size: 11px;
  color: #7a879c;
  margin-left: 6px;
}
.pd-album-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.pd-album-title {
  font-size: 14px;
  font-weight: 600;
  color: #dce4f0;
}
.pd-album-rename-input {
  width: 140px;
  margin-bottom: 0;
}
.pd-cover {
  background: rgba(240, 200, 80, 0.18);
  border-color: rgba(240, 200, 80, 0.5);
  color: #f0d27a;
}
.pd-cover-clear {
  background: rgba(140, 160, 190, 0.16);
  border-color: rgba(140, 160, 190, 0.4);
  color: #aab6c9;
}

@media (max-width: 640px) {
  .pd-upload-row { gap: 6px; }
  .pd-date { width: 130px; }
  .pd-viewer-img { max-height: 52vh; }
  .pd-viewer-bar { gap: 6px; font-size: 12px; }
}
</style>
