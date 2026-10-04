<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance capsule-room">
    <RoomLayout
      title="时光胶囊"
      kicker="把此刻的心流封存，留给未来的自己开启"
      data-enter
    >

    <!-- 档案陈列 -->
    <CapsuleArchivePanel :capsules="capsule.capsules.value" />
    <!-- 胶囊库档案 · 状态分布/下一封/逾末催启/即将开启/最近开启回看（capsule/capsule-vault 引擎，INCR-218） -->
    <CapsuleVaultPanel :capsules="capsule.capsules.value" />

    <!-- 新建胶囊 -->
    <section data-enter class="capsule-create">
      <button class="cap-btn-new" @click="showForm = !showForm">
        {{ showForm ? '收起' : '+ 封存新胶囊' }}
      </button>

      <div v-if="showForm" class="cap-form">
        <input
          v-model="form.title"
          class="cap-input"
          placeholder="胶囊标题，如「给明年今日的我」"
        />
        <label class="cap-field">
          <span class="cap-label">开启日</span>
          <input v-model="form.openDate" type="date" class="cap-input" />
        </label>
        <textarea
          v-model="form.note"
          class="cap-textarea"
          rows="2"
          placeholder="封存寄语（可选）"
        />
        <div class="cap-field">
          <span class="cap-label">封存笔记（可选）</span>
          <div class="cap-note-picker">
            <label
              v-for="n in recentNotes"
              :key="n.id"
              class="cap-note-opt"
            >
              <input
                type="checkbox"
                :value="n.id"
                v-model="selectedNoteIds"
              />
              <span class="cap-note-title">{{ n.title || '未命名笔记' }}</span>
            </label>
            <EmptyState v-if="recentNotes.length === 0" icon="📝" title="还没有笔记可封存" :glow="false" cta-label="" />
          </div>
        </div>
        <div class="cap-field">
          <span class="cap-label">封存照片（可选）</span>
          <EmptyState v-if="photoGroups.length === 0" icon="📷" title="还没有照片日记可封存" :glow="false" cta-label="" />
          <div v-else class="cap-photo-picker">
            <div v-for="g in photoGroups" :key="g.date" class="cap-photo-day">
              <span class="cap-photo-day-label">{{ g.date }}</span>
              <div class="cap-photo-grid">
                <button
                  v-for="p in g.photos"
                  :key="p.key"
                  type="button"
                  class="cap-photo-chip"
                  :class="{ selected: selectedPhotoKeys.includes(p.key) }"
                  :data-test="`cap-photo-pick-${p.key}`"
                  @click="togglePhoto(p.key)"
                >
                  <PhotoTile v-if="p.thumb" :src="p.thumb" class="cap-photo-thumb" :alt="`${g.date} 第 ${p.index + 1} 张`" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="cap-form-actions">
          <button class="cap-btn-cancel" @click="resetForm">清空</button>
          <button class="cap-btn-save" :disabled="!canCreate" @click="create">封存</button>
        </div>
      </div>
    </section>

    <!-- 封存中 -->
    <section data-enter class="capsule-section">
      <h3 class="cap-section-title">封存中 · {{ sealed.length }}</h3>
      <EmptyState v-if="sealed.length === 0" icon="" title="暂无封存中的胶囊" :glow="false" cta-label="" />
      <div v-for="c in sealed" :key="c.id" class="cap-card sealed">
        <div class="cap-card-head">
          <span class="cap-card-title">{{ c.title }}</span>
          <button class="cap-btn-remove" @click="remove(c.id)" title="删除">×</button>
        </div>
        <p v-if="c.note" class="cap-card-note">{{ c.note }}</p>
        <div class="cap-card-meta">
          <span class="cap-countdown" :class="{ ready: capsule.isOpenable(c) }">
            {{ capsule.isOpenable(c) ? '今日可开启' : `还有 ${capsule.daysUntilOpen(c.openDate)} 天开启` }}
          </span>
          <span class="cap-open-date">开启日 {{ c.openDate }}</span>
        </div>
        <button
          class="cap-btn-open"
          :disabled="!capsule.isOpenable(c)"
          @click="open(c.id)"
        >{{ capsule.isOpenable(c) ? '开启胶囊' : '未到开启日' }}</button>
      </div>
    </section>

    <!-- 已开启 -->
    <section data-enter class="capsule-section">
      <h3 class="cap-section-title">已开启 · {{ opened.length }}</h3>
      <EmptyState v-if="opened.length === 0" icon="" title="还没有开启过的胶囊" :glow="false" cta-label="" />
      <div v-for="c in opened" :key="c.id" class="cap-card opened">
        <div class="cap-card-head">
          <span class="cap-card-title">{{ c.title }}</span>
          <div class="cap-card-head-actions">
            <button class="cap-btn-reseal" @click="reseal(c.id)" title="重新封存">封存</button>
            <button class="cap-btn-remove" @click="remove(c.id)" title="删除">×</button>
          </div>
        </div>
        <p v-if="c.note" class="cap-card-note">{{ c.note }}</p>
        <div class="cap-items">
          <span class="cap-items-label">封存内容（{{ c.items?.length ?? 0 }}）</span>
          <ul class="cap-item-list">
            <li v-for="it in c.items" :key="it.type + it.id" class="cap-item" :data-test="`cap-item-row-${it.type}`">
              <template v-if="it.type === 'photo'">
                <PhotoTile v-if="photoThumbOf(it)" :src="photoThumbOf(it)" class="cap-item-photo" :alt="it.title" data-test="cap-item-photo" @click="openPhoto(photoFullOf(it))" />
                <span v-else class="cap-item-type">📷</span>
                <span class="cap-item-title">{{ it.title || '（无标题）' }}</span>
                <button
                  class="cap-item-remove"
                  @click="removeItem(c.id, it.type, it.id)"
                  title="移除"
                >×</button>
              </template>
              <template v-else>
                <span class="cap-item-type">{{ it.type === 'note' ? '📝' : '💎' }}</span>
                <span class="cap-item-title">{{ it.title || '（无标题）' }}</span>
                <button
                  class="cap-item-remove"
                  @click="removeItem(c.id, it.type, it.id)"
                  title="移除"
                >×</button>
              </template>
            </li>
            <li v-if="(c.items?.length ?? 0) === 0"><EmptyState icon="" title="空胶囊" :glow="false" cta-label="" /></li>
          </ul>
        </div>
        <div class="cap-card-meta">
          <span class="cap-opened-at">开启于 {{ formatDate(c.openedAt) }}</span>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="photoViewer.open" class="cap-photo-viewer" @click="closePhoto">
        <img :src="photoViewer.src" class="cap-photo-viewer-img" alt="照片胶囊" @click.stop />
      </div>
    </Teleport>
  </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import { ref, computed, reactive } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useTimeCapsule, type CapsuleItemRef, type CapsuleItemType } from '../modules/capsule'
import { getNoteStore } from '../modules/note'
import { usePhotoDiary } from '../modules/anchor/photo-diary'
import CapsuleArchivePanel from '../components/CapsuleArchivePanel.vue'
import CapsuleVaultPanel from '../components/CapsuleVaultPanel.vue'
import PhotoTile from '../components/PhotoTile.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const capsule = useTimeCapsule()
const noteStore = getNoteStore()
const diary = usePhotoDiary()
diary.load()

const showForm = ref(false)
const form = ref({ title: '', openDate: '', note: '' })
const selectedNoteIds = ref<string[]>([])
const selectedPhotoKeys = ref<string[]>([])

/** 照片日记按日期分组，供「封存照片」选择器使用 */
const photoGroups = computed(() =>
  diary
    .allDates()
    .map(date => {
      const entry = diary.getByDate(date)
      if (!entry) return null
      return {
        date,
        photos: entry.thumbs.map((thumb, i) => ({
          key: `${date}__${i}`,
          thumb: thumb || entry.images[i] || '',
          index: i,
        })),
      }
    })
    .filter(
      (g): g is { date: string; photos: { key: string; thumb: string; index: number }[] } => g !== null,
    ),
)

function togglePhoto(key: string) {
  if (selectedPhotoKeys.value.includes(key)) {
    selectedPhotoKeys.value = selectedPhotoKeys.value.filter(k => k !== key)
  } else {
    selectedPhotoKeys.value = [...selectedPhotoKeys.value, key]
  }
}

const recentNotes = computed(() =>
  noteStore.allNotes.value.slice(0, 20).map(n => ({ id: n.id, title: n.title })),
)

const canCreate = computed(
  () => form.value.title.trim().length > 0 && form.value.openDate.length > 0,
)

const sealed = capsule.sealed
const opened = capsule.opened

function resetForm() {
  form.value = { title: '', openDate: '', note: '' }
  selectedNoteIds.value = []
  selectedPhotoKeys.value = []
}

function create() {
  if (!canCreate.value) return
  const noteItems: CapsuleItemRef[] = selectedNoteIds.value.map(id => {
    const n = noteStore.getNoteById(id)
    return { type: 'note', id, title: n?.title || '未命名笔记' }
  })
  const photoItems: CapsuleItemRef[] = selectedPhotoKeys.value.map(key => {
    const [date, idxStr] = key.split('__')
    const index = Number(idxStr)
    const entry = diary.getByDate(date)
    const cap = entry?.captions[index] || ''
    return {
      type: 'photo',
      id: key,
      title: `📷 照片 · ${date} · 第 ${index + 1} 张${cap ? ' · ' + cap : ''}`,
      photoRef: { date, index },
    }
  })
  capsule.createCapsule(form.value.title, form.value.openDate, [...noteItems, ...photoItems], form.value.note)
  resetForm()
  showForm.value = false
}

function open(id: string) {
  capsule.openCapsule(id)
}

function reseal(id: string) {
  capsule.resealCapsule(id)
}

function remove(id: string) {
  capsule.removeCapsule(id)
}

function removeItem(id: string, type: CapsuleItemType, itemId: string) {
  capsule.removeItem(id, type, itemId)
}

function photoThumbOf(it: CapsuleItemRef): string {
  if (it.type !== 'photo' || !it.photoRef) return ''
  const entry = diary.getByDate(it.photoRef.date)
  if (!entry) return ''
  return entry.thumbs[it.photoRef.index] || entry.images[it.photoRef.index] || ''
}

function photoFullOf(it: CapsuleItemRef): string {
  if (it.type !== 'photo' || !it.photoRef) return ''
  return diary.getByDate(it.photoRef.date)?.images[it.photoRef.index] || ''
}

const photoViewer = reactive({ open: false, src: '' })
function openPhoto(src: string) {
  if (!src) return
  photoViewer.src = src
  photoViewer.open = true
}
function closePhoto() {
  photoViewer.open = false
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.capsule-room {
  min-height: 100%;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
}
  .capsule-room :deep(.room-layout){position:relative;z-index:1}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.orn-line {
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(124, 108, 240, 0.3), transparent);
}
.orn-diamond { color: rgba(124, 108, 240, 0.5); font-size: 12px; }

.capsule-title {
  text-align: center;
  font-size: 28px;
  font-weight: 400;
  margin: 12px 0 4px;
}
.header-kicker {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.52);
  letter-spacing: 2px;
  margin-bottom: 28px;
}

.capsule-create { max-width: 640px; margin: 0 auto 32px; }
.cap-btn-new {
  width: 100%;
  padding: 12px;
  border: 1px dashed rgba(124, 108, 240, 0.4);
  border-radius: 12px;
  background: rgba(124, 108, 240, 0.06);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}
.cap-btn-new:hover { background: rgba(124, 108, 240, 0.14); }

.cap-form {
  margin-top: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cap-input, .cap-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  box-sizing: border-box;
}
.cap-textarea { resize: vertical; }
.cap-field { display: flex; flex-direction: column; gap: 6px; }
.cap-label { font-size: 12px; color: rgba(255, 255, 255, 0.45); }

.cap-note-picker {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
}
.cap-note-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}
.cap-note-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cap-form-actions { display: flex; justify-content: flex-end; gap: 10px; }
.cap-btn-cancel, .cap-btn-save {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
.cap-btn-cancel { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.7); }
.cap-btn-save { background: #a07c8c; color: #fff; }
.cap-btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

.capsule-section { max-width: 640px; margin: 0 auto 28px; }
.cap-section-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
  margin: 0 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cap-card {
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: 12px;
}
.cap-card.sealed { border-color: rgba(124, 108, 240, 0.25); }
.cap-card.opened { border-color: rgba(52, 211, 153, 0.25); }

.cap-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cap-card-title { font-size: 15px; font-weight: 500; color: rgba(255, 255, 255, 0.9); }
.cap-card-head-actions { display: flex; gap: 8px; }
.cap-card-note { font-size: 13px; color: rgba(255, 255, 255, 0.5); margin: 8px 0 0; }

.cap-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}
.cap-countdown { color: rgba(255, 255, 255, 0.55); }
.cap-countdown.ready { color: #34d399; }

.cap-btn-open {
  margin-top: 12px;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #a07c8c;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}
.cap-btn-open:disabled { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.35); cursor: not-allowed; }

.cap-btn-reseal {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 12px;
}
.cap-btn-remove {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  font-size: 16px;
  cursor: pointer;
}
.cap-btn-remove:hover { color: #f87171; }

.cap-items { margin-top: 10px; }
.cap-items-label { font-size: 12px; color: rgba(255, 255, 255, 0.55); }
.cap-item-list { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.cap-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}
.cap-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cap-item-remove {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 14px;
}
.cap-item-remove:hover { color: #f87171; }
.cap-opened-at { font-size: 12px; color: rgba(255, 255, 255, 0.4); }

/* 封存照片选择器 */
.cap-photo-picker { display: flex; flex-direction: column; gap: 10px; max-height: 220px; overflow-y: auto; padding: 8px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; background: rgba(0, 0, 0, 0.2); }
.cap-photo-day { display: flex; flex-direction: column; gap: 6px; }
.cap-photo-day-label { font-size: 12px; color: rgba(255, 255, 255, 0.45); }
.cap-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 6px; }
.cap-photo-chip {
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  transition: border-color 0.15s;
}
.cap-photo-chip.selected { border-color: #a07c8c; }
.cap-photo-chip:hover { border-color: rgba(160, 124, 140, 0.5); }
.cap-photo-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }

/* 已开启胶囊内的照片缩略图 */
.cap-item-photo { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; cursor: zoom-in; flex-shrink: 0; }

/* 照片放大查看器 */
.cap-photo-viewer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.82);
  cursor: zoom-out;
}
.cap-photo-viewer-img { max-width: 90vw; max-height: 90vh; border-radius: 10px; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5); }
</style>
