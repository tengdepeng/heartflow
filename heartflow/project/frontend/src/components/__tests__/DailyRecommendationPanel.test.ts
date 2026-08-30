// ============================================================
// DailyRecommendationPanel 组件测试（INCR-01：每日词汇推荐）
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { storage } from '../../engine/storage'
import DailyRecommendationPanel from '../DailyRecommendationPanel.vue'
import type { WordRecommendationPack } from '../../modules/word-mirror/daily-recommendation'

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function makeDailyPack(): WordRecommendationPack {
  return {
    id: `rec-${today()}`,
    date: today(),
    type: 'daily_word',
    dailyWord: {
      date: today(),
      word: '澄明',
      definition: '清澈明亮，形容心境纯净透彻',
      example: '静坐片刻后，他的心境变得澄明如水。',
      etymology: '「澄」从水登声',
      relatedWords: ['清澈', '通透'],
      funFact: '古人用「澄明」形容沉淀后的清水。',
      practiceType: 'flashcard',
      tags: ['心境'],
    },
    reason: '今日新词"澄明"，可纳入你的词汇边界',
    studyTip: '可先阅读词源和例句，再用它写一个句子。',
  }
}

describe('DailyRecommendationPanel', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
  })

  it('未生成今日推荐时展示空态与生成按钮', () => {
    const wrapper = mount(DailyRecommendationPanel)
    expect(wrapper.text()).toContain('每日词汇推荐')
    expect(wrapper.text()).toContain('生成今日推荐')
  })

  it('生成今日推荐后写入持久化并展示完成按钮', async () => {
    const wrapper = mount(DailyRecommendationPanel)
    await wrapper.find('.drp-empty .wm-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('标记完成')
    // 持久化到每日推荐键
    const saved = storage.getKV<WordRecommendationPack | null>(
      'hf:word_mirror:daily_recommendation',
      null,
    )
    expect(saved).toBeTruthy()
    expect(['daily_word', 'review', 'theme', 'personalized']).toContain(saved?.type)
    expect(saved).toMatchObject({ date: today() })
  })

  it('已生成今日推荐(含历史统计)可标记完成', async () => {
    // 预置今日推荐 + 匹配历史，模拟「已生成」
    storage.setKV('hf:word_mirror:daily_recommendation', makeDailyPack())
    storage.setKV('hf:word_mirror:recommendation_history', [
      { date: today(), type: 'daily_word', wordCount: 1, completed: false },
    ])

    const wrapper = mount(DailyRecommendationPanel)
    expect(wrapper.text()).toContain('每日一词')
    expect(wrapper.text()).toContain('累计 1')

    await wrapper.find('.drp-card .wm-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('今日已完成')
    const history = storage.getKV<{ completed: boolean }[]>(
      'hf:word_mirror:recommendation_history',
      [],
    )
    expect(history[0].completed).toBe(true)
  })

  it('展示主题词汇推荐', () => {
    storage.setKV('hf:word_mirror:daily_recommendation', {
      id: `rec-${today()}`,
      date: today(),
      type: 'theme',
      themePack: {
        theme: '时间',
        description: '关于时间的词汇',
        icon: '⏳',
        coreWords: ['光阴', '荏苒', '须臾'],
        extendedWords: ['朝暮'],
        writingPrompt: '写一段关于时间的文字。',
      },
      reason: '本周主题"时间"，系统学习一组相关词汇',
      studyTip: '可按主题学习，建立词语之间的语义网络。',
    })

    const wrapper = mount(DailyRecommendationPanel)
    expect(wrapper.text()).toContain('主题')
    expect(wrapper.text()).toContain('光阴')
  })
})