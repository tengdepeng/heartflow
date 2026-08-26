// ============================================================
// 幕僚体系 · 测试套件
// 覆盖：常量、类型、庆祝退休、作息生活、幕僚互动、见证
// 约 50 个测试
// ============================================================

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'

// ============================================================
// vi.hoisted — 共享 kvStore 状态（使用 getter 延迟访问，避免闭包失效）
// ============================================================
const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

// ============================================================
// Mock engine/storage — 使用工厂函数返回普通函数（非 vi.fn()），
// 这是项目中已验证的 mock 模式（参考 cognition 模块）
// ============================================================
function makeStorageMock() {
  return {
    storage: {
      getKV: <T,>(key: string, def: T): T => {
        const store = getKvStore()
        return store[key] !== undefined ? (store[key] as T) : def
      },
      setKV: (key: string, val: any) => {
        const store = getKvStore()
        store[key] = val
      },
    },
  }
}

vi.mock('../../engine/storage', () => makeStorageMock())
vi.mock('@/engine/storage', () => makeStorageMock())

// ============================================================
// 固定系统时间，保证日期相关测试确定性
// ============================================================
const FIXED_DATE = new Date('2025-06-15T10:00:00.000Z')
const FIXED_DATE_STR = '2025-06-15'
const FIXED_ISO = FIXED_DATE.toISOString()

beforeAll(() => {
  vi.setSystemTime(FIXED_DATE)
})

// ============================================================
// 辅助函数
// ============================================================
function makeCelebrationPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cel_existing',
    type: 'milestone' as const,
    advisorId: 'adv_1',
    title: 'Pre-existing',
    description: 'Already there',
    date: FIXED_DATE_STR,
    celebrated: false,
    ...overrides,
  }
}

// ============================================================
// 1. 常量验证（7 个测试）
// ============================================================
describe('Constants', () => {
  beforeEach(() => { vi.resetModules() })

  it('INTERACTION_TYPE_META — 5 种互动类型，每项含 label/icon/description', async () => {
    const { INTERACTION_TYPE_META } = await import('../types')
    const keys = Object.keys(INTERACTION_TYPE_META)
    expect(keys).toHaveLength(5)
    expect(keys).toEqual(expect.arrayContaining([
      'collaboration', 'coexistence', 'mutual-learning', 'conflict', 'dialogue',
    ]))
    for (const k of keys) {
      const entry = INTERACTION_TYPE_META[k as keyof typeof INTERACTION_TYPE_META]
      expect(entry).toHaveProperty('label')
      expect(entry).toHaveProperty('icon')
      expect(entry).toHaveProperty('description')
    }
  })

  it('TIME_SLOT_META — 8 个时段，每项含 label/hourRange/vibe', async () => {
    const { TIME_SLOT_META } = await import('../types')
    const keys = Object.keys(TIME_SLOT_META)
    expect(keys).toHaveLength(8)
    expect(keys).toEqual(expect.arrayContaining([
      'dawn', 'morning', 'noon', 'afternoon', 'dusk', 'evening', 'night', 'midnight',
    ]))
    for (const k of keys) {
      const meta = TIME_SLOT_META[k as keyof typeof TIME_SLOT_META]
      expect(meta).toHaveProperty('label')
      expect(meta).toHaveProperty('hourRange')
      expect(meta.hourRange).toHaveLength(2)
      expect(meta).toHaveProperty('vibe')
    }
  })

  it('ACTIVITY_META — 10 种活动类型，每项含 label/icon/defaultDuration', async () => {
    const { ACTIVITY_META } = await import('../types')
    const keys = Object.keys(ACTIVITY_META)
    expect(keys).toHaveLength(10)
    expect(keys).toEqual(expect.arrayContaining([
      'reading', 'writing', 'meditating', 'cooking', 'gardening',
      'crafting', 'resting', 'wandering', 'observing', 'dreaming',
    ]))
    for (const k of keys) {
      const meta = ACTIVITY_META[k as keyof typeof ACTIVITY_META]
      expect(meta).toHaveProperty('label')
      expect(meta).toHaveProperty('icon')
      expect(meta).toHaveProperty('defaultDuration')
      expect(typeof meta.defaultDuration).toBe('number')
    }
  })

  it('CELEBRATION_TYPE_META — 6 种庆祝类型，每项含 label/icon/defaultRitual', async () => {
    const { CELEBRATION_TYPE_META } = await import('../types')
    const keys = Object.keys(CELEBRATION_TYPE_META)
    expect(keys).toHaveLength(6)
    expect(keys).toEqual(expect.arrayContaining([
      'milestone', 'birthday', 'achievement', 'anniversary', 'seasonal', 'farewell',
    ]))
    for (const k of keys) {
      const meta = CELEBRATION_TYPE_META[k as keyof typeof CELEBRATION_TYPE_META]
      expect(meta).toHaveProperty('label')
      expect(meta).toHaveProperty('icon')
      expect(meta).toHaveProperty('defaultRitual')
    }
  })

  it('RETIREMENT_PHASE_META — 4 个阶段，每项含 label/description/duration', async () => {
    const { RETIREMENT_PHASE_META } = await import('../types')
    const keys = Object.keys(RETIREMENT_PHASE_META)
    expect(keys).toHaveLength(4)
    expect(keys).toEqual(expect.arrayContaining([
      'contemplation', 'farewell', 'archiving', 'legacy',
    ]))
    for (const k of keys) {
      const meta = RETIREMENT_PHASE_META[k as keyof typeof RETIREMENT_PHASE_META]
      expect(meta).toHaveProperty('label')
      expect(meta).toHaveProperty('description')
      expect(meta).toHaveProperty('duration')
      expect(typeof meta.duration).toBe('number')
    }
  })

  it('WITNESS_EVENT_META — 8 种见证事件，每项含 label/icon/weight', async () => {
    const { WITNESS_EVENT_META } = await import('../types')
    const keys = Object.keys(WITNESS_EVENT_META)
    expect(keys).toHaveLength(8)
    expect(keys).toEqual(expect.arrayContaining([
      'first-focus', 'streak-record', 'emotion-breakthrough', 'knowledge-milestone',
      'relationship-milestone', 'health-milestone', 'career-milestone', 'personal-growth',
    ]))
    for (const k of keys) {
      const meta = WITNESS_EVENT_META[k as keyof typeof WITNESS_EVENT_META]
      expect(meta).toHaveProperty('label')
      expect(meta).toHaveProperty('icon')
      expect(meta).toHaveProperty('weight')
      expect(typeof meta.weight).toBe('number')
    }
  })

  it('ADVISOR_STORAGE_KEYS — 6 个存储键', async () => {
    const { ADVISOR_STORAGE_KEYS } = await import('../types')
    expect(ADVISOR_STORAGE_KEYS).toEqual({
      relations: 'hf:advisor:relations',
      activities: 'hf:advisor:activities',
      schedules: 'hf:advisor:schedules',
      celebrations: 'hf:advisor:celebrations',
      retirements: 'hf:advisor:retirements',
      witnesses: 'hf:advisor:witnesses',
    })
  })
})

// ============================================================
// 2. 类型验证（4 个测试）
// ============================================================
describe('Type validation', () => {
  beforeEach(() => { vi.resetModules() })

  it('InteractionType — 5 种字面量', async () => {
    const { INTERACTION_TYPE_META } = await import('../types')
    const valid = ['collaboration', 'coexistence', 'mutual-learning', 'conflict', 'dialogue']
    valid.forEach(t => expect(INTERACTION_TYPE_META[t as keyof typeof INTERACTION_TYPE_META]).toBeDefined())
  })

  it('ActivityType — 10 种字面量', async () => {
    const { ACTIVITY_META } = await import('../types')
    const valid = ['reading', 'writing', 'meditating', 'cooking', 'gardening', 'crafting', 'resting', 'wandering', 'observing', 'dreaming']
    valid.forEach(t => expect(ACTIVITY_META[t as keyof typeof ACTIVITY_META]).toBeDefined())
  })

  it('CelebrationType — 6 种字面量', async () => {
    const { CELEBRATION_TYPE_META } = await import('../types')
    const valid = ['milestone', 'birthday', 'achievement', 'anniversary', 'seasonal', 'farewell']
    valid.forEach(t => expect(CELEBRATION_TYPE_META[t as keyof typeof CELEBRATION_TYPE_META]).toBeDefined())
  })

  it('WitnessEventType — 8 种字面量', async () => {
    const { WITNESS_EVENT_META } = await import('../types')
    const valid = ['first-focus', 'streak-record', 'emotion-breakthrough', 'knowledge-milestone', 'relationship-milestone', 'health-milestone', 'career-milestone', 'personal-growth']
    valid.forEach(t => expect(WITNESS_EVENT_META[t as keyof typeof WITNESS_EVENT_META]).toBeDefined())
  })
})

// ============================================================
// 3. useAdvisorCelebration（10 个测试）
// ============================================================
describe('useAdvisorCelebration', () => {
  beforeEach(() => {
    resetKvStore()
    vi.resetModules()
  })

  it('createCelebration — 创建庆祝事件（含自定义日期），持久化并自动生成 ritual', async () => {
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()

    const event = api.createCelebration('adv_1', 'milestone', '百天里程碑', '幕僚陪伴你100天')
    expect(event.id).toMatch(/^cel_/)
    expect(event.type).toBe('milestone')
    expect(event.advisorId).toBe('adv_1')
    expect(event.date).toBe(FIXED_DATE_STR)
    expect(event.celebrated).toBe(false)
    expect(event.ritual!.name).toBe('授勋仪式')
    expect(event.ritual!.steps).toHaveLength(5)
    expect(event.ritual!.participants).toEqual(['adv_1'])

    // 自定义日期
    const custom = api.createCelebration('adv_2', 'birthday', '诞辰', '庆祝', '2025-08-01')
    expect(custom.date).toBe('2025-08-01')

    // 持久化
    const stored = JSON.parse(getKvStore()['hf:advisor:celebrations']!)
    expect(stored).toHaveLength(2)
  })

  it('completeCelebration — 完成庆祝（含不存在 ID 返回 false）', async () => {
    getKvStore()['hf:advisor:celebrations'] = JSON.stringify([
      makeCelebrationPayload({ id: 'cel_1', celebrated: false, ritual: { name: '授勋仪式', steps: [], participants: [] } }),
    ])
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()

    expect(api.completeCelebration('cel_1', '一幅画卷')).toBe(true)
    const stored = JSON.parse(getKvStore()['hf:advisor:celebrations']!)
    expect(stored[0].celebrated).toBe(true)
    expect(stored[0].ritual!.artifact).toBe('一幅画卷')

    expect(api.completeCelebration('nonexistent')).toBe(false)
  })

  it('getAdvisorCelebrations — 获取幕僚庆祝历史（含空结果）', async () => {
    getKvStore()['hf:advisor:celebrations'] = JSON.stringify([
      makeCelebrationPayload({ id: 'cel_1', advisorId: 'adv_a' }),
      makeCelebrationPayload({ id: 'cel_2', advisorId: 'adv_b' }),
      makeCelebrationPayload({ id: 'cel_3', advisorId: 'adv_a', type: 'birthday' }),
    ])
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()

    expect(api.getAdvisorCelebrations('adv_a')).toHaveLength(2)
    expect(api.getAdvisorCelebrations('adv_b')).toHaveLength(1)
    expect(api.getAdvisorCelebrations('adv_x')).toEqual([])
  })

  it('getTodayCelebrations — 返回今日未庆祝事件', async () => {
    getKvStore()['hf:advisor:celebrations'] = JSON.stringify([
      makeCelebrationPayload({ id: 'cel_1', date: FIXED_DATE_STR, celebrated: false }),
      makeCelebrationPayload({ id: 'cel_2', date: FIXED_DATE_STR, celebrated: true }),
      makeCelebrationPayload({ id: 'cel_3', date: '2025-06-01', celebrated: false }),
    ])
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()
    const today = api.getTodayCelebrations()
    expect(today).toHaveLength(1)
    expect(today[0].id).toBe('cel_1')
  })

  it('getUpcomingCelebrations — 返回未来 7 天内未庆祝事件', async () => {
    getKvStore()['hf:advisor:celebrations'] = JSON.stringify([
      makeCelebrationPayload({ id: 'cel_1', date: '2025-06-17', celebrated: false }),
      makeCelebrationPayload({ id: 'cel_2', date: '2025-06-22', celebrated: false }),
      makeCelebrationPayload({ id: 'cel_3', date: '2025-06-23', celebrated: false }),
      makeCelebrationPayload({ id: 'cel_4', date: '2025-06-01', celebrated: false }),
    ])
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()
    const upcoming = api.getUpcomingCelebrations()
    expect(upcoming).toHaveLength(2)
    expect(upcoming.map(e => e.id)).toEqual(expect.arrayContaining(['cel_1', 'cel_2']))
  })

  it('startRetirement — 开始退休仪式', async () => {
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()
    const ceremony = api.startRetirement('adv_1', '幕僚完成使命', ['adv_2', 'adv_3'])
    expect(ceremony.id).toMatch(/^ret_/)
    expect(ceremony.phase).toBe('contemplation')
    expect(ceremony.witnesses).toEqual(['adv_2', 'adv_3'])
    expect(ceremony.legacies).toEqual([])
    expect(ceremony.startedAt).toBe(FIXED_ISO)
    const stored = JSON.parse(getKvStore()['hf:advisor:retirements']!)
    expect(stored).toHaveLength(1)
  })

  it('advanceRetirementPhase — 推进阶段（含不存在 ID 和已到终点的边界）', async () => {
    getKvStore()['hf:advisor:retirements'] = JSON.stringify([{
      id: 'ret_1', advisorId: 'adv_1', reason: 'test', phase: 'contemplation',
      startedAt: FIXED_ISO, legacies: [], witnesses: [],
    }])
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()

    expect(api.advanceRetirementPhase('ret_1')).toBe('farewell')
    expect(api.advanceRetirementPhase('ret_1')).toBe('archiving')
    expect(api.advanceRetirementPhase('ret_1')).toBe('legacy')
    // 到 legacy 后设置 completedAt
    const stored = JSON.parse(getKvStore()['hf:advisor:retirements']!)
    expect(stored[0].completedAt).toBe(FIXED_ISO)
    // 再推进不变
    expect(api.advanceRetirementPhase('ret_1')).toBe('legacy')
    // 不存在的 ID
    expect(api.advanceRetirementPhase('nonexistent')).toBeUndefined()
  })

  it('addLegacy — 添加遗留物（含不存在仪式 ID 返回 undefined）', async () => {
    getKvStore()['hf:advisor:retirements'] = JSON.stringify([{
      id: 'ret_1', advisorId: 'adv_1', reason: 'test', phase: 'legacy',
      startedAt: FIXED_ISO, legacies: [], witnesses: [],
    }])
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()

    const legacy = api.addLegacy('ret_1', 'wisdom', '智慧箴言', '知行合一', true)
    expect(legacy!.id).toMatch(/^leg_/)
    expect(legacy!.type).toBe('wisdom')
    expect(legacy!.inheritable).toBe(true)

    const stored = JSON.parse(getKvStore()['hf:advisor:retirements']!)
    expect(stored[0].legacies).toHaveLength(1)

    expect(api.addLegacy('nonexistent', 'memory', 't', 'c')).toBeUndefined()
  })

  it('writeFarewellLetter — 写入告别信（含不存在 ID 返回 false）', async () => {
    getKvStore()['hf:advisor:retirements'] = JSON.stringify([{
      id: 'ret_1', advisorId: 'adv_1', reason: 'test', phase: 'farewell',
      startedAt: FIXED_ISO, legacies: [], witnesses: [],
    }])
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()

    expect(api.writeFarewellLetter('ret_1', '感谢陪伴，再会。')).toBe(true)
    const stored = JSON.parse(getKvStore()['hf:advisor:retirements']!)
    expect(stored[0].farewellLetter).toBe('感谢陪伴，再会。')

    expect(api.writeFarewellLetter('nonexistent', 'letter')).toBe(false)
  })

  it('getActiveRetirement & getAllLegacies & getRetirementStats — 综合查询', async () => {
    getKvStore()['hf:advisor:retirements'] = JSON.stringify([
      { id: 'ret_1', advisorId: 'adv_1', reason: 'active', phase: 'contemplation', startedAt: FIXED_ISO, legacies: [], witnesses: [] },
      { id: 'ret_2', advisorId: 'adv_2', reason: 'done', phase: 'legacy', startedAt: FIXED_ISO, completedAt: FIXED_ISO, legacies: [{ id: 'leg_1', type: 'wisdom', title: '智慧', content: '...', inheritable: true }, { id: 'leg_2', type: 'blessing', title: '祝福', content: '...', inheritable: true }], witnesses: [] },
      { id: 'ret_3', advisorId: 'adv_3', reason: 'done2', phase: 'legacy', startedAt: FIXED_ISO, completedAt: FIXED_ISO, legacies: [], witnesses: [] },
    ])
    const { useAdvisorCelebration } = await import('../celebration')
    const api = useAdvisorCelebration()

    // getActiveRetirement
    expect(api.getActiveRetirement('adv_1')!.id).toBe('ret_1')
    expect(api.getActiveRetirement('adv_2')).toBeUndefined()
    expect(api.getActiveRetirement('adv_3')).toBeUndefined()

    // getAllLegacies
    expect(api.getAllLegacies()).toHaveLength(2)

    // getRetirementStats
    const stats = api.getRetirementStats()
    expect(stats).toEqual({ total: 3, completed: 2, active: 1, totalLegacies: 2 })
  })
})

// ============================================================
// 4. useAdvisorDailyLife（10 个测试）
// ============================================================
describe('useAdvisorDailyLife', () => {
  beforeEach(() => {
    resetKvStore()
    vi.resetModules()
  })

  it('currentTimeSlot & currentActivities — 初始状态', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()
    expect(api.currentTimeSlot.value).toBe('dusk') // 10:00 UTC -> 18:00 本地 (Asia/Shanghai)
    expect(api.currentActivities.value).toEqual([])
  })

  it('initSchedule — 初始化作息（scholar / 未知个性默认 hermit / 重复覆盖）', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()

    // scholar
    const s1 = api.initSchedule('adv_1', 'scholar')
    expect(s1.isActive).toBe(true)
    expect(s1.slots.dawn).toEqual(['reading'])
    expect(s1.slots.morning).toEqual(['writing', 'reading'])

    // 未知个性 -> hermit
    const s2 = api.initSchedule('adv_x', 'unknown')
    expect(s2.slots.dawn).toEqual(['meditating'])

    // 重复初始化覆盖
    const s3 = api.initSchedule('adv_1', 'guardian')
    expect(s3.slots.dawn).toEqual(['meditating']) // guardian 覆盖了 scholar

    // 持久化
    const stored = JSON.parse(getKvStore()['hf:advisor:schedules']!)
    expect(Object.keys(stored)).toHaveLength(2)
  })

  it('getCurrentActivities — 返回当前时段活动（含无作息默认 resting）', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()

    api.initSchedule('adv_1', 'scholar')
    expect(api.getCurrentActivities('adv_1')).toEqual(['meditating']) // scholar dusk slot
    expect(api.getCurrentActivities('nonexistent')).toEqual(['resting'])
  })

  it('startActivity — 开始活动（含 dreaming 不可中断、替换旧活动）', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()

    const act = api.startActivity('adv_1', 'reading', 'study-room', '阅读古籍')
    expect(act.id).toMatch(/^act_/)
    expect(act.type).toBe('reading')
    expect(act.duration).toBe(45)
    expect(act.interruptible).toBe(true)
    expect(api.currentActivities.value).toHaveLength(1)
    // 场景中幕僚
    expect(api.getAllScenes().find(s => s.id === 'study-room')!.presentAdvisors).toContain('adv_1')

    // dreaming 不可中断
    const dream = api.startActivity('adv_2', 'dreaming', 'bedroom')
    expect(dream.interruptible).toBe(false)
    expect(dream.duration).toBe(90)

    // 替换旧活动
    api.startActivity('adv_1', 'writing', 'study-room')
    expect(api.currentActivities.value).toHaveLength(2)
    expect(api.currentActivities.value.find(a => a.advisorId === 'adv_1')!.type).toBe('writing')
  })

  it('endActivity — 结束活动（含无活动时返回 undefined）', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()

    api.startActivity('adv_1', 'reading', 'study-room')
    const ended = api.endActivity('adv_1')
    expect(ended).toBeDefined()
    expect(ended!.type).toBe('reading')
    expect(api.currentActivities.value).toHaveLength(0)
    expect(api.getAllScenes().find(s => s.id === 'study-room')!.presentAdvisors).not.toContain('adv_1')

    expect(api.endActivity('adv_1')).toBeUndefined()
  })

  it('getSceneActivities — 获取场景中所有活动', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()

    api.startActivity('adv_1', 'reading', 'study-room')
    api.startActivity('adv_2', 'writing', 'study-room')
    api.startActivity('adv_3', 'cooking', 'kitchen')

    expect(api.getSceneActivities('study-room')).toHaveLength(2)
    expect(api.getSceneActivities('kitchen')).toHaveLength(1)
    expect(api.getSceneActivities('garden')).toHaveLength(0)
  })

  it('toggleActive — 切换活跃状态（含不存在幕僚返回 false）', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()

    api.initSchedule('adv_1', 'scholar')
    expect(api.toggleActive('adv_1')).toBe(false) // true -> false
    expect(api.toggleActive('adv_1')).toBe(true)  // false -> true
    expect(api.toggleActive('nonexistent')).toBe(false)
  })

  it('getAllScenes — 返回全部 6 个默认场景', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()
    const scenes = api.getAllScenes()
    expect(scenes).toHaveLength(6)
    const ids = scenes.map(s => s.id)
    expect(ids).toEqual(expect.arrayContaining(['study-room', 'garden', 'kitchen', 'workshop', 'living-room', 'bedroom']))
  })

  it('getSceneStats — 返回场景使用统计', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()

    api.startActivity('adv_1', 'reading', 'study-room')
    api.startActivity('adv_2', 'writing', 'study-room')

    const stats = api.getSceneStats()
    const studyRoom = stats.find(s => s.sceneId === 'study-room')!
    expect(studyRoom.occupancy).toBe(2)
    expect(studyRoom.maxCapacity).toBe(3)
    const bedroom = stats.find(s => s.sceneId === 'bedroom')!
    expect(bedroom.occupancy).toBe(0)
    expect(bedroom.maxCapacity).toBe(1)
  })
})

// ============================================================
// 5. useAdvisorInteraction（8 个测试）
// ============================================================
describe('useAdvisorInteraction', () => {
  beforeEach(() => {
    resetKvStore()
    vi.resetModules()
  })

  it('allRelations & getAdvisorRelations — 关系查询（含空状态）', async () => {
    getKvStore()['hf:advisor:relations'] = JSON.stringify([
      { id: 'rel_1', advisorAId: 'adv_a', advisorBId: 'adv_b', relationType: 'peer', closeness: 60, interactionCount: 5, lastInteractionAt: FIXED_ISO, sharedTopics: [], interactionHistory: [] },
      { id: 'rel_2', advisorAId: 'adv_a', advisorBId: 'adv_c', relationType: 'stranger', closeness: 0, interactionCount: 0, lastInteractionAt: FIXED_ISO, sharedTopics: [], interactionHistory: [] },
      { id: 'rel_3', advisorAId: 'adv_b', advisorBId: 'adv_c', relationType: 'mentor', closeness: 30, interactionCount: 3, lastInteractionAt: FIXED_ISO, sharedTopics: [], interactionHistory: [] },
    ])
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    expect(api.allRelations.value).toHaveLength(3)
    expect(api.getAdvisorRelations('adv_a')).toHaveLength(2)
    expect(api.getAdvisorRelations('adv_x')).toEqual([])
  })

  it('initRelation — 初始化关系（含重复初始化返回已有、双向查找）', async () => {
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    const r1 = api.initRelation('adv_a', 'adv_b')
    expect(r1.id).toMatch(/^rel_/)
    expect(r1.relationType).toBe('stranger')
    expect(r1.closeness).toBe(0)
    expect(r1.interactionCount).toBe(0)

    // 重复初始化
    const r2 = api.initRelation('adv_a', 'adv_b')
    expect(r2.id).toBe(r1.id)
    expect(api.allRelations.value).toHaveLength(1)

    // 双向查找
    const r3 = api.initRelation('adv_b', 'adv_a')
    expect(r3.id).toBe(r1.id)
  })

  it('recordInteraction — 记录互动，更新亲密度与关系类型', async () => {
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    const record = api.recordInteraction('adv_a', 'adv_b', 'collaboration', '哲学', '深入讨论', 'positive')
    expect(record.id).toMatch(/^int_/)
    expect(record.type).toBe('collaboration')
    expect(record.outcome).toBe('positive')
    expect(record.closenessDelta).toBe(3)

    const relations = JSON.parse(getKvStore()['hf:advisor:relations']!)
    expect(relations[0].closeness).toBe(3)
    expect(relations[0].interactionCount).toBe(1)
    expect(relations[0].sharedTopics).toContain('哲学')
  })

  it('recordInteraction — 关系类型演进（stranger -> rival -> mentor -> peer -> companion）', async () => {
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    const expectType = (expected: string) => {
      const rels = JSON.parse(getKvStore()['hf:advisor:relations']!)
      expect(rels[0].relationType).toBe(expected)
    }

    // 10 positive => closeness 30 => mentor
    for (let i = 0; i < 10; i++) api.recordInteraction('adv_a', 'adv_b', 'dialogue', '话题', '摘要', 'positive')
    expectType('mentor')

    // 10 more => closeness 60 => peer
    for (let i = 0; i < 10; i++) api.recordInteraction('adv_a', 'adv_b', 'collaboration', '协作', '一起工作', 'positive')
    expectType('peer')

    // 7 more => closeness 81 => companion
    for (let i = 0; i < 7; i++) api.recordInteraction('adv_a', 'adv_b', 'coexistence', '共处', '相处', 'positive')
    expectType('companion')
  })

  it('recordInteraction — closeness 边界 [0, 100] 与 negative 衰减', async () => {
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    // 不低于 0
    for (let i = 0; i < 10; i++) api.recordInteraction('adv_a', 'adv_b', 'conflict', '分歧', '争论', 'negative')
    expect(JSON.parse(getKvStore()['hf:advisor:relations']!)[0].closeness).toBe(0)

    // 不超过 100
    const { useAdvisorInteraction: use2 } = await import('../interaction')
    const api2 = use2()
    for (let i = 0; i < 50; i++) api2.recordInteraction('adv_c', 'adv_d', 'collaboration', '协作', '一起工作', 'positive')
    const rels = JSON.parse(getKvStore()['hf:advisor:relations']!)
    const rel = rels.find((r: any) => r.advisorAId === 'adv_c')
    expect(rel.closeness).toBe(100)
    expect(rel.relationType).toBe('companion')
  })

  it('suggestTopics — 根据角色推荐话题（含无角色空结果）', async () => {
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    const topics = api.suggestTopics(
      { role: 'scholar', personality: 'analytical' },
      { role: 'craftsman', personality: 'creative' },
    )
    expect(topics.length).toBeGreaterThan(0)
    expect(topics.every(t => typeof t === 'string')).toBe(true)

    expect(api.suggestTopics({}, {})).toEqual([])
  })

  it('getNetworkStats — 关系网络统计（含空网络）', async () => {
    getKvStore()['hf:advisor:relations'] = JSON.stringify([
      { id: 'rel_1', advisorAId: 'adv_a', advisorBId: 'adv_b', relationType: 'peer', closeness: 60, interactionCount: 5, lastInteractionAt: FIXED_ISO, sharedTopics: [], interactionHistory: [] },
      { id: 'rel_2', advisorAId: 'adv_a', advisorBId: 'adv_c', relationType: 'companion', closeness: 90, interactionCount: 20, lastInteractionAt: FIXED_ISO, sharedTopics: [], interactionHistory: [] },
    ])
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    const stats = api.getNetworkStats()
    expect(stats.totalRelations).toBe(2)
    expect(stats.totalInteractions).toBe(25)
    expect(stats.averageCloseness).toBe(75)
    expect(stats.strongestBond.closeness).toBe(90)
    expect(stats.mostConnectedAdvisor).toBe('adv_a')
  })

  it('removeRelation — 移除关系（含不存在 ID 返回 false）', async () => {
    getKvStore()['hf:advisor:relations'] = JSON.stringify([
      { id: 'rel_1', advisorAId: 'adv_a', advisorBId: 'adv_b', relationType: 'peer', closeness: 60, interactionCount: 5, lastInteractionAt: FIXED_ISO, sharedTopics: [], interactionHistory: [] },
    ])
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    expect(api.removeRelation('rel_1')).toBe(true)
    expect(JSON.parse(getKvStore()['hf:advisor:relations']!)).toHaveLength(0)
    expect(api.removeRelation('nonexistent')).toBe(false)
  })
})

// ============================================================
// 6. useAdvisorWitness（8 个测试）
// ============================================================
describe('useAdvisorWitness', () => {
  beforeEach(() => {
    resetKvStore()
    vi.resetModules()
  })

  it('witnesses & unviewedCount — 初始状态', async () => {
    const { useAdvisorWitness } = await import('../witness')
    const api = useAdvisorWitness()
    expect(api.witnesses.value).toEqual([])
    expect(api.unviewedCount.value).toBe(0)
  })

  it('recordWitness — 记录见证（AdvisorWitnessRecord 不含 reaction/description/emotion，遵守记录简化原则 + 禁储存感受）', async () => {
    const { useAdvisorWitness } = await import('../witness')
    const api = useAdvisorWitness()

    const entry = api.recordWitness('adv_1', 'first-focus', '首次专注')
    expect(entry.id).toMatch(/^wit_/)
    expect(entry.advisorId).toBe('adv_1')
    expect(entry.eventType).toBe('first-focus')
    expect(entry.viewed).toBe(false)
    // 宪法"记录简化原则" + 蓝图"禁储存感受"：数据层不存 reaction/description/emotion
    expect((entry as any).reaction).toBeUndefined()
    expect((entry as any).description).toBeUndefined()
    expect((entry as any).emotion).toBeUndefined()
    expect(entry.timestamp).toBe(FIXED_ISO)

    // 无 description/emotion 也能正常记录
    const entry2 = api.recordWitness('adv_2', 'streak-record', '连击')
    expect((entry2 as any).reaction).toBeUndefined()
    expect((entry2 as any).description).toBeUndefined()
    expect(typeof entry2.id).toBe('string')

    // 持久化
    const stored = JSON.parse(getKvStore()['hf:advisor:witnesses']!)
    expect(stored).toHaveLength(2)
    expect(stored[0].reaction).toBeUndefined()
  })

  it('generateReaction — 展示用纯函数（不落盘，按性格/事件生成）', async () => {
    const { generateReaction } = await import('../witness')
    const r1 = generateReaction('first-focus', 'guardian')
    expect(typeof r1).toBe('string')
    expect(r1.length).toBeGreaterThan(0)
    // 不同性格产出不同池（至少不为空）
    const r2 = generateReaction('first-focus', 'scholar')
    expect(typeof r2).toBe('string')
    // 默认（无 personality）也能生成
    const r3 = generateReaction('streak-record')
    expect(r3.length).toBeGreaterThan(0)
  })

  it('markViewed — 标记已读（含不存在 ID 返回 false）', async () => {
    getKvStore()['hf:advisor:witnesses'] = JSON.stringify([{
      id: 'wit_1', advisorId: 'adv_1', eventType: 'first-focus',
      title: 't', description: 'd', timestamp: FIXED_ISO, viewed: false,
    }])
    const { useAdvisorWitness } = await import('../witness')
    const api = useAdvisorWitness()

    expect(api.markViewed('wit_1')).toBe(true)
    expect(JSON.parse(getKvStore()['hf:advisor:witnesses']!)[0].viewed).toBe(true)
    expect(api.markViewed('nonexistent')).toBe(false)
  })

  it('getAdvisorWitnesses — 按时间倒序获取幕僚见证', async () => {
    const earlier = new Date('2025-06-10T10:00:00.000Z').toISOString()
    const later = new Date('2025-06-14T10:00:00.000Z').toISOString()
    getKvStore()['hf:advisor:witnesses'] = JSON.stringify([
      { id: 'wit_1', advisorId: 'adv_1', eventType: 'first-focus', title: 't1', description: 'd1', timestamp: earlier, viewed: false },
      { id: 'wit_2', advisorId: 'adv_1', eventType: 'streak-record', title: 't2', description: 'd2', timestamp: later, viewed: false },
      { id: 'wit_3', advisorId: 'adv_2', eventType: 'first-focus', title: 't3', description: 'd3', timestamp: earlier, viewed: false },
    ])
    const { useAdvisorWitness } = await import('../witness')
    const api = useAdvisorWitness()

    const adv1W = api.getAdvisorWitnesses('adv_1')
    expect(adv1W).toHaveLength(2)
    expect(adv1W[0].id).toBe('wit_2') // 倒序
    expect(adv1W[1].id).toBe('wit_1')
  })

  it('getUnviewedWitnesses — 获取未读见证（含 unviewedCount 计算属性）', async () => {
    getKvStore()['hf:advisor:witnesses'] = JSON.stringify([
      { id: 'wit_1', advisorId: 'adv_1', eventType: 'first-focus', title: 't1', description: 'd1', timestamp: FIXED_ISO, viewed: false },
      { id: 'wit_2', advisorId: 'adv_2', eventType: 'streak-record', title: 't2', description: 'd2', timestamp: FIXED_ISO, viewed: true },
      { id: 'wit_3', advisorId: 'adv_3', eventType: 'personal-growth', title: 't3', description: 'd3', timestamp: FIXED_ISO, viewed: false },
    ])
    const { useAdvisorWitness } = await import('../witness')
    const api = useAdvisorWitness()

    expect(api.getUnviewedWitnesses()).toHaveLength(2)
    expect(api.unviewedCount.value).toBe(2)
  })

  it('getWitnessStats — 见证统计（含空数据）', async () => {
    getKvStore()['hf:advisor:witnesses'] = JSON.stringify([
      { id: 'wit_1', advisorId: 'adv_1', eventType: 'first-focus', title: 't1', description: 'd1', timestamp: '2025-06-01T10:00:00.000Z', viewed: false },
      { id: 'wit_2', advisorId: 'adv_1', eventType: 'streak-record', title: 't2', description: 'd2', timestamp: '2025-06-10T10:00:00.000Z', viewed: false },
      { id: 'wit_3', advisorId: 'adv_2', eventType: 'first-focus', title: 't3', description: 'd3', timestamp: '2025-06-15T10:00:00.000Z', viewed: false },
    ])
    const { useAdvisorWitness } = await import('../witness')
    const api = useAdvisorWitness()

    const stats = api.getWitnessStats()
    expect(stats.totalWitnessed).toBe(3)
    expect(stats.byType['first-focus']).toBe(2)
    expect(stats.byType['streak-record']).toBe(1)
    expect(stats.byAdvisor['adv_1']).toBe(2)
    expect(stats.firstWitnessAt).toBe('2025-06-01T10:00:00.000Z')
    expect(stats.lastWitnessAt).toBe('2025-06-15T10:00:00.000Z')
    expect(stats.mostActiveAdvisor).toBe('adv_1')
  })

  it('getRecentWitnesses — 按时间倒序获取近期见证（默认 limit=10）', async () => {
    const entries = []
    for (let i = 1; i <= 15; i++) {
      const d = new Date(`2025-06-${String(i).padStart(2, '0')}T10:00:00.000Z`)
      entries.push({
        id: `wit_${i}`, advisorId: 'adv_1', eventType: 'first-focus' as const,
        title: `t${i}`, description: `d${i}`,
        timestamp: d.toISOString(), viewed: false,
      })
    }
    getKvStore()['hf:advisor:witnesses'] = JSON.stringify(entries)
    const { useAdvisorWitness } = await import('../witness')
    const api = useAdvisorWitness()

    const recent5 = api.getRecentWitnesses(5)
    expect(recent5).toHaveLength(5)
    expect(recent5[0].timestamp).toBe('2025-06-15T10:00:00.000Z')

    const recentDefault = api.getRecentWitnesses()
    expect(recentDefault).toHaveLength(10)
  })

  it('clearAll — 清空所有见证记录', async () => {
    getKvStore()['hf:advisor:witnesses'] = JSON.stringify([
      { id: 'wit_1', advisorId: 'adv_1', eventType: 'first-focus', title: 't', description: 'd', timestamp: FIXED_ISO, viewed: false },
    ])
    const { useAdvisorWitness } = await import('../witness')
    const api = useAdvisorWitness()

    api.clearAll()
    expect(api.witnesses.value).toEqual([])
    expect(JSON.parse(getKvStore()['hf:advisor:witnesses']!)).toEqual([])
  })
})

// ============================================================
// 7. 边界条件（4 个测试）
// ============================================================
describe('Edge cases', () => {
  beforeEach(() => {
    resetKvStore()
    vi.resetModules()
  })

  it('空状态：所有 composable 在无预存数据时均可正常工作', async () => {
    const [celebration, dailyLife, interaction, witness] = await Promise.all([
      import('../celebration'),
      import('../daily-life'),
      import('../interaction'),
      import('../witness'),
    ])

    const cel = celebration.useAdvisorCelebration()
    const dl = dailyLife.useAdvisorDailyLife()
    const inter = interaction.useAdvisorInteraction()
    const wit = witness.useAdvisorWitness()

    expect(cel.getAdvisorCelebrations('any')).toEqual([])
    expect(cel.getTodayCelebrations()).toEqual([])
    expect(cel.getUpcomingCelebrations()).toEqual([])
    expect(cel.getAllLegacies()).toEqual([])
    expect(cel.getRetirementStats()).toEqual({ total: 0, completed: 0, active: 0, totalLegacies: 0 })

    expect(dl.getAllScenes()).toHaveLength(6)
    expect(dl.currentActivities.value).toEqual([])

    expect(inter.allRelations.value).toEqual([])
    expect(inter.getNetworkStats().totalRelations).toBe(0)
    expect(inter.getNetworkStats().averageCloseness).toBe(0)

    expect(wit.witnesses.value).toEqual([])
    expect(wit.unviewedCount.value).toBe(0)
    expect(wit.getWitnessStats().totalWitnessed).toBe(0)
  })

  it('Celebration 重复操作：重复创建/完成/推进退休不应抛异常', async () => {
    const { useAdvisorCelebration } = await import('../celebration')
    const cel = useAdvisorCelebration()

    const e1 = cel.createCelebration('adv_1', 'milestone', 'A', 'B')
    const e2 = cel.createCelebration('adv_1', 'milestone', 'A', 'B')
    expect(e1.id).not.toBe(e2.id)

    expect(cel.completeCelebration(e1.id)).toBe(true)
    expect(cel.completeCelebration(e1.id)).toBe(true) // 已完成仍返回 true

    const ceremony = cel.startRetirement('adv_1', '完成')
    for (let i = 0; i < 4; i++) cel.advanceRetirementPhase(ceremony.id)
    expect(cel.advanceRetirementPhase(ceremony.id)).toBe('legacy') // 不再变化
  })

  it('Interaction 重复操作：重复 initRelation 不创建新关系', async () => {
    const { useAdvisorInteraction } = await import('../interaction')
    const api = useAdvisorInteraction()

    const r1 = api.initRelation('adv_a', 'adv_b')
    const r2 = api.initRelation('adv_a', 'adv_b')
    expect(r1.id).toBe(r2.id)
    expect(api.allRelations.value).toHaveLength(1)
  })

  it('DailyLife 重复操作：重复 startActivity 替换当前活动', async () => {
    const { useAdvisorDailyLife } = await import('../daily-life')
    const api = useAdvisorDailyLife()

    api.startActivity('adv_1', 'reading', 'study-room')
    api.startActivity('adv_1', 'writing', 'study-room')
    api.startActivity('adv_1', 'meditating', 'garden')
    expect(api.currentActivities.value).toHaveLength(1)
    expect(api.currentActivities.value[0].type).toBe('meditating')
  })
})