<template>
  <section class="gsp" data-test="garden-social" aria-label="花园社交">
    <header class="gsp-head">
      <div class="gsp-head-titles">
        <span class="gsp-title">🌸 花园社交</span>
        <span class="gsp-sub">好友 · 访园 · 礼物 · 动态</span>
      </div>
    </header>

    <!-- 社交概览卡 -->
    <div v-if="hasFriends || hasAnyActivity" class="gsp-overview" data-test="gsp-overview">
      <div class="gsp-ov-box">
        <strong class="gsp-ov-num">{{ s.friendCount.value }}</strong>
        <span class="gsp-ov-label">好友</span>
      </div>
      <div class="gsp-ov-box">
        <strong class="gsp-ov-num">{{ s.onlineFriendCount.value }}</strong>
        <span class="gsp-ov-label">在线</span>
      </div>
      <div class="gsp-ov-box">
        <strong class="gsp-ov-num">{{ s.pendingRequestCount.value }}</strong>
        <span class="gsp-ov-label">待处理请求</span>
      </div>
      <div class="gsp-ov-box">
        <strong class="gsp-ov-num">{{ s.unreadGiftCount.value }}</strong>
        <span class="gsp-ov-label">未读礼物</span>
      </div>
      <div class="gsp-ov-box">
        <strong class="gsp-ov-num">{{ s.unreadActivityCount.value }}</strong>
        <span class="gsp-ov-label">新动态</span>
      </div>
      <div class="gsp-score">
        <span class="gsp-score-chip">活跃 {{ stats.activityScore }}</span>
        <span class="gsp-score-chip">人气 {{ stats.popularityScore }}</span>
      </div>
    </div>

    <!-- 好友管理 -->
    <div class="gsp-card" data-test="gsp-card-friends">
      <div class="gsp-card-head">
        <span class="gsp-card-title">好友花园</span>
        <span class="gsp-card-count">{{ s.friendCount.value }} 位</span>
      </div>

      <!-- 添加好友表单 -->
      <form class="gsp-add" @submit.prevent="doAddFriend">
        <input v-model="newFriend.name" class="gsp-input" data-test="gsp-name" placeholder="好友昵称" required />
        <input v-model="newFriend.gardenName" class="gsp-input" data-test="gsp-garden" placeholder="花园名称" required />
        <button class="gsp-btn" data-test="gsp-add-btn" type="submit">添加</button>
      </form>

      <!-- 搜索 -->
      <div class="gsp-search-row">
        <input v-model.trim="query" class="gsp-input" data-test="gsp-query" placeholder="搜索好友 / 标签 / 备注" />
      </div>

      <p v-if="!s.friendCount.value && !s.pendingRequestCount.value && !s.unreadGiftCount.value && !s.activities.value.length" class="gsp-empty" data-test="gsp-empty">
        还没有花园好友。添加第一位好友，让花园热闹起来。
      </p>

      <ul v-if="visibleFriends.length" class="gsp-friend-list" data-test="gsp-friend-list">
        <li v-for="f in visibleFriends" :key="f.id" class="gsp-friend" :data-test="`gsp-friend-${f.id}`">
          <div class="gsp-friend-main">
            <span class="gsp-avat" :class="`gsp-avat--${f.status}`">{{ (f.name || '?').slice(0, 1) }}</span>
            <div class="gsp-friend-body">
              <div class="gsp-friend-name">
                <strong>{{ f.name }}</strong>
                <span class="gsp-status" :class="`gsp-status--${f.status}`">{{ statusLabel(f.status) }}</span>
                <span v-if="f.isStarred" class="gsp-star">★</span>
              </div>
              <div class="gsp-friend-meta">
                {{ f.gardenName }} · {{ f.flowerCount }} 花 · 互动 {{ f.interactionCount }}
              </div>
              <div v-if="f.note" class="gsp-friend-note">{{ f.note }}</div>
              <div v-if="f.tags.length" class="gsp-tags">
                <span v-for="t in f.tags" :key="t" class="gsp-tag">{{ t }}</span>
              </div>
            </div>
          </div>
          <div class="gsp-friend-ops">
            <button class="gsp-mini" :data-test="`gsp-star-${f.id}`" title="星标" @click="toggleStar(f.id)">{{ f.isStarred ? '☆' : '★' }}</button>
            <button class="gsp-mini" title="访问花园" @click="visit(f.id)">访</button>
            <button class="gsp-mini" :data-test="`gsp-remove-${f.id}`" title="移除好友" @click="removeFriend(f.id)">×</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 好友请求 -->
    <div v-if="s.pendingRequests.value.length" class="gsp-card" data-test="gsp-card-requests">
      <div class="gsp-card-head">
        <span class="gsp-card-title">好友请求</span>
        <span class="gsp-card-count">{{ s.pendingRequestCount.value }} 条</span>
      </div>
      <ul class="gsp-req-list">
        <li v-for="r in s.pendingRequests.value" :key="r.id" class="gsp-req" :data-test="`gsp-req-${r.id}`">
          <div class="gsp-req-body">
            <div class="gsp-req-name">{{ r.fromName }}</div>
            <div v-if="r.message" class="gsp-req-msg">{{ r.message }}</div>
          </div>
          <div class="gsp-req-ops">
            <button class="gsp-mini gsp-mini--ok" :data-test="`gsp-accept-${r.id}`" @click="acceptRequest(r.id)">接受</button>
            <button class="gsp-mini gsp-mini--no" :data-test="`gsp-reject-${r.id}`" @click="rejectRequest(r.id)">拒绝</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 访园 -->
    <div v-if="s.friends.value.length" class="gsp-card" data-test="gsp-card-visit">
      <div class="gsp-card-head">
        <span class="gsp-card-title">访园</span>
        <span class="gsp-card-count">串门好友的花园</span>
      </div>

      <form v-if="!s.currentGardenSnapshot.value" class="gsp-visit-form" @submit.prevent="doVisit">
        <select v-model="visitTarget" class="gsp-select" data-test="gsp-visit-target">
          <option v-for="f in s.friends.value" :key="f.id" :value="f.id">{{ f.name }} · {{ f.gardenName }}</option>
        </select>
        <button class="gsp-btn" data-test="gsp-visit-btn" type="submit">访问花园</button>
      </form>

      <div v-if="snap" class="gsp-snap" data-test="gsp-snap">
        <div class="gsp-snap-title">
          <strong>{{ snap.gardenName }}</strong>
          <span class="gsp-snap-mood">{{ snap.ambientMood }} · {{ snap.season }}</span>
        </div>
        <div class="gsp-snap-meta">
          <span class="gsp-chip">{{ snap.totalFlowers }} 朵花</span>
          <span class="gsp-chip">{{ snap.uniqueFlowerTypes }} 品种</span>
          <span class="gsp-chip">健康 {{ snap.healthScore }}</span>
          <span class="gsp-chip">{{ snap.totalVisitors }} 访客</span>
        </div>
        <p class="gsp-snap-msg">{{ snap.healthMessage }}</p>

        <div class="gsp-footprint">
          <button
            v-for="fp in FOOTPRINTS" :key="fp.type"
            class="gsp-fp" :data-test="`gsp-fp-${fp.type}`"
            @click="leave(fp.type)"
          >{{ fp.icon }}{{ fp.label }}</button>
        </div>
        <button class="gsp-mini" data-test="gsp-end-visit" @click="endVisit">结束访园</button>
      </div>
    </div>

    <!-- 礼物 -->
    <div class="gsp-card" data-test="gsp-card-gifts">
      <div class="gsp-card-head">
        <span class="gsp-card-title">礼物交换</span>
        <span class="gsp-card-count">{{ s.unreadGiftCount.value }} 未读 / 送 {{ giftStats.sent }} · 收 {{ giftStats.received }}</span>
      </div>

      <!-- 送礼 -->
      <form class="gsp-gift-form" @submit.prevent="doSendGift">
        <select v-model="giftTarget" class="gsp-select" data-test="gsp-gift-target">
          <option disabled value="">选择好友</option>
          <option v-for="f in s.friends.value" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
        <select v-model="giftId" class="gsp-select" data-test="gsp-gift-sel" :disabled="!giftTarget">
          <option disabled value="">选择礼物</option>
          <option v-for="g in s.GIFT_LIBRARY" :key="g.id" :value="g.id">{{ g.icon }} {{ g.name }}</option>
        </select>
        <button class="gsp-btn" data-test="gsp-gift-send" type="submit" :disabled="!giftTarget || !giftId">送出</button>
      </form>

      <!-- 收到的礼物 -->
      <div v-if="receivedGifts.length" class="gsp-gift-inbox" data-test="gsp-gift-inbox">
        <div class="gsp-inbox-title">收到的礼物</div>
        <ul class="gsp-gift-list">
          <li v-for="ex in receivedGifts" :key="ex.id" class="gsp-gift" :data-test="`gsp-gift-in-${ex.id}`">
            <span class="gsp-gift-icon">{{ ex.gift.icon }}</span>
            <div class="gsp-gift-body">
              <div class="gsp-gift-name">{{ ex.fromName }} 送 {{ ex.gift.name }}</div>
              <div v-if="ex.message" class="gsp-gift-msg">{{ ex.message }}</div>
            </div>
            <div class="gsp-gift-ops">
              <button class="gsp-mini" :data-test="`gsp-gift-read-${ex.id}`" @click="readGift(ex.id)">已读</button>
              <button class="gsp-mini" :data-test="`gsp-gift-recip-${ex.id}`" @click="reciprocate(ex.id)">回礼</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- 礼物统计 -->
      <div v-if="giftStats.total" class="gsp-gift-stats" data-test="gsp-gift-stats">
        <span class="gsp-stat-chip">最常收到 {{ giftStats.mostReceived || '—' }}</span>
        <span class="gsp-stat-chip">最常送出 {{ giftStats.mostSent || '—' }}</span>
      </div>
    </div>

    <!-- 社交动态 -->
    <div v-if="s.activities.value.length" class="gsp-card" data-test="gsp-card-activities">
      <div class="gsp-card-head">
        <span class="gsp-card-title">花园动态</span>
        <button class="gsp-mini" data-test="gsp-all-read" @click="readAll">全部已读</button>
      </div>
      <ul class="gsp-activity-list">
        <li v-for="a in s.activities.value.slice(0, 15)" :key="a.id" class="gsp-activity" :class="{ 'gsp-activity--unread': !a.read }" :data-test="`gsp-act-${a.id}`">
          <span class="gsp-act-dot" :class="`gsp-act-dot--${a.type}`"></span>
          <div class="gsp-act-body">
            <p class="gsp-act-desc">{{ a.description }}</p>
            <time class="gsp-act-time">{{ shortTime(a.timestamp) }}</time>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGardenSocial } from '../modules/emotion/garden-social'
import type { FriendStatus } from '../modules/emotion/garden-social'

const s = useGardenSocial()

// ---- 新增好友表单 ----
const newFriend = ref<{ name: string; gardenName: string; status: FriendStatus; flowerCount: number; dominantEmotion: string }>({
  name: '',
  gardenName: '',
  status: 'offline',
  flowerCount: 0,
  dominantEmotion: 'calm',
})

function doAddFriend(): void {
  const name = newFriend.value.name.trim()
  const gardenName = newFriend.value.gardenName.trim()
  if (!name || !gardenName) return
  s.addFriend({
    name,
    gardenName,
    status: newFriend.value.status,
    flowerCount: Math.floor(Math.random() * 40) + 5,
    dominantEmotion: newFriend.value.dominantEmotion,
    lastActiveAt: 0,
  })
  newFriend.value.name = ''
  newFriend.value.gardenName = ''
}

// ---- 搜索与筛选 ----
const query = ref('')
const visibleFriends = computed(() => {
  const q = query.value.trim()
  if (!q) return s.friends.value
  return s.searchFriends(q)
})

function toggleStar(id: string): void { s.toggleStarFriend(id) }
function removeFriend(id: string): void { s.removeFriend(id) }
function acceptRequest(id: string): void {
  const r = s.friendRequests.value.find(x => x.id === id)
  if (!r) return
  s.acceptFriendRequest(id, {
    name: r.fromName,
    gardenName: `${r.fromName}的花园`,
    status: 'offline',
    flowerCount: Math.floor(Math.random() * 40) + 5,
    dominantEmotion: 'calm',
    lastActiveAt: 0,
  })
}
function rejectRequest(id: string): void { s.rejectFriendRequest(id) }

// ---- 访园 ----
const visitTarget = ref('')
const snap = computed(() => s.currentGardenSnapshot.value)

function doVisit(): void {
  if (!visitTarget.value) return
  const friend = s.friends.value.find(f => f.id === visitTarget.value)
  if (!friend) return
  s.visitGarden(friend.id, friend.name)
}

function visit(id: string): void {
  visitTarget.value = id
  doVisit()
}

const FOOTPRINTS = [
  { type: 'like' as const, icon: '👍', label: '点赞' },
  { type: 'water' as const, icon: '💧', label: '浇水' },
  { type: 'comment' as const, icon: '💬', label: '留言' },
  { type: 'gift' as const, icon: '🎁', label: '礼物' },
  { type: 'admire' as const, icon: '⭐', label: '赞赏' },
]

function leave(type: 'like' | 'water' | 'comment' | 'gift' | 'admire'): void {
  s.leaveFootprint(type)
}
function endVisit(): void { s.endVisit() }

// ---- 礼物 ----
const giftTarget = ref('')
const giftId = ref('')
const giftStats = computed(() =>
  (() => {
    const stats = s.getGiftStats()
    const received = s.getReceivedGifts().length
    const sent = s.getSentGifts().length
    return { ...stats, received, sent, total: received + sent }
  })(),
)
const receivedGifts = computed(() => s.getReceivedGifts())

function doSendGift(): void {
  if (!giftTarget.value || !giftId.value) return
  const friend = s.friends.value.find(f => f.id === giftTarget.value)
  if (!friend) return
  s.sendGift(giftTarget.value, friend.name, giftId.value)
}
function readGift(id: string): void { s.markGiftRead(id) }
function reciprocate(id: string): void {
  const defaultGift = s.GIFT_LIBRARY.find(g => g.type === 'emotion-card') ?? s.GIFT_LIBRARY[0]
  if (defaultGift) s.reciprocateGift(id, defaultGift.id)
}

// ---- 动态 ----
function readAll(): void { s.markAllActivitiesRead() }

// ---- 统计 ----
const stats = computed(() => s.socialStats.value)
const hasFriends = computed(() => s.friendCount.value > 0)
const hasAnyActivity = computed(() =>
  s.activities.value.length > 0 || s.pendingRequestCount.value > 0 || s.unreadGiftCount.value > 0,
)

// ---- 工具 ----
const STATUS_LABELS: Record<FriendStatus, string> = {
  online: '在线',
  offline: '离线',
  away: '离开',
  busy: '忙碌',
}
function statusLabel(st: FriendStatus): string {
  return STATUS_LABELS[st] ?? st
}
function shortTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
</script>

<style scoped>
.gsp {
  border-radius: 16px;
  padding: 18px 20px 20px;
  background: linear-gradient(180deg, rgba(var(--accent-rgb, 212, 165, 116), 0.05), rgba(var(--accent-rgb, 212, 165, 116), 0.02));
  border: 1px solid color-mix(in srgb, var(--accent, #d4a574) 22%, transparent);
}
.gsp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.gsp-head-titles { display: flex; flex-direction: column; }
.gsp-title { font-size: 1.05rem; font-weight: 700; color: var(--text, #2b2b35); }
.gsp-sub { font-size: 0.78rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin-top: 2px; }

.gsp-overview { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
.gsp-ov-box { display: flex; flex-direction: column; align-items: center; min-width: 64px; padding: 8px 10px; background: rgba(255,255,255,0.5); border-radius: 10px; }
.gsp-ov-num { font-size: 1.15rem; font-weight: 700; color: var(--accent, #d4a574); }
.gsp-ov-label { font-size: 0.72rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin-top: 2px; }
.gsp-score { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
.gsp-score-chip, .gsp-stat-chip, .gsp-chip { font-size: 0.72rem; padding: 3px 8px; border-radius: 999px; background: rgba(var(--accent-rgb, 212, 165, 116), 0.1); color: var(--accent, #d4a574); }

.gsp-card { margin-top: 12px; padding: 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12); }
.gsp-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.gsp-card-title { font-weight: 700; color: var(--text, #2b2b35); }
.gsp-card-count { font-size: 0.74rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }

.gsp-add, .gsp-visit-form, .gsp-gift-form, .gsp-search-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.gsp-input, .gsp-select { flex: 1; min-width: 110px; padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.25); background: #fff; font-size: 0.82rem; color: var(--text, #2b2b35); }
.gsp-btn { padding: 7px 14px; border: none; border-radius: 8px; background: var(--accent, #d4a574); color: #fff; font-size: 0.82rem; cursor: pointer; }
.gsp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.gsp-mini { padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb, 212, 165, 116),0.25); background: transparent; font-size: 0.76rem; color: var(--accent, #d4a574); cursor: pointer; }
.gsp-mini--ok { border-color: #3aa06a; color: #3aa06a; }
.gsp-mini--no { border-color: #c46a5a; color: #c46a5a; }

.gsp-empty { font-size: 0.82rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); padding: 8px 0; }

.gsp-friend-list, .gsp-req-list, .gsp-gift-list, .gsp-activity-list { list-style: none; padding: 0; margin: 0; }
.gsp-friend { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 6px; border-radius: 10px; border-bottom: 1px dashed rgba(var(--accent-rgb, 212, 165, 116),0.15); }
.gsp-friend:last-child { border-bottom: none; }
.gsp-friend-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
.gsp-avat { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; border-radius: 50%; font-weight: 700; color: #fff; }
.gsp-avat--online { background: #3aa06a; }
.gsp-avat--offline { background: #9a9aab; }
.gsp-avat--away { background: #d9a03c; }
.gsp-avat--busy { background: #c46a5a; }
.gsp-friend-body { min-width: 0; }
.gsp-friend-name { display: flex; align-items: center; gap: 6px; }
.gsp-friend-name strong { font-size: 0.86rem; color: var(--text, #2b2b35); }
.gsp-status { font-size: 0.68rem; padding: 1px 6px; border-radius: 999px; background: rgba(var(--accent-rgb, 212, 165, 116),0.1); color: var(--accent, #d4a574); }
.gsp-star { color: #d9a03c; }
.gsp-friend-meta, .gsp-friend-note { font-size: 0.74rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }
.gsp-tags { display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.gsp-tag { font-size: 0.68rem; padding: 1px 6px; border-radius: 999px; background: rgba(var(--accent-rgb, 212, 165, 116),0.1); color: var(--accent, #d4a574); }
.gsp-friend-ops { display: flex; gap: 4px; }

.gsp-req { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 6px; border-bottom: 1px dashed rgba(var(--accent-rgb, 212, 165, 116),0.15); }
.gsp-req:last-child { border-bottom: none; }
.gsp-req-name { font-size: 0.86rem; font-weight: 600; color: var(--text, #2b2b35); }
.gsp-req-msg { font-size: 0.74rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }
.gsp-req-ops { display: flex; gap: 4px; }

.gsp-snap { padding: 12px; border-radius: 10px; background: rgba(var(--accent-rgb, 212, 165, 116),0.06); }
.gsp-snap-title { display: flex; align-items: center; gap: 8px; }
.gsp-snap-title strong { color: var(--text, #2b2b35); }
.gsp-snap-mood { font-size: 0.74rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }
.gsp-snap-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.gsp-snap-msg { font-size: 0.78rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin: 6px 0; }
.gsp-footprint { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0; }
.gsp-fp { padding: 6px 10px; border: 1px solid rgba(var(--accent-rgb, 212, 165, 116),0.25); border-radius: 8px; background: #fff; font-size: 0.78rem; color: var(--text, #2b2b35); cursor: pointer; }

.gsp-gift-inbox { margin-top: 6px; }
.gsp-inbox-title { font-size: 0.76rem; font-weight: 600; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin-bottom: 6px; }
.gsp-gift { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px dashed rgba(var(--accent-rgb, 212, 165, 116),0.15); }
.gsp-gift:last-child { border-bottom: none; }
.gsp-gift-icon { font-size: 1.2rem; }
.gsp-gift-name { font-size: 0.82rem; color: var(--text, #2b2b35); }
.gsp-gift-msg { font-size: 0.74rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }
.gsp-gift-ops { display: flex; gap: 4px; margin-left: auto; }
.gsp-gift-stats { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }

.gsp-activity { display: flex; align-items: flex-start; gap: 10px; padding: 7px 4px; border-bottom: 1px dashed rgba(var(--accent-rgb, 212, 165, 116),0.15); }
.gsp-activity:last-child { border-bottom: none; }
.gsp-activity--unread .gsp-act-desc { color: var(--text, #2b2b35); font-weight: 600; }
.gsp-act-dot { width: 9px; height: 9px; flex: 0 0 9px; margin-top: 5px; border-radius: 50%; background: #9a9aab; }
.gsp-act-dot--visit { background: #3aa06a; }
.gsp-act-dot--gift { background: #d9a03c; }
.gsp-act-dot--footprint { background: #7c5cfc; }
.gsp-act-dot--friend_added { background: #2d9cdb; }
.gsp-act-dot--achievement { background: #e26aa0; }
.gsp-act-body { min-width: 0; }
.gsp-act-desc { font-size: 0.82rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin: 0; }
.gsp-act-time { font-size: 0.68rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }
</style>