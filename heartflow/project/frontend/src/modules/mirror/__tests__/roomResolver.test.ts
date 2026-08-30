// 房间路由解析器单测：覆盖用户口语 → 真实路由
// 修复「镜我只回『正在跳转』却不跳」——写死 roomRouteMap 死路由/缺项
import { describe, it, expect } from 'vitest'
import { resolveRoomRoute } from '../roomResolver'

describe('resolveRoomRoute', () => {
  it('精确别名：殿堂设置 → /settings', () => {
    expect(resolveRoomRoute('殿堂设置')).toEqual({ path: '/settings', roomName: '殿堂设置' })
  })

  it('口语别名与房间图 name 不一致：知识殿堂 → /knowledge（房间图 name 为「经略阁」）', () => {
    expect(resolveRoomRoute('知识殿堂')).toEqual({ path: '/knowledge', roomName: '知识殿堂' })
  })

  it('口语别名：情绪花房 → /garden', () => {
    expect(resolveRoomRoute('情绪花房')).toEqual({ path: '/garden', roomName: '情绪花房' })
  })

  it('口语别名：成长庭院 / 成长花园 → /growth-garden', () => {
    expect(resolveRoomRoute('成长庭院')).toEqual({ path: '/growth-garden', roomName: '成长庭院' })
    expect(resolveRoomRoute('成长花园')).toEqual({ path: '/growth-garden', roomName: '成长花园' })
  })

  it('路由存在但房间图未注册节点：房间管理器 → /room-manager', () => {
    expect(resolveRoomRoute('房间管理器')).toEqual({ path: '/room-manager', roomName: '房间管理器' })
  })

  it('房间图 name 精准匹配：经略阁 → /knowledge', () => {
    expect(resolveRoomRoute('经略阁')).toEqual({ path: '/knowledge', roomName: '经略阁' })
  })

  it('家 / 心流 / 首页 映射到根', () => {
    expect(resolveRoomRoute('家')).toEqual({ path: '/home-space', roomName: '家' })
    expect(resolveRoomRoute('心流')).toEqual({ path: '/', roomName: '心流' })
    expect(resolveRoomRoute('首页').path).toBe('/')
  })

  it('包含匹配：花房 → /garden', () => {
    expect(resolveRoomRoute('花房').path).toBe('/garden')
  })

  it('记账同义词 → /reward（劳酬空间，记账 v2）：让「打开记账」经 explore 也能跳转', () => {
    expect(resolveRoomRoute('记账').path).toBe('/reward')
    expect(resolveRoomRoute('账本').path).toBe('/reward')
    expect(resolveRoomRoute('财务').path).toBe('/reward')
    expect(resolveRoomRoute('开销').path).toBe('/reward')
    expect(resolveRoomRoute('劳酬').path).toBe('/reward')
  })

  it('无法解析返回 null，调用方据此回退提示', () => {
    expect(resolveRoomRoute('一个不存在的房间xyz')).toEqual({ path: null, roomName: null })
    expect(resolveRoomRoute('').path).toBeNull()
  })

  it('大小写与空格不敏感', () => {
    expect(resolveRoomRoute(' 殿堂设置 ').path).toBe('/settings')
    expect(resolveRoomRoute('DIAN TANG SHE ZHI')).toBeDefined()
  })
})
