import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { WordEntry, WordGameType, WordGameRound, WordGameSession } from '../../modules/word-mirror/types'

const sessions: Ref<WordGameSession[]> = ref([])
const createSession = vi.fn((gameType: WordGameType, words: WordEntry[]) => {
  const rounds: WordGameRound[] = words.slice(0, 2).map((w) => ({
    type: gameType,
    question: `"${w.word}" 的释义是？`,
    options: [w.definition, '干扰项A', '干扰项B', '干扰项C'],
    correctIndex: 0,
    targetWord: w.word,
    hint: '提示',
  }))
  const session: WordGameSession = {
    id: `g-${sessions.value.length + 1}`,
    gameType,
    rounds,
    currentRound: 0,
    correctCount: 0,
    totalCount: rounds.length,
    startedAt: '2026-09-04T10:00:00.000Z',
    wordIds: words.map((w) => w.id),
  }
  sessions.value.push(session)
  return session
})
const submitAnswer = vi.fn((sessionId: string, selectedIndex: number) => {
  const s = sessions.value.find((x) => x.id === sessionId)
  if (!s || s.currentRound >= s.totalCount) return false
  const round = s.rounds[s.currentRound]
  const correct = selectedIndex === round.correctIndex
  if (correct) s.correctCount++
  s.currentRound++
  if (s.currentRound >= s.totalCount) s.completedAt = '2026-09-04T10:00:00.000Z'
  return correct
})
const getCurrentRound = vi.fn((sessionId: string) => {
  const s = sessions.value.find((x) => x.id === sessionId)
  if (!s || s.currentRound >= s.totalCount) return null
  return s.rounds[s.currentRound]
})
const getProgress = vi.fn((sessionId: string) => {
  const s = sessions.value.find((x) => x.id === sessionId)
  if (!s) return null
  return {
    current: s.currentRound,
    total: s.totalCount,
    correct: s.correctCount,
    percentage: s.totalCount > 0 ? Math.round((s.correctCount / s.totalCount) * 100) : 0,
  }
})
const getGameStats = vi.fn(() => {
  const completed = sessions.value.filter((s) => s.completedAt)
  const totalRounds = completed.reduce((sum, s) => sum + s.totalCount, 0)
  const totalCorrect = completed.reduce((sum, s) => sum + s.correctCount, 0)
  return {
    totalGames: completed.length,
    totalCorrect,
    totalRounds,
    accuracy: totalRounds > 0 ? Math.round((totalCorrect / totalRounds) * 100) : 0,
  }
})
const removeSession = vi.fn((sessionId: string) => {
  sessions.value = sessions.value.filter((s) => s.id !== sessionId)
})

vi.mock('../../modules/word-mirror/word-games', () => ({
  useWordGames: () => ({
    sessions,
    createSession,
    submitAnswer,
    getCurrentRound,
    getProgress,
    getGameStats,
    removeSession,
  }),
}))

import WordGamesPanel from '../WordGamesPanel.vue'

const words: WordEntry[] = [
  { id: 'w-1', word: '专注', definition: '集中注意力', proficiency: 1, favorite: false, tags: [], createdAt: '2026-01-01T00:00:00.000Z', reviewCount: 0 },
  { id: 'w-2', word: '坚持', definition: '持续不懈', proficiency: 1, favorite: false, tags: [], createdAt: '2026-01-02T00:00:00.000Z', reviewCount: 0 },
]

beforeEach(() => {
  sessions.value = []
  createSession.mockClear()
  submitAnswer.mockClear()
  getCurrentRound.mockClear()
  getProgress.mockClear()
  getGameStats.mockClear()
  removeSession.mockClear()
})

describe('WordGamesPanel · 词汇游戏接线', () => {
  it('空态：无词汇时标题渲染、提示收集词语、显示「暂无游戏记录」', async () => {
    const wrapper = mount(WordGamesPanel, { props: { words: [] } })
    await nextTick()
    expect(wrapper.text()).toContain('词汇游戏')
    expect(wrapper.text()).toContain('还没有可用的词汇')
    expect(wrapper.text()).toContain('暂无游戏记录')
  })

  it('有词汇：游戏类型 chips 渲染、开始按钮可用', async () => {
    const wrapper = mount(WordGamesPanel, { props: { words } })
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('闪卡')
    expect(text).toContain('配对')
    expect(text).toContain('填空')
    expect(text).toContain('词源')
    expect(wrapper.find('.wgp-btn--primary').attributes('disabled')).toBeUndefined()
  })

  it('开始游戏：选类型+点开始 → createSession 接线 + 当前回合问题渲染', async () => {
    const wrapper = mount(WordGamesPanel, { props: { words } })
    await nextTick()

    await wrapper.findAll('.wgp-chip')[1].trigger('click')
    await wrapper.find('.wgp-btn--primary').trigger('click')

    expect(createSession).toHaveBeenCalledWith('match', words)
    await nextTick()
    expect(wrapper.text()).toContain('"专注" 的释义是？')
  })

  it('答题：点选项 → submitAnswer 接线 + 正确反馈', async () => {
    const wrapper = mount(WordGamesPanel, { props: { words } })
    await nextTick()
    await wrapper.find('.wgp-btn--primary').trigger('click')
    await nextTick()

    // 第一题正确选项是 index 0
    await wrapper.findAll('.wgp-option')[0].trigger('click')
    expect(submitAnswer).toHaveBeenCalledWith('g-1', 0)
    await nextTick()
    expect(wrapper.text()).toContain('回答正确')
  })

  it('下一题：点「下一题」进入下一回合', async () => {
    const wrapper = mount(WordGamesPanel, { props: { words } })
    await nextTick()
    await wrapper.find('.wgp-btn--primary').trigger('click')
    await nextTick()
    await wrapper.findAll('.wgp-option')[0].trigger('click')
    await nextTick()
    await wrapper.find('.wgp-play-feedback .wgp-btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('"坚持" 的释义是？')
  })

  it('完成局：答完所有题后显示完成卡片 + 统计正确率', async () => {
    const wrapper = mount(WordGamesPanel, { props: { words } })
    await nextTick()
    await wrapper.find('.wgp-btn--primary').trigger('click')
    await nextTick()

    // 答完 2 题
    for (let i = 0; i < 2; i++) {
      await wrapper.findAll('.wgp-option')[0].trigger('click')
      await nextTick()
      const nextBtn = wrapper.find('.wgp-play-feedback .wgp-btn')
      if (nextBtn.exists()) {
        await nextBtn.trigger('click')
        await nextTick()
      }
    }

    expect(wrapper.text()).toContain('本局完成')
    expect(wrapper.text()).toContain('2/2')
    expect(wrapper.text()).toContain('完成局数')
    expect(wrapper.text()).toContain('100%')
  })

  it('删除会话：点删除 → removeSession 接线', async () => {
    const wrapper = mount(WordGamesPanel, { props: { words } })
    await nextTick()
    await wrapper.find('.wgp-btn--primary').trigger('click')
    await nextTick()
    await wrapper.findAll('.wgp-item .wgp-btn--small')[0].trigger('click')
    expect(removeSession).toHaveBeenCalledWith('g-1')
  })
})
