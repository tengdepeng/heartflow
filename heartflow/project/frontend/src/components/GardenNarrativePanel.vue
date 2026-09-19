<!-- ============================================================
  情绪花房 · 花园叙事面板
  接线孤儿引擎 garden-narrative(useGardenNarrative)：
  花语故事 / 成长日记 / 季节相册 / 花园分享 / 访客留言
  ============================================================ -->
<template>
  <section class="gnp" data-enter aria-label="花园叙事">
    <header class="gnp-head">
      <div class="gnp-head-titles">
        <span class="gnp-title">🌻 花园叙事</span>
        <span class="gnp-sub">花语故事 · 成长日记 · 季节相册 · 花园分享</span>
      </div>
      <button v-if="records.length" class="gnp-refresh" @click="regenerate">重新生成</button>
    </header>

    <div v-if="!records.length" class="gnp-empty-hero">
      记录第一份情绪，花园会为它长出一朵花，也为你写下一段花语故事。
    </div>

    <template v-else>
      <div class="gnp-row">
        <!-- 花语故事 -->
        <div class="gnp-block" data-test="stories">
          <div class="gnp-block-head">
            <h4 class="gnp-block-title">花语故事 <em v-if="stories.length">({{ stories.length }})</em></h4>
            <button class="gnp-mini" @click="generateMoreStories">续写故事</button>
          </div>
          <ul v-if="stories.length" class="gnp-stories">
            <li
              v-for="s in stories"
              :key="s.id"
              class="gnp-story"
              :class="{ 'gnp-story--milestone': s.isMilestone }"
            >
              <span class="gnp-badge" :style="{ background: emotionColor(s.emotionType) }">
                {{ emotionLabel(s.emotionType) }}
              </span>
              <div class="gnp-story-body">
                <div class="gnp-story-line">
                  <strong>{{ s.title }}</strong>
                  <span v-if="s.isMilestone" class="gnp-milestone">★ 里程碑</span>
                </div>
                <p>{{ s.content }}</p>
                <time>{{ s.date }}</time>
              </div>
            </li>
          </ul>
          <p v-else class="gnp-empty">花园还很安静，点「续写故事」让花朵开口。</p>
        </div>

        <!-- 成长日记 -->
        <div class="gnp-block" data-test="diary">
          <h4 class="gnp-block-title">成长日记</h4>
          <ul v-if="diaryEntries.length" class="gnp-diary">
            <li v-for="e in diaryEntries" :key="e.id" class="gnp-diary-item">
              <div class="gnp-diary-head">
                <strong>{{ e.title }}</strong>
                <span class="gnp-mood" :class="moodClass(e.mood)">{{ moodLabel(e.mood) }}</span>
                <span v-if="e.isPrivate" class="gnp-private">🔒 私密</span>
              </div>
              <p>{{ e.content }}</p>
              <em v-if="e.newFlowers > 0">新开 {{ e.newFlowers }} 朵 · 健康 {{ e.healthScore }}</em>
            </li>
          </ul>
          <p v-else class="gnp-empty">还没有日记，花园会把每一天的开花悄悄记下来。</p>
        </div>
      </div>

      <div class="gnp-row">
        <!-- 季节相册 -->
        <div class="gnp-block gnp-block--albums" data-test="albums">
          <h4 class="gnp-block-title">季节相册</h4>
          <div v-if="seasonAlbums.length" class="gnp-albums">
            <article
              v-for="a in seasonAlbums"
              :key="a.id"
              class="gnp-album"
              :style="{ borderColor: a.coverColor }"
            >
              <span class="gnp-album-season" :style="{ color: a.coverColor }">
                {{ seasonLabel(a.season) }} · {{ a.year }}
              </span>
              <p>{{ a.story }}</p>
              <em>{{ a.snapshot.totalFlowers }} 朵花 · 健康 {{ a.snapshot.healthScore }}</em>
            </article>
          </div>
          <p v-else class="gnp-empty">季节更替时，花园会为自己拍下一张相册。</p>
        </div>

        <!-- 花园分享 + 访客留言 -->
        <div class="gnp-block gnp-block--share" data-test="share">
          <h4 class="gnp-block-title">花园分享</h4>
          <div class="gnp-share-actions">
            <button class="gnp-mini" @click="createShare">生成分享链接</button>
          </div>
          <ul v-if="shareLinks.length" class="gnp-shares">
            <li v-for="l in shareLinks" :key="l.id" class="gnp-share" :class="{ 'gnp-share--off': !l.active }">
              <code>{{ l.code }}</code>
              <span>{{ shareStatus(l) }}</span>
              <button v-if="l.active" @click="deactivateShare(l.id)">停用</button>
            </li>
          </ul>

          <h4 class="gnp-block-title gnp-block-title--sm">访客留言</h4>
          <div v-if="selectedShareId" class="gnp-msg-form">
            <input v-model="msgName" placeholder="访客昵称" />
            <input v-model="msgContent" placeholder="写一句留言…" @keyup.enter="addMessage" />
            <button @click="addMessage" :disabled="!msgContent.trim()">留言</button>
          </div>
          <ul v-if="visitorMessages.length" class="gnp-messages">
            <li v-for="m in visitorMessages" :key="m.id" class="gnp-message">
              <div class="gnp-message-head">
                <strong>{{ m.visitorName }}</strong>
                <span v-if="m.reaction" class="gnp-reaction">{{ m.reaction }}</span>
              </div>
              <p>{{ m.content }}</p>
            </li>
          </ul>
          <p v-else class="gnp-empty">生成链接后，朋友就能在花园里为你留下祝福。</p>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useEmotionGarden, useGardenNarrative, EMOTION_FLOWERS } from '../modules/emotion'
import {
  computeEnvironment,
  generateFlowerLayout,
  calculateGardenHealth,
  getFlowerClusters,
} from '../modules/emotion/garden-environment'
import type { EmotionType } from '../modules/emotion/types'
import type { ShareLink } from '../modules/emotion/garden-narrative'

const garden = useEmotionGarden()
const narrative = useGardenNarrative()

// 数据源：与宿主 EmotionGarden 同源(useEmotionGarden 共享模块级 records，宿主增删即响应)
const records = computed(() => garden.records.value)

const flowers = computed(() => generateFlowerLayout(records.value))
const health = computed(() => calculateGardenHealth(flowers.value, records.value))
const environment = computed(() => computeEnvironment(garden.getAmbientMood()))
const clusters = computed(() => getFlowerClusters(flowers.value))

// 叙述读值（解包 ref）
const stories = computed(() => narrative.stories.value)
const diaryEntries = computed(() => narrative.diaryEntries.value)
const seasonAlbums = computed(() => narrative.seasonAlbums.value)
const shareLinks = computed(() => narrative.shareLinks.value)
const visitorMessages = computed(() => narrative.visitorMessages.value)

// ---- 交互状态 ----
const selectedShareId = ref<string | null>(null)
const msgName = ref('')
const msgContent = ref('')

// ---- 生成 ----
function regenerate() {
  narrative.generateFullNarrative(
    records.value,
    flowers.value,
    health.value,
    environment.value,
    clusters.value,
  )
}

function generateMoreStories() {
  narrative.generateStories(records.value, flowers.value)
}

// ---- 分享 / 留言 ----
function createShare() {
  const link = narrative.createShareLink()
  selectedShareId.value = link.id
}

function deactivateShare(id: string) {
  narrative.deactivateShare(id)
}

function addMessage() {
  if (!selectedShareId.value) return
  const content = msgContent.value.trim()
  if (!content) return
  narrative.addVisitorMessage(selectedShareId.value, msgName.value.trim(), content)
  msgContent.value = ''
  msgName.value = ''
}

function shareStatus(l: ShareLink): string {
  return l.active ? (l.expiresAt ? '分享中' : '分享中 · 永久') : '已停用'
}

// ---- 文案映射 ----
const MOOD_LABELS: Record<string, string> = {
  sunny: '阳光灿烂',
  cloudy: '多云转晴',
  rainy: '细雨绵绵',
  stormy: '风雨交加',
  peaceful: '宁静致远',
}
const MOOD_CLASSES: Record<string, string> = {
  sunny: 'gnp-mood--sunny',
  cloudy: 'gnp-mood--cloudy',
  rainy: 'gnp-mood--rainy',
  stormy: 'gnp-mood--stormy',
  peaceful: 'gnp-mood--peaceful',
}
const SEASON_ICONS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

function emotionLabel(type: string): string {
  return EMOTION_FLOWERS[type as EmotionType]?.label ?? type
}
function emotionColor(type: string): string {
  return EMOTION_FLOWERS[type as EmotionType]?.color ?? '#7c8a7a'
}
function moodLabel(mood: string): string {
  return MOOD_LABELS[mood] ?? mood
}
function moodClass(mood: string): string {
  return MOOD_CLASSES[mood] ?? 'gnp-mood--peaceful'
}
function seasonLabel(season: string): string {
  return SEASON_ICONS[season] ?? season
}

onMounted(() => {
  garden.load()
  regenerate()
})

// 外部新增情绪记录时，重新纳入叙述（生成/更新当日日记，自动补快照与相册）
watch(() => records.value.length, () => regenerate())
</script>

<style scoped>
.gnp {
  --gnp-bg: rgba(var(--panel-rgb, 18 18 18), 0.5);
  background: var(--gnp-bg);
  border: 1px solid rgba(var(--border-rgb, 255 255 255), 0.08);
  border-radius: 14px;
  padding: 18px 20px;
  margin: 14px 0;
}

.gnp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.gnp-head-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gnp-title {
  font-size: 17px;
  font-weight: 650;
  color: var(--text-primary, #efe8dd);
}
.gnp-sub {
  font-size: 12px;
  color: var(--text-muted, rgba(239, 232, 221, 0.55));
}
.gnp-refresh,
.gnp-mini {
  border: 1px solid rgba(var(--accent-rgb, 138 154 122), 0.45);
  background: transparent;
  color: var(--text-secondary, #d8d2c8);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.gnp-refresh:hover,
.gnp-mini:hover {
  background: rgba(var(--accent-rgb, 138 154 122), 0.14);
}

.gnp-empty-hero {
  color: var(--text-muted, rgba(239, 232, 221, 0.6));
  font-size: 13px;
  text-align: center;
  padding: 26px 12px;
  background: rgba(var(--accent-rgb, 138 154 122), 0.06);
  border-radius: 10px;
}

.gnp-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.gnp-row:last-child {
  margin-bottom: 0;
}
@media (max-width: 760px) {
  .gnp-row {
    grid-template-columns: 1fr;
  }
}

.gnp-block {
  background: rgba(var(--panel-rgb, 18 18 18), 0.35);
  border: 1px solid rgba(var(--border-rgb, 255 255 255), 0.06);
  border-radius: 10px;
  padding: 12px 14px;
}
.gnp-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.gnp-block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #d8d2c8);
  margin: 0 0 10px;
}
.gnp-block-title em {
  font-style: normal;
  color: var(--text-muted, rgba(239, 232, 221, 0.55));
  font-size: 12px;
  font-weight: 400;
}
.gnp-block-title--sm {
  margin-top: 14px;
}

.gnp-empty {
  color: var(--text-muted, rgba(239, 232, 221, 0.5));
  font-size: 12px;
  margin: 0;
  padding: 8px 0;
}

.gnp-stories,
.gnp-diary,
.gnp-shares,
.gnp-messages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gnp-story {
  display: flex;
  gap: 10px;
  padding: 9px;
  border-radius: 9px;
  background: rgba(var(--panel-rgb, 18 18 18), 0.35);
  border-left: 3px solid transparent;
}
.gnp-story--milestone {
  border-left-color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.gnp-badge {
  flex: 0 0 auto;
  align-self: flex-start;
  color: #1b1712;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  white-space: nowrap;
}
.gnp-story-body {
  flex: 1;
  min-width: 0;
}
.gnp-story-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.gnp-story-line strong {
  font-size: 13px;
  color: var(--text-primary, #efe8dd);
}
.gnp-story-body p {
  margin: 3px 0 4px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary, #d8d2c8);
}
.gnp-story-body time {
  font-size: 11px;
  color: var(--text-muted, rgba(239, 232, 221, 0.5));
}
.gnp-milestone {
  color: #f0c040;
  font-size: 11px;
  font-weight: 600;
}

.gnp-diary-item {
  padding: 9px;
  border-radius: 9px;
  background: rgba(var(--panel-rgb, 18 18 18), 0.35);
}
.gnp-diary-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.gnp-diary-head strong {
  font-size: 13px;
  color: var(--text-primary, #efe8dd);
}
.gnp-mood {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 20px;
}
.gnp-mood--sunny { background: rgba(240, 192, 64, 0.2); color: #f0c040; }
.gnp-mood--cloudy { background: rgba(140, 150, 165, 0.2); color: #aab4c2; }
.gnp-mood--rainy { background: rgba(144, 128, 184, 0.2); color: #a89ac8; }
.gnp-mood--stormy { background: rgba(232, 112, 48, 0.2); color: #e8a070; }
.gnp-mood--peaceful { background: rgba(128, 184, 208, 0.2); color: #80b8d0; }
.gnp-private {
  font-size: 11px;
  color: var(--text-muted, rgba(239, 232, 221, 0.5));
}
.gnp-diary-item p {
  margin: 5px 0 3px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary, #d8d2c8);
}
.gnp-diary-item em {
  font-style: normal;
  font-size: 11px;
  color: var(--text-muted, rgba(239, 232, 221, 0.5));
}

.gnp-albums {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gnp-album {
  border: 1px solid;
  border-radius: 9px;
  padding: 9px 10px;
  background: rgba(var(--panel-rgb, 18 18 18), 0.3);
}
.gnp-album-season {
  font-size: 13px;
  font-weight: 650;
}
.gnp-album p {
  margin: 5px 0 4px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary, #d8d2c8);
}
.gnp-album em {
  font-style: normal;
  font-size: 11px;
  color: var(--text-muted, rgba(239, 232, 221, 0.5));
}

.gnp-share-actions {
  margin-bottom: 8px;
}
.gnp-share {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 9px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb, 138 154 122), 0.1);
}
.gnp-share--off {
  background: rgba(var(--danger-rgb, 196 106 90), 0.1);
}
.gnp-share code {
  font-family: monospace;
  letter-spacing: 1px;
  font-size: 12px;
  color: var(--text-primary, #efe8dd);
}
.gnp-share span {
  margin-left: auto;
  color: var(--text-muted, rgba(239, 232, 221, 0.55));
  font-size: 11px;
}
.gnp-share button {
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(239, 232, 221, 0.55));
  font-size: 11px;
  cursor: pointer;
}
.gnp-share button:hover {
  color: var(--danger, #c46a5a);
}

.gnp-msg-form {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.gnp-msg-form input {
  flex: 1 1 100px;
  min-width: 0;
  background: rgba(var(--panel-rgb, 18 18 18), 0.5);
  border: 1px solid rgba(var(--border-rgb, 255 255 255), 0.1);
  border-radius: 8px;
  padding: 6px 9px;
  color: var(--text-primary, #efe8dd);
  font-size: 12px;
}
.gnp-msg-form button {
  flex: 0 0 auto;
  border: 1px solid rgba(var(--accent-rgb, 138 154 122), 0.45);
  background: transparent;
  color: var(--text-secondary, #d8d2c8);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}
.gnp-msg-form button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gnp-message {
  padding: 7px 9px;
  border-radius: 8px;
  background: rgba(var(--panel-rgb, 18 18 18), 0.3);
}
.gnp-message-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gnp-message-head strong {
  font-size: 12px;
  color: var(--text-secondary, #d8d2c8);
}
.gnp-message p {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary, #efe8dd);
}
</style>