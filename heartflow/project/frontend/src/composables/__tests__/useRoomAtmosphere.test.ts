import { describe, it, expect, beforeEach } from 'vitest'
import { ROOM_SCENES, useRoomAtmosphere } from '../useRoomAtmosphere'

describe('useRoomAtmosphere', () => {
  beforeEach(() => {
    const { currentSceneId } = useRoomAtmosphere()
    currentSceneId.value = 'entrance'
  })
  it('初始场景为玄关', () => {
    const { currentScene } = useRoomAtmosphere()
    expect(currentScene.value.id).toBe('entrance')
    expect(currentScene.value.name).toBe('玄关')
  })

  it('switchScene 切换到有效场景', () => {
    const { switchScene, currentScene } = useRoomAtmosphere()
    expect(switchScene('bedroom')).toBe(true)
    expect(currentScene.value.id).toBe('bedroom')
    expect(currentScene.value.name).toBe('卧室')
  })

  it('switchScene 无效场景返回 false', () => {
    const { switchScene, currentScene } = useRoomAtmosphere()
    expect(switchScene('nonexistent')).toBe(false)
    expect(currentScene.value.id).toBe('entrance')
  })

  it('switchScene 切换场景后氛围光色变化', () => {
    const { switchScene, currentScene } = useRoomAtmosphere()
    switchScene('bathroom')
    expect(currentScene.value.atmosphereColor).toBe('#c8e8f0')
    expect(currentScene.value.atmosphereLabel).toBe('水雾蓝 · 5000K')
  })

  it('ROOM_SCENES 包含全部 11 个房间', () => {
    expect(ROOM_SCENES).toHaveLength(11)
    const ids = ROOM_SCENES.map(s => s.id)
    expect(ids).toContain('entrance')
    expect(ids).toContain('wardrobe')
    expect(ids).toContain('kitchen')
    expect(ids).toContain('dining-room')
    expect(ids).toContain('bedroom')
    expect(ids).toContain('bathroom')
    expect(ids).toContain('living-room')
    expect(ids).toContain('study')
    expect(ids).toContain('courtyard')
    expect(ids).toContain('balcony')
    expect(ids).toContain('storage')
  })

  it('每个房间场景都有必须的字段', () => {
    for (const scene of ROOM_SCENES) {
      expect(scene.id).toBeTruthy()
      expect(scene.name).toBeTruthy()
      expect(scene.icon).toBeTruthy()
      expect(scene.description).toBeTruthy()
      expect(scene.atmosphereColor).toBeTruthy()
      expect(scene.atmosphereLabel).toBeTruthy()
    }
  })

  it('applyAtmosphere 设置 CSS 变量', () => {
    const { currentScene, applyAtmosphere } = useRoomAtmosphere()
    applyAtmosphere(currentScene.value)
    const color = document.documentElement.style.getPropertyValue('--room-atmosphere-color')
    expect(color).toBeTruthy()
  })

  it('resetAtmosphere 移除 CSS 变量', () => {
    const { currentScene, applyAtmosphere, resetAtmosphere } = useRoomAtmosphere()
    applyAtmosphere(currentScene.value)
    resetAtmosphere()
    const color = document.documentElement.style.getPropertyValue('--room-atmosphere-color')
    expect(color).toBe('')
  })
})