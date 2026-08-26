// ============================================================
// 情绪花房 · 花园社交互动系统（P16-14）
// 访园机制、好友管理、礼物交换、社交动态、社交分析
// ============================================================

import { ref, computed } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/** 好友状态 */
export type FriendStatus = 'online' | 'offline' | 'away' | 'busy'

/** 好友关系 */
export interface GardenFriend {
  /** 好友 ID */
  id: string
  /** 好友昵称 */
  name: string
  /** 好友头像 */
  avatar?: string
  /** 花园名称 */
  gardenName: string
  /** 花园描述 */
  gardenDescription?: string
  /** 当前状态 */
  status: FriendStatus
  /** 最近活跃时间 */
  lastActiveAt: number
  /** 成为好友的时间 */
  friendedAt: number
  /** 花园花朵数量 */
  flowerCount: number
  /** 主导情绪 */
  dominantEmotion: string
  /** 互动次数 */
  interactionCount: number
  /** 是否星标好友 */
  isStarred: boolean
  /** 好友备注 */
  note?: string
  /** 分组标签 */
  tags: string[]
}

/** 好友请求 */
export interface FriendRequest {
  /** 请求 ID */
  id: string
  /** 发送者 ID */
  fromId: string
  /** 发送者昵称 */
  fromName: string
  /** 发送者头像 */
  fromAvatar?: string
  /** 接收者 ID */
  toId: string
  /** 请求消息 */
  message?: string
  /** 发送时间 */
  sentAt: number
  /** 请求状态 */
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  /** 处理时间 */
  resolvedAt?: number
}

/** 花园快照（访园时看到的） */
export interface GardenSnapshot {
  /** 花园主人 ID */
  ownerId: string
  /** 花园主人昵称 */
  ownerName: string
  /** 花园名称 */
  gardenName: string
  /** 花园情绪氛围 */
  ambientMood: string
  /** 花朵总数 */
  totalFlowers: number
  /** 花朵种类数 */
  uniqueFlowerTypes: number
  /** 最近情绪记录数 */
  recentEmotionCount: number
  /** 花园健康评分 */
  healthScore: number
  /** 花园健康信息 */
  healthMessage: string
  /** 当前季节 */
  season: string
  /** 访客总数 */
  totalVisitors: number
  /** 快照时间 */
  capturedAt: number
}

/** 访园记录 */
export interface GardenVisit {
  /** 记录 ID */
  id: string
  /** 访客 ID */
  visitorId: string
  /** 访客昵称 */
  visitorName: string
  /** 被访花园主人 ID */
  hostId: string
  /** 访问时间 */
  visitedAt: number
  /** 停留时长（秒） */
  duration: number
  /** 是否留下印记 */
  leftFootprint: boolean
  /** 印记类型 */
  footprintType?: 'like' | 'water' | 'comment' | 'gift' | 'admire'
  /** 印记内容 */
  footprintMessage?: string
  /** 针对的花朵 */
  targetFlower?: string
  /** 是否已回复 */
  replied: boolean
  /** 回复内容 */
  reply?: string
}

/** 礼物类型 */
export type GiftType = 'flower' | 'seed' | 'fertilizer' | 'decoration' | 'emotion-card'

/** 礼物 */
export interface GardenGift {
  /** 礼物 ID */
  id: string
  /** 礼物类型 */
  type: GiftType
  /** 礼物名称 */
  name: string
  /** 礼物描述 */
  description: string
  /** 礼物图标/emoji */
  icon: string
  /** 稀有度 */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  /** 情绪附加效果 */
  emotionEffect?: string
}

/** 礼物交换记录 */
export interface GiftExchange {
  /** 记录 ID */
  id: string
  /** 发送者 ID */
  fromId: string
  /** 发送者昵称 */
  fromName: string
  /** 接收者 ID */
  toId: string
  /** 接收者昵称 */
  toName: string
  /** 礼物 */
  gift: GardenGift
  /** 附言 */
  message?: string
  /** 发送时间 */
  sentAt: number
  /** 是否已读 */
  read: boolean
  /** 是否已回礼 */
  reciprocated: boolean
}

/** 社交动态 */
export interface SocialActivity {
  /** 动态 ID */
  id: string
  /** 动态类型 */
  type: 'visit' | 'gift' | 'footprint' | 'friend_added' | 'garden_bloom' | 'achievement'
  /** 涉及用户 ID */
  userId: string
  /** 涉及用户昵称 */
  userName: string
  /** 动态描述 */
  description: string
  /** 关联对象（如花朵 ID、礼物 ID） */
  targetId?: string
  /** 发生时间 */
  timestamp: number
  /** 是否已读 */
  read: boolean
}

/** 社交统计 */
export interface SocialStats {
  /** 好友总数 */
  totalFriends: number
  /** 在线好友数 */
  onlineFriends: number
  /** 收到的访园次数 */
  totalVisitsReceived: number
  /** 发出的访园次数 */
  totalVisitsMade: number
  /** 收到的礼物数 */
  giftsReceived: number
  /** 发出的礼物数 */
  giftsSent: number
  /** 收到的足迹数 */
  footprintsReceived: number
  /** 回复率 */
  replyRate: number
  /** 社交活跃度评分 */
  activityScore: number
  /** 花园人气评分 */
  popularityScore: number
}

/** 花园社交配置 */
export interface GardenSocialConfig {
  /** 是否允许陌生人访问 */
  allowStrangerVisits: boolean
  /** 是否显示在线状态 */
  showOnlineStatus: boolean
  /** 是否允许礼物接收 */
  allowGifts: boolean
  /** 是否显示社交动态 */
  showActivityFeed: boolean
  /** 好友上限 */
  maxFriends: number
  /** 每日最大访园次数 */
  maxDailyVisits: number
  /** 每日最大礼物发送数 */
  maxDailyGifts: number
}

// ============================================================
// 礼物库
// ============================================================

export const GIFT_LIBRARY: GardenGift[] = [
  { id: 'gift-flower-rose', type: 'flower', name: '玫瑰', description: '象征爱与热情的红色玫瑰', icon: '🌹', rarity: 'common', emotionEffect: 'happy' },
  { id: 'gift-flower-sunflower', type: 'flower', name: '向日葵', description: '充满阳光与希望的向日葵', icon: '🌻', rarity: 'common', emotionEffect: 'excited' },
  { id: 'gift-flower-lavender', type: 'flower', name: '薰衣草', description: '带来宁静与安详的薰衣草', icon: '💜', rarity: 'common', emotionEffect: 'calm' },
  { id: 'gift-flower-cherry', type: 'flower', name: '樱花', description: '温柔浪漫的樱花', icon: '🌸', rarity: 'uncommon', emotionEffect: 'grateful' },
  { id: 'gift-flower-lotus', type: 'flower', name: '莲花', description: '出淤泥而不染的莲花', icon: '🪷', rarity: 'uncommon', emotionEffect: 'calm' },
  { id: 'gift-flower-orchid', type: 'flower', name: '兰花', description: '高雅清幽的兰花', icon: '🌺', rarity: 'rare', emotionEffect: 'inspired' },
  { id: 'gift-seed-hope', type: 'seed', name: '希望种子', description: '种下后72小时绽放出希望之花', icon: '🌱', rarity: 'uncommon', emotionEffect: 'excited' },
  { id: 'gift-seed-dream', type: 'seed', name: '梦想种子', description: '种下后96小时绽放出灵感之花', icon: '🌰', rarity: 'rare', emotionEffect: 'inspired' },
  { id: 'gift-fertilizer-quick', type: 'fertilizer', name: '快速生长肥', description: '加速花朵生长50%', icon: '💧', rarity: 'common' },
  { id: 'gift-fertilizer-rainbow', type: 'fertilizer', name: '彩虹肥料', description: '随机改变花朵颜色', icon: '🌈', rarity: 'rare' },
  { id: 'gift-decoration-lantern', type: 'decoration', name: '石灯笼', description: '为花园增添温馨氛围', icon: '🏮', rarity: 'common' },
  { id: 'gift-decoration-fountain', type: 'decoration', name: '小喷泉', description: '流水声舒缓心情', icon: '⛲', rarity: 'uncommon' },
  { id: 'gift-emotion-hug', type: 'emotion-card', name: '温暖拥抱卡', description: '送给朋友的暖心拥抱', icon: '🤗', rarity: 'common', emotionEffect: 'grateful' },
  { id: 'gift-emotion-cheer', type: 'emotion-card', name: '加油打气卡', description: '为朋友加油鼓劲', icon: '💪', rarity: 'common', emotionEffect: 'excited' },
  { id: 'gift-emotion-comfort', type: 'emotion-card', name: '安慰卡', description: '在朋友难过时给予安慰', icon: '🫂', rarity: 'uncommon', emotionEffect: 'calm' },
  { id: 'gift-emotion-starlight', type: 'emotion-card', name: '星光祝福卡', description: '来自星空的神秘祝福', icon: '✨', rarity: 'rare', emotionEffect: 'inspired' },
  { id: 'gift-emotion-rainbow', type: 'emotion-card', name: '彩虹卡', description: '七种情绪色彩的祝福', icon: '🌈', rarity: 'legendary', emotionEffect: 'grateful' },
]

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_SOCIAL_CONFIG: GardenSocialConfig = {
  allowStrangerVisits: true,
  showOnlineStatus: true,
  allowGifts: true,
  showActivityFeed: true,
  maxFriends: 200,
  maxDailyVisits: 20,
  maxDailyGifts: 10,
}

// ============================================================
// useGardenSocial Composable
// ============================================================

export function useGardenSocial(config?: Partial<GardenSocialConfig>) {
  // ---- 配置 ----
  const socialConfig = ref<GardenSocialConfig>({
    ...DEFAULT_SOCIAL_CONFIG,
    ...config,
  })

  // ---- 状态 ----
  const friends = ref<GardenFriend[]>([])
  const friendRequests = ref<FriendRequest[]>([])
  const visits = ref<GardenVisit[]>([])
  const giftExchanges = ref<GiftExchange[]>([])
  const activities = ref<SocialActivity[]>([])
  const currentGardenSnapshot = ref<GardenSnapshot | null>(null)
  const isVisiting = ref(false)
  const dailyVisitCount = ref(0)
  const dailyGiftCount = ref(0)

  // ---- 内部状态 ----
  let activityIdCounter = 0
  let visitIdCounter = 0
  let requestIdCounter = 0
  let exchangeIdCounter = 0
  let dailyResetTimer: ReturnType<typeof setInterval> | null = null

  // ---- 派生状态 ----
  const friendCount = computed(() => friends.value.length)

  const onlineFriends = computed(() =>
    friends.value.filter(f => f.status === 'online'),
  )

  const onlineFriendCount = computed(() => onlineFriends.value.length)

  const starredFriends = computed(() =>
    friends.value.filter(f => f.isStarred),
  )

  const pendingRequests = computed(() =>
    friendRequests.value.filter(r => r.status === 'pending'),
  )

  const pendingRequestCount = computed(() => pendingRequests.value.length)

  const unreadActivities = computed(() =>
    activities.value.filter(a => !a.read),
  )

  const unreadActivityCount = computed(() => unreadActivities.value.length)

  const unreadGifts = computed(() =>
    giftExchanges.value.filter(g => !g.read),
  )

  const unreadGiftCount = computed(() => unreadGifts.value.length)

  const socialStats = computed<SocialStats>(() => {
    const visitsReceived = visits.value.filter(v => v.hostId === 'self').length
    const visitsMade = visits.value.filter(v => v.visitorId === 'self').length
    const giftsReceived = giftExchanges.value.filter(g => g.toId === 'self').length
    const giftsSent = giftExchanges.value.filter(g => g.fromId === 'self').length
    const footprintsReceived = visits.value.filter(v => v.leftFootprint).length
    const replied = visits.value.filter(v => v.replied).length

    const replyRate = footprintsReceived > 0
      ? Math.round(replied / footprintsReceived * 100) / 100
      : 0

    const activityScore = Math.min(100, Math.round(
      (visitsMade * 5 + giftsSent * 3 + friends.value.length * 2) / 2,
    ))

    const popularityScore = Math.min(100, Math.round(
      (visitsReceived * 5 + giftsReceived * 3 + footprintsReceived * 2) / 2,
    ))

    return {
      totalFriends: friends.value.length,
      onlineFriends: onlineFriendCount.value,
      totalVisitsReceived: visitsReceived,
      totalVisitsMade: visitsMade,
      giftsReceived,
      giftsSent,
      footprintsReceived,
      replyRate,
      activityScore,
      popularityScore,
    }
  })

  // ============================================================
  // 好友管理
  // ============================================================

  /** 添加好友 */
  function addFriend(friend: Omit<GardenFriend, 'id' | 'friendedAt' | 'interactionCount' | 'isStarred' | 'tags'>): GardenFriend | null {
    if (friends.value.length >= socialConfig.value.maxFriends) return null

    const newFriend: GardenFriend = {
      ...friend,
      id: `friend_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      friendedAt: Date.now(),
      interactionCount: 0,
      isStarred: false,
      tags: [],
    }

    friends.value = [...friends.value, newFriend]
    addActivity({
      type: 'friend_added',
      userId: newFriend.id,
      userName: newFriend.name,
      description: `与 ${newFriend.name} 成为了花园好友`,
      timestamp: Date.now(),
    })

    return newFriend
  }

  /** 移除好友 */
  function removeFriend(friendId: string): boolean {
    const idx = friends.value.findIndex(f => f.id === friendId)
    if (idx === -1) return false
    friends.value = [...friends.value.slice(0, idx), ...friends.value.slice(idx + 1)]
    return true
  }

  /** 星标好友 */
  function toggleStarFriend(friendId: string): boolean {
    const idx = friends.value.findIndex(f => f.id === friendId)
    if (idx === -1) return false

    const updated = [...friends.value]
    updated[idx] = { ...updated[idx], isStarred: !updated[idx].isStarred }
    friends.value = updated
    return true
  }

  /** 更新好友备注 */
  function updateFriendNote(friendId: string, note: string): boolean {
    const idx = friends.value.findIndex(f => f.id === friendId)
    if (idx === -1) return false

    const updated = [...friends.value]
    updated[idx] = { ...updated[idx], note }
    friends.value = updated
    return true
  }

  /** 添加好友标签 */
  function addFriendTag(friendId: string, tag: string): boolean {
    const idx = friends.value.findIndex(f => f.id === friendId)
    if (idx === -1) return false

    const friend = friends.value[idx]
    if (friend.tags.includes(tag)) return false

    const updated = [...friends.value]
    updated[idx] = { ...friend, tags: [...friend.tags, tag] }
    friends.value = updated
    return true
  }

  /** 移除好友标签 */
  function removeFriendTag(friendId: string, tag: string): boolean {
    const idx = friends.value.findIndex(f => f.id === friendId)
    if (idx === -1) return false

    const friend = friends.value[idx]
    const updated = [...friends.value]
    updated[idx] = { ...friend, tags: friend.tags.filter(t => t !== tag) }
    friends.value = updated
    return true
  }

  /** 更新好友状态 */
  function updateFriendStatus(friendId: string, status: FriendStatus): boolean {
    const idx = friends.value.findIndex(f => f.id === friendId)
    if (idx === -1) return false

    const updated = [...friends.value]
    updated[idx] = { ...updated[idx], status, lastActiveAt: Date.now() }
    friends.value = updated
    return true
  }

  /** 搜索好友 */
  function searchFriends(query: string): GardenFriend[] {
    const q = query.toLowerCase()
    return friends.value.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.gardenName.toLowerCase().includes(q) ||
      (f.note && f.note.toLowerCase().includes(q)) ||
      f.tags.some(t => t.toLowerCase().includes(q)),
    )
  }

  /** 按标签筛选好友 */
  function getFriendsByTag(tag: string): GardenFriend[] {
    return friends.value.filter(f => f.tags.includes(tag))
  }

  /** 按互动次数排序获取好友 */
  function getTopFriends(limit: number = 10): GardenFriend[] {
    return [...friends.value]
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, limit)
  }

  // ============================================================
  // 好友请求
  // ============================================================

  /** 发送好友请求 */
  function sendFriendRequest(
    toId: string,
    _toName: string,
    message?: string,
  ): FriendRequest {
    const request: FriendRequest = {
      id: `req_${Date.now().toString(36)}_${(requestIdCounter++).toString(36)}`,
      fromId: 'self',
      fromName: '我',
      toId,
      message,
      sentAt: Date.now(),
      status: 'pending',
    }

    friendRequests.value = [...friendRequests.value, request]
    return request
  }

  /** 接受好友请求 */
  function acceptFriendRequest(requestId: string, friendInfo: Omit<GardenFriend, 'id' | 'friendedAt' | 'interactionCount' | 'isStarred' | 'tags'>): GardenFriend | null {
    const idx = friendRequests.value.findIndex(r => r.id === requestId)
    if (idx === -1) return null

    const updated = [...friendRequests.value]
    updated[idx] = { ...updated[idx], status: 'accepted', resolvedAt: Date.now() }
    friendRequests.value = updated

    return addFriend(friendInfo)
  }

  /** 拒绝好友请求 */
  function rejectFriendRequest(requestId: string): boolean {
    const idx = friendRequests.value.findIndex(r => r.id === requestId)
    if (idx === -1) return false

    const updated = [...friendRequests.value]
    updated[idx] = { ...updated[idx], status: 'rejected', resolvedAt: Date.now() }
    friendRequests.value = updated
    return true
  }

  /** 获取收到的待处理好友请求 */
  function getReceivedRequests(): FriendRequest[] {
    return friendRequests.value.filter(r => r.toId === 'self' && r.status === 'pending')
  }

  /** 获取发出的待处理好友请求 */
  function getSentRequests(): FriendRequest[] {
    return friendRequests.value.filter(r => r.fromId === 'self' && r.status === 'pending')
  }

  // ============================================================
  // 访园机制
  // ============================================================

  /** 访问好友花园 */
  function visitGarden(hostId: string, hostName: string): GardenSnapshot | null {
    if (dailyVisitCount.value >= socialConfig.value.maxDailyVisits) return null

    isVisiting.value = true
    dailyVisitCount.value++

    // 生成花园快照
    const snapshot: GardenSnapshot = {
      ownerId: hostId,
      ownerName: hostName,
      gardenName: `${hostName}的花园`,
      ambientMood: ['bright', 'normal', 'dim', 'warm'][Math.floor(Math.random() * 4)],
      totalFlowers: Math.floor(Math.random() * 50) + 10,
      uniqueFlowerTypes: Math.floor(Math.random() * 15) + 3,
      recentEmotionCount: Math.floor(Math.random() * 30) + 5,
      healthScore: Math.floor(Math.random() * 40) + 60,
      healthMessage: '花园状态良好',
      season: ['spring', 'summer', 'autumn', 'winter'][Math.floor(Math.random() * 4)],
      totalVisitors: Math.floor(Math.random() * 100) + 1,
      capturedAt: Date.now(),
    }

    currentGardenSnapshot.value = snapshot

    // 记录访问
    const visit: GardenVisit = {
      id: `visit_${Date.now().toString(36)}_${(visitIdCounter++).toString(36)}`,
      visitorId: 'self',
      visitorName: '我',
      hostId,
      visitedAt: Date.now(),
      duration: 0,
      leftFootprint: false,
      replied: false,
    }

    visits.value = [...visits.value, visit]

    // 更新好友互动计数
    incrementFriendInteraction(hostId)

    addActivity({
      type: 'visit',
      userId: hostId,
      userName: hostName,
      description: `访问了 ${hostName} 的花园`,
      timestamp: Date.now(),
    })

    return snapshot
  }

  /** 结束访园 */
  function endVisit(): number {
    if (!isVisiting.value) return 0

    isVisiting.value = false
    const lastVisit = visits.value[visits.value.length - 1]
    if (lastVisit && lastVisit.duration === 0) {
      const duration = Math.floor((Date.now() - lastVisit.visitedAt) / 1000)
      const updated = [...visits.value]
      updated[updated.length - 1] = { ...lastVisit, duration }
      visits.value = updated
      return duration
    }

    return 0
  }

  /** 在访问的花园留下印记 */
  function leaveFootprint(
    footprintType: GardenVisit['footprintType'],
    message?: string,
    targetFlower?: string,
  ): boolean {
    if (!currentGardenSnapshot.value) return false

    const lastVisit = visits.value[visits.value.length - 1]
    if (!lastVisit) return false

    const updated = [...visits.value]
    updated[updated.length - 1] = {
      ...lastVisit,
      leftFootprint: true,
      footprintType,
      footprintMessage: message,
      targetFlower,
    }

    visits.value = updated

    addActivity({
      type: 'footprint',
      userId: currentGardenSnapshot.value.ownerId,
      userName: currentGardenSnapshot.value.ownerName,
      description: `在 ${currentGardenSnapshot.value.ownerName} 的花园留下了${getFootprintLabel(footprintType ?? 'like')}`,
      targetId: targetFlower,
      timestamp: Date.now(),
    })

    return true
  }

  /** 回复访客印记 */
  function replyToVisit(visitId: string, reply: string): boolean {
    const idx = visits.value.findIndex(v => v.id === visitId)
    if (idx === -1) return false

    const updated = [...visits.value]
    updated[idx] = { ...updated[idx], replied: true, reply }
    visits.value = updated
    return true
  }

  /** 获取花园访客记录 */
  function getGardenVisits(): GardenVisit[] {
    return visits.value.filter(v => v.hostId === 'self')
  }

  /** 获取我的访园记录 */
  function getMyVisits(): GardenVisit[] {
    return visits.value.filter(v => v.visitorId === 'self')
  }

  // ============================================================
  // 礼物交换
  // ============================================================

  /** 发送礼物 */
  function sendGift(toId: string, toName: string, giftId: string, message?: string): GiftExchange | null {
    if (dailyGiftCount.value >= socialConfig.value.maxDailyGifts) return null
    if (!socialConfig.value.allowGifts) return null

    const gift = GIFT_LIBRARY.find(g => g.id === giftId)
    if (!gift) return null

    dailyGiftCount.value++

    const exchange: GiftExchange = {
      id: `gift_${Date.now().toString(36)}_${(exchangeIdCounter++).toString(36)}`,
      fromId: 'self',
      fromName: '我',
      toId,
      toName,
      gift,
      message,
      sentAt: Date.now(),
      read: false,
      reciprocated: false,
    }

    giftExchanges.value = [...giftExchanges.value, exchange]

    // 更新好友互动计数
    incrementFriendInteraction(toId)

    addActivity({
      type: 'gift',
      userId: toId,
      userName: toName,
      description: `送给 ${toName} ${gift.icon} ${gift.name}`,
      targetId: gift.id,
      timestamp: Date.now(),
    })

    return exchange
  }

  /** 标记礼物为已读 */
  function markGiftRead(exchangeId: string): boolean {
    const idx = giftExchanges.value.findIndex(e => e.id === exchangeId)
    if (idx === -1) return false

    const updated = [...giftExchanges.value]
    updated[idx] = { ...updated[idx], read: true }
    giftExchanges.value = updated
    return true
  }

  /** 回礼 */
  function reciprocateGift(exchangeId: string, giftId: string, message?: string): GiftExchange | null {
    const idx = giftExchanges.value.findIndex(e => e.id === exchangeId)
    if (idx === -1) return null

    const original = giftExchanges.value[idx]

    const updated = [...giftExchanges.value]
    updated[idx] = { ...original, reciprocated: true }
    giftExchanges.value = updated

    return sendGift(original.fromId, original.fromName, giftId, message)
  }

  /** 获取收到的礼物 */
  function getReceivedGifts(): GiftExchange[] {
    return giftExchanges.value.filter(e => e.toId === 'self')
  }

  /** 获取发出的礼物 */
  function getSentGifts(): GiftExchange[] {
    return giftExchanges.value.filter(e => e.fromId === 'self')
  }

  /** 获取礼物统计 */
  function getGiftStats(): {
    byType: Record<string, number>
    byRarity: Record<string, number>
    mostReceived: string
    mostSent: string
  } {
    const byType: Record<string, number> = {}
    const byRarity: Record<string, number> = {}
    const receivedCounts: Record<string, number> = {}
    const sentCounts: Record<string, number> = {}

    for (const e of giftExchanges.value) {
      byType[e.gift.type] = (byType[e.gift.type] ?? 0) + 1
      byRarity[e.gift.rarity] = (byRarity[e.gift.rarity] ?? 0) + 1

      if (e.toId === 'self') {
        receivedCounts[e.gift.name] = (receivedCounts[e.gift.name] ?? 0) + 1
      }
      if (e.fromId === 'self') {
        sentCounts[e.gift.name] = (sentCounts[e.gift.name] ?? 0) + 1
      }
    }

    let mostReceived = ''
    let mostSent = ''
    let maxR = 0
    let maxS = 0
    for (const [name, count] of Object.entries(receivedCounts)) {
      if (count > maxR) { maxR = count; mostReceived = name }
    }
    for (const [name, count] of Object.entries(sentCounts)) {
      if (count > maxS) { maxS = count; mostSent = name }
    }

    return { byType, byRarity, mostReceived, mostSent }
  }

  // ============================================================
  // 社交动态
  // ============================================================

  /** 添加社交动态 */
  function addActivity(activity: Omit<SocialActivity, 'id' | 'read'>): SocialActivity {
    const newActivity: SocialActivity = {
      ...activity,
      id: `act_${Date.now().toString(36)}_${(activityIdCounter++).toString(36)}`,
      read: false,
    }

    activities.value = [newActivity, ...activities.value].slice(0, 100)
    return newActivity
  }

  /** 标记动态为已读 */
  function markActivityRead(activityId: string): boolean {
    const idx = activities.value.findIndex(a => a.id === activityId)
    if (idx === -1) return false

    const updated = [...activities.value]
    updated[idx] = { ...updated[idx], read: true }
    activities.value = updated
    return true
  }

  /** 全部标记已读 */
  function markAllActivitiesRead(): number {
    let count = 0
    activities.value = activities.value.map(a => {
      if (!a.read) { count++; return { ...a, read: true } }
      return a
    })
    return count
  }

  /** 获取最近社交动态 */
  function getRecentActivities(limit: number = 20): SocialActivity[] {
    return activities.value.slice(0, limit)
  }

  /** 获取与特定好友的互动动态 */
  function getActivitiesWithFriend(friendId: string): SocialActivity[] {
    return activities.value.filter(a => a.userId === friendId)
  }

  // ============================================================
  // 社交分析
  // ============================================================

  /** 获取社交互动时间线 */
  function getInteractionTimeline(days: number = 30): Array<{
    date: string
    visits: number
    gifts: number
    footprints: number
  }> {
    const timeline: Array<{ date: string; visits: number; gifts: number; footprints: number }> = []
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      const dayStart = new Date(dateStr).getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000

      if (dayEnd <= cutoff) continue

      const dayVisits = visits.value.filter(v =>
        v.visitedAt >= dayStart && v.visitedAt < dayEnd,
      ).length
      const dayGifts = giftExchanges.value.filter(g =>
        g.sentAt >= dayStart && g.sentAt < dayEnd,
      ).length
      const dayFootprints = visits.value.filter(v =>
        v.visitedAt >= dayStart && v.visitedAt < dayEnd && v.leftFootprint,
      ).length

      timeline.push({ date: dateStr, visits: dayVisits, gifts: dayGifts, footprints: dayFootprints })
    }

    return timeline
  }

  /** 获取最活跃好友 */
  function getMostActiveFriends(limit: number = 5): GardenFriend[] {
    return [...friends.value]
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, limit)
  }

  /** 获取好友情绪分布 */
  function getFriendEmotionDistribution(): Record<string, number> {
    const dist: Record<string, number> = {}
    for (const f of friends.value) {
      dist[f.dominantEmotion] = (dist[f.dominantEmotion] ?? 0) + 1
    }
    return dist
  }

  // ============================================================
  // 每日重置
  // ============================================================

  /** 启动每日重置 */
  function startDailyReset(): void {
    if (dailyResetTimer) return

    const resetDaily = () => {
      dailyVisitCount.value = 0
      dailyGiftCount.value = 0
    }

    // 计算到午夜的毫秒数
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = midnight.getTime() - now.getTime()

    dailyResetTimer = setTimeout(() => {
      resetDaily()
      // 之后每24小时重置
      dailyResetTimer = setInterval(resetDaily, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }

  /** 停止每日重置 */
  function stopDailyReset(): void {
    if (dailyResetTimer) {
      clearInterval(dailyResetTimer)
      dailyResetTimer = null
    }
  }

  // ============================================================
  // 配置管理
  // ============================================================

  /** 更新社交配置 */
  function updateConfig(update: Partial<GardenSocialConfig>): void {
    socialConfig.value = { ...socialConfig.value, ...update }
  }

  /** 重置所有社交数据 */
  function reset(): void {
    friends.value = []
    friendRequests.value = []
    visits.value = []
    giftExchanges.value = []
    activities.value = []
    currentGardenSnapshot.value = null
    isVisiting.value = false
    dailyVisitCount.value = 0
    dailyGiftCount.value = 0
    stopDailyReset()
  }

  // ============================================================
  // 内部辅助
  // ============================================================

  /** 增加好友互动计数 */
  function incrementFriendInteraction(friendId: string): void {
    const idx = friends.value.findIndex(f => f.id === friendId)
    if (idx === -1) return

    const updated = [...friends.value]
    updated[idx] = { ...updated[idx], interactionCount: updated[idx].interactionCount + 1 }
    friends.value = updated
  }

  return {
    // 配置
    socialConfig,
    updateConfig,

    // 好友
    friends,
    friendCount,
    onlineFriends,
    onlineFriendCount,
    starredFriends,
    addFriend,
    removeFriend,
    toggleStarFriend,
    updateFriendNote,
    addFriendTag,
    removeFriendTag,
    updateFriendStatus,
    searchFriends,
    getFriendsByTag,
    getTopFriends,

    // 好友请求
    friendRequests,
    pendingRequests,
    pendingRequestCount,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getReceivedRequests,
    getSentRequests,

    // 访园
    visits,
    currentGardenSnapshot,
    isVisiting,
    visitGarden,
    endVisit,
    leaveFootprint,
    replyToVisit,
    getGardenVisits,
    getMyVisits,

    // 礼物
    giftExchanges,
    unreadGifts,
    unreadGiftCount,
    sendGift,
    markGiftRead,
    reciprocateGift,
    getReceivedGifts,
    getSentGifts,
    getGiftStats,

    // 社交动态
    activities,
    unreadActivities,
    unreadActivityCount,
    addActivity,
    markActivityRead,
    markAllActivitiesRead,
    getRecentActivities,
    getActivitiesWithFriend,

    // 社交分析
    socialStats,
    getInteractionTimeline,
    getMostActiveFriends,
    getFriendEmotionDistribution,

    // 每日管理
    startDailyReset,
    stopDailyReset,

    // 生命周期
    reset,

    // 常量
    DEFAULT_SOCIAL_CONFIG,
    GIFT_LIBRARY,
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 获取足迹类型标签 */
function getFootprintLabel(type: NonNullable<GardenVisit['footprintType']>): string {
  const labels: Record<string, string> = {
    like: '点赞',
    water: '浇水',
    comment: '留言',
    gift: '礼物',
    admire: '赞赏',
  }
  return labels[type] ?? type
}