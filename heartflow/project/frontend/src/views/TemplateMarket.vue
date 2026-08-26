<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance tm">
    <div data-enter class="tm-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">&#10022;</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">发现和导入模板</p>
      <h1 class="tm-title">模板市场</h1>
    </div>

    <!-- 概览卡片 -->
    <div data-enter class="tm-overview">
      <div class="tm-overview-card">
        <div class="tm-template-icon">&#127968;</div>
        <div class="tm-template-info">
          <span class="tm-overview-number">{{ roomTemplates.length }}</span>
          <span class="tm-overview-label">房间模板</span>
        </div>
      </div>
      <div class="tm-overview-card">
        <div class="tm-template-icon">&#129489;</div>
        <div class="tm-template-info">
          <span class="tm-overview-number">{{ advisorTemplates.length }}</span>
          <span class="tm-overview-label">幕僚性格模板</span>
        </div>
      </div>
      <div class="tm-overview-card">
        <div class="tm-template-icon">&#128230;</div>
        <div class="tm-template-info">
          <span class="tm-overview-number">{{ roomTemplates.length + advisorTemplates.length }}</span>
          <span class="tm-overview-label">模板总数</span>
        </div>
      </div>
    </div>

    <!-- 房间模板 -->
    <section data-enter class="tm-room-section">
      <h2 class="tm-section-title">房间模板</h2>
      <div v-if="roomTemplates.length === 0" class="tm-empty-hint">暂无房间模板</div>
      <div v-else class="tm-template-grid">
        <article
          v-for="tmpl in roomTemplates"
          :key="tmpl.id"
          class="tm-template-card"
        >
          <div class="tm-card-top">
            <span class="tm-type-badge tm-type-badge--room">房间</span>
            <span class="tm-version">v{{ tmpl.version }}</span>
          </div>
          <h3 class="tm-template-name">{{ tmpl.name }}</h3>
          <p class="tm-template-desc">{{ tmpl.description }}</p>
          <div class="tm-template-tags">
            <span
              v-for="tag in tmpl.tags"
              :key="tag"
              class="tm-template-tag"
            >{{ tag }}</span>
          </div>
          <div class="tm-template-actions">
            <button class="tm-template-btn" @click.stop="applyTemplate(tmpl)">应用</button>
            <button class="tm-template-btn" @click.stop="handleExport(tmpl)">导出</button>
          </div>
        </article>
      </div>
    </section>

    <!-- 幕僚性格模板 -->
    <section data-enter class="tm-personality-section">
      <h2 class="tm-section-title">幕僚性格模板</h2>
      <div v-if="advisorTemplates.length === 0" class="tm-empty-hint">暂无幕僚性格模板</div>
      <div v-else class="tm-template-grid">
        <article
          v-for="tmpl in advisorTemplates"
          :key="tmpl.id"
          class="tm-template-card"
        >
          <div class="tm-card-top">
            <span class="tm-type-badge tm-type-badge--advisor">幕僚</span>
            <span class="tm-version">v{{ tmpl.version }}</span>
          </div>
          <h3 class="tm-template-name">{{ tmpl.name }}</h3>
          <p class="tm-template-desc">{{ tmpl.description }}</p>
          <div class="tm-template-tags">
            <span
              v-for="tag in tmpl.tags"
              :key="tag"
              class="tm-template-tag"
            >{{ tag }}</span>
          </div>
          <div class="tm-template-actions">
            <button class="tm-template-btn" @click.stop="applyTemplate(tmpl)">应用</button>
            <button class="tm-template-btn" @click.stop="handleExport(tmpl)">导出</button>
          </div>
        </article>
      </div>
    </section>

    <!-- 导入模板 -->
    <section data-enter class="tm-import-section">
      <h2 class="tm-section-title">导入模板</h2>
      <p class="tm-import-hint">选择从心流工坊导出的 .hf-template.json 文件</p>
      <p v-if="shareLocalOnly" class="tm-local-notice">
        宪法第43条「分享的本地边界」已生效：模板分享仅限本地 .hf-template 文件或 P2P，不经任何官方服务器、不强制云端账号。
      </p>
      <div class="tm-import-area">
        <input
          ref="fileInputRef"
          class="tm-sr-only"
          type="file"
          accept=".hf-template.json,.json"
          @change="handleImport"
        />
        <button class="tm-import-btn" @click="fileInputRef?.click()">
          选择文件并导入
        </button>
        <p v-if="importError" class="tm-import-error">{{ importError }}</p>
        <p v-if="importSuccess" class="tm-import-success">{{ importSuccess }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storage } from '../engine/storage'
import { exportTemplate as exportTemplateToFile, downloadTemplate, importTemplate } from '../modules/template/types'
import type { RoomTemplate } from '../modules/template/types'
import { useTemplateMarket } from '../modules/template'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useStyle } from '../resonance/bridges/style'
import { isShareLocalOnly } from '../modules/share/share-local'

const { entranceRef, entranceClass } = useViewEntrance()

// 第43条 分享的本地边界（默认启用，UI 据以提示用户）
const shareLocalOnly = isShareLocalOnly()
const fileInputRef = ref<HTMLInputElement | null>(null)
const importError = ref('')
const importSuccess = ref('')

// ---- 顾问人设 / 语气（下沉到 useTemplateMarket 数据层） ----
const advisorMarket = useTemplateMarket()
onMounted(advisorMarket.load)

// ---- 风格包桥接（与材料工坊同源：applyTemplate 时应用真实风格包到全局 :root） ----
const style = useStyle()

// ---- 示例房间模板 ----

const roomTemplates: RoomTemplate[] = [
  {
    id: 'room-minimal-study',
    name: '极简书房',
    description: '干净、安静的专注空间，适合深度阅读与写作。',
    author: '心流工坊',
    version: '1.2.0',
    type: 'room',
    data: {
      layout: 'single-center',
      background: 'warm-wood',
      presetScene: 'mountain-cloud',
      widgets: ['timer', 'notes', 'goals'],
      style: {
        mode: 'dark',
        colors: {
          accent: '#a8967a',
          bgPrimary: '#0e0d0b',
          bgSecondary: '#17150f',
          textPrimary: '#e8e2d6',
          textSecondary: '#9a9284',
          border: 'rgba(255,255,255,0.06)',
        },
      },
    },
    createdAt: '2025-01-15T00:00:00.000Z',
    tags: ['专注', '阅读', '写作'],
  },
  {
    id: 'room-meditation-garden',
    name: '冥想庭院',
    description: '静谧的禅意空间，适合冥想、呼吸与情绪整理。',
    author: '心流工坊',
    version: '1.1.0',
    type: 'room',
    data: {
      layout: 'single-center',
      background: 'zen-garden',
      presetScene: 'forest-dawn',
      widgets: ['emotion', 'breathing', 'journal'],
      soundscape: 'forest-ambient',
      style: {
        mode: 'dark',
        colors: {
          accent: '#7fae8a',
          bgPrimary: '#080f0b',
          bgSecondary: '#0f1812',
          textPrimary: '#dceee0',
          textSecondary: '#8fa896',
          border: 'rgba(255,255,255,0.06)',
        },
      },
    },
    createdAt: '2025-02-20T00:00:00.000Z',
    tags: ['冥想', '放松', '自然'],
  },
  {
    id: 'room-dashboard',
    name: '效率看板',
    description: '一目了然的专注统计与任务看板，适合日回顾与规划。',
    author: '心流工坊',
    version: '1.1.0',
    type: 'room',
    data: {
      layout: 'grid',
      background: 'dark-professional',
      presetScene: 'none',
      widgets: ['stats', 'goals', 'timeline', 'calendar'],
      style: {
        mode: 'dark',
        colors: {
          accent: '#5b9bd5',
          bgPrimary: '#070b12',
          bgSecondary: '#0e1726',
          textPrimary: '#dce6f2',
          textSecondary: '#7f93ac',
          border: 'rgba(91,155,213,0.10)',
        },
      },
    },
    createdAt: '2025-03-10T00:00:00.000Z',
    tags: ['效率', '统计', '规划'],
  },
  {
    id: 'room-night-sanctuary',
    name: '深夜安全岛',
    description: '低刺激、暗色调的庇护空间，适合夜间情绪整理。',
    author: '心流工坊',
    version: '1.0.0',
    type: 'room',
    data: {
      layout: 'single-center',
      background: 'deep-night',
      presetScene: 'snowy-night',
      widgets: ['emotion', 'journal'],
      dimming: 0.3,
      style: {
        mode: 'dark',
        colors: {
          accent: '#8a7fb0',
          bgPrimary: '#0a0812',
          bgSecondary: '#140f20',
          textPrimary: '#e2dcf0',
          textSecondary: '#9488ac',
          border: 'rgba(255,255,255,0.06)',
        },
      },
    },
    createdAt: '2025-04-05T00:00:00.000Z',
    tags: ['夜间', '情绪', '庇护'],
  },
  {
    id: 'room-body-temple',
    name: '身体温室',
    description: '融合运动记录与身体觉察的空间，适合晨间唤醒与晚间放松。',
    author: '心流工坊',
    version: '1.0.0',
    type: 'room',
    data: {
      layout: 'split',
      background: 'warm-sunset',
      presetScene: 'autumn-courtyard',
      widgets: ['movement', 'breathing', 'body-stats'],
      style: {
        mode: 'dark',
        colors: {
          accent: '#d4a574',
          bgPrimary: '#0e0a06',
          bgSecondary: '#1a120a',
          textPrimary: '#f0e2d0',
          textSecondary: '#a8917a',
          border: 'rgba(255,255,255,0.06)',
        },
      },
    },
    createdAt: '2025-05-01T00:00:00.000Z',
    tags: ['运动', '身体', '觉察'],
  },
  {
    id: 'room-focus-peak',
    name: '专注峰顶',
    description: '高度专注的极简空间，排除一切干扰，适合高强度工作。',
    author: '心流工坊',
    version: '1.0.0',
    type: 'room',
    data: {
      layout: 'fullscreen',
      background: 'sheer-white',
      presetScene: 'none',
      widgets: ['timer', 'progress'],
      dimming: 0.1,
      style: {
        mode: 'dark',
        colors: {
          accent: '#c9c9d4',
          bgPrimary: '#16161c',
          bgSecondary: '#22222a',
          textPrimary: '#f5f5f7',
          textSecondary: '#9a9aa6',
          border: 'rgba(255,255,255,0.08)',
        },
      },
    },
    createdAt: '2025-05-15T00:00:00.000Z',
    tags: ['专注', '极简', '高强度'],
  },
]

// ---- 示例幕僚性格模板 ----

const advisorTemplates: RoomTemplate[] = [
  {
    id: 'advisor-wise-elder',
    name: '睿智长者',
    description: '沉稳、温和的引导型幕僚，适合需要鼓励与大局观的时刻。',
    author: '心流工坊',
    version: '1.0.0',
    type: 'advisor',
    data: {
      persona: 'wise-elder',
      tone: 'gentle',
      traits: ['patience', 'wisdom', 'encouraging'],
      greeting: '孩子，今天的路，你走得很好。',
    },
    createdAt: '2025-01-20T00:00:00.000Z',
    tags: ['温和', '引导', '鼓励'],
  },
  {
    id: 'advisor-accountability-partner',
    name: '问责伙伴',
    description: '直接、干脆的督促型幕僚，帮你守住承诺、推进计划。',
    author: '心流工坊',
    version: '1.0.0',
    type: 'advisor',
    data: {
      persona: 'accountability-partner',
      tone: 'direct',
      traits: ['firm', 'honest', 'motivating'],
      greeting: '你上周说这周要完成的事，开始了吗？',
    },
    createdAt: '2025-02-10T00:00:00.000Z',
    tags: ['督促', '直接', '效率'],
  },
  {
    id: 'advisor-creative-spark',
    name: '灵感火花',
    description: '天马行空、充满想象力的幕僚，适合创意产出与头脑风暴。',
    author: '心流工坊',
    version: '1.0.0',
    type: 'advisor',
    data: {
      persona: 'creative-spark',
      tone: 'playful',
      traits: ['imaginative', 'curious', 'unconventional'],
      greeting: '嘿，如果今天没什么规则，你最想做什么？',
    },
    createdAt: '2025-03-01T00:00:00.000Z',
    tags: ['创意', '想象', '轻松'],
  },
  {
    id: 'advisor-mindful-observer',
    name: '静观者',
    description: '安静、内省的幕僚，帮助你觉察当下、梳理内心。',
    author: '心流工坊',
    version: '1.0.0',
    type: 'advisor',
    data: {
      persona: 'mindful-observer',
      tone: 'calm',
      traits: ['introspective', 'patient', 'observant'],
      greeting: '此刻，你感受到什么？',
    },
    createdAt: '2025-03-25T00:00:00.000Z',
    tags: ['内省', '静观', '情绪'],
  },
]

function handleExport(tmpl: RoomTemplate) {
  const share = exportTemplateToFile(tmpl)
  downloadTemplate(share)
}

function applyTemplate(tmpl: RoomTemplate) {
  const confirmMsg = tmpl.type === 'room'
    ? `应用房间模板「${tmpl.name}」？当前全局主题与背景将被覆盖。`
    : `应用幕僚性格模板「${tmpl.name}」？当前幕僚设置将被覆盖。`
  if (!confirm(confirmMsg)) return

  try {
    if (tmpl.type === 'room') {
      const data = tmpl.data as any
      // 1) 应用真实风格包到全局：与材料工坊同源，importPack 写入 :root CSS 变量，所有房间共享生效
      if (data.style) {
        style.importPack({
          formatVersion: 1,
          id: `tmpl-${tmpl.id}`,
          name: tmpl.name,
          version: tmpl.version,
          author: tmpl.author,
          description: tmpl.description,
          createdAt: tmpl.createdAt,
          theme: {
            mode: data.style.mode ?? 'dark',
            colors: data.style.colors,
          },
          fonts: data.style.fonts ?? {
            display: "'Inter','Noto Sans SC',system-ui",
            body: "'Inter','Noto Sans SC',system-ui",
            mono: "'JetBrains Mono',monospace",
          },
          animations: data.style.animations ?? { breathingSpeed: 1.0, particleDensity: 1.0 },
        })
      }
      // 2) 应用有效预设场景背景（presetScene 必须是 6 个有效枚举之一，否则 HomeBackgroundMedia 不渲染）
      if (data.presetScene) {
        const config = storage.getConfig()
        config.background = {
          ...config.background,
          type: 'preset',
          presetScene: data.presetScene,
        }
        storage.setConfig(config)
      }
    } else if (tmpl.type === 'advisor') {
      const advisorData = tmpl.data as any
      advisorMarket.applyAdvisor(advisorData)
    }
    alert(`模板「${tmpl.name}」已应用`)
  } catch {
    alert('应用模板失败，请稍后重试')
  }
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importError.value = ''
  importSuccess.value = ''

  const reader = new FileReader()
  reader.onload = () => {
    const json = reader.result as string
    const share = importTemplate(json)
    if (!share) {
      importError.value = '文件格式不正确，请检查是否为有效的模板文件。'
      return
    }
    importSuccess.value = `成功导入模板「${share.name}」（${share.type === 'room' ? '房间' : '幕僚'}）`
  }
  reader.onerror = () => {
    importError.value = '文件读取失败，请重试。'
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<style scoped>
/* =============================================
   Warm Amber Theme — TemplateMarket
   Background:  var(--bg-primary) → var(--bg-deep) → var(--bg-surface-alt) → var(--bg-deepest)
   Accent:      var(--accent)
   Max-width:   600px
   ============================================= */

/* ---- Root Container ---- */

.tm {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 48px 24px 64px;
  color: var(--text-primary);
  min-height: 100vh;
  background: transparent;
  isolation: isolate;
}

/* Ambient glow — top-center */
.tm::before {
  content: '';
  position: fixed;
  top: -25%;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 500px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Ambient glow — bottom-right */
.tm::after {
  content: '';
  position: fixed;
  bottom: -15%;
  right: -10%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */

.tm-header {
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}

.orn-diamond {
  color: var(--accent);
  font-size: 14px;
  line-height: 1;
  opacity: 0.8;
}

.header-kicker {
  margin: 0 0 8px;
  font-size: 13px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(var(--accent-rgb), 0.7);
}

.tm-title {
  margin: 0;
  font-size: 28px;
  font-weight: 500;
  color: #f0e8de;
  letter-spacing: 0.02em;
}

/* ---- Overview Cards ---- */

.tm-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.tm-overview-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  transition: background 0.25s ease, border-color 0.25s ease;
}

.tm-overview-card:hover {
  background: rgba(var(--accent-rgb), 0.10);
  border-color: rgba(var(--accent-rgb), 0.22);
}

.tm-template-icon {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
}

.tm-template-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tm-overview-number {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.2;
}

.tm-overview-label {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.2;
}

/* ---- Section ---- */

.tm-room-section,
.tm-personality-section,
.tm-import-section {
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.tm-section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.15);
}

/* ---- Template Grid ---- */

.tm-template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.tm-template-card {
  padding: 18px;
  border-radius: 14px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.25s ease, background 0.25s ease;
}

.tm-template-card:hover {
  background: rgba(var(--accent-rgb), 0.07);
  border-color: rgba(var(--accent-rgb), 0.20);
}

.tm-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tm-type-badge {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.tm-type-badge--room {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
}

.tm-type-badge--advisor {
  background: rgba(var(--accent-rgb), 0.12);
  color: #c8956a;
}

.tm-version {
  font-size: 11px;
  color: var(--text-low);
}

.tm-template-name {
  font-size: 15px;
  font-weight: 500;
  color: #f0e8de;
  margin: 0;
}

.tm-template-desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
  flex: 1;
}

.tm-template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tm-template-tag {
  display: inline-flex;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--text-secondary);
}

.tm-template-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.tm-template-btn {
  flex: 1;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tm-template-btn:hover {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.30);
}

/* ---- Import Section ---- */

.tm-import-hint {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.50);
  margin: 0 0 12px;
}

.tm-local-notice {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px dashed rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  padding: 8px 10px;
  margin: 0 0 12px;
}

.tm-import-area {
  padding: 24px 20px;
  border-radius: 14px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px dashed rgba(var(--accent-rgb), 0.20);
  text-align: center;
}

.tm-import-btn {
  padding: 10px 22px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tm-import-btn:hover {
  background: rgba(var(--accent-rgb), 0.16);
  border-color: rgba(var(--accent-rgb), 0.32);
}

.tm-import-error {
  margin-top: 10px;
  font-size: 12px;
  color: #e07060;
}

.tm-import-success {
  margin-top: 10px;
  font-size: 12px;
  color: #7ab87a;
}

/* ---- Empty Hint ---- */

.tm-empty-hint {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.40);
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px dashed rgba(var(--accent-rgb), 0.10);
}

/* ---- Screen Reader Only ---- */

.tm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .tm { padding: 32px 20px 64px; }
  .tm-overview { gap: 8px; }
  .tm-overview-card { padding: 12px 8px; }
  .tm-template-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .tm { padding: 24px 14px 56px; }
  .tm-overview { flex-direction: column; }
  .tm-section-title { font-size: 12px; }
}

@media (max-width: 480px) {
  .tm-overview { grid-template-columns: repeat(2, 1fr); }
  .tm-template-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
  .tm-template-card { padding: 12px; }
}
</style>