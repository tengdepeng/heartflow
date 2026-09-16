<template>
  <section class="brp" aria-label="荐书">
    <div class="brp-head">
      <div class="brp-title-wrap">
        <span class="brp-title">荐书</span>
        <span class="brp-sub">从阅读历史析出偏好，为你挑下一本</span>
      </div>
    </div>

    <div class="brp-tabs" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        class="brp-tab"
        :class="{ 'is-active': tab === t.key }"
        role="tab"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ============ 荐书 ============ -->
    <div v-show="tab === 'recs'" class="brp-body">
      <div class="brp-actions">
        <button type="button" class="brp-btn" :disabled="!books.length" @click="runRecommend">
          {{ recommendations.length ? '重新生成推荐' : '从阅读历史生成推荐' }}
        </button>
        <span v-if="!books.length" class="brp-hint">先添加几本书，才能生成推荐</span>
      </div>

      <div v-if="summary.total > 0" class="brp-summary">
        <div class="brp-summary-metric"><b>{{ summary.total }}</b><span>推荐</span></div>
        <div class="brp-summary-metric"><b>{{ summary.averageMatchScore }}</b><span>平均匹配</span></div>
        <div class="brp-summary-metric"><b>{{ summary.topMatchedTags.length }}</b><span>匹配标签</span></div>
      </div>

      <p v-if="!recommendations.length" class="brp-empty">生成推荐后，这里会列出与你偏好匹配的书籍。</p>
      <div v-else class="brp-recs">
        <div v-for="r in recommendations" :key="r.id" class="brp-rec">
          <div class="brp-rec-head">
            <div class="brp-rec-title-wrap">
              <b class="brp-rec-title">《{{ r.title }}》</b>
              <span class="brp-rec-author">{{ r.author }}</span>
            </div>
            <span class="brp-rec-score">{{ r.reason.matchScore }}</span>
          </div>
          <div class="brp-rec-reason">
            <span class="brp-rec-reason-primary">{{ r.reason.primary }}</span>
            <span class="brp-rec-reason-detail">{{ r.reason.detail }}</span>
          </div>
          <div class="brp-rec-bar">
            <i :style="{ width: r.reason.matchScore + '%' }"></i>
          </div>
          <div class="brp-rec-foot">
            <div class="brp-rec-tags">
              <span v-for="t in r.reason.matchedTags.slice(0, 3)" :key="t" class="brp-rec-tag">{{ t }}</span>
            </div>
            <span class="brp-rec-meta">{{ r.estimatedReadingTime }} 分 · 难度 {{ '●'.repeat(r.difficulty) }}{{ '○'.repeat(5 - r.difficulty) }}</span>
            <button type="button" class="brp-rec-dismiss" @click="dismiss(r.id)" title="移除">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 偏好 ============ -->
    <div v-show="tab === 'prefs'" class="brp-body">
      <div class="brp-actions">
        <button type="button" class="brp-btn" :disabled="!books.length" @click="runAutoPrefs">从阅读历史更新偏好</button>
      </div>

      <div class="brp-pref-block">
        <span class="brp-block-label">偏好标签</span>
        <div v-if="preferences.preferredTags.length" class="brp-pref-list">
          <div v-for="p in preferences.preferredTags.slice(0, 8)" :key="p.tag" class="brp-pref-item">
            <span class="brp-pref-name">{{ p.tag }}</span>
            <div class="brp-pref-bar"><i :style="{ width: Math.round(p.weight * 100) + '%' }"></i></div>
            <span class="brp-pref-val">{{ Math.round(p.weight * 100) }}%</span>
          </div>
        </div>
        <p v-else class="brp-empty">更新偏好后，这里会显示你的标签偏好。</p>
      </div>

      <div class="brp-pref-block">
        <span class="brp-block-label">偏好作者</span>
        <div v-if="preferences.preferredAuthors.length" class="brp-pref-list">
          <div v-for="p in preferences.preferredAuthors.slice(0, 6)" :key="p.author" class="brp-pref-item">
            <span class="brp-pref-name">{{ p.author }}</span>
            <div class="brp-pref-bar"><i :style="{ width: Math.round(p.weight * 100) + '%' }"></i></div>
            <span class="brp-pref-val">{{ Math.round(p.weight * 100) }}%</span>
          </div>
        </div>
        <p v-else class="brp-empty">更新偏好后，这里会显示你的作者偏好。</p>
      </div>

      <div class="brp-pref-facts">
        <div class="brp-pref-fact">
          <span class="brp-pref-fact-label">偏好难度</span>
          <span class="brp-pref-fact-val">{{ '●'.repeat(preferences.preferredDifficulty) }}{{ '○'.repeat(5 - preferences.preferredDifficulty) }}</span>
        </div>
        <div class="brp-pref-fact">
          <span class="brp-pref-fact-label">偏好篇幅</span>
          <span class="brp-pref-fact-val">{{ LENGTH_META[preferences.preferredBookLength] }}</span>
        </div>
      </div>

      <div v-if="preferences.excludedTags.length || preferences.excludedAuthors.length" class="brp-pref-block">
        <span class="brp-block-label">已排除</span>
        <div class="brp-exclusions">
          <span v-for="t in preferences.excludedTags" :key="'t' + t" class="brp-exclusion">
            {{ t }}
            <button type="button" class="brp-exclusion-x" @click="unexclude('tag', t)">✕</button>
          </span>
          <span v-for="a in preferences.excludedAuthors" :key="'a' + a" class="brp-exclusion">
            {{ a }}
            <button type="button" class="brp-exclusion-x" @click="unexclude('author', a)">✕</button>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useReadingHall } from '../modules/reading/hall'
import { useBookRecommendations } from '../modules/reading/book-recommendations'
import type { Book } from '../modules/reading/types'

const TABS = [
  { key: 'recs', label: '荐书' },
  { key: 'prefs', label: '偏好' },
] as const

type TabKey = (typeof TABS)[number]['key']
const tab = ref<TabKey>('recs')

const hall = useReadingHall()
const books = computed(() => hall.books.value)

const recStore = useBookRecommendations()
const recommendations = computed(() => recStore.recommendations.value)
const preferences = computed(() => recStore.preferences.value)
const summary = computed(() => recStore.recommendationSummary.value)

const LENGTH_META: Record<string, string> = {
  short: '短篇',
  medium: '中篇',
  long: '长篇',
  any: '不限',
}

// 精选候选书库（供推荐引擎挑选）
const CANDIDATE_LIBRARY: Book[] = [
  { id: 'lib_1', title: '小王子', author: '圣埃克苏佩里', totalPages: 96, currentPage: 0, status: 'want_to_read', tags: ['哲学', '童话', '成长'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_2', title: '百年孤独', author: '加西亚·马尔克斯', totalPages: 360, currentPage: 0, status: 'want_to_read', tags: ['文学', '魔幻', '家族'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_3', title: '活着', author: '余华', totalPages: 191, currentPage: 0, status: 'want_to_read', tags: ['文学', '现实', '人生'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_4', title: '人类简史', author: '尤瓦尔·赫拉利', totalPages: 440, currentPage: 0, status: 'want_to_read', tags: ['历史', '社科', '文明'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_5', title: '思考，快与慢', author: '丹尼尔·卡尼曼', totalPages: 418, currentPage: 0, status: 'want_to_read', tags: ['心理', '思维', '决策'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_6', title: '非暴力沟通', author: '马歇尔·卢森堡', totalPages: 190, currentPage: 0, status: 'want_to_read', tags: ['沟通', '心理', '成长'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_7', title: '原则', author: '瑞·达利欧', totalPages: 550, currentPage: 0, status: 'want_to_read', tags: ['商业', '思维', '决策'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_8', title: '月亮与六便士', author: '毛姆', totalPages: 275, currentPage: 0, status: 'want_to_read', tags: ['文学', '理想', '人生'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_9', title: '被讨厌的勇气', author: '岸见一郎', totalPages: 194, currentPage: 0, status: 'want_to_read', tags: ['心理', '哲学', '成长'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_10', title: '三体', author: '刘慈欣', totalPages: 302, currentPage: 0, status: 'want_to_read', tags: ['科幻', '宇宙', '文明'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_11', title: '乡土中国', author: '费孝通', totalPages: 200, currentPage: 0, status: 'want_to_read', tags: ['社科', '社会', '文化'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_12', title: '瓦尔登湖', author: '梭罗', totalPages: 292, currentPage: 0, status: 'want_to_read', tags: ['哲学', '自然', '生活'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_13', title: '自控力', author: '凯利·麦格尼格尔', totalPages: 263, currentPage: 0, status: 'want_to_read', tags: ['心理', '习惯', '成长'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_14', title: '围城', author: '钱锺书', totalPages: 359, currentPage: 0, status: 'want_to_read', tags: ['文学', '现实', '人生'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_15', title: '时间简史', author: '史蒂芬·霍金', totalPages: 256, currentPage: 0, status: 'want_to_read', tags: ['科学', '宇宙', '物理'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_16', title: '亲密关系', author: '罗兰·米勒', totalPages: 480, currentPage: 0, status: 'want_to_read', tags: ['心理', '关系', '成长'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_17', title: '禅与摩托车维修艺术', author: '罗伯特·波西格', totalPages: 416, currentPage: 0, status: 'want_to_read', tags: ['哲学', '旅行', '思维'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_18', title: '明朝那些事儿', author: '当年明月', totalPages: 296, currentPage: 0, status: 'want_to_read', tags: ['历史', '通俗', '文化'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_19', title: '心流', author: '米哈里·契克森米哈赖', totalPages: 336, currentPage: 0, status: 'want_to_read', tags: ['心理', '专注', '成长'], quotes: [], totalReadingTime: 0 },
  { id: 'lib_20', title: '局外人', author: '加缪', totalPages: 128, currentPage: 0, status: 'want_to_read', tags: ['文学', '哲学', '存在'], quotes: [], totalReadingTime: 0 },
]

function runRecommend() {
  recStore.autoUpdatePreferences(books.value)
  recStore.generateRecommendations(books.value, CANDIDATE_LIBRARY, 8)
}

function runAutoPrefs() {
  recStore.autoUpdatePreferences(books.value)
}

function dismiss(id: string) {
  recStore.dismissRecommendation(id)
}

function unexclude(type: 'tag' | 'author', value: string) {
  recStore.removeExclusion(type, value)
}

onMounted(() => {
  hall.getReadingStats()
})
</script>

<style scoped>
.brp {
  position: relative;
  z-index: 1;
  width: 100%;
  background: rgba(16, 14, 11, 0.55);
  border: 1px solid rgba(138, 122, 106, 0.15);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(14px);
}
.brp-head { margin-bottom: 12px; }
.brp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.brp-title { font-size: 15px; color: rgba(255, 246, 230, 0.92); letter-spacing: 2px; font-weight: 600; }
.brp-sub { font-size: 11px; color: rgba(138, 122, 106, 0.6); letter-spacing: 0.5px; }

.brp-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 14px; }
.brp-tab {
  border: 1px solid rgba(138, 122, 106, 0.15);
  background: transparent;
  color: rgba(255, 246, 230, 0.5);
  font-size: 11px;
  font-family: inherit;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.brp-tab:hover { color: rgba(255, 246, 230, 0.8); }
.brp-tab.is-active {
  background: rgba(138, 122, 106, 0.14);
  border-color: rgba(138, 122, 106, 0.3);
  color: #b8a088;
}

.brp-body { display: flex; flex-direction: column; gap: 14px; }
.brp-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.brp-btn {
  border: 1px solid rgba(138, 122, 106, 0.3);
  background: rgba(138, 122, 106, 0.1);
  color: #b8a088;
  font-size: 12px;
  font-family: inherit;
  padding: 7px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.brp-btn:hover:not(:disabled) { background: rgba(138, 122, 106, 0.18); border-color: rgba(138, 122, 106, 0.45); }
.brp-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.brp-hint { font-size: 10px; color: rgba(255, 246, 230, 0.4); }
.brp-empty { margin: 8px 0; font-size: 12px; color: rgba(255, 246, 230, 0.45); text-align: center; padding: 18px 0; }
.brp-block-label { font-size: 10px; color: rgba(255, 246, 230, 0.45); letter-spacing: 1px; }

.brp-summary { display: flex; gap: 8px; }
.brp-summary-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; background: rgba(138, 122, 106, 0.05); }
.brp-summary-metric b { font-size: 15px; font-weight: 600; color: #b8a088; font-variant-numeric: tabular-nums; }
.brp-summary-metric span { font-size: 10px; color: rgba(255, 246, 230, 0.4); }

.brp-recs { display: flex; flex-direction: column; gap: 8px; }
.brp-rec { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(138, 122, 106, 0.1); }
.brp-rec-head { display: flex; align-items: center; gap: 10px; }
.brp-rec-title-wrap { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.brp-rec-title { font-size: 13px; color: rgba(255, 246, 230, 0.9); }
.brp-rec-author { font-size: 10px; color: rgba(255, 246, 230, 0.4); }
.brp-rec-score { font-size: 16px; font-weight: 600; color: #b8a088; font-variant-numeric: tabular-nums; }
.brp-rec-reason { display: flex; flex-direction: column; gap: 2px; }
.brp-rec-reason-primary { font-size: 11px; color: #b8a088; }
.brp-rec-reason-detail { font-size: 10px; color: rgba(255, 246, 230, 0.5); line-height: 1.5; }
.brp-rec-bar { height: 4px; border-radius: 999px; background: rgba(138, 122, 106, 0.1); overflow: hidden; }
.brp-rec-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgba(138, 122, 106, 0.4), #b8a088); }
.brp-rec-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.brp-rec-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.brp-rec-tag { font-size: 9px; padding: 2px 8px; border-radius: 6px; background: rgba(138, 122, 106, 0.1); color: rgba(255, 246, 230, 0.6); }
.brp-rec-meta { font-size: 10px; color: rgba(255, 246, 230, 0.4); margin-left: auto; }
.brp-rec-dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   border: none; background: transparent; color: rgba(255, 246, 230, 0.35); cursor: pointer; font-size: 12px; padding: 2px 6px; 
  min-height: 26px;
}
.brp-rec-dismiss:hover { color: #c46a5a; }

.brp-pref-block { display: flex; flex-direction: column; gap: 8px; }
.brp-pref-list { display: flex; flex-direction: column; gap: 6px; }
.brp-pref-item { display: flex; align-items: center; gap: 8px; }
.brp-pref-name { width: 72px; flex-shrink: 0; font-size: 11px; color: rgba(255, 246, 230, 0.7); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.brp-pref-bar { flex: 1; height: 4px; border-radius: 999px; background: rgba(138, 122, 106, 0.1); overflow: hidden; }
.brp-pref-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgba(138, 122, 106, 0.4), #b8a088); }
.brp-pref-val { width: 40px; flex-shrink: 0; font-size: 10px; color: rgba(255, 246, 230, 0.45); text-align: right; font-variant-numeric: tabular-nums; }
.brp-pref-facts { display: flex; gap: 8px; }
.brp-pref-fact { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px; border-radius: 10px; background: rgba(138, 122, 106, 0.05); }
.brp-pref-fact-label { font-size: 10px; color: rgba(255, 246, 230, 0.4); }
.brp-pref-fact-val { font-size: 13px; color: #b8a088; }
.brp-exclusions { display: flex; flex-wrap: wrap; gap: 6px; }
.brp-exclusion {
  display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 4px 8px; border-radius: 8px; background: rgba(196, 106, 90, 0.1); border: 1px solid rgba(196, 106, 90, 0.2); color: rgba(255, 246, 230, 0.7); }
.brp-exclusion-x { border: none; background: transparent; color: rgba(255, 246, 230, 0.4); cursor: pointer; font-size: 10px; padding: 0; }
.brp-exclusion-x:hover { color: #c46a5a; }
</style>
