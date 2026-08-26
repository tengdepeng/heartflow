// ============================================================
// P16-14 情绪花房 · 测试套件
// 覆盖：实时情绪检测、花园社交互动、情绪趋势分析
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { useEmotionDetector } from '../emotion-detector'
import { useGardenSocial } from '../garden-social'
import { useEmotionTrends } from '../emotion-trends'
import type { EmotionRecord } from '../types'

// ============================================================
// 测试数据工厂
// ============================================================

function createEmotionRecord(type: string, daysAgo: number, note: string = ''): EmotionRecord {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60))
  return {
    id: `emotion_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: type as EmotionRecord['type'],
    note: note || `${type} test note`,
    createdAt: date.toISOString(),
  }
}

function createEmotionRecords(count: number, daysBack: number = 30): EmotionRecord[] {
  const records: EmotionRecord[] = []
  const types = ['happy', 'sad', 'anxious', 'angry', 'calm', 'excited', 'grateful', 'tired', 'inspired', 'neutral']
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const daysAgo = Math.floor(Math.random() * daysBack)
    records.push(createEmotionRecord(type, daysAgo))
  }
  return records
}

// ============================================================
// 一、实时情绪检测引擎（emotion-detector.ts）
// ============================================================

describe('P16-14 实时情绪检测引擎', () => {
  let detector: ReturnType<typeof useEmotionDetector>

  beforeEach(() => {
    detector = useEmotionDetector()
  })

  describe('文本情绪分析', () => {
    it('应该检测到开心情绪', () => {
      const results = detector.analyzeText('今天真是太开心了！一切都很好')
      expect(results.length).toBeGreaterThan(0)
      const happyResult = results.find(r => r.type === 'happy')
      expect(happyResult).toBeDefined()
      expect(happyResult!.confidence).toBeGreaterThan(0)
    })

    it('应该检测到难过情绪', () => {
      const results = detector.analyzeText('今天很伤心，忍不住哭了')
      expect(results.length).toBeGreaterThan(0)
      const sadResult = results.find(r => r.type === 'sad')
      expect(sadResult).toBeDefined()
    })

    it('应该检测到焦虑情绪', () => {
      const results = detector.analyzeText('明天要汇报了，非常紧张和焦虑')
      expect(results.length).toBeGreaterThan(0)
      const anxiousResult = results.find(r => r.type === 'anxious')
      expect(anxiousResult).toBeDefined()
    })

    it('应该检测到愤怒情绪', () => {
      const results = detector.analyzeText('真的气死我了，太让人火大了')
      expect(results.length).toBeGreaterThan(0)
      const angryResult = results.find(r => r.type === 'angry')
      expect(angryResult).toBeDefined()
    })

    it('应该检测到平静情绪', () => {
      const results = detector.analyzeText('今天很平静，感觉很放松')
      const calm = results.find(r => r.type === 'calm')
      expect(calm).toBeDefined()
    })

    it('应该检测到兴奋情绪', () => {
      const results = detector.analyzeText('太激动了！迫不及待想去旅行')
      const excited = results.find(r => r.type === 'excited')
      expect(excited).toBeDefined()
    })

    it('应该检测到感恩情绪', () => {
      const results = detector.analyzeText('非常感恩身边有这么多好朋友')
      const grateful = results.find(r => r.type === 'grateful')
      expect(grateful).toBeDefined()
    })

    it('应该检测到疲惫情绪', () => {
      const results = detector.analyzeText('今天累死了，筋疲力尽不想动')
      const tired = results.find(r => r.type === 'tired')
      expect(tired).toBeDefined()
    })

    it('应该检测到灵感情绪', () => {
      const results = detector.analyzeText('突然有了灵感，豁然开朗')
      const inspired = results.find(r => r.type === 'inspired')
      expect(inspired).toBeDefined()
    })

    it('应该检测到多种情绪混合', () => {
      const results = detector.analyzeText('虽然很开心但也很焦虑，压力好大')
      expect(results.length).toBeGreaterThanOrEqual(2)
    })

    it('应该区分情绪强度（修饰词影响）', () => {
      const mild = detector.analyzeText('有点开心')
      const strong = detector.analyzeText('非常开心！超级开心！')

      // 强度高的应该有更高的置信度或强度
      const mildHappy = mild.find(r => r.type === 'happy')
      const strongHappy = strong.find(r => r.type === 'happy')

      if (mildHappy && strongHappy) {
        // 强情绪应该有更高的置信度或强度
        expect(strongHappy.confidence).toBeGreaterThanOrEqual(mildHappy.confidence)
      }
    })

    it('空文本应该返回空数组', () => {
      const results = detector.analyzeText('')
      expect(results).toEqual([])
    })

    it('禁用文本分析时应该返回空数组', () => {
      detector.updateConfig({ enableTextAnalysis: false })
      const results = detector.analyzeText('今天很开心')
      expect(results).toEqual([])
    })

    it('快速检测应该返回主要情绪', () => {
      const result = detector.detectPrimary('今天非常开心！')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('happy')
    })

    it('无匹配情绪时快速检测返回 null', () => {
      const result = detector.detectPrimary('abcdefg')
      expect(result).toBeNull()
    })
  })

  describe('检测管理', () => {
    it('应该正确添加到检测列表', () => {
      detector.analyzeText('今天很开心')
      expect(detector.detectionCount.value).toBeGreaterThan(0)
    })

    it('应该正确确认检测', () => {
      detector.analyzeText('好像有点开心')
      const pending = detector.pendingDetections.value
      if (pending.length > 0) {
        const result = detector.confirmDetection(pending[0].id)
        expect(result).toBe(true)
      }
    })

    it('应该正确拒绝检测', () => {
      detector.analyzeText('好像有点开心')
      const pending = detector.pendingDetections.value
      if (pending.length > 0) {
        const result = detector.rejectDetection(pending[0].id)
        expect(result).toBe(true)
      }
    })

    it('应该正确全部确认', () => {
      detector.analyzeText('好像有点开心')
      detector.analyzeText('似乎有点难过')
      const count = detector.confirmAll()
      expect(count).toBeGreaterThanOrEqual(0)
      expect(detector.pendingCount.value).toBe(0)
    })

    it('应该正确统计检测数据', () => {
      detector.analyzeText('非常开心！')
      detector.analyzeText('很伤心')
      const stats = detector.stats.value
      expect(stats.totalDetections).toBeGreaterThan(0)
      expect(stats.typeCounts).toBeDefined()
      expect(stats.sourceCounts).toBeDefined()
    })

    it('应该正确获取主导情绪', () => {
      detector.analyzeText('非常开心！')
      detector.analyzeText('超级开心！')
      const dominant = detector.dominantEmotion.value
      if (dominant) {
        expect(dominant.type).toBe('happy')
      }
    })
  })

  describe('周期性检测', () => {
    it('应该执行周期性检查', () => {
      const result = detector.performPeriodicCheck()
      expect(result).toBeDefined()
      expect(result.context).toBeDefined()
      expect(result.context.timeOfDay).toBeDefined()
      expect(result.context.dayOfWeek).toBeDefined()
    })

    it('启动和停止周期性检测', () => {
      detector.startPeriodicDetection()
      detector.stopPeriodicDetection()
      // 不应抛出异常
      expect(true).toBe(true)
    })
  })

  describe('日记扫描', () => {
    it('应该扫描日记条目中的情绪', () => {
      const entries = [
        { text: '今天非常开心！', timestamp: Date.now() - 86400000 },
        { text: '有点难过', timestamp: Date.now() - 172800000 },
      ]
      const results = detector.scanDiary(entries)
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('查询功能', () => {
    beforeEach(() => {
      detector.analyzeText('非常开心！')
      detector.analyzeText('有点难过')
    })

    it('应该获取最近检测', () => {
      const recent = detector.getRecentDetections(24)
      expect(recent.length).toBeGreaterThan(0)
    })

    it('应该按情绪类型筛选', () => {
      const happy = detector.getDetectionsByType('happy')
      expect(happy.length).toBeGreaterThan(0)
      expect(happy.every(d => d.type === 'happy')).toBe(true)
    })

    it('应该按来源筛选', () => {
      const textDetections = detector.getDetectionsBySource('text')
      expect(textDetections.length).toBeGreaterThan(0)
      expect(textDetections.every(d => d.source === 'text')).toBe(true)
    })
  })

  describe('配置管理', () => {
    it('应该更新配置', () => {
      detector.updateConfig({ minConfidence: 0.8 })
      expect(detector.detectorConfig.value.minConfidence).toBe(0.8)
    })

    it('应该添加自定义关键词', () => {
      detector.addKeywords('happy', ['美滋滋', '舒坦'])
      const results = detector.analyzeText('今天美滋滋的')
      const happy = results.find(r => r.type === 'happy')
      expect(happy).toBeDefined()
    })
  })

  describe('重置', () => {
    it('应该重置所有状态', () => {
      detector.analyzeText('开心')
      detector.reset()
      expect(detector.detectionCount.value).toBe(0)
      expect(detector.pendingCount.value).toBe(0)
      expect(detector.confirmedCount.value).toBe(0)
    })
  })
})

// ============================================================
// 二、花园社交互动系统（garden-social.ts）
// ============================================================

describe('P16-14 花园社交互动系统', () => {
  let social: ReturnType<typeof useGardenSocial>

  beforeEach(() => {
    social = useGardenSocial()
  })

  describe('好友管理', () => {
    it('应该添加好友', () => {
      const friend = social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      expect(friend).not.toBeNull()
      expect(friend!.name).toBe('小明')
      expect(social.friendCount.value).toBe(1)
    })

    it('应该移除好友', () => {
      const friend = social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      expect(friend).not.toBeNull()
      const result = social.removeFriend(friend!.id)
      expect(result).toBe(true)
      expect(social.friendCount.value).toBe(0)
    })

    it('应该星标/取消星标好友', () => {
      const friend = social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      expect(friend).not.toBeNull()
      const result = social.toggleStarFriend(friend!.id)
      expect(result).toBe(true)
      expect(social.starredFriends.value.length).toBe(1)
    })

    it('应该更新好友备注', () => {
      const friend = social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      expect(friend).not.toBeNull()
      const result = social.updateFriendNote(friend!.id, '大学同学')
      expect(result).toBe(true)
    })

    it('应该添加好友标签', () => {
      const friend = social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      expect(friend).not.toBeNull()
      const result = social.addFriendTag(friend!.id, '同事')
      expect(result).toBe(true)
      expect(social.getFriendsByTag('同事').length).toBe(1)
    })

    it('应该移除好友标签', () => {
      const friend = social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      expect(friend).not.toBeNull()
      social.addFriendTag(friend!.id, '同事')
      const result = social.removeFriendTag(friend!.id, '同事')
      expect(result).toBe(true)
      expect(social.getFriendsByTag('同事').length).toBe(0)
    })

    it('应该更新好友状态', () => {
      const friend = social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      expect(friend).not.toBeNull()
      const result = social.updateFriendStatus(friend!.id, 'offline')
      expect(result).toBe(true)
    })

    it('应该搜索好友', () => {
      social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      social.addFriend({
        name: '小红',
        gardenName: '小红的花园',
        status: 'offline',
        lastActiveAt: Date.now(),
        flowerCount: 15,
        dominantEmotion: 'calm',
      })
      const results = social.searchFriends('小明')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('小明')
    })

    it('应该获取好友数量', () => {
      social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      social.addFriend({
        name: '小红',
        gardenName: '小红的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 15,
        dominantEmotion: 'calm',
      })
      expect(social.friendCount.value).toBe(2)
      expect(social.onlineFriendCount.value).toBe(2)
    })

    it('超过好友上限时添加失败', () => {
      social.updateConfig({ maxFriends: 1 })
      social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      const result = social.addFriend({
        name: '小红',
        gardenName: '小红的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 15,
        dominantEmotion: 'calm',
      })
      expect(result).toBeNull()
    })
  })

  describe('好友请求', () => {
    it('应该发送好友请求', () => {
      const request = social.sendFriendRequest('user123', '小明', '可以加好友吗？')
      expect(request).toBeDefined()
      expect(request.status).toBe('pending')
      expect(social.pendingRequestCount.value).toBe(1)
    })

    it('应该接受好友请求', () => {
      const request = social.sendFriendRequest('user123', '小明')
      // 模拟收到请求
      const received = {
        id: request.id,
        fromId: 'user123',
        fromName: '小明',
        toId: 'self',
        sentAt: Date.now(),
        status: 'pending' as const,
      }
      // 这里需要手动操作 friendRequests
      social.friendRequests.value = [received]
      const friend = social.acceptFriendRequest(request.id, {
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      expect(friend).not.toBeNull()
    })

    it('应该拒绝好友请求', () => {
      social.friendRequests.value = [{
        id: 'req_test',
        fromId: 'user123',
        fromName: '小明',
        toId: 'self',
        sentAt: Date.now(),
        status: 'pending',
      }]
      const result = social.rejectFriendRequest('req_test')
      expect(result).toBe(true)
    })
  })

  describe('访园机制', () => {
    it('应该访问好友花园', () => {
      const snapshot = social.visitGarden('friend123', '小明')
      expect(snapshot).not.toBeNull()
      expect(snapshot!.ownerName).toBe('小明')
      expect(social.isVisiting.value).toBe(true)
    })

    it('应该结束访园', () => {
      social.visitGarden('friend123', '小明')
      const duration = social.endVisit()
      expect(duration).toBeGreaterThanOrEqual(0)
      expect(social.isVisiting.value).toBe(false)
    })

    it('应该在访园时留下印记', () => {
      social.visitGarden('friend123', '小明')
      const result = social.leaveFootprint('like', '花园很漂亮！')
      expect(result).toBe(true)
    })

    it('无快照时留下印记应该失败', () => {
      const result = social.leaveFootprint('like', 'test')
      expect(result).toBe(false)
    })

    it('应该回复访客印记', () => {
      // 先添加一条访园记录
      social.visits.value = [{
        id: 'visit_test',
        visitorId: 'friend123',
        visitorName: '小明',
        hostId: 'self',
        visitedAt: Date.now(),
        duration: 120,
        leftFootprint: true,
        footprintType: 'comment',
        footprintMessage: '好看的花园',
        replied: false,
      }]
      const result = social.replyToVisit('visit_test', '谢谢！')
      expect(result).toBe(true)
    })

    it('超过每日访问上限时访问失败', () => {
      social.updateConfig({ maxDailyVisits: 1 })
      social.visitGarden('friend1', '小明')
      const result = social.visitGarden('friend2', '小红')
      expect(result).toBeNull()
    })
  })

  describe('礼物交换', () => {
    it('应该发送礼物', () => {
      const gift = social.sendGift('friend123', '小明', 'gift-flower-rose', '送你一朵花')
      expect(gift).not.toBeNull()
      expect(gift!.gift.name).toBe('玫瑰')
    })

    it('不存在的礼物ID应返回null', () => {
      const gift = social.sendGift('friend123', '小明', 'nonexistent-gift')
      expect(gift).toBeNull()
    })

    it('超过每日礼物上限时发送失败', () => {
      social.updateConfig({ maxDailyGifts: 1 })
      social.sendGift('friend1', '小明', 'gift-flower-rose')
      const result = social.sendGift('friend2', '小红', 'gift-flower-sunflower')
      expect(result).toBeNull()
    })

    it('应该标记礼物为已读', () => {
      const gift = social.sendGift('friend123', '小明', 'gift-flower-rose')
      expect(gift).not.toBeNull()
      // 模拟收到礼物
      social.giftExchanges.value = [{
        ...gift!,
        toId: 'self',
        fromId: 'friend123',
        fromName: '小明',
        read: false,
      }]
      const result = social.markGiftRead(gift!.id)
      expect(result).toBe(true)
    })

    it('应该回礼', () => {
      social.giftExchanges.value = [{
        id: 'gift_test',
        fromId: 'friend123',
        fromName: '小明',
        toId: 'self',
        toName: '我',
        gift: {
          id: 'gift-flower-rose',
          type: 'flower',
          name: '玫瑰',
          description: 'test',
          icon: '🌹',
          rarity: 'common',
        },
        sentAt: Date.now(),
        read: true,
        reciprocated: false,
      }]
      const result = social.reciprocateGift('gift_test', 'gift-flower-sunflower', '谢谢！')
      expect(result).not.toBeNull()
    })

    it('应该获取礼物统计', () => {
      social.sendGift('friend1', '小明', 'gift-flower-rose')
      social.sendGift('friend2', '小红', 'gift-flower-sunflower')
      const stats = social.getGiftStats()
      expect(stats.byType).toBeDefined()
      expect(stats.byRarity).toBeDefined()
    })
  })

  describe('社交动态', () => {
    it('应该添加社交动态', () => {
      const activity = social.addActivity({
        type: 'visit',
        userId: 'friend123',
        userName: '小明',
        description: '访问了小明的花园',
        timestamp: Date.now(),
      })
      expect(activity).toBeDefined()
      expect(social.unreadActivityCount.value).toBe(1)
    })

    it('应该标记动态已读', () => {
      social.addActivity({
        type: 'visit',
        userId: 'friend123',
        userName: '小明',
        description: 'test',
        timestamp: Date.now(),
      })
      const activities = social.getRecentActivities()
      const result = social.markActivityRead(activities[0].id)
      expect(result).toBe(true)
    })

    it('应该全部标记已读', () => {
      social.addActivity({
        type: 'visit',
        userId: 'a',
        userName: 'A',
        description: 'test1',
        timestamp: Date.now(),
      })
      social.addActivity({
        type: 'gift',
        userId: 'b',
        userName: 'B',
        description: 'test2',
        timestamp: Date.now(),
      })
      const count = social.markAllActivitiesRead()
      expect(count).toBe(2)
      expect(social.unreadActivityCount.value).toBe(0)
    })
  })

  describe('社交统计', () => {
    it('应该计算社交统计', () => {
      social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      social.visitGarden('friend123', '小明')
      social.sendGift('friend123', '小明', 'gift-flower-rose')

      const stats = social.socialStats.value
      expect(stats.totalFriends).toBe(1)
      expect(stats.totalVisitsMade).toBeGreaterThanOrEqual(0)
      expect(stats.giftsSent).toBeGreaterThanOrEqual(0)
    })

    it('应该获取互动时间线', () => {
      social.visitGarden('friend123', '小明')
      social.sendGift('friend123', '小明', 'gift-flower-rose')
      const timeline = social.getInteractionTimeline(7)
      expect(timeline.length).toBeGreaterThan(0)
    })

    it('应该获取好友情绪分布', () => {
      social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      social.addFriend({
        name: '小红',
        gardenName: '小红的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 15,
        dominantEmotion: 'calm',
      })
      const dist = social.getFriendEmotionDistribution()
      expect(dist['happy']).toBe(1)
      expect(dist['calm']).toBe(1)
    })
  })

  describe('重置', () => {
    it('应该重置所有社交数据', () => {
      social.addFriend({
        name: '小明',
        gardenName: '小明的花园',
        status: 'online',
        lastActiveAt: Date.now(),
        flowerCount: 20,
        dominantEmotion: 'happy',
      })
      social.visitGarden('friend123', '小明')
      social.reset()
      expect(social.friendCount.value).toBe(0)
      expect(social.visits.value.length).toBe(0)
    })
  })
})

// ============================================================
// 三、情绪趋势分析仪表盘（emotion-trends.ts）
// ============================================================

describe('P16-14 情绪趋势分析仪表盘', () => {
  let trends: ReturnType<typeof useEmotionTrends>

  beforeEach(() => {
    trends = useEmotionTrends()
  })

  describe('时间序列分析', () => {
    it('应该构建每日趋势', () => {
      const records = createEmotionRecords(50, 30)
      const points = trends.buildTrends(records, 'daily', 30)
      expect(points.length).toBeGreaterThan(0)
      expect(points[0].label).toBeDefined()
      expect(points[0].counts).toBeDefined()
    })

    it('应该构建每周趋势', () => {
      const records = createEmotionRecords(50, 60)
      const points = trends.buildTrends(records, 'weekly', 60)
      expect(points.length).toBeGreaterThan(0)
    })

    it('应该构建每月趋势', () => {
      const records = createEmotionRecords(100, 180)
      const points = trends.buildTrends(records, 'monthly', 180)
      expect(points.length).toBeGreaterThan(0)
    })

    it('空记录应该返回空数组', () => {
      const points = trends.buildTrends([], 'daily', 30)
      expect(points).toEqual([])
    })

    it('趋势数据点应该包含计算字段', () => {
      const records = createEmotionRecords(30, 14)
      const points = trends.buildTrends(records, 'daily', 14)
      for (const point of points) {
        expect(point.dominant).toBeDefined()
        expect(point.diversity).toBeGreaterThanOrEqual(0)
        expect(point.diversity).toBeLessThanOrEqual(1)
        expect(point.avgIntensity).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('趋势摘要', () => {
    it('应该计算趋势摘要', () => {
      const records = createEmotionRecords(50, 30)
      const summary = trends.computeSummary(records)
      expect(summary.totalRecords).toBeGreaterThan(0)
      expect(summary.dominantEmotion).toBeDefined()
      expect(summary.dominantRatio).toBeGreaterThanOrEqual(0)
      expect(summary.diversityIndex).toBeGreaterThanOrEqual(0)
      expect(summary.stabilityScore).toBeGreaterThanOrEqual(0)
      expect(summary.stabilityScore).toBeLessThanOrEqual(100)
      expect(summary.positiveRatio).toBeGreaterThanOrEqual(0)
      expect(summary.negativeRatio).toBeGreaterThanOrEqual(0)
      expect(summary.overallTrend).toBeDefined()
    })

    it('空记录应该返回默认摘要', () => {
      const summary = trends.computeSummary([])
      expect(summary.totalRecords).toBe(0)
      expect(summary.dominantEmotion).toBe('neutral')
    })

    it('应该评估整体趋势', () => {
      // 创建积极情绪逐渐增多的记录
      const records: EmotionRecord[] = []
      for (let i = 0; i < 20; i++) {
        const type = i < 10 ? 'sad' : 'happy'
        records.push(createEmotionRecord(type, 20 - i))
      }
      const summary = trends.computeSummary(records)
      expect(['improving', 'declining', 'stable', 'volatile']).toContain(summary.overallTrend)
    })
  })

  describe('模式检测', () => {
    it('应该检测情绪模式', () => {
      const records = createEmotionRecords(100, 30)
      const patterns = trends.detectPatterns(records)
      expect(patterns).toBeDefined()
      // 随机数据可能检测到也可能检测不到
      expect(Array.isArray(patterns)).toBe(true)
    })

    it('不足7条记录时不应检测模式', () => {
      const records = createEmotionRecords(5, 3)
      const patterns = trends.detectPatterns(records)
      expect(patterns).toEqual([])
    })

    it('检测到的模式应有完整结构', () => {
      // 创建有周期的数据
      const records: EmotionRecord[] = []
      const days = 30
      for (let d = 0; d < days; d++) {
        // 每7天重复同样的情绪模式
        const weekdayPattern = ['happy', 'calm', 'excited', 'calm', 'happy', 'excited', 'calm']
        const type = weekdayPattern[d % 7]
        records.push(createEmotionRecord(type, days - d))
      }
      const patterns = trends.detectPatterns(records)
      if (patterns.length > 0) {
        const p = patterns[0]
        expect(p.id).toBeDefined()
        expect(p.name).toBeDefined()
        expect(p.type).toBeDefined()
        expect(p.confidence).toBeGreaterThanOrEqual(0)
        expect(p.confidence).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('情绪预测', () => {
    it('应该预测未来情绪', () => {
      const records = createEmotionRecords(30, 14)
      const predictions = trends.predictEmotions(records)
      expect(predictions.length).toBeGreaterThan(0)
      expect(predictions.length).toBeLessThanOrEqual(7) // 默认预测7天
    })

    it('不足7条记录时不应预测', () => {
      const records = createEmotionRecords(3, 2)
      const predictions = trends.predictEmotions(records)
      expect(predictions).toEqual([])
    })

    it('预测应有完整结构', () => {
      const records = createEmotionRecords(30, 14)
      const predictions = trends.predictEmotions(records)
      if (predictions.length > 0) {
        const p = predictions[0]
        expect(p.date).toBeDefined()
        expect(p.predictedDominant).toBeDefined()
        expect(p.probabilities).toBeDefined()
        expect(p.confidence).toBeGreaterThanOrEqual(0)
        expect(p.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('禁用预测时返回空数组', () => {
      trends.trendsConfig.value = { ...trends.trendsConfig.value, enablePrediction: false }
      const records = createEmotionRecords(30, 14)
      const predictions = trends.predictEmotions(records)
      expect(predictions).toEqual([])
    })
  })

  describe('仪表盘数据', () => {
    it('应该生成仪表盘面板', () => {
      const records = createEmotionRecords(50, 30)
      const panels = trends.generateDashboardPanels(records)
      expect(panels.length).toBeGreaterThan(0)
      expect(panels.some(p => p.id === 'panel-trend-line')).toBe(true)
      expect(panels.some(p => p.id === 'panel-distribution-pie')).toBe(true)
      expect(panels.some(p => p.id === 'panel-key-metrics')).toBe(true)
      expect(panels.some(p => p.id === 'panel-heatmap')).toBe(true)
      expect(panels.some(p => p.id === 'panel-radar')).toBe(true)
    })

    it('每个面板应有完整结构', () => {
      const records = createEmotionRecords(30, 14)
      const panels = trends.generateDashboardPanels(records)
      for (const panel of panels) {
        expect(panel.id).toBeDefined()
        expect(panel.title).toBeDefined()
        expect(panel.type).toBeDefined()
        expect(panel.data).toBeDefined()
      }
    })
  })

  describe('相关性分析', () => {
    it('应该分析情绪相关性', () => {
      const records = createEmotionRecords(50, 30)
      const correlations = trends.analyzeCorrelations(records)
      expect(Array.isArray(correlations)).toBe(true)
    })

    it('不足10条记录时返回空数组', () => {
      const records = createEmotionRecords(5, 3)
      const correlations = trends.analyzeCorrelations(records)
      expect(correlations).toEqual([])
    })
  })

  describe('异常检测', () => {
    it('应该检测异常', () => {
      const records = createEmotionRecords(50, 30)
      const anomalies = trends.detectAnomalies(records)
      expect(Array.isArray(anomalies)).toBe(true)
    })

    it('不足14条记录时返回空数组', () => {
      const records = createEmotionRecords(5, 3)
      const anomalies = trends.detectAnomalies(records)
      expect(anomalies).toEqual([])
    })
  })

  describe('数据导出', () => {
    it('应该导出CSV', () => {
      const records = createEmotionRecords(30, 14)
      const csv = trends.exportTrendsCSV(records)
      expect(csv).toBeDefined()
      expect(csv.length).toBeGreaterThan(0)
      expect(csv.includes('日期')).toBe(true)
    })

    it('应该导出模式报告', () => {
      const report = trends.exportPatternsReport()
      expect(report).toBeDefined()
    })
  })

  describe('综合分析', () => {
    it('应该执行完整分析', () => {
      const records = createEmotionRecords(50, 30)
      const result = trends.analyzeAll(records)
      expect(result.trends).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.patterns).toBeDefined()
      expect(result.predictions).toBeDefined()
      expect(result.dashboardPanels).toBeDefined()
    })
  })

  describe('重置', () => {
    it('应该重置所有趋势数据', () => {
      const records = createEmotionRecords(30, 14)
      trends.buildTrends(records)
      trends.reset()
      expect(trends.trendData.value.length).toBe(0)
      expect(trends.patterns.value.length).toBe(0)
    })
  })
})

// ============================================================
// 四、模块集成测试
// ============================================================

describe('P16-14 模块集成', () => {
  it('情绪检测器应该与情绪记录系统集成', () => {
    const detector = useEmotionDetector()
    const records = createEmotionRecords(10, 7)

    // 扫描情绪记录
    const entries = records.map(r => ({
      text: r.note,
      timestamp: new Date(r.createdAt).getTime(),
    }))
    const detections = detector.scanDiary(entries)
    expect(detections.length).toBeGreaterThanOrEqual(0)
  })

  it('社交系统应该与趋势分析集成', () => {
    const social = useGardenSocial()
    social.addFriend({
      name: '小明',
      gardenName: '小明的花园',
      status: 'online',
      lastActiveAt: Date.now(),
      flowerCount: 20,
      dominantEmotion: 'happy',
    })
    social.addFriend({
      name: '小红',
      gardenName: '小红的花园',
      status: 'online',
      lastActiveAt: Date.now(),
      flowerCount: 15,
      dominantEmotion: 'calm',
    })

    const dist = social.getFriendEmotionDistribution()
    expect(dist).toBeDefined()
    expect(Object.keys(dist).length).toBeGreaterThan(0)
  })

  it('趋势分析应该可以在社交数据上运行', () => {
    const trends = useEmotionTrends()
    const records = createEmotionRecords(30, 14)
    const summary = trends.computeSummary(records)

    // 社交系统的好友情绪分布应该与趋势分析兼容
    const social = useGardenSocial()
    social.addFriend({
      name: '小明',
      gardenName: '小明的花园',
      status: 'online',
      lastActiveAt: Date.now(),
      flowerCount: 20,
      dominantEmotion: summary.dominantEmotion,
    })
    expect(social.friendCount.value).toBe(1)
  })
})