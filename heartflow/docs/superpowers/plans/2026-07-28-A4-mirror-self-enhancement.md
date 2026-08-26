# A4：镜我——幕僚系统深度完善

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the MirrorSelf (镜我) advisor system with the Four Acts of the Finalizing Hammer (定音锤四幕), enriched annual/quarterly dialogue, and advisor scheduling (task awareness + avatar dispatch + progress display).

**Architecture:** The existing system has MirrorSelf.vue (floating orb UI), advisor.ts store (dings, dialogue, affinity, witness, conversation), and 5 advisor views (Hub, Chat, Affinity, Archive, WitnessLog). This plan adds: (1) a new DingyinFourActs.vue full-screen reel view for the 4 narrative acts, powered by new store methods that aggregate user data into act-specific summaries; (2) enhanced annual dialogue with richer narrative structure; (3) a new AdvisorScheduler.vue component for task awareness and avatars dispatch.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, localStorage (storage engine)

---

## File Structure

### New Files
- `src/views/DingyinFourActs.vue` — Full-screen reel view displaying the 4 acts
- `src/views/__tests__/DingyinFourActs.test.ts` — Tests for the 4 acts view
- `src/components/AdvisorScheduler.vue` — Task awareness panel with avatar dispatch and progress display

### Modified Files
- `src/stores/advisor.ts` — Add `getFourActs()`, enhanced `getAnnualDialogue()`, `getTaskAwareness()`, `dispatchAvatar()`, `getTaskProgress()`
- `src/stores/advisor.test.ts` — Add tests for new store methods
- `src/components/MirrorSelf.vue` — Add entry button to open the 4 acts view
- `src/views/AdvisorHub.vue` — Add scheduling display and entry point

---

### Task 1: Add Four Acts generation to advisor store

**Files:**
- Modify: `src/stores/advisor.ts` (after line 226, add Four Acts section)
- Test: `src/stores/advisor.test.ts` (append Four Acts describe block)

- [ ] **Step 1: Write failing tests for Four Acts**

Add to `src/stores/advisor.test.ts`:

```typescript
import { createPinia, setActivePinia } from 'pinia'
import { useAdvisorStore } from './advisor'
import { storage } from '../engine/storage'

describe('advisor four acts', () => {
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
    // Seed some test data
    storage.setSessions([
      { id: 's1', completedAt: new Date().toISOString(), elapsed: 1500000 },
      { id: 's2', completedAt: new Date().toISOString(), elapsed: 1800000 },
    ])
    storage.setNotes([
      { id: 'n1', createdAt: new Date().toISOString(), content: 'test note 1' },
      { id: 'n2', createdAt: new Date().toISOString(), content: 'test note 2' },
    ])
    storage.setEmotions([
      { id: 'e1', type: 'happy', createdAt: new Date().toISOString() },
      { id: 'e2', type: 'sad', createdAt: new Date().toISOString() },
    ])
    storage.setAnchors([
      { id: 'a1', text: 'task 1', done: true, targetDate: new Date().toISOString().slice(0,10), stage: 'active', createdAt: new Date().toISOString(), priority: 'must', driftCount: 0 },
      { id: 'a2', text: 'task 2', done: false, targetDate: new Date().toISOString().slice(0,10), stage: 'active', createdAt: new Date().toISOString(), priority: 'can', driftCount: 0 },
    ])
    storage.setCrystals([
      { id: 'c1', createdAt: new Date().toISOString() },
    ])
    // Seed dingyin counts
    storage.setKV('hf:dingyin_counts', {
      default: { focus_complete: 5, emotion_logged: 3, note_created: 2 },
    })
  })

  it('getFourActs returns 4 acts with title and content', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    expect(acts).toHaveLength(4)
    expect(acts[0].title).toContain('你做过的事')
    expect(acts[1].title).toContain('你走过的路')
    expect(acts[2].title).toContain('你学会的')
    expect(acts[3].title).toContain('你在成为的')
  })

  it('each act has a non-empty summary and detailLines', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    for (const act of acts) {
      expect(act.summary).toBeTruthy()
      expect(act.detailLines.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('first act shows session and anchor counts', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    expect(acts[0].detailLines.some(l => l.includes('2') || l.includes('两次'))).toBe(true)
    expect(acts[0].detailLines.some(l => l.includes('锚点') || l.includes('task'))).toBe(true)
  })

  it('second act mentions journey or streak', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    expect(acts[1].detailLines.length).toBeGreaterThan(0)
  })

  it('third act shows notes and emotions', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    expect(acts[2].detailLines.some(l => l.includes('笔记') || l.includes('note'))).toBe(true)
  })

  it('fourth act shows current progress', () => {
    const advisor = useAdvisorStore()
    const acts = advisor.getFourActs()
    expect(acts[3].detailLines.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd project/frontend && npx vitest run src/stores/advisor.test.ts --reporter=verbose 2>&1 | head -40`
Expected: FAIL with "getFourActs is not a function" or similar

- [ ] **Step 3: Add Four Acts types and methods to advisor store**

Add after the `getAllDingyinProgress` method (after line 226) in `src/stores/advisor.ts`:

```typescript
  // ---- 定音锤四幕（Four Acts of the Finalizing Hammer） ----

  interface FourActItem {
    id: string
    title: string
    icon: string
    summary: string
    detailLines: string[]
    progress: number // 0-1
    color: string
  }

  /**
   * 生成定音锤四幕内容
   * 第一幕：你做过的事（已完成事项汇总）
   * 第二幕：你走过的路（历程与里程碑）
   * 第三幕：你学会的（知识积累）
   * 第四幕：你在成为的（当前状态与成长）
   */
  function getFourActs(): FourActItem[] {
    const sessions = storage.getSessions()
    const notes = storage.getNotes()
    const emotions = storage.getEmotions()
    const anchors = storage.getAnchors()
    const crystals = storage.getCrystals()
    const advisors = storage.getAdvisors()
    const dingyinCounts = storage.getKV<Record<string, Record<string, number>>>('hf:dingyin_counts', {})
    const defaultCounts = dingyinCounts.default ?? {}

    const completedSessions = sessions.filter(s => s.completedAt).length
    const totalMinutes = Math.round(sessions.reduce((s, x) => s + (x.elapsed || 0), 0) / 60000)
    const completedAnchors = anchors.filter((a: any) => a.done).length
    const totalAnchors = anchors.length
    const noteCount = notes.length
    const emotionCount = emotions.length
    const crystalCount = crystals.length
    const totalInteractions = advisors.reduce((s, a) => s + (a.totalInteractions ?? 0), 0)
    const avgAffinity = advisors.length > 0
      ? Math.round(advisors.reduce((s, a) => s + (a.affinity ?? 0), 0) / advisors.length)
      : 0
    const focusCount = defaultCounts.focus_complete ?? 0
    const emotionLogCount = defaultCounts.emotion_logged ?? 0
    const noteCreateCount = defaultCounts.note_created ?? 0

    // 第一幕：你做过的事
    const act1: FourActItem = {
      id: 'act-1',
      title: '第一幕 · 你做过的事',
      icon: '⚒️',
      summary: completedSessions > 0
        ? `已完成了 ${completedSessions} 次专注，累计 ${totalMinutes} 分钟。`
        : '尚未完成专注，第一步总是最珍贵的。',
      detailLines: [
        `已完成专注：${completedSessions} 次`,
        `累计专注时长：${totalMinutes} 分钟`,
        `已完成锚点：${completedAnchors} / ${totalAnchors}`,
        `凝结时间结晶：${crystalCount} 颗`,
      ],
      progress: Math.min(1, completedSessions / 20),
      color: '#d4a574',
    }

    // 第二幕：你走过的路
    const act2: FourActItem = {
      id: 'act-2',
      title: '第二幕 · 你走过的路',
      icon: '🛤️',
      summary: advisors.length > 0
        ? `与 ${advisors.length} 位幕僚同行，累计对话 ${totalInteractions} 次。`
        : '旅途刚开始，前方有无限可能。',
      detailLines: [
        `幕僚在位：${advisors.filter(a => !a.retired).length} 位`,
        `总交互次数：${totalInteractions}`,
        `平均好感度：${avgAffinity} / 100`,
        `情绪记录：${emotionCount} 次`,
      ],
      progress: Math.min(1, totalInteractions / 50),
      color: '#7c6cd4',
    }

    // 第三幕：你学会的
    const act3: FourActItem = {
      id: 'act-3',
      title: '第三幕 · 你学会的',
      icon: '📖',
      summary: noteCount > 0
        ? `写下了 ${noteCount} 篇笔记，记录了 ${emotionCount} 次情绪。`
        : '笔记是一面镜子，开始记录吧。',
      detailLines: [
        `笔记总数：${noteCount} 篇`,
        `情绪记录：${emotionCount} 次`,
        `定音锤·专注达成：${focusCount} 次`,
        `定音锤·情绪触发：${emotionLogCount} 次`,
        `定音锤·笔记触发：${noteCreateCount} 次`,
      ],
      progress: Math.min(1, noteCount / 15),
      color: '#4f8cff',
    }

    // 第四幕：你在成为的
    const act4: FourActItem = {
      id: 'act-4',
      title: '第四幕 · 你在成为的',
      icon: '🌟',
      summary: avgAffinity > 0
        ? `好感度均值 ${avgAffinity}，正在成为更完整的自己。`
        : '每一次互动，都在塑造未来的你。',
      detailLines: [
        `当前幕僚好感度均值：${avgAffinity} / 100`,
        `待完成锚点：${anchors.filter((a: any) => !a.done && a.stage !== 'pool').length}`,
        `锚点池中念头：${anchors.filter((a: any) => a.stage === 'pool').length}`,
        `总专注趋势：${completedSessions > 5 ? '持续增长' : '正在起步'}`,
      ],
      progress: Math.min(1, avgAffinity / 100),
      color: '#f0c040',
    }

    return [act1, act2, act3, act4]
  }

  /** 获取定音锤四幕的汇总进度（用于外部显示） */
  function getFourActsProgress(): { completed: number; total: number } {
    const acts = getFourActs()
    const completed = acts.filter(a => a.progress >= 0.8).length
    return { completed, total: acts.length }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd project/frontend && npx vitest run src/stores/advisor.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 5: Add return values to advisor store**

Add to the return statement of `useAdvisorStore`:

```typescript
  return {
    // ... existing returns ...
    getFourActs,
    getFourActsProgress,
  }
```

- [ ] **Step 6: Run tests again to confirm**

Run: `cd project/frontend && npx vitest run src/stores/advisor.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: ALL tests PASS

---

### Task 2: Enhance annual dialogue with richer narrative

**Files:**
- Modify: `src/stores/advisor.ts` (replace `getAnnualDialogue`)
- Test: `src/stores/advisor.test.ts` (enhance annual dialogue tests)

- [ ] **Step 1: Write enhanced tests for annual dialogue**

```typescript
describe('advisor enhanced annual dialogue', () => {
  beforeEach(() => {
    // same setup
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
    storage.setSessions([
      { id: 's1', completedAt: '2025-06-15T10:00:00Z', elapsed: 1500000 },
      { id: 's2', completedAt: '2025-07-20T14:00:00Z', elapsed: 1800000 },
    ])
    storage.setNotes([
      { id: 'n1', createdAt: '2025-03-10T08:00:00Z', content: 'test' },
    ])
    storage.setEmotions([
      { id: 'e1', type: 'happy', createdAt: '2025-05-01T12:00:00Z' },
    ])
    storage.setCrystals([{ id: 'c1', createdAt: '2025-04-01T00:00:00Z' }])
    storage.setAnchors([
      { id: 'a1', text: 'read', done: true, targetDate: '2025-06-01', stage: 'active', createdAt: '2025-01-01T00:00:00Z', priority: 'must', driftCount: 0 },
    ])
  })

  it('returns null when not in January 1st', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'))
    const advisor = useAdvisorStore()
    const result = advisor.getAnnualDialogue()
    expect(result).toBeNull()
    vi.useRealTimers()
  })

  it('returns enriched narrative on January 1st', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T08:00:00Z'))
    const advisor = useAdvisorStore()
    const result = advisor.getAnnualDialogue()
    expect(result).not.toBeNull()
    expect(result).toContain('年度回顾')
    expect(result).toContain('2025')
    expect(result).toContain('专注')
    expect(result).toContain('笔记')
    expect(result).toContain('情绪')
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (if the old tests don't pass)**

Run: `cd project/frontend && npx vitest run src/stores/advisor.test.ts --reporter=verbose 2>&1 | head -40`
Expected: The existing tests should still pass, plus new tests should pass

- [ ] **Step 3: Enhance the annual dialogue method**

Replace the `getAnnualDialogue` method in `src/stores/advisor.ts` (around line 551-591):

```typescript
  /**
   * 年度对话：在每年 1 月 1 日首次启动时，生成一份叙事性年度回顾
   * @returns 年度回顾文本，若非 1 月 1 日或已显示过则返回 null
   */
  function getAnnualDialogue(): string | null {
    const now = new Date()
    if (now.getMonth() !== 0 || now.getDate() !== 1) return null

    const lastYear = now.getFullYear() - 1
    const shownYear = storage.getKV<number>(ANNUAL_DIALOGUE_KEY, 0)
    if (shownYear >= lastYear) return null

    storage.setKV(ANNUAL_DIALOGUE_KEY, lastYear)

    const sessions = storage.getSessions()
    const notes = storage.getNotes()
    const emotions = storage.getEmotions()
    const crystals = storage.getCrystals()
    const anchors = storage.getAnchors()

    const lastYearSessions = sessions.filter(s => {
      if (!s.completedAt) return false
      return new Date(s.completedAt).getFullYear() === lastYear
    })
    const lastYearNotes = notes.filter(n => {
      return new Date(n.createdAt || n.createdAt).getFullYear() === lastYear
    })
    const lastYearEmotions = emotions.filter(e => {
      return new Date(e.createdAt).getFullYear() === lastYear
    })
    const lastYearCrystals = crystals.filter(c => {
      return new Date(c.createdAt).getFullYear() === lastYear
    })
    const lastYearAnchors = anchors.filter((a: any) => {
      return a.done && new Date(a.createdAt).getFullYear() === lastYear
    })

    const totalFocusCount = lastYearSessions.length
    const totalFocusDuration = lastYearSessions.reduce((sum, s) => sum + (s.elapsed || 0), 0)
    const totalFocusMinutes = Math.round(totalFocusDuration / 60000)
    const totalNotes = lastYearNotes.length
    const totalEmotions = lastYearEmotions.length
    const totalCrystals = lastYearCrystals.length
    const totalAnchors = lastYearAnchors.length

    // 构建叙事性回顾
    const parts: string[] = []
    parts.push(`「年度回顾 · ${lastYear}」`)

    if (totalFocusCount > 0) {
      parts.push(`这一年，你完成了 ${totalFocusCount} 次专注，累计 ${totalFocusMinutes} 分钟。`)
    } else {
      parts.push('这一年，专注的记录在等待你的第一笔。')
    }

    if (totalNotes > 0) {
      parts.push(`写下了 ${totalNotes} 篇笔记。`)
    }

    if (totalEmotions > 0) {
      parts.push(`记录了 ${totalEmotions} 次情绪。`)
    }

    if (totalAnchors > 0) {
      parts.push(`安放了 ${totalAnchors} 个心锚。`)
    }

    if (totalCrystals > 0) {
      parts.push(`凝结了 ${totalCrystals} 颗时间结晶。`)
    }

    // 添加启发性结语
    const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
    const currentMonth = monthNames[now.getMonth()]
    parts.push(`${currentMonth}月伊始，新的篇章正待书写。`)

    return parts.join('\n')
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd project/frontend && npx vitest run src/stores/advisor.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: All tests PASS

---

### Task 3: Add task awareness and avatar scheduling to advisor store

**Files:**
- Modify: `src/stores/advisor.ts` (add scheduling section)
- Test: `src/stores/advisor.test.ts` (add scheduling tests)

- [ ] **Step 1: Write failing tests for scheduling**

```typescript
describe('advisor scheduling', () => {
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
    storage.setAdvisors([
      { id: 'adv1', name: '小明', role: 'companion', personality: '活泼', affinity: 30, totalInteractions: 10, retired: false, state: 'awake', createdAt: new Date().toISOString() },
      { id: 'adv2', name: '老张', role: 'work', personality: '严谨', affinity: 50, totalInteractions: 20, retired: false, state: 'awake', createdAt: new Date().toISOString() },
    ])
    storage.setSessions([
      { id: 's1', completedAt: new Date().toISOString(), elapsed: 1500000 },
    ])
    storage.setNotes([{ id: 'n1', createdAt: new Date().toISOString(), content: 'test' }])
  })

  it('getTaskAwareness returns current task context', () => {
    const advisor = useAdvisorStore()
    const awareness = advisor.getTaskAwareness()
    expect(awareness).toHaveProperty('focusCount')
    expect(awareness).toHaveProperty('noteCount')
    expect(awareness).toHaveProperty('activeAdvisorCount')
  })

  it('getTaskAwareness shows correct counts', () => {
    const advisor = useAdvisorStore()
    const awareness = advisor.getTaskAwareness()
    expect(awareness.focusCount).toBe(1)
    expect(awareness.noteCount).toBe(1)
    expect(awareness.activeAdvisorCount).toBe(2)
  })

  it('dispatchAvatar returns the best matched advisor for a task type', () => {
    const advisor = useAdvisorStore()
    const matched = advisor.dispatchAvatar('focus')
    expect(matched).not.toBeNull()
    expect(matched).toHaveProperty('id')
    expect(matched).toHaveProperty('name')
  })

  it('dispatchAvatar returns null when no advisors', () => {
    storage.setAdvisors([])
    const advisor = useAdvisorStore()
    const matched = advisor.dispatchAvatar('focus')
    expect(matched).toBeNull()
  })

  it('getTaskProgress returns progress for active tasks', () => {
    const advisor = useAdvisorStore()
    const progress = advisor.getTaskProgress()
    expect(progress).toHaveProperty('focus')
    expect(progress).toHaveProperty('notes')
    expect(progress).toHaveProperty('emotions')
    expect(progress.focus).toHaveProperty('current')
    expect(progress.focus).toHaveProperty('total')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd project/frontend && npx vitest run src/stores/advisor.test.ts --reporter=verbose 2>&1 | head -40`
Expected: FAIL with "getTaskAwareness is not a function" etc.

- [ ] **Step 3: Add scheduling methods to advisor store**

Add after the Four Acts section in `src/stores/advisor.ts`:

```typescript
  // ---- 幕僚调度（Task Awareness + Avatar Dispatch + Progress Display） ----

  interface TaskAwareness {
    focusCount: number
    noteCount: number
    emotionCount: number
    anchorCount: number
    activeAdvisorCount: number
    lastActivity: string
    todayDate: string
  }

  interface TaskProgress {
    focus: { current: number; total: number; label: string }
    notes: { current: number; total: number; label: string }
    emotions: { current: number; total: number; label: string }
    anchors: { current: number; total: number; label: string }
  }

  /**
   * 任务感知：感知当前应用中的活动状态
   */
  function getTaskAwareness(): TaskAwareness {
    const today = new Date().toISOString().slice(0, 10)
    const sessions = storage.getSessions()
    const notes = storage.getNotes()
    const emotions = storage.getEmotions()
    const anchors = storage.getAnchors()
    const advisors = storage.getAdvisors()

    return {
      focusCount: sessions.filter(s => s.completedAt?.startsWith(today)).length,
      noteCount: notes.filter(n => (n.createdAt || '').startsWith(today)).length,
      emotionCount: emotions.filter(e => (e.createdAt || '').startsWith(today)).length,
      anchorCount: anchors.filter((a: any) => !a.done && a.stage === 'active').length,
      activeAdvisorCount: advisors.filter(a => !a.retired).length,
      lastActivity: advisors.reduce((latest, a) => {
        return a.lastActiveAt && a.lastActiveAt > latest ? a.lastActiveAt : latest
      }, ''),
      todayDate: today,
    }
  }

  /**
   * 分身调度：根据任务类型匹配最合适的幕僚
   * 匹配规则：根据幕僚角色与任务类型的亲和度
   * @param taskType 任务类型（focus / note / emotion / anchor / general）
   * @returns 匹配的幕僚信息，无匹配时返回 null
   */
  function dispatchAvatar(taskType: string): { id: string; name: string; role: string; affinity: number } | null {
    const advisors = storage.getAdvisors()
    const active = advisors.filter(a => !a.retired && a.state !== 'slumber')
    if (active.length === 0) return null

    // 角色-任务类型匹配权重
    const roleMatchScore: Record<string, Record<string, number>> = {
      companion: { focus: 0.6, note: 0.7, emotion: 0.9, anchor: 0.5, general: 0.8 },
      research:  { focus: 0.8, note: 0.9, emotion: 0.5, anchor: 0.7, general: 0.6 },
      work:      { focus: 0.9, note: 0.6, emotion: 0.4, anchor: 0.8, general: 0.7 },
      life:      { focus: 0.5, note: 0.7, emotion: 0.9, anchor: 0.6, general: 0.8 },
      steward:   { focus: 0.7, note: 0.8, emotion: 0.6, anchor: 0.9, general: 0.9 },
    }

    let bestMatch = active[0]
    let bestScore = -1

    for (const a of active) {
      const roleScore = roleMatchScore[a.role]?.[taskType] ?? 0.5
      const affinityFactor = (a.affinity ?? 0) / 100
      const score = roleScore * 0.6 + affinityFactor * 0.4
      if (score > bestScore) {
        bestScore = score
        bestMatch = a
      }
    }

    return {
      id: bestMatch.id,
      name: bestMatch.name,
      role: bestMatch.role,
      affinity: bestMatch.affinity ?? 0,
    }
  }

  /**
   * 获取今日任务进度概览
   */
  function getTaskProgress(): TaskProgress {
    const today = new Date().toISOString().slice(0, 10)
    const sessions = storage.getSessions()
    const notes = storage.getNotes()
    const emotions = storage.getEmotions()
    const anchors = storage.getAnchors()

    const todayFocus = sessions.filter(s => s.completedAt?.startsWith(today)).length
    const todayNotes = notes.filter(n => (n.createdAt || '').startsWith(today)).length
    const todayEmotions = emotions.filter(e => (e.createdAt || '').startsWith(today)).length
    const todayAnchors = anchors.filter((a: any) => a.done && (a.doneAt || '').startsWith(today)).length
    const totalActiveAnchors = anchors.filter((a: any) => !a.done && a.stage === 'active').length
    const totalActive = totalActiveAnchors + todayFocus

    return {
      focus: { current: todayFocus, total: Math.max(4, todayFocus + 1), label: '专注' },
      notes: { current: todayNotes, total: Math.max(3, todayNotes + 1), label: '笔记' },
      emotions: { current: todayEmotions, total: Math.max(3, todayEmotions + 1), label: '情绪' },
      anchors: { current: todayAnchors, total: totalActiveAnchors + todayAnchors || 1, label: '锚点' },
    }
  }
```

- [ ] **Step 4: Add return values**

Add to the return statement of `useAdvisorStore`:

```typescript
    getTaskAwareness,
    dispatchAvatar,
    getTaskProgress,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd project/frontend && npx vitest run src/stores/advisor.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: ALL tests PASS

---

### Task 4: Create DingyinFourActs view

**Files:**
- Create: `src/views/DingyinFourActs.vue`
- Test: `src/views/__tests__/DingyinFourActs.test.ts`

- [ ] **Step 1: Write failing tests for the 4 acts view**

```typescript
// ============================================================
// DingyinFourActs 定音锤四幕视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockFourActs = [
  { id: 'act-1', title: '第一幕 · 你做过的事', icon: '⚒️', summary: '已完成 5 次专注', detailLines: ['已完成专注：5 次', '累计专注时长：30 分钟'], progress: 0.5, color: '#d4a574' },
  { id: 'act-2', title: '第二幕 · 你走过的路', icon: '🛤️', summary: '与 2 位幕僚同行', detailLines: ['幕僚在位：2 位', '总交互次数：15'], progress: 0.3, color: '#7c6cd4' },
  { id: 'act-3', title: '第三幕 · 你学会的', icon: '📖', summary: '写下了 10 篇笔记', detailLines: ['笔记总数：10 篇', '情绪记录：5 次'], progress: 0.7, color: '#4f8cff' },
  { id: 'act-4', title: '第四幕 · 你在成为的', icon: '🌟', summary: '好感度均值 40', detailLines: ['当前好感度均值：40', '待完成锚点：3'], progress: 0.4, color: '#f0c040' },
]

const mockGetFourActs = vi.fn(() => mockFourActs)
const mockGetFourActsProgress = vi.fn(() => ({ completed: 1, total: 4 }))

vi.mock('../../stores/advisor', () => ({
  useAdvisorStore: () => ({
    getFourActs: mockGetFourActs,
    getFourActsProgress: mockGetFourActsProgress,
  }),
}))

async function getWrapper() {
  const { default: DingyinFourActs } = await import('../DingyinFourActs.vue')
  return mount(DingyinFourActs)
}

describe('DingyinFourActs 定音锤四幕', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染页面标题和副标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('定音锤')
    expect(wrapper.text()).toContain('四幕')
  })

  it('渲染 4 个幕卡片', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.dingyin-act-card')
    expect(cards).toHaveLength(4)
  })

  it('每个幕卡片显示标题、图标和摘要', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('你做过的事')
    expect(wrapper.text()).toContain('你走过的路')
    expect(wrapper.text()).toContain('你学会的')
    expect(wrapper.text()).toContain('你在成为的')
    expect(wrapper.text()).toContain('已完成 5 次专注')
    expect(wrapper.text()).toContain('与 2 位幕僚同行')
  })

  it('每个幕卡片显示进度条', async () => {
    const wrapper = await getWrapper()
    const progressBars = wrapper.findAll('.dingyin-progress-fill')
    expect(progressBars).toHaveLength(4)
  })

  it('点击幕卡片可展开查看详情', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.dingyin-act-card')
    // 默认第一个展开
    expect(wrapper.text()).toContain('已完成专注：5 次')
    // 点击第二个卡片
    await cards[1].trigger('click')
    expect(wrapper.text()).toContain('总交互次数：15')
  })

  it('显示汇总进度', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('4')
  })

  it('返回按钮存在', async () => {
    const wrapper = await getWrapper()
    const backBtn = wrapper.find('.dingyin-back-btn')
    expect(backBtn.exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd project/frontend && npx vitest run src/views/__tests__/DingyinFourActs.test.ts --reporter=verbose 2>&1`
Expected: FAIL with "Cannot find module" error

- [ ] **Step 3: Create DingyinFourActs.vue**

```vue
<template>
  <div class="dfa">
    <!-- 氛围背景 -->
    <div class="dfa-atmos">
      <div class="dfa-ambient-glow"></div>
    </div>

    <!-- 头部 -->
    <header class="dfa-header">
      <button class="dfa-back-btn" @click="goBack">← 返回</button>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">镜我 · 定音锤</p>
      <h1 class="dfa-title">四幕</h1>
      <p class="dfa-subtitle">你走过的每一步，都在这里留下回响</p>
    </header>

    <!-- 汇总进度 -->
    <div class="dfa-progress-overview">
      <div class="dfa-progress-stat">
        <span class="dfa-progress-value">{{ progress.completed }} / {{ progress.total }}</span>
        <span class="dfa-progress-label">幕已启</span>
      </div>
      <div class="dfa-progress-bar">
        <div class="dfa-progress-fill" :style="{ width: (progress.completed / progress.total * 100) + '%' }"></div>
      </div>
    </div>

    <!-- 四幕卡片列表 -->
    <div class="dfa-acts-list">
      <div
        v-for="act in acts"
        :key="act.id"
        class="dingyin-act-card"
        :class="{ expanded: expandedAct === act.id }"
        :style="{ '--act-color': act.color }"
        @click="toggleAct(act.id)"
      >
        <div class="dingyin-act-header">
          <span class="dingyin-act-icon">{{ act.icon }}</span>
          <div class="dingyin-act-title-area">
            <h3 class="dingyin-act-title">{{ act.title }}</h3>
            <p class="dingyin-act-summary">{{ act.summary }}</p>
          </div>
          <div class="dingyin-act-progress-ring">
            <svg viewBox="0 0 36 36" class="dingyin-ring-svg">
              <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="ring-fill" :stroke-dasharray="`${act.progress * 100}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="dingyin-ring-text">{{ Math.round(act.progress * 100) }}%</span>
          </div>
        </div>

        <!-- 展开详情 -->
        <Transition name="act-detail">
          <div v-if="expandedAct === act.id" class="dingyin-act-detail">
            <div class="dingyin-detail-divider"></div>
            <div class="dingyin-detail-lines">
              <div v-for="(line, idx) in act.detailLines" :key="idx" class="dingyin-detail-line">
                <span class="detail-bullet">·</span>
                <span class="detail-text">{{ line }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvisorStore } from '../stores/advisor'

const router = useRouter()
const advisor = useAdvisorStore()

const expandedAct = ref<string | null>('act-1')

const acts = computed(() => advisor.getFourActs())
const progress = computed(() => advisor.getFourActsProgress())

function toggleAct(id: string) {
  expandedAct.value = expandedAct.value === id ? null : id
}

function goBack() {
  router.back()
}
</script>

<style scoped>
/* =============================================================
   定音锤四幕 — Warm Amber Theme
   ============================================================= */
.dfa {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: linear-gradient(160deg, #0d0b09 0%, #14100b 30%, #0f0c09 65%, #0a0806 100%);
  position: relative;
  overflow: hidden;
}

.dfa-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.dfa-ambient-glow {
  position: absolute;
  top: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 500px;
  background: radial-gradient(ellipse, rgba(212,165,116,0.06) 0%, transparent 70%);
}

/* ---- Header ---- */
.dfa-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}
.dfa-back-btn {
  position: absolute;
  left: 0;
  top: 0;
  background: none;
  border: 1px solid rgba(212,165,116,0.12);
  border-radius: 8px;
  padding: 6px 14px;
  color: rgba(212,165,116,0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.dfa-back-btn:hover {
  color: var(--accent);
  border-color: rgba(212,165,116,0.25);
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}
.orn-line {
  display: inline-block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
.orn-diamond {
  font-size: 14px;
  color: var(--accent);
  opacity: 0.7;
}
.header-kicker {
  font-size: 11px;
  letter-spacing: 3px;
  color: rgba(212,165,116,0.5);
  margin-bottom: 6px;
}
.dfa-title {
  font-size: 28px;
  font-weight: 300;
  letter-spacing: 8px;
  color: var(--accent);
  margin: 0 0 8px;
}
.dfa-subtitle {
  font-size: 12px;
  color: rgba(212,165,116,0.3);
  margin: 0;
  letter-spacing: 1px;
}

/* ---- Progress Overview ---- */
.dfa-progress-overview {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(212,165,116,0.04);
  border: 1px solid rgba(212,165,116,0.08);
  position: relative;
  z-index: 1;
}
.dfa-progress-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}
.dfa-progress-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.1;
}
.dfa-progress-label {
  font-size: 10px;
  color: rgba(212,165,116,0.4);
  letter-spacing: 1px;
}
.dfa-progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(212,165,116,0.08);
  overflow: hidden;
}
.dfa-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(212,165,116,0.3), var(--accent));
  transition: width 0.6s ease;
}

/* ---- Acts List ---- */
.dfa-acts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 1;
}

/* ---- Act Card ---- */
.dingyin-act-card {
  padding: 18px;
  border-radius: 14px;
  background: rgba(212,165,116,0.03);
  border: 1px solid rgba(212,165,116,0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.dingyin-act-card:hover {
  background: rgba(212,165,116,0.06);
  border-color: rgba(212,165,116,0.15);
}
.dingyin-act-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--act-color, var(--accent));
  opacity: 0.3;
  border-radius: 0 2px 2px 0;
  transition: opacity 0.3s;
}
.dingyin-act-card:hover::before {
  opacity: 0.6;
}
.dingyin-act-card.expanded {
  border-color: rgba(212,165,116,0.18);
  background: rgba(212,165,116,0.05);
}
.dingyin-act-card.expanded::before {
  opacity: 0.8;
}

/* ---- Act Header ---- */
.dingyin-act-header {
  display: flex;
  align-items: center;
  gap: 14px;
}
.dingyin-act-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}
.dingyin-act-title-area {
  flex: 1;
  min-width: 0;
}
.dingyin-act-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(240,232,224,0.9);
  margin: 0 0 4px;
  letter-spacing: 1px;
}
.dingyin-act-summary {
  font-size: 12px;
  color: rgba(212,165,116,0.5);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- Progress Ring ---- */
.dingyin-act-progress-ring {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}
.dingyin-ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: rgba(212,165,116,0.08);
  stroke-width: 3;
}
.ring-fill {
  fill: none;
  stroke: var(--act-color, var(--accent));
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease;
}
.dingyin-ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: rgba(212,165,116,0.5);
  font-weight: 500;
}

/* ---- Detail ---- */
.dingyin-act-detail {
  overflow: hidden;
}
.dingyin-detail-divider {
  height: 1px;
  background: rgba(212,165,116,0.08);
  margin: 14px 0 12px;
}
.dingyin-detail-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dingyin-detail-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  color: rgba(240,232,224,0.6);
}
.detail-bullet {
  color: var(--act-color, var(--accent));
  opacity: 0.5;
  font-size: 10px;
}
.detail-text {
  flex: 1;
}

/* ---- Transition ---- */
.act-detail-enter-active {
  transition: all 0.3s ease-out;
}
.act-detail-leave-active {
  transition: all 0.2s ease-in;
}
.act-detail-enter-from {
  opacity: 0;
  max-height: 0;
}
.act-detail-enter-to {
  opacity: 1;
  max-height: 300px;
}
.act-detail-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .dfa { padding: 24px 14px 56px; }
  .dfa-title { font-size: 24px; }
  .dingyin-act-card { padding: 14px; }
  .dingyin-act-icon { font-size: 24px; }
}
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd project/frontend && npx vitest run src/views/__tests__/DingyinFourActs.test.ts --reporter=verbose 2>&1`
Expected: All tests PASS

---

### Task 5: Add entry point to MirrorSelf and create AdvisorScheduler

**Files:**
- Modify: `src/components/MirrorSelf.vue` (add entry button to Four Acts)
- Create: `src/components/AdvisorScheduler.vue`

- [ ] **Step 1: Write failing tests for MirrorSelf entry point**

Add to `src/components/__tests__/MirrorSelf.test.ts`:

```typescript
it('渲染定音锤四幕入口按钮', async () => {
  const wrapper = await getWrapper()
  const entryBtn = wrapper.find('.dingyin-entry-btn')
  expect(entryBtn.exists()).toBe(true)
  expect(entryBtn.text()).toContain('四幕')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd project/frontend && npx vitest run src/components/__tests__/MirrorSelf.test.ts --reporter=verbose 2>&1 | head -30`
Expected: FAIL - element not found

- [ ] **Step 3: Add entry button to MirrorSelf.vue**

Add to the `<template>` of `src/components/MirrorSelf.vue`, after the tooltip section:

```vue
    <!-- 定音锤四幕入口 -->
    <button class="dingyin-entry-btn" @click="openFourActs" title="定音锤四幕">
      <span class="dingyin-entry-icon">📜</span>
      <span class="dingyin-entry-label">四幕</span>
    </button>
```

Add to the `<script setup>`:

```typescript
import { useRouter } from 'vue-router'
const router = useRouter()

function openFourActs() {
  router.push('/dingyin-four-acts')
}
```

Add to `<style scoped>`:

```css
/* ========== 定音锤四幕入口 ========== */
.dingyin-entry-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid rgba(212,165,116,0.1);
  border-radius: 20px;
  background: rgba(212,165,116,0.04);
  color: rgba(212,165,116,0.5);
  font-size: 10px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}
.dingyin-entry-btn:hover {
  background: rgba(212,165,116,0.1);
  border-color: rgba(212,165,116,0.25);
  color: var(--accent);
}
.dingyin-entry-icon {
  font-size: 12px;
  line-height: 1;
}
.dingyin-entry-label {
  font-weight: 500;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd project/frontend && npx vitest run src/components/__tests__/MirrorSelf.test.ts --reporter=verbose 2>&1`
Expected: All tests PASS

- [ ] **Step 5: Create AdvisorScheduler.vue**

```vue
<template>
  <div class="ascheduler">
    <!-- 任务感知概览 -->
    <div class="ascheduler-section">
      <h4 class="ascheduler-section-title">任务感知</h4>
      <div class="ascheduler-grid">
        <div class="ascheduler-chip">
          <span class="ascheduler-chip-icon">🎯</span>
          <span class="ascheduler-chip-value">{{ awareness.focusCount }}</span>
          <span class="ascheduler-chip-label">今日专注</span>
        </div>
        <div class="ascheduler-chip">
          <span class="ascheduler-chip-icon">📝</span>
          <span class="ascheduler-chip-value">{{ awareness.noteCount }}</span>
          <span class="ascheduler-chip-label">今日笔记</span>
        </div>
        <div class="ascheduler-chip">
          <span class="ascheduler-chip-icon">💭</span>
          <span class="ascheduler-chip-value">{{ awareness.emotionCount }}</span>
          <span class="ascheduler-chip-label">今日情绪</span>
        </div>
        <div class="ascheduler-chip">
          <span class="ascheduler-chip-icon">⚓</span>
          <span class="ascheduler-chip-value">{{ awareness.anchorCount }}</span>
          <span class="ascheduler-chip-label">待锚点</span>
        </div>
      </div>
    </div>

    <!-- 分身调度 -->
    <div class="ascheduler-section">
      <h4 class="ascheduler-section-title">分身调度</h4>
      <div class="ascheduler-avatar-row">
        <div v-for="task in ['focus', 'note', 'emotion', 'anchor']" :key="task" class="ascheduler-avatar-card" @click="handleDispatch(task)">
          <span class="ascheduler-task-icon">{{ taskIcons[task as keyof typeof taskIcons] }}</span>
          <span class="ascheduler-task-label">{{ taskLabels[task as keyof typeof taskLabels] }}</span>
          <span v-if="dispatched[task]" class="ascheduler-dispatched-name">{{ dispatched[task]?.name }}</span>
          <span v-else class="ascheduler-dispatched-hint">点此调度</span>
        </div>
      </div>
    </div>

    <!-- 进度展示 -->
    <div class="ascheduler-section">
      <h4 class="ascheduler-section-title">进度展示</h4>
      <div class="ascheduler-progress-list">
        <div v-for="item in progressItems" :key="item.key" class="ascheduler-progress-row">
          <span class="ascheduler-progress-label">{{ item.label }}</span>
          <div class="ascheduler-progress-bar">
            <div class="ascheduler-progress-fill" :style="{ width: item.percent + '%' }"></div>
          </div>
          <span class="ascheduler-progress-text">{{ item.current }}/{{ item.total }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useAdvisorStore } from '../stores/advisor'

const advisor = useAdvisorStore()

const awareness = computed(() => advisor.getTaskAwareness())
const progress = computed(() => advisor.getTaskProgress())

const taskIcons = { focus: '🎯', note: '📝', emotion: '💭', anchor: '⚓' }
const taskLabels = { focus: '专注', note: '笔记', emotion: '情绪', anchor: '锚点' }

const dispatched = reactive<Record<string, { id: string; name: string } | null>>({
  focus: null,
  note: null,
  emotion: null,
  anchor: null,
})

function handleDispatch(task: string) {
  const result = advisor.dispatchAvatar(task)
  if (result) {
    dispatched[task] = { id: result.id, name: result.name }
  }
}

const progressItems = computed(() => [
  { key: 'focus', label: '专注', current: progress.value.focus.current, total: progress.value.focus.total, percent: Math.min(100, Math.round(progress.value.focus.current / progress.value.focus.total * 100)) },
  { key: 'notes', label: '笔记', current: progress.value.notes.current, total: progress.value.notes.total, percent: Math.min(100, Math.round(progress.value.notes.current / progress.value.notes.total * 100)) },
  { key: 'emotions', label: '情绪', current: progress.value.emotions.current, total: progress.value.emotions.total, percent: Math.min(100, Math.round(progress.value.emotions.current / progress.value.emotions.total * 100)) },
  { key: 'anchors', label: '锚点', current: progress.value.anchors.current, total: progress.value.anchors.total, percent: Math.min(100, Math.round(progress.value.anchors.current / progress.value.anchors.total * 100)) },
])
</script>

<style scoped>
.ascheduler {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ascheduler-section-title {
  font-size: 12px;
  font-weight: 500;
  color: rgba(212,165,116,0.5);
  margin: 0 0 12px;
  letter-spacing: 1px;
}
.ascheduler-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ascheduler-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  border-radius: 10px;
  background: rgba(212,165,116,0.03);
  border: 1px solid rgba(212,165,116,0.06);
}
.ascheduler-chip-icon {
  font-size: 18px;
  line-height: 1;
}
.ascheduler-chip-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.1;
}
.ascheduler-chip-label {
  font-size: 9px;
  color: rgba(212,165,116,0.35);
  letter-spacing: 0.5px;
}
.ascheduler-avatar-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ascheduler-avatar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px;
  border-radius: 12px;
  background: rgba(212,165,116,0.03);
  border: 1px solid rgba(212,165,116,0.08);
  cursor: pointer;
  transition: all 0.2s;
}
.ascheduler-avatar-card:hover {
  background: rgba(212,165,116,0.07);
  border-color: rgba(212,165,116,0.18);
}
.ascheduler-task-icon {
  font-size: 22px;
  line-height: 1;
}
.ascheduler-task-label {
  font-size: 10px;
  color: rgba(212,165,116,0.4);
}
.ascheduler-dispatched-name {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}
.ascheduler-dispatched-hint {
  font-size: 10px;
  color: rgba(212,165,116,0.2);
}
.ascheduler-progress-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ascheduler-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ascheduler-progress-label {
  width: 40px;
  font-size: 11px;
  color: rgba(212,165,116,0.4);
  flex-shrink: 0;
}
.ascheduler-progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(212,165,116,0.08);
  overflow: hidden;
}
.ascheduler-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(212,165,116,0.3), var(--accent));
  transition: width 0.4s ease;
}
.ascheduler-progress-text {
  width: 36px;
  font-size: 10px;
  color: rgba(212,165,116,0.3);
  text-align: right;
  flex-shrink: 0;
}
@media (max-width: 640px) {
  .ascheduler-grid,
  .ascheduler-avatar-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
```

---

### Task 6: Add scheduling display to AdvisorHub

**Files:**
- Modify: `src/views/AdvisorHub.vue` (add scheduler section)

- [ ] **Step 1: Write failing tests**

Add to `src/views/__tests__/AdvisorHub.test.ts`:

```typescript
it('幕僚大厅显示调度面板', async () => {
  const wrapper = await getWrapper()
  expect(wrapper.find('.ascheduler').exists()).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd project/frontend && npx vitest run src/views/__tests__/AdvisorHub.test.ts --reporter=verbose 2>&1 | head -20`
Expected: FAIL

- [ ] **Step 3: Add scheduler section to AdvisorHub.vue**

In `src/views/AdvisorHub.vue`, add after the chat area section (around line 71):

```vue
    <!-- 幕僚调度 -->
    <section class="ah-scheduler-section">
      <h3 class="ah-scheduler-heading">⚙ 幕僚调度</h3>
      <AdvisorScheduler />
    </section>
```

Add to the `<script setup>`:

```typescript
import AdvisorScheduler from '../components/AdvisorScheduler.vue'
```

Add to `<style scoped>`:

```css
.ah-scheduler-section {
  margin-top: 28px;
  position: relative;
  z-index: 1;
}
.ah-scheduler-heading {
  font-size: 14px;
  color: rgba(212,165,116,0.55);
  margin-bottom: 12px;
  letter-spacing: 1px;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd project/frontend && npx vitest run src/views/__tests__/AdvisorHub.test.ts --reporter=verbose 2>&1`
Expected: All tests PASS

---

### Task 7: Register route for DingyinFourActs and full verification

**Files:**
- Modify: Router config (find the router file)

- [ ] **Step 1: Find the router file**

Run: `grep -r "createRouter" src/ --include="*.ts" -l` or look for the router configuration

- [ ] **Step 2: Add the route**

```typescript
{
  path: '/dingyin-four-acts',
  name: 'DingyinFourActs',
  component: () => import('../views/DingyinFourActs.vue'),
}
```

- [ ] **Step 3: Run TypeScript type check**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 4: Run all tests**

Run: `cd project/frontend && npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 5: Run constitution compliance tests**

Run: `cd project/frontend && npx vitest run src/engine/__tests__/constitution-compliance.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: All 20 constitution compliance tests PASS

---

## Self-Review Checklist

1. **Spec coverage:**
   - 定音锤四幕: ✅ Task 1 (store methods) + Task 4 (view) + Task 5 (entry point)
   - 年度对话: ✅ Task 2 (enhanced narrative)
   - 幕僚调度: ✅ Task 3 (store methods) + Task 5 (AdvisorScheduler component) + Task 6 (AdvisorHub integration)

2. **Placeholder scan:** No TBD/TODO patterns found. All code blocks contain complete implementations.

3. **Type consistency:** 
   - `FourActItem` interface defined in Task 1, used in Task 4
   - `TaskAwareness`, `TaskProgress` interfaces defined in Task 3, used in Task 5
   - Return structures consistent across all tasks