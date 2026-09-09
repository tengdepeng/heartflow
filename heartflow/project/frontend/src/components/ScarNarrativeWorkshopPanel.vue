<template>
  <section class="snw snw-panel">
    <header class="snw-head">
      <h3 class="snw-title">🕯️ 伤痕叙事工坊</h3>
      <p class="snw-sub">故事书写 · 匿名共鸣 · 伤痕地图 · 锻造仪式</p>
    </header>

    <nav class="snw-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="snw-tab"
        :class="{ 'snw-tab--active': activeTab === tab.key }"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </nav>

    <!-- 故事 -->
    <div v-show="activeTab === 'story'" class="snw-body">
      <div class="snw-stats">
        <div class="snw-stat"><span class="snw-stat-n">{{ storyStats.total }}</span><span class="snw-stat-l">故事</span></div>
        <div class="snw-stat"><span class="snw-stat-n">{{ storyStats.completed }}</span><span class="snw-stat-l">已完成</span></div>
        <div class="snw-stat"><span class="snw-stat-n">{{ storyStats.totalChapters }}</span><span class="snw-stat-l">章节</span></div>
      </div>
      <div class="snw-row">
        <input v-model="newStory.title" placeholder="故事标题" class="snw-input" />
        <input v-model="newStory.summary" placeholder="摘要" class="snw-input" />
        <button class="snw-btn snw-btn--primary" @click="onCreateStory">书写新故事</button>
      </div>
      <ul class="snw-list">
        <li v-for="s in stories" :key="s.id" class="snw-item">
          <div class="snw-item-main">
            <span class="snw-badge" :class="s.completed ? 'snw-badge--done' : ''">{{ s.completed ? '已完成' : '书写中' }}</span>
            <span class="snw-item-name">{{ s.title }}</span>
            <span class="snw-muted">{{ s.chapters.length }} 章 · 读 {{ s.readCount }}</span>
          </div>
          <span class="snw-muted">{{ getEmotionArcDescription(s) }}</span>
        </li>
        <li v-if="stories.length === 0" class="snw-empty">还没有故事，写下第一段吧</li>
      </ul>
    </div>

    <!-- 社区 -->
    <div v-show="activeTab === 'community'" class="snw-body">
      <div class="snw-stats">
        <div class="snw-stat"><span class="snw-stat-n">{{ shares.length }}</span><span class="snw-stat-l">匿名分享</span></div>
        <div class="snw-stat"><span class="snw-stat-n">{{ totalResonance }}</span><span class="snw-stat-l">共鸣总数</span></div>
      </div>
      <div class="snw-row">
        <input v-model="newShare.title" placeholder="分享标题" class="snw-input" />
        <input v-model="newShare.excerpt" placeholder="摘要" class="snw-input" />
        <button class="snw-btn snw-btn--primary" @click="onCreateShare">匿名分享</button>
      </div>
      <ul class="snw-list">
        <li v-for="sh in recentShares" :key="sh.id" class="snw-item">
          <div class="snw-item-main">
            <span class="snw-badge">{{ sh.isAnonymous ? '匿名' : sh.anonymousName }}</span>
            <span class="snw-item-name">{{ sh.title }}</span>
            <span class="snw-muted">💗 {{ sh.resonanceCount }}</span>
          </div>
        </li>
        <li v-if="shares.length === 0" class="snw-empty">还没有社区分享</li>
      </ul>
    </div>

    <!-- 地图 -->
    <div v-show="activeTab === 'map'" class="snw-body">
      <div class="snw-stats">
        <div class="snw-stat"><span class="snw-stat-n">{{ scarMap?.totalScars ?? 0 }}</span><span class="snw-stat-l">伤痕总数</span></div>
        <div class="snw-stat"><span class="snw-stat-n">{{ scarMap?.overallHealingRate ?? 0 }}%</span><span class="snw-stat-l">整体愈合率</span></div>
        <div class="snw-stat"><span class="snw-stat-n">{{ scarMap?.mostSeverePart ?? '—' }}</span><span class="snw-stat-l">最严重部位</span></div>
      </div>
      <div class="snw-row snw-row--end">
        <button class="snw-btn snw-btn--primary" :disabled="!marks.length" @click="onGenerateMap">生成伤痕地图</button>
      </div>
      <ul class="snw-list">
        <li v-for="hd in scarMap?.heatData ?? []" :key="hd.bodyPart" class="snw-item">
          <div class="snw-item-main">
            <span class="snw-item-name">{{ hd.bodyPart }}</span>
            <span class="snw-muted">{{ hd.scarCount }} 道 · 均级 {{ hd.avgSeverity }} · 愈合 {{ hd.avgHealingProgress }}%</span>
          </div>
          <div class="snw-heat"><div class="snw-heat-fill" :style="{ width: `${hd.heatValue}%` }" /></div>
        </li>
        <li v-if="!marks.length" class="snw-empty">暂无伤痕数据，无法生成地图</li>
      </ul>
    </div>

    <!-- 仪式 -->
    <div v-show="activeTab === 'ritual'" class="snw-body">
      <div class="snw-stats">
        <div class="snw-stat"><span class="snw-stat-n">{{ rituals.length }}</span><span class="snw-stat-l">仪式</span></div>
        <div class="snw-stat"><span class="snw-stat-n">{{ rituals.filter(r => r.completed).length }}</span><span class="snw-stat-l">已完成</span></div>
      </div>
      <div class="snw-row">
        <select v-model="newRitual.type" class="snw-input">
          <option value="monthly-review">月度回顾</option>
          <option value="milestone">里程碑</option>
          <option value="transformation">转化</option>
          <option value="closure">告别</option>
        </select>
        <input v-model="newRitual.name" placeholder="仪式名称" class="snw-input" />
        <button class="snw-btn snw-btn--primary" @click="onCreateRitual">开启锻造仪式</button>
      </div>
      <ol class="snw-list snw-rituals">
        <li v-for="r in rituals" :key="r.id" class="snw-item">
          <div class="snw-item-main">
            <span class="snw-badge" :class="r.completed ? 'snw-badge--done' : ''">{{ r.completed ? '已完成' : r.type }}</span>
            <span class="snw-item-name">{{ r.name }}</span>
          </div>
        </li>
        <li v-if="rituals.length === 0" class="snw-empty">还没有锻造仪式</li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useScarStories, useCommunitySupport, useScarMap, useForgingRituals } from '@/modules/scar'
import type { BodyMark } from '@/modules/scar/types'

const props = defineProps<{ marks?: BodyMark[] }>()
const marks = computed(() => props.marks ?? [])

const storiesApi = useScarStories()
const { stories, storyStats, getEmotionArcDescription, createStory, loadStories } = storiesApi
const community = useCommunitySupport()
const { shares, recentShares, createShare, loadShares } = community
const { scarMap, generateScarMap } = useScarMap()
const ritualsApi = useForgingRituals()
const { rituals, createRitual, loadRituals } = ritualsApi

// 引擎为局部 ref，需显式载入持久化数据（孤儿组件接线补全）
onMounted(() => {
  loadStories()
  loadShares()
  loadRituals()
})

const tabs = [
  { key: 'story', label: '故事' },
  { key: 'community', label: '社区' },
  { key: 'map', label: '地图' },
  { key: 'ritual', label: '仪式' },
] as const
type TabKey = typeof tabs[number]['key']
const activeTab = ref<TabKey>('story')

const totalResonance = computed(() => shares.value.reduce((s, sh) => s + sh.resonanceCount, 0))

const newStory = reactive({ title: '', summary: '' })
function onCreateStory() {
  if (!newStory.title.trim()) return
  createStory([], newStory.title.trim(), newStory.summary.trim(), [])
  newStory.title = ''
  newStory.summary = ''
}
const newShare = reactive({ title: '', excerpt: '' })
function onCreateShare() {
  if (!newShare.title.trim()) return
  createShare('', newShare.title.trim(), newShare.excerpt.trim(), '匿名', true)
  newShare.title = ''
  newShare.excerpt = ''
}
function onGenerateMap() {
  if (marks.value.length) generateScarMap(marks.value)
}
const newRitual = reactive({ type: 'monthly-review' as const, name: '' })
function onCreateRitual() {
  if (!newRitual.name.trim()) return
  createRitual(newRitual.type, [], newRitual.name.trim())
  newRitual.name = ''
}
</script>

<style scoped>
.snw-panel {
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  padding: 16px;
  color: var(--hf-text);
  max-width: 560px;
}
.snw-head { margin-bottom: 12px; }
.snw-title { margin: 0; font-size: 16px; }
.snw-sub { margin: 2px 0 0; font-size: 12px; color: var(--hf-text-muted); }
.snw-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.snw-tab { background: transparent; border: 1px solid var(--hf-border); color: var(--hf-text-muted); border-radius: 999px; padding: 4px 12px; font-size: 12px; cursor: pointer; }
.snw-tab--active { background: var(--hf-primary); color: #fff; border-color: var(--hf-primary); }
.snw-stats { display: flex; gap: 8px; margin-bottom: 12px; }
.snw-stat { flex: 1; background: var(--hf-bg); border: 1px solid var(--hf-border); border-radius: var(--hf-radius); padding: 8px; text-align: center; }
.snw-stat-n { display: block; font-size: 18px; font-weight: 600; color: var(--hf-primary); }
.snw-stat-l { font-size: 11px; color: var(--hf-text-muted); }
.snw-row { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; }
.snw-row--end { justify-content: flex-end; }
.snw-input { background: var(--hf-surface); border: 1px solid var(--hf-border); border-radius: 6px; padding: 5px 8px; color: var(--hf-text); font-size: 13px; flex: 1; min-width: 0; }
.snw-btn { background: var(--hf-surface); border: 1px solid var(--hf-border); color: var(--hf-text); border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
.snw-btn--primary { background: var(--hf-primary); color: #fff; border-color: var(--hf-primary); }
.snw-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.snw-rituals { list-style: decimal inside; }
.snw-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; background: var(--hf-bg); border: 1px solid var(--hf-border); border-radius: 6px; padding: 8px; flex-wrap: wrap; }
.snw-item-main { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.snw-item-name { font-size: 13px; }
.snw-badge { font-size: 11px; padding: 1px 6px; border-radius: 6px; background: var(--hf-surface); border: 1px solid var(--hf-border); color: var(--hf-text-muted); }
.snw-badge--done { color: #98c379; border-color: #98c379; }
.snw-muted { font-size: 11px; color: var(--hf-text-muted); }
.snw-heat { flex-basis: 100%; height: 4px; background: var(--hf-border); border-radius: 999px; overflow: hidden; }
.snw-heat-fill { height: 100%; background: #e06c75; }
.snw-empty { font-size: 12px; color: var(--hf-text-muted); text-align: center; padding: 12px; }
</style>
