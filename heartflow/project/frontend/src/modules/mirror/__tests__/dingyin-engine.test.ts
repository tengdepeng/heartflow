// ============================================================
// 定音锤 · 证据聚合引擎 测试
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from '../../../engine/storage'
import {
  gatherFourActs,
  getIronLawResponse,
  getFourActsProgress,
  knockAndGetFreshness,
  checkFreshness,
} from '../dingyin-engine'

describe('dingyin-engine', () => {
  beforeEach(() => {
    storage.clear()
  })

  describe('gatherFourActs', () => {
    it('空数据时返回四幕空壳', () => {
      const acts = gatherFourActs()
      expect(acts).toHaveLength(4)
      expect(acts[0].id).toBe('act_what_you_did')
      expect(acts[1].id).toBe('act_how_you_treat_others')
      expect(acts[2].id).toBe('act_how_you_grow')
      expect(acts[3].id).toBe('act_inner_voice')

      // 空数据时每幕进度为 0
      for (const act of acts) {
        expect(act.progress).toBe(0)
      }
    })

    it('有专注数据时第一幕包含专注证据', () => {
      const now = new Date().toISOString()
      const today = now.slice(0, 10)
      storage.setSessions([
        {
          id: 's1',
          startedAt: now,
          completedAt: `${today}T10:00:00.000Z`,
          elapsed: 25 * 60000,
          plannedDuration: 25 * 60000,
          pausedDuration: 0,
          pausedAt: null,
          status: 'completed',
          mode: 'focus',
          tags: [],
          note: '',
          carrierId: null,
        },
        {
          id: 's2',
          startedAt: now,
          completedAt: `${today}T14:00:00.000Z`,
          elapsed: 45 * 60000,
          plannedDuration: 45 * 60000,
          pausedDuration: 0,
          pausedAt: null,
          status: 'completed',
          mode: 'focus',
          tags: [],
          note: '',
          carrierId: null,
        },
      ])

      const acts = gatherFourActs()
      const act1 = acts[0]
      expect(act1.progress).toBeGreaterThan(0)
      expect(act1.detailLines.some(l => l.includes('专注完成 2 次'))).toBe(true)
      expect(act1.detailLines.some(l => l.includes('1 小时 10 分钟'))).toBe(true)
    })

    it('有笔记数据时第一幕包含笔记证据', () => {
      const now = new Date().toISOString()
      storage.setNotes([
        { id: 'n1', title: '笔记1', content: '', createdAt: now, updatedAt: now, tags: [] },
        { id: 'n2', title: '笔记2', content: '', createdAt: now, updatedAt: now, tags: [] },
        { id: 'n3', title: '笔记3', content: '', createdAt: now, updatedAt: now, tags: [] },
      ])

      const acts = gatherFourActs()
      expect(acts[0].detailLines.some(l => l.includes('笔记 3 篇'))).toBe(true)
    })

    it('有关系数据时第二幕包含关系证据', () => {
      const now = new Date().toISOString()
      storage.setRelations([
        {
          id: 'r1', name: '张三', relation: 'friend', closeness: 0.8,
          lastContact: now, tags: [], notes: '', color: '#ccc',
          importantDates: [], createdAt: now, updatedAt: now,
        },
        {
          id: 'r2', name: '李四', relation: 'family', closeness: 0.95,
          lastContact: now, tags: [], notes: '', color: '#ccc',
          importantDates: [], createdAt: now, updatedAt: now,
        },
      ])

      const acts = gatherFourActs()
      const act2 = acts[1]
      expect(act2.progress).toBeGreaterThan(0)
      expect(act2.detailLines.some(l => l.includes('人物卡片 2 张'))).toBe(true)
      expect(act2.detailLines.some(l => l.includes('张三'))).toBe(true)
      expect(act2.detailLines.some(l => l.includes('李四'))).toBe(true)
    })

    it('有目标数据时第三幕包含目标证据', () => {
      storage.setGoals([
        {
          id: 'g1', title: '学习Vue', description: '', tier: 'target',
          domain: 'work', status: 'growing', order: 0,
          anchorCount: 0, anchorDone: 0, createdAt: '', updatedAt: '',
        },
        {
          id: 'g2', title: '每天跑步', description: '', tier: 'plan',
          domain: 'health', status: 'bloom', order: 1,
          anchorCount: 0, anchorDone: 0, createdAt: '', updatedAt: '',
        },
      ])

      const acts = gatherFourActs()
      const act3 = acts[2]
      expect(act3.progress).toBeGreaterThan(0)
      expect(act3.detailLines.some(l => l.includes('目标 2 个'))).toBe(true)
      expect(act3.detailLines.some(l => l.includes('已开花 1 个'))).toBe(true)
    })

    it('有情绪数据时第四幕包含情绪证据', () => {
      const now = new Date().toISOString()
      storage.setEmotions([
        { id: 'e1', type: 'happy', note: '', createdAt: now },
        { id: 'e2', type: 'calm', note: '', createdAt: now },
        { id: 'e3', type: 'happy', note: '', createdAt: now },
      ])

      const acts = gatherFourActs()
      const act4 = acts[3]
      expect(act4.progress).toBeGreaterThan(0)
      expect(act4.detailLines.some(l => l.includes('情绪记录 3 次'))).toBe(true)
      expect(act4.detailLines.some(l => l.includes('开心 2 次'))).toBe(true)
    })

    it('有身体日志时第四幕包含身体证据', () => {
      storage.setKV('hf:body_logs', [
        { type: 'sleep', value: { hours: 7.5 }, at: new Date().toISOString() },
        { type: 'sleep', value: { hours: 8 }, at: new Date().toISOString() },
        { type: 'exercise', value: { minutes: 30 }, at: new Date().toISOString() },
      ])

      const acts = gatherFourActs()
      const act4 = acts[3]
      expect(act4.detailLines.some(l => l.includes('平均睡眠 7.8 小时'))).toBe(true)
      expect(act4.detailLines.some(l => l.includes('累计运动 30 分钟'))).toBe(true)
    })

    it('有多模块数据时 summary 包含证据来源数', () => {
      const now = new Date().toISOString()
      storage.setSessions([{
        id: 's1', startedAt: now, completedAt: now, elapsed: 60000,
        plannedDuration: 60000, pausedDuration: 0, pausedAt: null,
        status: 'completed', mode: 'focus', tags: [], note: '', carrierId: null,
      }])
      storage.setNotes([{ id: 'n1', title: '笔记', content: '', createdAt: now, updatedAt: now, tags: [] }])
      storage.setEmotions([{ id: 'e1', type: 'calm', note: '', createdAt: now }])

      const acts = gatherFourActs()
      // 第一幕应该来自 focus + note 两个来源
      expect(acts[0].summary).toContain('个角落')
      expect(acts[0].detailLines.length).toBeGreaterThan(0)
    })
  })

  describe('getIronLawResponse', () => {
    it('返回铁律回应的固定文本', () => {
      const response = getIronLawResponse()
      expect(response).toBe('我把我看到的东西放在这里了。')
    })
  })

  describe('getFourActsProgress', () => {
    it('空数据时返回 0/4', () => {
      const progress = getFourActsProgress()
      expect(progress.completed).toBe(0)
      expect(progress.total).toBe(4)
    })
  })

  describe('knockAndGetFreshness', () => {
    it('首次敲锤返回 null lastKnockedAt', () => {
      const f = knockAndGetFreshness()
      expect(f.lastKnockedAt).toBeNull()
      expect(f.hasSignificantChange).toBe(false)
    })

    it('第二次敲锤记录上次时间', () => {
      knockAndGetFreshness() // 首次
      const f = knockAndGetFreshness() // 第二次
      expect(f.lastKnockedAt).not.toBeNull()
      expect(typeof f.lastKnockedAt).toBe('string')
    })
  })

  describe('checkFreshness', () => {
    it('未敲过锤返回 null', () => {
      const f = checkFreshness()
      expect(f.lastKnockedAt).toBeNull()
      expect(f.hasSignificantChange).toBe(false)
    })

    it('敲过锤后返回上次时间', () => {
      knockAndGetFreshness()
      const f = checkFreshness()
      expect(f.lastKnockedAt).not.toBeNull()
    })
  })
})