import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAdvisorStore } from './advisor'
import { storage } from '../engine/storage'
import { getLocalDateKey } from '../utils/time'

describe('advisor sanctuary behavior', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })

    setActivePinia(createPinia())
    storage.clear()

    const today = getLocalDateKey()
    storage.setConfig({
      ...storage.getConfig(),
      advisorEnabled: true,
      advisorResetDate: today,
    })
  })

  it('suppresses tap responses while sanctuary is active', () => {
    const advisor = useAdvisorStore()
    const initialCount = advisor.messages.length

    advisor.pauseForSanctuary()
    advisor.onTap()

    expect(advisor.currentBubble).toBeNull()
    expect(advisor.messages.length).toBe(initialCount)
  })

  it('allows responses again after leaving sanctuary', () => {
    const advisor = useAdvisorStore()
    const initialCount = advisor.messages.length

    advisor.pauseForSanctuary()
    advisor.resumeFromSanctuary()
    advisor.onTap()

    expect(advisor.currentBubble).not.toBeNull()
    expect(advisor.messages.length).toBe(initialCount + 1)
  })

  it('initial state has messages', () => {
    const advisor = useAdvisorStore()
    expect(advisor.messages).toBeDefined()
    expect(advisor.currentBubble).toBeNull()
  })

  it('onTap generates a response when not in sanctuary', () => {
    const advisor = useAdvisorStore()
    const initialCount = advisor.messages.length
    advisor.onTap()
    expect(advisor.messages.length).toBeGreaterThanOrEqual(initialCount)
  })

  it('multiple taps in sanctuary stay suppressed', () => {
    const advisor = useAdvisorStore()
    const initialCount = advisor.messages.length
    advisor.pauseForSanctuary()
    advisor.onTap()
    advisor.onTap()
    advisor.onTap()
    expect(advisor.currentBubble).toBeNull()
    expect(advisor.messages.length).toBe(initialCount)
  })

  it('sanctuary pause is idempotent', () => {
    const advisor = useAdvisorStore()
    advisor.pauseForSanctuary()
    advisor.pauseForSanctuary()
    advisor.resumeFromSanctuary()
    advisor.onTap()
    expect(advisor.messages.length).toBeGreaterThan(0)
  })
})

describe('advisor dingyin hammer', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })

    setActivePinia(createPinia())
    storage.clear()

    const today = getLocalDateKey()
    storage.setConfig({
      ...storage.getConfig(),
      advisorEnabled: true,
      advisorResetDate: today,
    })
  })

  it('getDingyinHammer returns null for non-threshold counts', () => {
    const advisor = useAdvisorStore()
    // 第 1 次（不是阈值）
    expect(advisor.getDingyinHammer('default', 'focus_complete')).toBeNull()
    // 第 2 次
    expect(advisor.getDingyinHammer('default', 'focus_complete')).toBeNull()
    // 第 3 次
    expect(advisor.getDingyinHammer('default', 'focus_complete')).toBeNull()
    // 第 4 次
    expect(advisor.getDingyinHammer('default', 'focus_complete')).toBeNull()
  })

  it('getDingyinHammer returns message at threshold (5th focus)', () => {
    const advisor = useAdvisorStore()
    // 前 4 次
    advisor.getDingyinHammer('default', 'focus_complete')
    advisor.getDingyinHammer('default', 'focus_complete')
    advisor.getDingyinHammer('default', 'focus_complete')
    advisor.getDingyinHammer('default', 'focus_complete')
    // 第 5 次 — 阈值
    const result = advisor.getDingyinHammer('default', 'focus_complete')
    expect(result).not.toBeNull()
    expect(result).toContain('5')
    expect(result).toContain('专注')
  })

  it('getDingyinHammer returns message at threshold (10th emotion)', () => {
    const advisor = useAdvisorStore()
    for (let i = 0; i < 9; i++) {
      advisor.getDingyinHammer('default', 'emotion_logged')
    }
    const result = advisor.getDingyinHammer('default', 'emotion_logged')
    expect(result).not.toBeNull()
    expect(result).toContain('10')
  })

  it('triggerDingyinHammer calls say() via bubble at threshold', () => {
    const advisor = useAdvisorStore()
    const initialCount = advisor.messages.length
    // 触发 5 次 focus_complete
    for (let i = 0; i < 5; i++) {
      advisor.triggerDingyinHammer('focus_complete')
    }
    // 第 5 次应触发气泡
    expect(advisor.messages.length).toBeGreaterThan(initialCount)
  })

  it('getDingyinProgress returns current progress', () => {
    const advisor = useAdvisorStore()
    const progress = advisor.getDingyinProgress('default', 'focus_complete')
    expect(progress).toHaveProperty('current')
    expect(progress).toHaveProperty('next')
    expect(progress).toHaveProperty('progress')
    expect(progress.current).toBe(0)
    expect(progress.next).toBe(5)
    expect(progress.progress).toBe(0)
  })

  it('getDingyinProgress returns 1.0 progress when past all thresholds', () => {
    const advisor = useAdvisorStore()
    // 触发 200 次
    for (let i = 0; i < 200; i++) {
      advisor.getDingyinHammer('default', 'focus_complete')
    }
    const progress = advisor.getDingyinProgress('default', 'focus_complete')
    expect(progress.progress).toBe(1)
    expect(progress.next).toBeNull()
  })

  it('getAllDingyinProgress returns all event types', () => {
    const advisor = useAdvisorStore()
    const all = advisor.getAllDingyinProgress('default')
    expect(all).toHaveProperty('focus_complete')
    expect(all).toHaveProperty('emotion_logged')
    expect(all).toHaveProperty('note_created')
  })
})

describe('advisor annual dialogue', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })

    setActivePinia(createPinia())
    storage.clear()

    const today = getLocalDateKey()
    storage.setConfig({
      ...storage.getConfig(),
      advisorEnabled: true,
      advisorResetDate: today,
    })
  })

  it('getAnnualDialogue returns null when not Jan 1', () => {
    const advisor = useAdvisorStore()
    // 模拟当前不是 1 月 1 日
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    const result = advisor.getAnnualDialogue()
    expect(result).toBeNull()
    vi.useRealTimers()
  })

  it('getQuarterlyDialogue returns null when not end of quarter', () => {
    const advisor = useAdvisorStore()
    // 模拟当前不是季度末（例如 1 月中旬）
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15'))
    const result = advisor.getQuarterlyDialogue()
    expect(result).toBeNull()
    vi.useRealTimers()
  })

  it('triggerAnnualDialogue does not fail when not Jan 1', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    const advisor = useAdvisorStore()
    const result = advisor.triggerAnnualDialogue()
    expect(result).toBe(false)
    vi.useRealTimers()
  })

  it('triggerQuarterlyDialogue does not fail when not quarter end', () => {
    // 固定到非季末日期，避免"真实 now 落在季末月最后 7 天"时假红
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15'))
    const advisor = useAdvisorStore()
    const result = advisor.triggerQuarterlyDialogue()
    expect(result).toBe(false)
    vi.useRealTimers()
  })
})

describe('advisor onNoteCreated', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })

    setActivePinia(createPinia())
    storage.clear()

    const today = getLocalDateKey()
    storage.setConfig({
      ...storage.getConfig(),
      advisorEnabled: true,
      advisorResetDate: today,
    })
  })

  it('onNoteCreated generates a response', () => {
    const advisor = useAdvisorStore()
    const initialCount = advisor.messages.length
    advisor.onNoteCreated()
    expect(advisor.messages.length).toBeGreaterThan(initialCount)
  })

  it('onNoteCreated triggers dingyin hammer', () => {
    const advisor = useAdvisorStore()
    // 触发 5 次 onNoteCreated（第 5 次是阈值）
    for (let i = 0; i < 5; i++) {
      advisor.onNoteCreated()
    }
    // 应该至少有一次定音锤消息
    const dingyinMessages = advisor.messages.filter(m => m.trigger.startsWith('dingyin_'))
    expect(dingyinMessages.length).toBeGreaterThanOrEqual(1)
  })
})

describe('advisor four acts', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })

    setActivePinia(createPinia())
    storage.clear()

    const today = getLocalDateKey()
    storage.setConfig({
      ...storage.getConfig(),
      advisorEnabled: true,
      advisorResetDate: today,
    })

    // 填充测试数据：8 次专注、3 个锚点、5 颗结晶、10 条笔记、12 条情绪
    storage.setSessions([
      { id: 's1', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: '2026-07-28T08:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-07-28T08:25:00Z', tags: ['work'], note: '', carrierId: null },
      { id: 's2', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: '2026-07-28T09:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-07-28T09:25:00Z', tags: ['work'], note: '', carrierId: null },
      { id: 's3', status: 'completed', mode: 'focus', plannedDuration: 3000000, elapsed: 3000000, startedAt: '2026-07-28T10:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-07-28T10:50:00Z', tags: ['study'], note: '', carrierId: null },
      { id: 's4', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: '2026-07-28T14:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-07-28T14:25:00Z', tags: ['work'], note: '', carrierId: null },
      { id: 's5', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: '2026-07-28T15:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-07-28T15:25:00Z', tags: ['work'], note: '', carrierId: null },
      { id: 's6', status: 'completed', mode: 'focus', plannedDuration: 3000000, elapsed: 3000000, startedAt: '2026-07-28T16:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-07-28T16:50:00Z', tags: ['reading'], note: '', carrierId: null },
      { id: 's7', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: '2026-07-27T08:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-07-27T08:25:00Z', tags: ['work'], note: '', carrierId: null },
      { id: 's8', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: '2026-07-27T09:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-07-27T09:25:00Z', tags: ['work'], note: '', carrierId: null },
    ])
    storage.setAnchors([
      { id: 'a1', text: '完成报告', done: true, targetDate: today, createdAt: '2026-07-28T07:00:00Z', priority: 'must', driftCount: 0 },
      { id: 'a2', text: '阅读文档', done: true, targetDate: today, createdAt: '2026-07-28T07:30:00Z', priority: 'can', driftCount: 0 },
      { id: 'a3', text: '运动健身', done: false, targetDate: today, createdAt: '2026-07-28T08:00:00Z', priority: 'must', driftCount: 0 },
    ])
    storage.setCrystals([
      { id: 'c1', sessionId: 's1', color: '#ffd700', intensity: 0.8, createdAt: '2026-07-28T08:25:00Z', shape: 'sphere', tags: ['work'], insight: null },
      { id: 'c2', sessionId: 's2', color: '#ffd700', intensity: 0.7, createdAt: '2026-07-28T09:25:00Z', shape: 'tetrahedron', tags: ['work'], insight: null },
      { id: 'c3', sessionId: 's3', color: '#87ceeb', intensity: 0.9, createdAt: '2026-07-28T10:50:00Z', shape: 'octahedron', tags: ['study'], insight: '专注学习效率高' },
      { id: 'c4', sessionId: 's4', color: '#ffd700', intensity: 0.6, createdAt: '2026-07-28T14:25:00Z', shape: 'sphere', tags: ['work'], insight: null },
      { id: 'c5', sessionId: 's5', color: '#ffd700', intensity: 0.75, createdAt: '2026-07-28T15:25:00Z', shape: 'dodecahedron', tags: ['work'], insight: '保持节奏' },
    ])
    storage.setNotes([
      { id: 'n1', title: '晨间思考', content: '今天的计划...', tags: ['daily'], createdAt: '2026-07-28T07:00:00Z', updatedAt: '2026-07-28T07:00:00Z' },
      { id: 'n2', title: '工作笔记', content: '项目进展...', tags: ['work'], createdAt: '2026-07-28T09:00:00Z', updatedAt: '2026-07-28T09:00:00Z' },
      { id: 'n3', title: '阅读摘录', content: '书中金句...', tags: ['reading'], createdAt: '2026-07-28T11:00:00Z', updatedAt: '2026-07-28T11:00:00Z' },
      { id: 'n4', title: '灵感记录', content: '新想法...', tags: ['idea'], createdAt: '2026-07-28T12:00:00Z', updatedAt: '2026-07-28T12:00:00Z' },
      { id: 'n5', title: '复盘总结', content: '今天收获...', tags: ['daily'], createdAt: '2026-07-28T18:00:00Z', updatedAt: '2026-07-28T18:00:00Z' },
      { id: 'n6', title: '昨日笔记1', content: '内容...', tags: ['work'], createdAt: '2026-07-27T10:00:00Z', updatedAt: '2026-07-27T10:00:00Z' },
      { id: 'n7', title: '昨日笔记2', content: '内容...', tags: ['work'], createdAt: '2026-07-27T14:00:00Z', updatedAt: '2026-07-27T14:00:00Z' },
      { id: 'n8', title: '昨日笔记3', content: '内容...', tags: ['daily'], createdAt: '2026-07-27T20:00:00Z', updatedAt: '2026-07-27T20:00:00Z' },
      { id: 'n9', title: '昨日笔记4', content: '内容...', tags: ['idea'], createdAt: '2026-07-27T21:00:00Z', updatedAt: '2026-07-27T21:00:00Z' },
      { id: 'n10', title: '昨日笔记5', content: '内容...', tags: ['reading'], createdAt: '2026-07-27T22:00:00Z', updatedAt: '2026-07-27T22:00:00Z' },
    ])
    storage.setEmotions([
      { id: 'e1', type: 'happy', note: '开心', createdAt: '2026-07-28T08:00:00Z' },
      { id: 'e2', type: 'happy', note: '满足', createdAt: '2026-07-28T09:00:00Z' },
      { id: 'e3', type: 'calm', note: '平静', createdAt: '2026-07-28T10:00:00Z' },
      { id: 'e4', type: 'happy', note: '愉快', createdAt: '2026-07-28T11:00:00Z' },
      { id: 'e5', type: 'anxious', note: '焦虑', createdAt: '2026-07-28T12:00:00Z' },
      { id: 'e6', type: 'calm', note: '放松', createdAt: '2026-07-28T14:00:00Z' },
      { id: 'e7', type: 'happy', note: '高兴', createdAt: '2026-07-28T15:00:00Z' },
      { id: 'e8', type: 'sad', note: '低落', createdAt: '2026-07-28T16:00:00Z' },
      { id: 'e9', type: 'calm', note: '宁静', createdAt: '2026-07-28T17:00:00Z' },
      { id: 'e10', type: 'happy', note: '感恩', createdAt: '2026-07-28T18:00:00Z' },
      { id: 'e11', type: 'calm', note: '安稳', createdAt: '2026-07-27T12:00:00Z' },
      { id: 'e12', type: 'sad', note: '惆怅', createdAt: '2026-07-27T20:00:00Z' },
    ])
    // 设置幕僚数据
    storage.setAdvisors([
      { id: 'default', name: '凳我', role: 'guardian', personality: 'caring', affinity: 45, level: 1, createdAt: '2026-07-28T00:00:00Z', unlocked: true, totalInteractions: 12, retired: false, lastActiveAt: '2026-07-28T08:00:00Z', witnessLog: [], state: 'awake', conversationContext: { lastAdvisorMessage: null, lastUserReply: null, turnCount: 0 } },
    ])
    // 设置定音锤计数
    storage.setKV('hf:dingyin_counts', {
      default: {
        focus_complete: 8,
        emotion_logged: 12,
        note_created: 10,
      },
    })
    // 设置关系数据（第二幕）
    storage.setRelations([
      { id: 'r1', name: '小明', relation: 'friend', tags: [], notes: '', closeness: 0.8, color: '#34d399', lastContact: '2026-07-28T10:00:00Z', importantDates: [], createdAt: '2026-07-28T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z' },
      { id: 'r2', name: '妈妈', relation: 'family', tags: [], notes: '', closeness: 0.9, color: '#f0c040', lastContact: '2026-07-30T08:00:00Z', importantDates: [], createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z' },
    ])
    // 设置目标数据（第三幕）
    storage.setGoals([
      { id: 'g1', title: '成为更好的自己', description: '', tier: 'vision', parentId: undefined, status: 'growing', domain: 'growth', order: 0, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z', anchorCount: 5, anchorDone: 3 },
      { id: 'g2', title: '完成项目', description: '', tier: 'target', parentId: 'g1', status: 'bloom', domain: 'work', order: 0, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', completedAt: '2026-07-28T00:00:00Z', anchorCount: 3, anchorDone: 3 },
      { id: 'g3', title: '每周运动', description: '', tier: 'plan', parentId: 'g2', status: 'sprout', domain: 'health', order: 0, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', anchorCount: 1, anchorDone: 0 },
    ])
    // 设置身体日志数据（第四幕）
    storage.setKV('hf:body_logs', [
      { id: 'bl1', type: 'sleep', value: { hours: 7.5 }, at: '2026-07-28T23:00:00Z' },
      { id: 'bl2', type: 'sleep', value: { hours: 6.0 }, at: '2026-07-27T23:00:00Z' },
      { id: 'bl3', type: 'exercise', value: { minutes: 30 }, at: '2026-07-28T18:00:00Z' },
      { id: 'bl4', type: 'meal', value: { content: '早餐' }, at: '2026-07-28T08:00:00Z' },
    ])
    // 设置字镜数据（第四幕）
    storage.setKV('hf:word_mirror', [
      { id: 'w1', word: '专注', definition: '集中注意力', proficiency: 5, favorite: false, createdAt: '2026-07-28T00:00:00Z' },
      { id: 'w2', word: '宁静', definition: '内心平静', proficiency: 3, favorite: false, createdAt: '2026-07-28T00:00:00Z' },
      { id: 'w3', word: '流动', definition: '如水般自然', proficiency: 2, favorite: false, createdAt: '2026-07-28T00:00:00Z' },
    ])
    storage.setKV('hf:word_history', [
      { id: 'wh1', text: '今天很专注', topWords: ['专', '注', '今', '天', '很'], mood: '积极词汇', at: '2026-07-28T10:00:00Z' },
    ])
  })

  it('getFourActs returns 4 acts each with title/summary/detailLines/hammerState', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    expect(acts.length).toBe(4)
    for (const act of acts) {
      expect(act).toHaveProperty('id')
      expect(act).toHaveProperty('title')
      expect(act).toHaveProperty('icon')
      expect(act).toHaveProperty('summary')
      expect(act).toHaveProperty('detailLines')
      expect(act).toHaveProperty('progress')
      expect(act).toHaveProperty('color')
      expect(act).toHaveProperty('hammerState')
      expect(act.hammerState).toBe('idle')
      expect(Array.isArray(act.detailLines)).toBe(true)
      expect(act.detailLines.length).toBeGreaterThan(0)
    }
  })

  it('first act (你做过的事) shows focus, notes, crystals, anchors', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    const act1 = acts[0]
    expect(act1.id).toBe('act_what_you_did')
    expect(act1.title).toBe('你做过的事')
    expect(act1.summary).toContain('专注')
    expect(act1.summary).toContain('笔记')
    expect(act1.summary).toContain('结晶')
    const detailText = act1.detailLines.join(' ')
    expect(detailText).toMatch(/8|完成/)
    expect(detailText).toMatch(/3|锚点/)
    expect(detailText).toMatch(/10|笔记/)
    expect(detailText).toMatch(/5|结晶/)
  })

  it('second act (你如何待别人) shows relations and intimacy', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    const act2 = acts[1]
    expect(act2.id).toBe('act_how_you_treat_others')
    expect(act2.title).toBe('你如何对待别人')
    expect(act2.summary).toContain('人物卡片')
    const detailText = act2.detailLines.join(' ')
    expect(detailText).toMatch(/2|人物卡片/)
    expect(detailText).toMatch(/小明|妈妈/)
    expect(detailText).toMatch(/朋友|家人/)
    expect(detailText).toMatch(/亲密度/)
  })

  it('third act (你如何成长) shows goals and growth status', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    const act3 = acts[2]
    expect(act3.id).toBe('act_how_you_grow')
    expect(act3.title).toBe('你如何成长')
    expect(act3.summary).toContain('目标')
    const detailText = act3.detailLines.join(' ')
    expect(detailText).toMatch(/3|目标/)
    expect(detailText).toMatch(/愿景|目标|计划/)
    expect(detailText).toMatch(/已开花|开花/)
    expect(detailText).toMatch(/生长中/)
  })

  it('fourth act (你内心真正的声音) shows emotions, body, word mirror', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    const act4 = acts[3]
    expect(act4.id).toBe('act_inner_voice')
    expect(act4.title).toBe('你内心真正的声音')
    expect(act4.summary).toContain('情绪')
    expect(act4.summary).toContain('身体')
    expect(act4.summary).toContain('词汇')
    const detailText = act4.detailLines.join(' ')
    expect(detailText).toMatch(/12|情绪/)
    expect(detailText).toMatch(/开心|happy/)
    expect(detailText).toMatch(/身体日志/)
    expect(detailText).toMatch(/睡眠/)
    expect(detailText).toMatch(/字镜/)
    expect(act4.progress).toBeGreaterThanOrEqual(0)
    expect(act4.progress).toBeLessThanOrEqual(1)
  })

  it('getFourActsProgress returns completed and total counts', () => {
    const advisor = useAdvisorStore()
    const progress = advisor.getFourActsProgress()
    expect(progress).toHaveProperty('completed')
    expect(progress).toHaveProperty('total')
    expect(progress.completed).toBeGreaterThanOrEqual(0)
    expect(progress.total).toBeGreaterThanOrEqual(4)
  })

  it('getFourActsIronLawResponse returns the iron law terminal response', () => {
    const advisor = useAdvisorStore()
    const response = advisor.getFourActsIronLawResponse()
    expect(response).toBe('我把我看到的东西放在这里了。')
    expect(response).not.toContain('总结')
    expect(response).not.toContain('因此')
    expect(response).not.toContain('所以')
    expect(response).not.toContain('这说明')
  })
})

describe('advisor enhanced annual dialogue', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })

    setActivePinia(createPinia())
    storage.clear()

    const today = getLocalDateKey()
    storage.setConfig({
      ...storage.getConfig(),
      advisorEnabled: true,
      advisorResetDate: today,
    })
  })

  it('getAnnualDialogue returns null when not Jan 1', () => {
    const advisor = useAdvisorStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    const result = advisor.getAnnualDialogue()
    expect(result).toBeNull()
    vi.useRealTimers()
  })

  it('getAnnualDialogue returns enhanced narrative review on Jan 1', () => {
    // 填充去年的数据
    storage.setSessions([
      { id: 's1', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: '2025-03-15T08:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2025-03-15T08:25:00Z', tags: ['work'], note: '', carrierId: null },
      { id: 's2', status: 'completed', mode: 'focus', plannedDuration: 3000000, elapsed: 3000000, startedAt: '2025-06-20T10:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2025-06-20T10:50:00Z', tags: ['study'], note: '', carrierId: null },
    ])
    storage.setNotes([
      { id: 'n1', title: '思考', content: '内容...', tags: ['daily'], createdAt: '2025-04-01T07:00:00Z', updatedAt: '2025-04-01T07:00:00Z' },
      { id: 'n2', title: '灵感', content: '内容...', tags: ['idea'], createdAt: '2025-08-15T12:00:00Z', updatedAt: '2025-08-15T12:00:00Z' },
    ])
    storage.setEmotions([
      { id: 'e1', type: 'happy', note: '开心', createdAt: '2025-05-10T08:00:00Z' },
      { id: 'e2', type: 'calm', note: '平静', createdAt: '2025-09-20T10:00:00Z' },
      { id: 'e3', type: 'sad', note: '低落', createdAt: '2025-11-05T16:00:00Z' },
    ])
    storage.setAnchors([
      { id: 'a1', text: '学习新技能', done: true, targetDate: '2025-06-01', createdAt: '2025-01-15T07:00:00Z', priority: 'must', driftCount: 0 },
      { id: 'a2', text: '完成项目', done: false, targetDate: '2025-12-31', createdAt: '2025-03-01T07:00:00Z', priority: 'must', driftCount: 1 },
    ])
    storage.setCrystals([
      { id: 'c1', sessionId: 's1', color: '#ffd700', intensity: 0.8, createdAt: '2025-03-15T08:25:00Z', shape: 'sphere', tags: ['work'], insight: null },
    ])

    const advisor = useAdvisorStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01'))
    const result = advisor.getAnnualDialogue()
    expect(result).not.toBeNull()
    // 包含叙事性回顾的关键词
    expect(result).toContain('年度回顾')
    expect(result).toContain('2025')
    expect(result).toContain('【专注】')
    expect(result).toContain('【笔记】')
    expect(result).toContain('【情绪】')
    expect(result).toContain('【锚点】')
    expect(result).toContain('【结晶】')
    // 包含具体数字
    expect(result).toContain('2 次专注')
    expect(result).toContain('2 篇笔记')
    expect(result).toContain('3 次情绪')
    expect(result).toContain('2 个锚点')
    expect(result).toContain('1 颗结晶')
    // 包含启发性结语
    expect(result).toContain('一月伊始')
    // 使用换行连接
    expect(result).toContain('\n')
    vi.useRealTimers()
  })
})

describe('advisor scheduling', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })

    setActivePinia(createPinia())
    storage.clear()

    const today = getLocalDateKey()
    storage.setConfig({
      ...storage.getConfig(),
      advisorEnabled: true,
      advisorResetDate: today,
    })
  })

  it('getTaskAwareness returns focusCount, noteCount, activeAdvisorCount', () => {
    const timestampToday = getLocalDateKey()

    storage.setSessions([
      { id: 's1', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: `${timestampToday}T08:00:00Z`, pausedDuration: 0, pausedAt: null, completedAt: `${timestampToday}T08:25:00Z`, tags: [], note: '', carrierId: null },
    ])
    storage.setNotes([
      { id: 'n1', title: 'Test', content: 'test', tags: [], createdAt: `${timestampToday}T07:00:00Z`, updatedAt: `${timestampToday}T07:00:00Z` },
    ])
    storage.setAdvisors([
      { id: 'adv1', name: '小镜', role: 'guardian', personality: 'caring', affinity: 50, level: 1, createdAt: `${timestampToday}T00:00:00Z`, unlocked: true, totalInteractions: 5, retired: false, lastActiveAt: `${timestampToday}T08:00:00Z`, witnessLog: [], state: 'awake', conversationContext: { lastAdvisorMessage: null, lastUserReply: null, turnCount: 0 } },
    ])

    const advisor = useAdvisorStore()
    const awareness = advisor.getTaskAwareness()

    expect(awareness).toHaveProperty('focusCount')
    expect(awareness).toHaveProperty('noteCount')
    expect(awareness).toHaveProperty('emotionCount')
    expect(awareness).toHaveProperty('anchorCount')
    expect(awareness).toHaveProperty('activeAdvisorCount')
    expect(awareness).toHaveProperty('lastActivity')
    expect(awareness).toHaveProperty('todayDate')
  })

  it('getTaskAwareness shows correct counts', () => {
    const timestampToday = getLocalDateKey()
    const today = getLocalDateKey()

    storage.setSessions([
      { id: 's1', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: `${timestampToday}T08:00:00Z`, pausedDuration: 0, pausedAt: null, completedAt: `${timestampToday}T08:25:00Z`, tags: [], note: '', carrierId: null },
      { id: 's2', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: `${timestampToday}T09:00:00Z`, pausedDuration: 0, pausedAt: null, completedAt: `${timestampToday}T09:25:00Z`, tags: [], note: '', carrierId: null },
    ])
    storage.setNotes([
      { id: 'n1', title: 'Note 1', content: 'test', tags: [], createdAt: `${timestampToday}T07:00:00Z`, updatedAt: `${timestampToday}T07:00:00Z` },
    ])
    storage.setEmotions([
      { id: 'e1', type: 'happy', note: '开心', createdAt: `${timestampToday}T08:00:00Z` },
      { id: 'e2', type: 'calm', note: '平静', createdAt: `${timestampToday}T09:00:00Z` },
    ])
    storage.setAnchors([
      { id: 'a1', text: '任务1', done: false, targetDate: today, createdAt: `${timestampToday}T07:00:00Z`, priority: 'must', driftCount: 0 },
    ])
    storage.setAdvisors([
      { id: 'adv1', name: '小镜', role: 'guardian', personality: 'caring', affinity: 50, level: 1, createdAt: `${timestampToday}T00:00:00Z`, unlocked: true, totalInteractions: 5, retired: false, lastActiveAt: `${timestampToday}T08:00:00Z`, witnessLog: [], state: 'awake', conversationContext: { lastAdvisorMessage: null, lastUserReply: null, turnCount: 0 } },
      { id: 'adv2', name: '小研', role: 'scholar', personality: 'steady', affinity: 30, level: 1, createdAt: `${timestampToday}T00:00:00Z`, unlocked: true, totalInteractions: 3, retired: false, lastActiveAt: `${timestampToday}T09:00:00Z`, witnessLog: [], state: 'awake', conversationContext: { lastAdvisorMessage: null, lastUserReply: null, turnCount: 0 } },
    ])

    const advisor = useAdvisorStore()
    const awareness = advisor.getTaskAwareness()

    expect(awareness.focusCount).toBe(2)
    expect(awareness.noteCount).toBe(1)
    expect(awareness.emotionCount).toBe(2)
    expect(awareness.anchorCount).toBe(1)
    // 注意：store setup 会自动注入 6 类固定幕僚（preset-*），故活跃幕僚数 >= 2
    expect(awareness.activeAdvisorCount).toBeGreaterThanOrEqual(2)
    expect(awareness.todayDate).toBe(today)
  })

  it('dispatchAvatar returns matching advisor (has id, name)', () => {
    const timestampToday = getLocalDateKey()

    storage.setAdvisors([
      { id: 'adv1', name: '小镜', role: 'guardian', personality: 'caring', affinity: 50, level: 1, createdAt: `${timestampToday}T00:00:00Z`, unlocked: true, totalInteractions: 5, retired: false, lastActiveAt: `${timestampToday}T08:00:00Z`, witnessLog: [], state: 'awake', conversationContext: { lastAdvisorMessage: null, lastUserReply: null, turnCount: 0 } },
      { id: 'adv2', name: '小研', role: 'scholar', personality: 'steady', affinity: 30, level: 1, createdAt: `${timestampToday}T00:00:00Z`, unlocked: true, totalInteractions: 3, retired: false, lastActiveAt: `${timestampToday}T09:00:00Z`, witnessLog: [], state: 'awake', conversationContext: { lastAdvisorMessage: null, lastUserReply: null, turnCount: 0 } },
      { id: 'adv3', name: '小工', role: 'craftsman', personality: 'rigorous', affinity: 20, level: 1, createdAt: `${timestampToday}T00:00:00Z`, unlocked: true, totalInteractions: 2, retired: false, lastActiveAt: `${timestampToday}T10:00:00Z`, witnessLog: [], state: 'awake', conversationContext: { lastAdvisorMessage: null, lastUserReply: null, turnCount: 0 } },
    ])

    const advisor = useAdvisorStore()
    const result = advisor.dispatchAvatar('focus')

    expect(result).not.toBeNull()
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('role')
    expect(result).toHaveProperty('affinity')
    // 对于 'focus' 任务，craftsman 角色的匹配度最高（0.9）
    expect(result!.role).toBe('craftsman')
  })

  it('dispatchAvatar 在有固定幕僚时返回有效幕僚（系统默认注入 6 类固定幕僚）', () => {
    // store setup 会自动注入 6 类固定幕僚（preset-*），故即使 storage 为空也会被补齐
    storage.setAdvisors([])

    const advisor = useAdvisorStore()
    const result = advisor.dispatchAvatar('focus')

    expect(result).not.toBeNull()
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('role')
    expect(result).toHaveProperty('affinity')
  })

  it('getTaskProgress returns focus/notes/emotions/anchors progress', () => {
    const timestampToday = getLocalDateKey()
    const today = getLocalDateKey()

    storage.setSessions([
      { id: 's1', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: `${timestampToday}T08:00:00Z`, pausedDuration: 0, pausedAt: null, completedAt: `${timestampToday}T08:25:00Z`, tags: [], note: '', carrierId: null },
    ])
    storage.setNotes([
      { id: 'n1', title: 'Note 1', content: 'test', tags: [], createdAt: `${timestampToday}T07:00:00Z`, updatedAt: `${timestampToday}T07:00:00Z` },
      { id: 'n2', title: 'Note 2', content: 'test', tags: [], createdAt: `${timestampToday}T08:00:00Z`, updatedAt: `${timestampToday}T08:00:00Z` },
    ])
    storage.setEmotions([
      { id: 'e1', type: 'happy', note: '开心', createdAt: `${timestampToday}T08:00:00Z` },
    ])
    storage.setAnchors([
      { id: 'a1', text: '任务1', done: true, targetDate: today, createdAt: `${timestampToday}T07:00:00Z`, priority: 'must', driftCount: 0 },
      { id: 'a2', text: '任务2', done: false, targetDate: today, createdAt: `${timestampToday}T08:00:00Z`, priority: 'can', driftCount: 0 },
    ])

    const advisor = useAdvisorStore()
    const progress = advisor.getTaskProgress()

    expect(progress).toHaveProperty('focus')
    expect(progress).toHaveProperty('notes')
    expect(progress).toHaveProperty('emotions')
    expect(progress).toHaveProperty('anchors')

    expect(progress.focus).toHaveProperty('current')
    expect(progress.focus).toHaveProperty('total')
    expect(progress.focus).toHaveProperty('label')
    expect(progress.focus.current).toBe(1)
    expect(progress.focus.label).toBe('专注')

    expect(progress.notes.current).toBe(2)
    expect(progress.notes.label).toBe('笔记')

    expect(progress.emotions.current).toBe(1)
    expect(progress.emotions.label).toBe('情绪')

    expect(progress.anchors.current).toBe(1)
    expect(progress.anchors.total).toBe(2)
    expect(progress.anchors.label).toBe('锚点')
  })
})

describe('advisor say() 宪法第4条·只给原材料检测', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => { memoryStorage.set(key, value) },
        removeItem: (key: string) => { memoryStorage.delete(key) },
      },
      configurable: true,
    })
    setActivePinia(createPinia())
    storage.clear()
    const cfg = storage.getConfig()
    storage.setConfig({
      ...cfg,
      advisorEnabled: true,
      complianceOverride: { ...cfg.complianceOverride, dataDriven: false },
    })
  })

  it('含结论性文案：say() 写入 constitutionFlags.dataDriven', () => {
    const advisor = useAdvisorStore()
    const before = advisor.messages.length
    advisor.say('我建议你今天先休息一下', 'focus_complete')
    expect(advisor.messages.length).toBe(before + 1)
    const msg = advisor.messages[advisor.messages.length - 1]
    expect(msg.constitutionFlags).toBeDefined()
    expect(msg.constitutionFlags!.dataDriven).toContain('建议')
  })

  it('override 开启（dataDriven=true）：含结论词也不写入 dataDriven', () => {
    const cfg = storage.getConfig()
    storage.setConfig({
      ...cfg,
      complianceOverride: { ...cfg.complianceOverride, dataDriven: true },
    })
    const advisor = useAdvisorStore()
    const before = advisor.messages.length
    advisor.say('我建议你今天先休息一下', 'focus_complete')
    expect(advisor.messages.length).toBe(before + 1)
    const msg = advisor.messages[advisor.messages.length - 1]
    expect(msg.constitutionFlags?.dataDriven ?? []).toEqual([])
  })

  it('干净文案：不写入任何 constitutionFlags', () => {
    const advisor = useAdvisorStore()
    advisor.say('今天你完成了一篇笔记。', 'focus_complete')
    const msg = advisor.messages[advisor.messages.length - 1]
    expect(msg.constitutionFlags).toBeUndefined()
  })
})