<template>
  <section class="pd-panel" aria-label="照片日记">
    <div class="pd-panel-head">
      <span class="pd-panel-title">📷 照片日记</span>
      <span class="pd-panel-sub">本地私有 · 图片不离开设备</span>
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
      </div>
    </div>

    <!-- 上传 -->
    <div class="pd-block">
      <span class="pd-block-label">记录此刻</span>
      <div class="pd-upload-row">
        <input v-model="date" type="date" class="pd-input pd-date" />
        <input ref="fileInput" type="file" accept="image/*" multiple class="pd-file" @change="onFiles" />
        <button class="pd-btn pd-btn-primary" :disabled="!pendingFiles.length" @click="confirmUpload">上传</button>
      </div>
      <input v-model="caption" class="pd-input pd-caption" placeholder="图注（可选）" />
      <p v-if="pendingFiles.length" class="pd-pending">已选 {{ pendingFiles.length }} 张图片</p>
    </div>

    <!-- 画廊 -->
    <div v-if="diary.entries.value.length" class="pd-block">
      <span class="pd-block-label">照片墙</span>
      <div v-for="entry in sortedEntries" :key="entry.id" class="pd-entry">
        <div class="pd-entry-head">
          <span class="pd-entry-date">{{ entry.date }}</span>
          <span class="pd-entry-count">{{ entry.images.length }} 张</span>
        </div>
        <p v-if="entry.caption" class="pd-entry-caption">{{ entry.caption }}</p>
        <div class="pd-grid">
          <div v-for="(img, i) in entry.images" :key="i" class="pd-img-wrap">
            <img :src="img" class="pd-img" alt="照片日记" />
            <button class="pd-img-remove" @click="removeImage(entry.date, i)">×</button>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="pd-hint">还没有照片日记。选几张图片记录今天吧。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePhotoDiary, fileToDataUrl, todayKey } from '../modules/anchor/photo-diary'

const diary = usePhotoDiary()
diary.load()

const date = ref(todayKey())
const caption = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFiles = ref<File[]>([])

const photoCount = computed(() =>
  diary.entries.value.reduce((s, e) => s + e.images.length, 0),
)

const sortedEntries = computed(() =>
  [...diary.entries.value].sort((a, b) => b.date.localeCompare(a.date)),
)

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) pendingFiles.value = Array.from(input.files)
}

async function confirmUpload() {
  if (pendingFiles.value.length === 0) return
  const urls: string[] = []
  for (const f of pendingFiles.value) {
    try {
      urls.push(await fileToDataUrl(f))
    } catch {
      // 跳过无法读取的文件
    }
  }
  if (urls.length > 0) {
    diary.addImages(date.value, urls, caption.value.trim() || undefined)
  }
  pendingFiles.value = []
  caption.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function removeImage(d: string, index: number) {
  diary.removeImage(d, index)
}
</script>

<style scoped>
.pd-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
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
.pd-stats {
  display: flex;
  gap: 8px;
}
.pd-stat {
  flex: 1;
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
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
.pd-caption { width: 100%; margin-bottom: 8px; }
.pd-file {
  flex: 1;
  font-size: 12px;
  color: #8a97ad;
}
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
.pd-pending {
  font-size: 12px;
  color: #9fc4e8;
  margin: 4px 0 0;
}
.pd-entry {
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.pd-entry-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
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
}
.pd-img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  display: block;
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
</style>
