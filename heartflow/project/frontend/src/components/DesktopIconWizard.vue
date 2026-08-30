<template>
  <div class="desktop-icon-wizard">
    <p class="diw-note">
      ⚠️ 电脑端图标（窗口 / 任务栏 / 桌面快捷方式）是<strong>构建期资源</strong>，由 Tauri 打包时写入，
      运行时无法热替换。下方向导帮你把自定义图生成标准图标集并提供命令，替换后需
      <code>tauri build</code> 重新打包生效。
    </p>

    <div class="diw-upload">
      <button type="button" class="diw-btn" @click="fileInput?.click()">选择源图片（建议正方形 PNG/SVG）</button>
      <input ref="fileInput" type="file" accept="image/*" class="diw-file" @change="onPick" />
    </div>

    <div v-if="sourceUrl" class="diw-result">
      <div class="diw-preview">
        <img :src="sourceUrl" alt="源图预览" />
        <span>1024×1024 源图（tauri icon 输入）</span>
      </div>

      <div class="diw-sizes">
        <div v-for="g in generated" :key="g.size" class="diw-size">
          <img :src="g.url" :alt="`${g.size}px`" />
          <span>{{ g.size }}×{{ g.size }}</span>
          <button type="button" class="diw-btn diw-btn-sm" @click="download(g.url, `icon-${g.size}.png`)">下载</button>
        </div>
      </div>

      <div class="diw-cmd">
        <p>把上面 1024 源图存为 <code>src-tauri/icons/icon.png</code>，然后运行（Tauri CLI 会自动生成全套尺寸并改写 tauri.conf.json）：</p>
        <div class="diw-cmd-row">
          <code>npx tauri icon src-tauri/icons/icon.png</code>
          <button type="button" class="diw-btn diw-btn-sm" @click="copyCmd">复制命令</button>
        </div>
        <p class="diw-cmd-hint">或把 32/128/256 PNG 直接拖入 <code>src-tauri/icons/</code> 并手动在 tauri.conf.json 的 <code>icon</code> 数组登记。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const fileInput = ref<HTMLInputElement | null>(null)
const sourceUrl = ref<string | null>(null)
const generated = ref<{ size: number; url: string }[]>([])

function renderToDataUrl(img: HTMLImageElement, size: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  // 透明底，居中铺满（cover）
  const scale = Math.max(size / img.width, size / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
  return canvas.toDataURL('image/png')
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    sourceUrl.value = renderToDataUrl(img, 1024)
    generated.value = [32, 128, 256].map((s) => ({ size: s, url: renderToDataUrl(img, s) }))
    URL.revokeObjectURL(url)
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
  input.value = ''
}

function download(dataUrl: string, name: string) {
  if (!dataUrl) return
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = name
  a.click()
}

async function copyCmd() {
  try {
    await navigator.clipboard.writeText('npx tauri icon src-tauri/icons/icon.png')
  } catch {
    /* 剪贴板不可用时静默 */
  }
}
</script>

<style scoped>
.desktop-icon-wizard {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.diw-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.7;
  background: rgba(184, 154, 106, 0.1);
  border: 1px solid rgba(184, 154, 106, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
}
.diw-note code,
.diw-cmd code,
.diw-cmd-hint code {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}
.diw-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.diw-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}
.diw-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
.diw-file {
  display: none;
}
.diw-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 12px;
}
.diw-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  opacity: 0.7;
}
.diw-preview img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.diw-sizes {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.diw-size {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.8;
}
.diw-size img {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background:
    repeating-conic-gradient(rgba(255, 255, 255, 0.08) 0% 25%, transparent 0% 50%) 50% / 16px 16px;
}
.diw-cmd p {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 1.6;
}
.diw-cmd-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.diw-cmd-hint {
  opacity: 0.6;
}
</style>
