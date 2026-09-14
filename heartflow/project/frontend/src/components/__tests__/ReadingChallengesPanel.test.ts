import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { ReadingChallenge, ChallengeType } from '../../modules/reading/challenges'

const challenges: Ref<ReadingChallenge[]> = ref([])

const createChallenge = vi.fn(
  (name: string, type: ChallengeType, target: number, endDate: string, description: string, tags: string[] = [], reward?: string) => {
    const c: ReadingChallenge = {
      id: `challenge_${challenges.value.length + 1}`,
      name,
      description,
      type,
      target,
      progress: 0,
      startDate: '2026-09-01T00:00:00.000Z',
      endDate,
      completed: false,
      reward,
      tags,
    }
    challenges.value = [...challenges.value, c]
    return c
  },
)
const incrementProgress = vi.fn((id: string, amount = 1) => {
  const c = challenges.value.find((x) => x.id === id)
  if (!c) return false
  c.progress = Math.min(c.progress + amount, c.target)
  return true
})
const updateProgress = vi.fn((id: string, progress: number) => {
  const c = challenges.value.find((x) => x.id === id)
  if (!c) return false
  c.progress = Math.min(progress, c.target)
  return true
})
const deleteChallenge = vi.fn((id: string) => {
  challenges.value = challenges.value.filter((c) => c.id !== id)
  return true
})

vi.mock('../../modules/reading/challenges', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/reading/challenges')>()
  return {
    ...actual,
    useReadingChallenges: () => ({
      challenges,
      getChallenges: vi.fn(() => challenges.value),
      getActiveChallenges: vi.fn(() => challenges.value.filter((c) => !c.completed)),
      getCompletedChallenges: vi.fn(() => challenges.value.filter((c) => c.completed)),
      createChallenge,
      updateProgress,
      incrementProgress,
      deleteChallenge,
    }),
  }
})

import ReadingChallengesPanel from '../ReadingChallengesPanel.vue'

function makeChallenge(id: string, name: string, type: ChallengeType, target = 10, progress = 0): ReadingChallenge {
  return {
    id,
    name,
    description: `${name}的描述`,
    type,
    target,
    progress,
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-12-31',
    completed: progress >= target,
    completedAt: progress >= target ? '2026-09-03T00:00:00.000Z' : undefined,
    reward: '解锁成就',
    tags: ['年度'],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  challenges.value = []
})

describe('ReadingChallengesPanel · 阅读挑战接线', () => {
  it('空态渲染标题、副题、统计 0 与空态提示', () => {
    const wrapper = mount(ReadingChallengesPanel)
    expect(wrapper.find('.rcp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('阅读挑战')
    expect(wrapper.text()).toContain('挑战目标 · 进度追踪 · 达成奖励')
    expect(wrapper.text()).toContain('挑战统计')
    expect(wrapper.text()).toContain('新建挑战')
    expect(wrapper.text()).toContain('挑战列表')
    expect(wrapper.text()).toContain('暂无挑战，在下方创建第一个阅读挑战。')
  })

  it('挑战统计渲染总数、进行中与已达成', () => {
    challenges.value = [
      makeChallenge('c1', '年度计划', 'book_count', 24, 24),
      makeChallenge('c2', '每日阅读', 'daily_streak', 30, 5),
      makeChallenge('c3', '类型探索', 'genre_explore', 5, 0),
    ]
    const wrapper = mount(ReadingChallengesPanel)
    const cells = wrapper.findAll('.rcp-cell')
    expect(cells[0].text()).toContain('3')
    expect(cells[0].text()).toContain('总挑战')
    expect(cells[1].text()).toContain('2')
    expect(cells[1].text()).toContain('进行中')
    expect(cells[2].text()).toContain('1')
    expect(cells[2].text()).toContain('已达成')
  })

  it('新建挑战选类型、填名称目标日期后调用 createChallenge', async () => {
    const wrapper = mount(ReadingChallengesPanel)
    await wrapper.find('.rcp-input[aria-label="挑战名称"]').setValue('月读十本')
    await wrapper.find('.rcp-num').setValue(10)
    await wrapper.find('.rcp-input[aria-label="截止日期"]').setValue('2026-12-31')
    await wrapper.find('.rcp-input[aria-label="挑战描述"]').setValue('本月读完十本书')
    const typeBtns = wrapper.findAll('.rcp-type-btn')
    await typeBtns[0].trigger('click') // book_count
    await wrapper.find('.rcp-input[aria-label="奖励描述"]').setValue('解锁成就')
    await wrapper.find('.rcp-input[aria-label="标签"]').setValue('月度，习惯')
    await wrapper.find('.rcp-save').trigger('click')
    expect(createChallenge).toHaveBeenCalledWith('月读十本', 'book_count', 10, '2026-12-31', '本月读完十本书', ['月度', '习惯'], '解锁成就')
    expect(wrapper.text()).toContain('月读十本')
  })

  it('名称或目标或截止日期为空时创建按钮禁用', async () => {
    const wrapper = mount(ReadingChallengesPanel)
    const save = wrapper.find('.rcp-save')
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.find('.rcp-input[aria-label="挑战名称"]').setValue('只有名称')
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.find('.rcp-num').setValue(10)
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.find('.rcp-input[aria-label="截止日期"]').setValue('2026-12-31')
    expect(save.attributes('disabled')).toBeUndefined()
  })

  it('挑战列表渲染类型图标、名称、进度、标签与奖励', () => {
    challenges.value = [makeChallenge('c1', '年度计划', 'book_count', 24, 12)]
    const wrapper = mount(ReadingChallengesPanel)
    expect(wrapper.text()).toContain('📚')
    expect(wrapper.text()).toContain('年度计划')
    expect(wrapper.text()).toContain('12/24')
    expect(wrapper.text()).toContain('数量挑战')
    expect(wrapper.text()).toContain('年度')
    expect(wrapper.text()).toContain('解锁成就')
    expect(wrapper.text()).toContain('50%')
  })

  it('已完成挑战渲染已达成徽标与完成日期', () => {
    challenges.value = [makeChallenge('c1', '年度计划', 'book_count', 24, 24)]
    const wrapper = mount(ReadingChallengesPanel)
    expect(wrapper.text()).toContain('✓ 已达成')
    expect(wrapper.text()).toContain('完成于 2026-09-03')
    expect(wrapper.find('.rcp-inc').exists()).toBe(false)
  })

  it('递增进度调用 incrementProgress', async () => {
    challenges.value = [makeChallenge('c1', '每日阅读', 'daily_streak', 30, 5)]
    const wrapper = mount(ReadingChallengesPanel)
    await wrapper.find('.rcp-inc').trigger('click')
    expect(incrementProgress).toHaveBeenCalledWith('c1', 1)
  })

  it('点击完成调用 updateProgress 至目标', async () => {
    challenges.value = [makeChallenge('c1', '每日阅读', 'daily_streak', 30, 5)]
    const wrapper = mount(ReadingChallengesPanel)
    await wrapper.find('.rcp-finish').trigger('click')
    expect(updateProgress).toHaveBeenCalledWith('c1', 30)
  })

  it('删除挑战调用 deleteChallenge', async () => {
    challenges.value = [makeChallenge('c1', '每日阅读', 'daily_streak', 30, 5)]
    const wrapper = mount(ReadingChallengesPanel)
    await wrapper.find('.rcp-del').trigger('click')
    expect(deleteChallenge).toHaveBeenCalledWith('c1')
  })
})