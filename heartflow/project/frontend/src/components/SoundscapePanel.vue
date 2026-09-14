<template>
  <section class="scp" aria-label="环境音景">
    <div class="scp-head">
      <span class="scp-title">🔊 环境音景</span>
      <span class="scp-sub">音景 · 环境 · 氛围</span>
    </div>

    <!-- 音景选择 -->
    <div v-if="soundscapes.length" class="scp-list">
      <button
        v-for="s in soundscapes"
        :key="s.id"
        class="scp-item"
        :class="{ active: s.id === activeId }"
        @click="switchSoundscape(s.id)"
      >
        <span class="scp-item-name">{{ s.name }}</span>
        <span class="scp-item-ambient">{{ s.ambient }}</span>
      </button>
    </div>
    <p v-else class="scp-empty">暂无音景。</p>

    <!-- 活跃音景详情 -->
    <div v-if="active" class="scp-detail">
      <div class="scp-detail-head">
        <span class="scp-detail-name">{{ active.name }} · {{ active.ambient }}</span>
      </div>

      <div class="scp-section">
        <span class="scp-section-label">情绪旋律</span>
        <div class="scp-tags">
          <span v-for="(melody, emo) in active.emotionMelodies" :key="emo" class="scp-tag">
            {{ EMOTION_LABELS[emo] }} · {{ melody }}
          </span>
        </div>
      </div>

      <div class="scp-section">
        <span class="scp-section-label">季节变奏</span>
        <div class="scp-tags">
          <span v-for="(variation, se) in active.seasonalVariations" :key="se" class="scp-tag">
            {{ SEASON_LABELS[se] }} · {{ variation }}
          </span>
        </div>
      </div>
    </div>

    <!-- 音量控制 -->
    <div class="scp-volume">
      <div class="scp-volume-row">
        <span class="scp-volume-label">音量</span>
        <span class="scp-volume-value">{{ Math.round(masterVolume * 100) }}%</span>
      </div>
      <div class="scp-volume-bar" aria-label="音量">
        <div class="scp-volume-fill" :style="{ width: `${Math.round(masterVolume * 100)}%` }"></div>
      </div>
      <div class="scp-volume-btns">
        <button class="scp-btn" @click="setVolume(masterVolume - 0.1)">−</button>
        <button class="scp-btn" @click="setVolume(0)">静音</button>
        <button class="scp-btn" @click="setVolume(1)">最大</button>
        <button class="scp-btn" @click="setVolume(masterVolume + 0.1)">+</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSoundscape } from '../modules/emotion/flower-season'
import type { Soundscape, Season } from '../modules/emotion/flower-season'
import type { EmotionType } from '../modules/emotion/types'

const {
  soundscapes,
  activeSoundscapeId,
  masterVolume,
  initSoundscapes,
  switchSoundscape,
  getActiveSoundscape,
  setVolume,
} = useSoundscape()

onMounted(() => {
  initSoundscapes()
})

const active = computed<Soundscape | undefined>(() => getActiveSoundscape())
const activeId = computed<string | null>(() => activeSoundscapeId.value)

const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '愉悦', calm: '平静', sad: '悲伤', angry: '愤怒', anxious: '焦虑',
}

const SEASON_LABELS: Record<Season, string> = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬',
}
</script>

<style scoped>
.scp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.scp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.scp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.scp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.scp-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.scp-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}
.scp-item.active {
  border-color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.scp-item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.scp-item.active .scp-item-name {
  color: #f0c040;
}
.scp-item-ambient {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.45));
}
.scp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
}
.scp-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.08);
  border: 1px solid rgba(138, 154, 122, 0.2);
}
.scp-detail-head {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.scp-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scp-section-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
}
.scp-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.scp-tag {
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.scp-volume {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.scp-volume-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.scp-volume-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.scp-volume-value {
  font-size: 13px;
  font-weight: 600;
  color: #f0c040;
}
.scp-volume-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.scp-volume-fill {
  height: 100%;
  border-radius: 3px;
  background: #f0c040;
  transition: width 0.2s;
}
.scp-volume-btns {
  display: flex;
  gap: 6px;
}
.scp-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.scp-btn:hover {
  border-color: #f0c040;
  color: #f0c040;
}
</style>