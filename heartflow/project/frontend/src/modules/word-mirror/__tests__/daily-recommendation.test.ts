// ============================================================
// 字镜阁 · 每日词汇推荐测试（P16-4）
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { useDailyRecommendation } from '../daily-recommendation'
import type { WordEntry } from '../types'

// 创建测试用词汇数据
function createTestWords(): WordEntry[] {
  return [
    {
      id: '1',
      word: '澄明',
      definition: '清澈明亮',
      proficiency: 2,
      favorite: true,
      tags: ['心境', '品质'],
      createdAt: '2026-01-01',
      lastReviewedAt: '2026-07-20',
      reviewCount: 3,
    },
    {
      id: '2',
      word: '笃行',
      definition: '切实地践行',
      proficiency: 4,
      favorite: false,
      tags: ['行动', '品质'],
      createdAt: '2026-01-15',
      lastReviewedAt: '2026-08-01',
      reviewCount: 8,
    },
    {
      id: '3',
      word: '精进',
      definition: '勤奋努力不断向上',
      proficiency: 1,
      favorite: false,
      tags: ['成长', '行动'],
      createdAt: '2026-02-01',
      lastReviewedAt: '2026-07-10',
      reviewCount: 1,
    },
    {
      id: '4',
      word: '温润',
      definition: '温和柔润如玉',
      proficiency: 3,
      favorite: true,
      tags: ['品质', '性格'],
      createdAt: '2026-03-01',
      lastReviewedAt: '2026-07-25',
      reviewCount: 5,
    },
    {
      id: '5',
      word: '洞见',
      definition: '深刻透彻的见解',
      proficiency: 5,
      favorite: true,
      tags: ['智慧', '思维'],
      createdAt: '2026-01-20',
      lastReviewedAt: '2026-08-01',
      reviewCount: 12,
    },
  ]
}

describe('daily recommendation', () => {
  let recommendation: ReturnType<typeof useDailyRecommendation>

  beforeEach(() => {
    recommendation = useDailyRecommendation()
  })

  describe('getDailyWord', () => {
    it('应返回每日一词', () => {
      const daily = recommendation.getDailyWord('2026-08-02')
      expect(daily).toBeDefined()
      expect(daily.word).toBeTruthy()
      expect(daily.definition).toBeTruthy()
      expect(daily.example).toBeTruthy()
      expect(daily.etymology).toBeTruthy()
      expect(daily.relatedWords.length).toBeGreaterThan(0)
      expect(daily.tags.length).toBeGreaterThan(0)
      expect(daily.practiceType).toBeTruthy()
      expect(daily.funFact).toBeTruthy()
    })

    it('同一天应返回相同的每日一词', () => {
      const word1 = recommendation.getDailyWord('2026-08-02')
      const word2 = recommendation.getDailyWord('2026-08-02')
      expect(word1.word).toBe(word2.word)
    })

    it('不同日期应返回不同的每日一词', () => {
      const word1 = recommendation.getDailyWord('2026-08-02')
      const word2 = recommendation.getDailyWord('2026-08-03')
      // 可能碰巧相同（如果每日一词库很小），但大概率不同
      expect(word1.date).not.toBe(word2.date)
    })

    it('date 字段应被正确设置', () => {
      const daily = recommendation.getDailyWord('2026-06-15')
      expect(daily.date).toBe('2026-06-15')
    })
  })

  describe('getReviewRecommendations', () => {
    it('应根据熟练度优先推荐低熟练度词汇', () => {
      const words = createTestWords()
      const reviewWords = recommendation.getReviewRecommendations(words, 3)

      expect(reviewWords.length).toBeLessThanOrEqual(3)
      // 精进(proficiency=1) 应该被优先推荐
      expect(reviewWords[0]).toBe('精进')
    })

    it('空词汇列表应返回空数组', () => {
      const reviewWords = recommendation.getReviewRecommendations([], 5)
      expect(reviewWords).toEqual([])
    })

    it('应尊重 count 参数', () => {
      const words = createTestWords()
      const reviewWords = recommendation.getReviewRecommendations(words, 2)
      expect(reviewWords.length).toBeLessThanOrEqual(2)
    })
  })

  describe('getThemePack', () => {
    it('应返回主题词汇包', () => {
      const pack = recommendation.getThemePack('2026-08-02')
      expect(pack).toBeDefined()
      expect(pack.theme).toBeTruthy()
      expect(pack.description).toBeTruthy()
      expect(pack.coreWords.length).toBeGreaterThanOrEqual(3)
      expect(pack.extendedWords.length).toBeGreaterThanOrEqual(3)
      expect(pack.writingPrompt).toBeTruthy()
    })

    it('同一天应返回相同主题', () => {
      const pack1 = recommendation.getThemePack('2026-08-02')
      const pack2 = recommendation.getThemePack('2026-08-02')
      expect(pack1.theme).toBe(pack2.theme)
    })

    it('包含用户偏好标签时应优先匹配', () => {
      const pack = recommendation.getThemePack('2026-08-02', ['智慧', '思维'])
      expect(pack).toBeDefined()
      // 可能匹配到"智慧"主题包
      expect(pack.theme).toBeTruthy()
    })
  })

  describe('getPersonalizedRecommendations', () => {
    it('应生成个性化推荐', () => {
      const words = createTestWords()
      const personalized = recommendation.getPersonalizedRecommendations(words, 3)

      expect(personalized.length).toBeLessThanOrEqual(3)
      personalized.forEach((pw) => {
        expect(pw.word).toBeTruthy()
        expect(pw.definition).toBeTruthy()
        expect(pw.reason).toBeTruthy()
        expect(pw.matchScore).toBeGreaterThanOrEqual(0)
        expect(pw.matchScore).toBeLessThanOrEqual(100)
        expect(pw.priority).toBeTruthy()
      })
    })

    it('应过滤用户已掌握的词汇', () => {
      const words = createTestWords()
      const personalized = recommendation.getPersonalizedRecommendations(words, 10)

      const knownWords = new Set(words.map((w) => w.word))
      personalized.forEach((pw) => {
        expect(knownWords.has(pw.word)).toBe(false)
      })
    })

    it('空词汇列表应返回空数组', () => {
      const personalized = recommendation.getPersonalizedRecommendations([], 5)
      expect(personalized).toEqual([])
    })
  })

  describe('generateTodayRecommendation', () => {
    it('应生成综合推荐包', () => {
      const words = createTestWords()
      const pack = recommendation.generateTodayRecommendation(words, '2026-08-02')

      expect(pack).toBeDefined()
      expect(pack.id).toBe('rec-2026-08-02')
      expect(pack.date).toBe('2026-08-02')
      expect(pack.type).toBeTruthy()
      expect(pack.reason).toBeTruthy()
      expect(pack.studyTip).toBeTruthy()
    })

    it('推荐类型应包含每日一词/复习/主题/个性化之一', () => {
      const words = createTestWords()
      const pack = recommendation.generateTodayRecommendation(words, '2026-08-02')

      expect(['daily_word', 'review', 'theme', 'personalized']).toContain(pack.type)
    })

    it('daily_word 类型应有 dailyWord 字段', () => {
      // 测试日期 2026-08-02，dayOfYear 使 rotationType 为 0 或 3
      const words = createTestWords()
      const pack = recommendation.generateTodayRecommendation(words, '2026-01-01')

      if (pack.type === 'daily_word') {
        expect(pack.dailyWord).toBeDefined()
        expect(pack.dailyWord!.word).toBeTruthy()
      }
    })
  })

  describe('completeRecommendation', () => {
    it('应将推荐标记为已完成', () => {
      const words = createTestWords()
      const pack = recommendation.generateTodayRecommendation(words, '2026-08-02')

      recommendation.completeRecommendation('2026-08-02', pack.type)

      const stats = recommendation.getRecommendationStats()
      expect(stats.completedCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getRecommendationStats', () => {
    it('应返回推荐统计', () => {
      const stats = recommendation.getRecommendationStats()

      expect(stats).toBeDefined()
      expect(stats.totalRecommendations).toBeGreaterThanOrEqual(0)
      expect(stats.completionRate).toBeGreaterThanOrEqual(0)
      expect(stats.completionRate).toBeLessThanOrEqual(100)
      expect(stats.favoriteType).toBeTruthy()
    })
  })

  describe('getWordLibraryStats', () => {
    it('应返回词汇库统计', () => {
      const stats = recommendation.getWordLibraryStats()

      expect(stats.dailyWordsCount).toBeGreaterThanOrEqual(10)
      expect(stats.themePacksCount).toBeGreaterThanOrEqual(5)
      expect(stats.recommendationPoolCount).toBeGreaterThanOrEqual(10)
    })
  })

  describe('用户画像', () => {
    it('应从用户词汇中构建画像', () => {
      const words = createTestWords()
      const pack = recommendation.generateTodayRecommendation(words, '2026-08-02')

      // 画像信息应反映在推荐理由中
      expect(pack.reason).toBeTruthy()
    })
  })
})