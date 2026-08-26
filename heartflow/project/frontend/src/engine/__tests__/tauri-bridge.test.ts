// ============================================================
// Tauri Bridge 测试
// 测试所有命令封装函数的类型和接口契约
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

// 每个测试重新导入以获取 fresh mock
let tauriBridge: typeof import('../tauri-bridge')

beforeEach(async () => {
  mockInvoke.mockReset()
  // 重新导入模块以刷新内部状态
  tauriBridge = await import('../tauri-bridge')
})

describe('Tauri Bridge — 存储命令', () => {
  describe('loadStorage', () => {
    it('调用 cmd_load_storage 并返回结果', async () => {
      mockInvoke.mockResolvedValueOnce('{"version":10,"sessions":[]}')
      const result = await tauriBridge.loadStorage()
      expect(result.success).toBe(true)
      expect(result.data).toBe('{"version":10,"sessions":[]}')
      expect(mockInvoke).toHaveBeenCalledWith('cmd_load_storage')
    })

    it('invoke 失败时返回错误', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('File not found'))
      const result = await tauriBridge.loadStorage()
      expect(result.success).toBe(false)
      expect(result.error).toContain('File not found')
    })
  })

  describe('saveStorage', () => {
    it('调用 cmd_save_storage 并传递 data 参数', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.saveStorage('{"test":true}')
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_save_storage', { data: '{"test":true}' })
    })
  })

  describe('clearStorage', () => {
    it('调用 cmd_clear_storage', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.clearStorage()
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_clear_storage')
    })
  })
})

describe('Tauri Bridge — SQLite 命令', () => {
  describe('sqliteGetKv', () => {
    it('调用 cmd_sqlite_get_kv 并传递 key', async () => {
      mockInvoke.mockResolvedValueOnce('{"theme":"dark"}')
      const result = await tauriBridge.sqliteGetKv('config')
      expect(result.success).toBe(true)
      expect(result.data).toBe('{"theme":"dark"}')
      expect(mockInvoke).toHaveBeenCalledWith('cmd_sqlite_get_kv', { key: 'config' })
    })
  })

  describe('sqliteSetKv', () => {
    it('调用 cmd_sqlite_set_kv 并传递 key 和 value', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.sqliteSetKv('config', '{"theme":"dark"}')
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_sqlite_set_kv', {
        key: 'config',
        value: '{"theme":"dark"}',
      })
    })
  })

  describe('sqliteDeleteKv', () => {
    it('调用 cmd_sqlite_delete_kv 并传递 key', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.sqliteDeleteKv('config')
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_sqlite_delete_kv', { key: 'config' })
    })
  })

  describe('sqliteGetAllKv', () => {
    it('调用 cmd_sqlite_get_all_kv', async () => {
      mockInvoke.mockResolvedValueOnce('[{"key":"a","value":"1"}]')
      const result = await tauriBridge.sqliteGetAllKv()
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_sqlite_get_all_kv')
    })
  })

  describe('sqliteQuery', () => {
    it('调用 cmd_sqlite_query 并传递 query', async () => {
      mockInvoke.mockResolvedValueOnce('[{"id":"s1"}]')
      const result = await tauriBridge.sqliteQuery('SELECT * FROM sessions')
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_sqlite_query', {
        query: 'SELECT * FROM sessions',
      })
    })
  })

  describe('sqliteExecute', () => {
    it('调用 cmd_sqlite_execute 并传递 statement', async () => {
      mockInvoke.mockResolvedValueOnce('1')
      const result = await tauriBridge.sqliteExecute('INSERT INTO kv_store VALUES ("k","v")')
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_sqlite_execute', {
        statement: 'INSERT INTO kv_store VALUES ("k","v")',
      })
    })
  })

  describe('sqliteBackup', () => {
    it('调用 cmd_sqlite_backup', async () => {
      mockInvoke.mockResolvedValueOnce('/path/to/backup.db')
      const result = await tauriBridge.sqliteBackup()
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_sqlite_backup')
    })
  })

  describe('sqliteRestore', () => {
    it('调用 cmd_sqlite_restore', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.sqliteRestore()
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_sqlite_restore')
    })
  })
})

describe('Tauri Bridge — AI 代理命令', () => {
  describe('aiChat', () => {
    it('调用 cmd_ai_chat 并传递 messages', async () => {
      mockInvoke.mockResolvedValueOnce('你好！')
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const result = await tauriBridge.aiChat(messages)
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_ai_chat', { messages })
    })
  })

  describe('aiAnalyzeSentiment', () => {
    it('调用 cmd_ai_analyze_sentiment 并传递 text', async () => {
      mockInvoke.mockResolvedValueOnce('positive')
      const result = await tauriBridge.aiAnalyzeSentiment('今天很开心')
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_ai_analyze_sentiment', {
        text: '今天很开心',
      })
    })
  })

  describe('aiGenerateSummary', () => {
    it('调用 cmd_ai_generate_summary 并传递 entries', async () => {
      mockInvoke.mockResolvedValueOnce('Summary...')
      const result = await tauriBridge.aiGenerateSummary(['entry1', 'entry2'])
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_ai_generate_summary', {
        entries: ['entry1', 'entry2'],
      })
    })
  })

  describe('aiSuggestActions', () => {
    it('调用 cmd_ai_suggest_actions 并传递 context', async () => {
      mockInvoke.mockResolvedValueOnce('建议...')
      const result = await tauriBridge.aiSuggestActions('今天心情低落')
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_ai_suggest_actions', {
        context: '今天心情低落',
      })
    })
  })

  describe('aiConfigure', () => {
    it('调用 cmd_ai_configure 并传递 config', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const config = {
        model_url: 'https://api.openai.com/v1/chat/completions',
        api_key: 'sk-test',
        model_name: 'gpt-4o-mini',
        max_tokens: 1024,
        temperature: 0.7,
      }
      const result = await tauriBridge.aiConfigure(config)
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_ai_configure', { config })
    })
  })

  describe('aiGetStatus', () => {
    it('调用 cmd_ai_get_status', async () => {
      const status = {
        configured: true,
        model_name: 'gpt-4o-mini',
        model_url: 'https://api.openai.com/v1/chat/completions',
        max_tokens: 1024,
        temperature: 0.7,
      }
      mockInvoke.mockResolvedValueOnce(status)
      const result = await tauriBridge.aiGetStatus()
      expect(result.success).toBe(true)
      expect(result.data).toEqual(status)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_ai_get_status')
    })
  })
})

describe('Tauri Bridge — 触角系统命令', () => {
  describe('checkAutoStart', () => {
    it('调用 cmd_check_auto_start', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      const result = await tauriBridge.checkAutoStart()
      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_check_auto_start')
    })
  })

  describe('setAutoStart', () => {
    it('调用 cmd_set_auto_start 并传递 enabled', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.setAutoStart(true)
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_set_auto_start', { enabled: true })
    })
  })

  describe('registerShortcut', () => {
    it('调用 cmd_register_passing_shortcut 并传递 shortcut', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.registerShortcut('Ctrl+Shift+K')
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_register_passing_shortcut', {
        shortcut: 'Ctrl+Shift+K',
      })
    })
  })

  describe('unregisterAllShortcuts', () => {
    it('调用 cmd_unregister_all_shortcuts', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.unregisterAllShortcuts()
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_unregister_all_shortcuts')
    })
  })

  describe('openOverlayWindow', () => {
    it('调用 cmd_open_overlay_window 并传递 color 和 opacity', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.openOverlayWindow('#000000', 0.5)
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_open_overlay_window', {
        color: '#000000',
        opacity: 0.5,
        form: 'silent',
        glow: '#d8a866',
        show_beacon: true,
        show_hint: true,
        glow_intensity: 1.0,
      })
    })
  })

  describe('closeOverlayWindow', () => {
    it('调用 cmd_close_overlay_window', async () => {
      mockInvoke.mockResolvedValueOnce(undefined)
      const result = await tauriBridge.closeOverlayWindow()
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_close_overlay_window')
    })
  })

  describe('getTouchpointStatus', () => {
    it('调用 cmd_get_touchpoint_status', async () => {
      const status = {
        autoStart: true,
        shortcutCount: 3,
        overlayActive: false,
      }
      mockInvoke.mockResolvedValueOnce(status)
      const result = await tauriBridge.getTouchpointStatus()
      expect(result.success).toBe(true)
      expect(result.data).toEqual(status)
      expect(mockInvoke).toHaveBeenCalledWith('cmd_get_touchpoint_status')
    })
  })
})

describe('Tauri Bridge — 批量操作', () => {
  describe('sqliteSetKvBatch', () => {
    it('逐个调用 cmd_sqlite_set_kv 写入多个键值', async () => {
      mockInvoke.mockResolvedValue(undefined)
      const entries = [
        { key: 'k1', value: 'v1' },
        { key: 'k2', value: 'v2' },
        { key: 'k3', value: 'v3' },
      ]
      const result = await tauriBridge.sqliteSetKvBatch(entries)
      expect(result.success).toBe(true)
      expect(mockInvoke).toHaveBeenCalledTimes(3)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'cmd_sqlite_set_kv', { key: 'k1', value: 'v1' })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'cmd_sqlite_set_kv', { key: 'k2', value: 'v2' })
      expect(mockInvoke).toHaveBeenNthCalledWith(3, 'cmd_sqlite_set_kv', { key: 'k3', value: 'v3' })
    })

    it('部分失败时返回错误', async () => {
      mockInvoke
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Write failed'))
        .mockResolvedValueOnce(undefined)

      const entries = [
        { key: 'k1', value: 'v1' },
        { key: 'k2', value: 'v2' },
        { key: 'k3', value: 'v3' },
      ]
      const result = await tauriBridge.sqliteSetKvBatch(entries)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Write failed')
    })
  })

  describe('sqliteGetKvBatch', () => {
    it('逐个调用 cmd_sqlite_get_kv 获取多个键值', async () => {
      mockInvoke
        .mockResolvedValueOnce('v1')
        .mockResolvedValueOnce('v2')
        .mockRejectedValueOnce(new Error('Not found'))

      const result = await tauriBridge.sqliteGetKvBatch(['k1', 'k2', 'k3'])
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        k1: 'v1',
        k2: 'v2',
        k3: null,
      })
    })
  })
})

describe('CommandResult 类型', () => {
  it('成功的 CommandResult 包含 data 字段', async () => {
    mockInvoke.mockResolvedValueOnce('test-data')
    const result = await tauriBridge.loadStorage()
    if (result.success) {
      // TypeScript 类型守卫：success 为 true 时 data 应存在
      expect(result.data).toBe('test-data')
    }
  })

  it('失败的 CommandResult 包含 error 字段', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('BOOM'))
    const result = await tauriBridge.loadStorage()
    if (!result.success) {
      // TypeScript 类型守卫：success 为 false 时 error 应存在
      expect(result.error).toBeDefined()
    }
  })
})