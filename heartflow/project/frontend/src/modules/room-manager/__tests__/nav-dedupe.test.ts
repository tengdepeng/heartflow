// ============================================================
// 侧边栏去重 · defaultNavVisible 标记测试
// 功能已被其他房间收编的房间默认不进侧边栏（路由保留、父房间内链可达）
// ============================================================

import { describe, expect, it } from 'vitest'
import { getRoom, getAllRooms } from '../../../engine/room-graph'

/** 被收编、默认不进侧边栏的房间及收编它的父房间 */
const DEDUPED: Record<string, string> = {
  'style-market': '材质工坊（风格包管理）/ 殿堂装修工坊',
  'template-market': '殿堂装修工坊',
  'component-market': '材质工坊 / 殿堂装修工坊',
  'carrier-editor': '殿堂装修工坊',
  'advisor-affinity': '幕僚大厅',
  'plugin-market': '插件管理器 / 插件生态',
  'space-customizer': '殿堂装修工坊 / 应用空间',
  'data-outflow': '守护室',
  'mirror-self': '幕僚形象（幕僚大厅内链进入）',
  'decoration-workshop': '殿堂设置「管理入口」',
  'app-space': '殿堂设置「管理入口」',
  'plugins': '殿堂设置「管理入口」',
  'time-corridor': '时间线枢纽（时间可视化视角）',
  'timeline-index': '时间线枢纽（索引视角）',
  'visualization-studio': '时间线枢纽 / 星盘',
  'home-replica': '家（骨架占位）',
  'star-map': '经略阁（3D 视图）',
  'automation-workshop': '自律工坊（自动化引擎）',
  'transform-gallery': '成长庭院',
  'body-wisdom': '身体温室',
}

describe('侧边栏去重 · defaultNavVisible', () => {
  it('被收编房间标记 defaultNavVisible: false', () => {
    for (const id of Object.keys(DEDUPED)) {
      const room = getRoom(id)
      expect(room, `${id} 应存在于房间图`).toBeTruthy()
      expect(room!.defaultNavVisible, `${id} 应默认不进侧边栏（收编于${DEDUPED[id]}）`).toBe(false)
    }
  })

  it('被收编房间路由保留（path 不变，父房间内链可达）', () => {
    for (const id of Object.keys(DEDUPED)) {
      expect(getRoom(id)!.path).toMatch(/^\//)
    }
  })

  it('其余房间默认仍进侧边栏（缺省 true）', () => {
    const others = getAllRooms().filter(r => !(r.id in DEDUPED))
    expect(others.length).toBeGreaterThan(0)
    for (const r of others) {
      expect(r.defaultNavVisible ?? true, `${r.id} 不应被误伤`).toBe(true)
    }
  })
})
