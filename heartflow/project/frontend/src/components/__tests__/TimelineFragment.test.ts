// ============================================================
// TimelineFragment 时间片段组件测试
// ============================================================
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelineFragment from '../TimelineFragment.vue'
import type { TimeCrystal, FocusSession, Note } from '../../types'
import type { EmotionRecord } from '../../modules/emotion/types'
import type { Anchor } from '../../modules/anchor/types'
import type { DailyRingLog } from '../../modules/body/rings'
import type { Habit } from '../../modules/discipline'
import type { MovementRecord } from '../../modules/movement'
import type { BreakRecord } from '../../modules/rest'
import type { DialogueSession } from '../../modules/mirror'

// 模拟 emotion types 模块中的常量
vi.mock('../../modules/emotion/types', () => ({
  EMOTION_FLOWERS: {
    happy: { label: '轻快', color: '#f0c040', petalColor: '#f5d060', coreColor: '#e8a820', petals: 6, petalShape: 'rounded' },
    calm: { label: '平静', color: '#80b8d0', petalColor: '#a0d0e0', coreColor: '#6090b0', petals: 5, petalShape: 'pointed' },
    sad: { label: '低落', color: '#9080b8', petalColor: '#b0a0d0', coreColor: '#7060a0', petals: 5, petalShape: 'wavy' },
    anxious: { label: '紧绷', color: '#c05050', petalColor: '#d07070', coreColor: '#a03030', petals: 7, petalShape: 'pointed' },
    angry: { label: '烦躁', color: '#e87030', petalColor: '#f09050', coreColor: '#c05020', petals: 8, petalShape: 'pointed' },
  },
  EmotionType: {},
}))

vi.mock('../../modules/discipline', () => ({
  HABIT_DIFFICULTY_META: {
    easy: { label: '简单', color: '#2ecc71', basePoints: 1 },
    medium: { label: '中等', color: '#3498db', basePoints: 3 },
    hard: { label: '困难', color: '#f39c12', basePoints: 5 },
    extreme: { label: '极限', color: '#e74c3c', basePoints: 10 },
  },
}))

const mockCrystal: TimeCrystal = {
  id: 'c1',
  sessionId: 's1',
  color: '#7c5cfc',
  intensity: 0.85,
  createdAt: '2025-06-15T10:30:00Z',
  shape: 'octahedron',
  tags: ['专注', '深度'],
  insight: '保持专注',
}

const mockSession: FocusSession = {
  id: 's1',
  status: 'completed',
  mode: 'focus',
  plannedDuration: 3600000,
  elapsed: 3600000,
  startedAt: '2025-06-15T10:30:00Z',
  pausedDuration: 0,
  pausedAt: null,
  completedAt: '2025-06-15T11:30:00Z',
  tags: ['专注', '深度'],
  note: '进入了深度专注状态',
  carrierId: null,
}

const mockNote: Note = {
  id: 'n1',
  title: '测试笔记',
  content: '这是一条测试笔记内容，用于验证组件渲染',
  tags: ['随笔', '测试'],
  createdAt: '2025-06-15T10:30:00Z',
  updatedAt: '2025-06-15T11:00:00Z',
}

const mockEmotion: EmotionRecord = {
  id: 'e1',
  type: 'happy',
  note: '心情很好',
  createdAt: '2025-06-15T10:30:00Z',
}

const mockAnchor: Anchor = {
  id: 'a1',
  text: '测试锚点',
  done: false,
  targetDate: '2025-06-15',
  createdAt: '2025-06-15T10:30:00Z',
  priority: 'must',
  driftCount: 0,
  tags: ['重要'],
  category: '工作',
}

const mockBody: DailyRingLog = {
  date: '2025-06-15',
  activityMinutes: 30,
  restMinutes: 60,
  feeling: 2,
}

const mockHabit: Habit = {
  id: 'h1',
  title: '晨间拉伸',
  description: '',
  icon: '🤸',
  difficulty: 'easy',
  frequency: 'daily',
  target: 1,
  streak: 12,
  bestStreak: 20,
  totalCompleted: 45,
  enabled: true,
  createdAt: '2025-01-01T00:00:00Z',
  completedDates: ['2025-06-15'],
}

const mockMovement: MovementRecord = {
  id: 'mv1',
  type: 'running',
  duration: 30,
  intensity: 'moderate',
  calories: 300,
  distance: 5,
  date: '2025-06-15',
  timestamp: '2025-06-15T08:00:00Z',
}

const mockRest: BreakRecord = {
  id: 'br1',
  activity: '冥想',
  duration: 15,
  mood: 4,
  date: '2025-06-15',
}

const mockDialogue: DialogueSession = {
  id: 'dlg1',
  title: '今晚复盘',
  entries: [],
  createdAt: '2025-06-15T09:00:00Z',
  lastActiveAt: '2025-06-15T09:30:00Z',
  tags: [],
  primaryIntents: [],
  archived: false,
  summary: '',
}

describe('TimelineFragment', () => {
  // ---- crystal 类型 ----
  it('渲染 crystal 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'crystal',
        crystal: mockCrystal,
        session: mockSession,
      },
    })
    expect(wrapper.find('.fragment').exists()).toBe(true)
    expect(wrapper.find('.frag-crystal').exists()).toBe(true)
    expect(wrapper.text()).toContain('专注结晶')
  })

  it('crystal 类型显示正确的强度标签', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'crystal',
        crystal: { ...mockCrystal, intensity: 0.92 },
        session: mockSession,
      },
    })
    expect(wrapper.text()).toContain('完美之晶')
  })

  it('crystal 类型显示正确的时长', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'crystal',
        crystal: mockCrystal,
        session: mockSession,
      },
    })
    expect(wrapper.text()).toContain('60分钟')
  })

  it('crystal 类型渲染 SVG 多边形', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'crystal',
        crystal: mockCrystal,
        session: mockSession,
      },
    })
    expect(wrapper.find('svg polygon').exists()).toBe(true)
  })

  // ---- session 类型 ----
  it('渲染 session 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'session',
        session: mockSession,
      },
    })
    expect(wrapper.find('.frag-session').exists()).toBe(true)
    expect(wrapper.text()).toContain('专注')
  })

  it('session 类型显示标签列表', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'session',
        session: mockSession,
      },
    })
    const tags = wrapper.findAll('.frag-tag')
    expect(tags.length).toBeGreaterThanOrEqual(1)
    expect(tags[0].text()).toBe('专注')
  })

  it('session 类型显示备注', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'session',
        session: mockSession,
      },
    })
    expect(wrapper.text()).toContain('进入了深度专注状态')
  })

  // ---- note 类型 ----
  it('渲染 note 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'note',
        note: mockNote,
      },
    })
    expect(wrapper.find('.frag-note').exists()).toBe(true)
    expect(wrapper.text()).toContain('测试笔记')
  })

  it('note 类型显示内容摘要', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'note',
        note: mockNote,
      },
    })
    expect(wrapper.text()).toContain('这是一条测试笔记内容')
  })

  // ---- emotion 类型 ----
  it('渲染 emotion 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'emotion',
        emotion: mockEmotion,
      },
    })
    expect(wrapper.find('.frag-emotion').exists()).toBe(true)
    expect(wrapper.text()).toContain('轻快')
  })

  it('emotion 类型显示情绪图标', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'emotion',
        emotion: { ...mockEmotion, type: 'sad' },
      },
    })
    expect(wrapper.text()).toContain('低落')
  })

  // ---- anchor 类型 ----
  it('渲染 anchor 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'anchor',
        anchor: mockAnchor,
      },
    })
    expect(wrapper.find('.frag-anchor').exists()).toBe(true)
    expect(wrapper.text()).toContain('测试锚点')
  })

  it('anchor 类型中未完成显示"停留中"', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'anchor',
        anchor: mockAnchor,
      },
    })
    expect(wrapper.text()).toContain('停留中')
  })

  it('anchor 类型已完成显示"已锚定"', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'anchor',
        anchor: { ...mockAnchor, done: true },
      },
    })
    expect(wrapper.text()).toContain('已锚定')
  })

  // ---- body 类型 ----
  it('渲染 body 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'body',
        body: mockBody,
      },
    })
    expect(wrapper.find('.frag-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('身体三环')
    expect(wrapper.text()).toContain('活动 30 分')
    expect(wrapper.text()).toContain('感受 舒展')
  })

  // ---- habit 类型 ----
  it('渲染 habit 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'habit',
        habit: mockHabit,
      },
    })
    expect(wrapper.find('.frag-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('晨间拉伸')
    expect(wrapper.text()).toContain('完成打卡')
    expect(wrapper.text()).toContain('连续 12 天')
    expect(wrapper.text()).toContain('累计 45 次')
    expect(wrapper.text()).toContain('简单')
  })

  // ---- movement 类型 ----
  it('渲染 movement 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'movement',
        movement: mockMovement,
      },
    })
    expect(wrapper.find('.frag-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('跑步')
    expect(wrapper.text()).toContain('30 分钟')
    expect(wrapper.text()).toContain('中度')
    expect(wrapper.text()).toContain('消耗 300 千卡')
  })

  // ---- rest 类型 ----
  it('渲染 rest 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'rest',
        rest: mockRest,
      },
    })
    expect(wrapper.find('.frag-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('冥想')
    expect(wrapper.text()).toContain('15 分钟')
    expect(wrapper.text()).toContain('愉悦')
  })

  // ---- dialogue 类型 ----
  it('渲染 dialogue 类型的时间片段', () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'dialogue',
        dialogue: mockDialogue,
      },
    })
    expect(wrapper.find('.frag-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('今晚复盘')
    expect(wrapper.text()).toContain('轮对话')
  })

  // ---- 事件 ----
  it('点击 fragment 触发 click 事件', async () => {
    const wrapper = mount(TimelineFragment, {
      props: {
        type: 'crystal',
        crystal: mockCrystal,
        session: mockSession,
      },
    })
    await wrapper.find('.fragment').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})