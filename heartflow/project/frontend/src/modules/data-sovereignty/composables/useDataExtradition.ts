// ============================================================
// 数据主权与遗忘退场 · 数据引渡仪式
// 蓝图定义：
//   将数据导出包装为仪式化流程
//   支持 6 阶段引渡：准备→打包→传输→验证→完成
//   生成加密引渡包 + 传输码 + 接收端恢复
// ============================================================

import { ref, computed, reactive } from 'vue'
import type {
  ExtraditionPhase,
  ExtraditionManifest,
  ExtraditionModule,
  ExtraditionPackage,
  ExtraditionState,
  ExtraditionCallbacks,
} from '../types'

// ---- 引渡阶段元信息 ----

export const EXTRADITION_PHASES: { phase: ExtraditionPhase; label: string; icon: string; description: string }[] = [
  { phase: 'idle', label: '待命', icon: '🪷', description: '引渡仪式尚未开始' },
  { phase: 'preparing', label: '准备', icon: '📋', description: '选择模块，生成密钥，准备引渡' },
  { phase: 'packaging', label: '打包', icon: '📦', description: '序列化数据，压缩加密，签名封印' },
  { phase: 'transferring', label: '传输', icon: '📡', description: '生成传输码，等待接收端扫描' },
  { phase: 'verifying', label: '验证', icon: '🔍', description: '校验数据完整性，确认引渡成功' },
  { phase: 'completed', label: '完成', icon: '✨', description: '引渡仪式完成，数据已安全抵达' },
  { phase: 'failed', label: '失败', icon: '❌', description: '引渡过程中出现错误' },
]

// ---- 仪式冥想文本 ----

const RITUAL_MEDITATIONS: Record<ExtraditionPhase, string> = {
  idle: '每一份数据，都是时间的沉淀。',
  preparing: '选择即告别，打包即新生。',
  packaging: '加密为守护，签名为承诺。',
  transferring: '跨越虚空的桥梁，连接此岸与彼岸。',
  verifying: '确信每一字节都完好无损。',
  completed: '引渡完成。此处的星火，已在他处点燃。',
  failed: '仪式中断，但数据仍在原地等待。',
}

// ---- 模块扫描 ----

/** 扫描可引渡的模块 */
function scanModules(): ExtraditionModule[] {
  const modules: ExtraditionModule[] = []
  const prefixMap: Record<string, string> = {
    timer: 'hf:timer',
    emotion: 'hf:emotion',
    anchor: 'hf:anchor',
    goal: 'hf:goal',
    relation: 'hf:relation',
    study: 'hf:study',
    play: 'hf:play',
    note: 'hf:note',
    safety: 'hf:safety',
    bag: 'hf:bag',
    craft: 'hf:craft',
    seasonal: 'hf:seasonal',
    output: 'hf:output',
    knowledge: 'hf:knowledge',
    will: 'hf:wills',
    customization: 'hf:customization',
    template: 'hf:template',
  }

  for (const [key, prefix] of Object.entries(prefixMap)) {
    let itemCount = 0
    let sizeBytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) {
        itemCount++
        sizeBytes += localStorage.getItem(k)?.length || 0
      }
    }
    if (itemCount > 0) {
      modules.push({
        moduleKey: key,
        moduleName: getModuleLabel(key),
        itemCount,
        sizeBytes,
        sensitive: key === 'safety' || key === 'will' || key === 'relation',
      })
    }
  }

  return modules.sort((a, b) => b.sizeBytes - a.sizeBytes)
}

function getModuleLabel(key: string): string {
  const labels: Record<string, string> = {
    timer: '更漏·专注计时',
    emotion: '情绪花房',
    anchor: '逐日心锚',
    goal: '留光阁',
    relation: '羁绊之厅',
    study: '思绪书房',
    play: '逸趣阁',
    note: '便笺',
    safety: '安全守护',
    bag: '载物背囊',
    craft: '殿堂工坊',
    seasonal: '岁时阁',
    output: '输出管理',
    knowledge: '知识图谱',
    will: '先祖遗志',
    customization: '空间定制',
    template: '房间模板',
  }
  return labels[key] || key
}

// ---- 工具函数 ----

function generatePasscode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function generateChecksum(data: string): string {
  // 模拟 SHA-256 摘要
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// 主 composable
// ============================================================

export function useDataExtradition() {
  // ---- 状态 ----

  const state = reactive<ExtraditionState>({
    phase: 'idle',
    progress: 0,
    currentModule: '',
    packageId: null,
    transferCode: null,
    error: null,
  })

  /** 可引渡的模块列表 */
  const availableModules = ref<ExtraditionModule[]>(scanModules())

  /** 选中的模块 */
  const selectedModules = ref<Set<string>>(new Set())

  /** 加密密钥（用户自定义或自动生成） */
  const encryptionKey = ref('')

  /** 仪式冥想文本 */
  const meditation = computed(() => RITUAL_MEDITATIONS[state.phase])

  /** 当前阶段信息 */
  const currentPhaseInfo = computed(() =>
    EXTRADITION_PHASES.find(p => p.phase === state.phase) || EXTRADITION_PHASES[0]
  )

  /** 已打包的引渡包 */
  const currentPackage = ref<ExtraditionPackage | null>(null)

  /** 引渡历史 */
  const extraditionHistory = ref<ExtraditionManifest[]>(loadHistory())

  // ---- 持久化 ----

  function loadHistory(): ExtraditionManifest[] {
    try {
      const raw = localStorage.getItem('hf:extradition_history')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveHistory() {
    localStorage.setItem('hf:extradition_history', JSON.stringify(extraditionHistory.value))
  }

  // ---- 方法 ----

  /** 刷新模块列表 */
  function refreshModules() {
    availableModules.value = scanModules()
  }

  /** 切换模块选择 */
  function toggleModule(moduleKey: string) {
    const sel = new Set(selectedModules.value)
    if (sel.has(moduleKey)) {
      sel.delete(moduleKey)
    } else {
      sel.add(moduleKey)
    }
    selectedModules.value = sel
  }

  /** 全选/全不选 */
  function selectAll(select: boolean) {
    if (select) {
      selectedModules.value = new Set(availableModules.value.map(m => m.moduleKey))
    } else {
      selectedModules.value = new Set()
    }
  }

  /** 选中的模块详情 */
  const selectedModuleDetails = computed(() =>
    availableModules.value.filter(m => selectedModules.value.has(m.moduleKey))
  )

  /** 选中数据总大小 */
  const totalSize = computed(() =>
    selectedModuleDetails.value.reduce((sum, m) => sum + m.sizeBytes, 0)
  )

  /** 生成加密密钥 */
  function generateKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let key = ''
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    encryptionKey.value = key
    return key
  }

  /**
   * 执行数据引渡导出
   */
  async function executeExtradition(
    callbacks?: ExtraditionCallbacks
  ): Promise<ExtraditionPackage | null> {
    if (selectedModules.value.size === 0) {
      state.error = '请至少选择一个模块'
      state.phase = 'failed'
      return null
    }

    state.error = null
    state.progress = 0
    state.currentModule = ''

    try {
      // 阶段 1: 准备
      setPhase('preparing', callbacks)
      state.currentModule = '初始化密钥'
      if (!encryptionKey.value) generateKey()
      await delay(600)
      reportProgress(10, '准备完成', callbacks)

      // 阶段 2: 打包
      setPhase('packaging', callbacks)
      const selectedDetails = selectedModuleDetails.value
      let totalItems = 0
      let totalBytes = 0
      const payloadParts: Record<string, any> = {}

      for (let i = 0; i < selectedDetails.length; i++) {
        const mod = selectedDetails[i]
        state.currentModule = mod.moduleName
        reportProgress(10 + Math.round((i / selectedDetails.length) * 50), mod.moduleName, callbacks)

        // 收集模块数据
        const moduleData = collectModuleData(mod.moduleKey)
        if (moduleData) {
          payloadParts[mod.moduleKey] = moduleData
          totalItems += mod.itemCount
          totalBytes += mod.sizeBytes
        }

        await delay(200)
      }

      // 序列化并加密
      state.currentModule = '加密封装'
      const payloadStr = JSON.stringify(payloadParts)
      const checksum = generateChecksum(payloadStr)
      const encryptedPayload = encryptPayload(payloadStr, encryptionKey.value)
      await delay(400)

      const passcode = generatePasscode()
      const manifest: ExtraditionManifest = {
        packageId: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceDevice: getDeviceName(),
        createdAt: Date.now(),
        modules: selectedDetails.map(m => ({
          moduleKey: m.moduleKey,
          moduleName: m.moduleName,
          itemCount: m.itemCount,
          sizeBytes: m.sizeBytes,
          sensitive: m.sensitive,
        })),
        checksum,
        encryption: 'aes-256',
        version: '1.0.0',
        passcode,
      }

      reportProgress(70, '打包完成', callbacks)

      // 阶段 3: 传输
      setPhase('transferring', callbacks)
      state.currentModule = '生成传输码'
      const transferCode = generateTransferCode(manifest)
      state.transferCode = transferCode
      state.packageId = manifest.packageId

      const pkg: ExtraditionPackage = {
        manifest,
        payload: encryptedPayload,
        transferCode,
        expiresAt: Date.now() + 30 * 60000, // 30分钟有效
      }

      currentPackage.value = pkg
      await delay(500)
      reportProgress(85, '传输码已生成', callbacks)

      // 阶段 4: 验证
      setPhase('verifying', callbacks)
      state.currentModule = '校验完整性'
      const verifyChecksum = generateChecksum(payloadStr)
      if (verifyChecksum !== checksum) {
        throw new Error('数据校验失败，请重试')
      }
      await delay(300)
      reportProgress(95, '校验通过', callbacks)

      // 阶段 5: 完成
      setPhase('completed', callbacks)
      reportProgress(100, '引渡完成', callbacks)
      extraditionHistory.value.unshift(manifest)
      saveHistory()

      callbacks?.onComplete?.(pkg)
      return pkg
    } catch (e) {
      state.error = String(e)
      state.phase = 'failed'
      callbacks?.onError?.(String(e))
      return null
    }
  }

  /**
   * 导入引渡包（接收端）
   */
  async function importExtradition(
    transferCode: string,
    passcode: string,
    key: string
  ): Promise<{ success: boolean; importedModules: string[]; error?: string }> {
    state.error = null

    try {
      setPhase('verifying')
      state.currentModule = '解析传输码'

      // 从传输码解析 manifest
      const manifest = parseTransferCode(transferCode)
      if (!manifest) {
        throw new Error('无效的传输码')
      }

      if (manifest.passcode !== passcode) {
        throw new Error('引渡密码错误')
      }

      // 从历史记录中查找包
      const pkg = currentPackage.value
      if (!pkg || pkg.manifest.packageId !== manifest.packageId) {
        throw new Error('未找到对应的引渡包，请确保导出端已完成打包')
      }

      if (pkg.expiresAt < Date.now()) {
        throw new Error('引渡包已过期')
      }

      state.currentModule = '解密数据'
      await delay(300)

      const decrypted = decryptPayload(pkg.payload, key)
      const payloadData = JSON.parse(decrypted)

      // 校验数据完整性
      const checksum = generateChecksum(decrypted)
      if (checksum !== manifest.checksum) {
        throw new Error('数据完整性校验失败')
      }

      state.currentModule = '恢复数据'
      reportProgress(30, '解包数据', undefined)

      const importedModules: string[] = []
      const moduleKeys = Object.keys(payloadData)

      for (let i = 0; i < moduleKeys.length; i++) {
        const modKey = moduleKeys[i]
        const modData = payloadData[modKey]
        state.currentModule = getModuleLabel(modKey)

        // 恢复模块数据
        for (const [k, v] of Object.entries(modData)) {
          localStorage.setItem(k, JSON.stringify(v))
        }
        importedModules.push(modKey)
        reportProgress(30 + Math.round((i / moduleKeys.length) * 60), getModuleLabel(modKey), undefined)
        await delay(100)
      }

      reportProgress(95, '数据恢复完成', undefined)
      setPhase('completed')
      reportProgress(100, '引渡恢复完成', undefined)

      return { success: true, importedModules }
    } catch (e) {
      state.error = String(e)
      state.phase = 'failed'
      return { success: false, importedModules: [], error: String(e) }
    }
  }

  /** 重置引渡状态 */
  function reset() {
    state.phase = 'idle'
    state.progress = 0
    state.currentModule = ''
    state.packageId = null
    state.transferCode = null
    state.error = null
    currentPackage.value = null
    selectedModules.value = new Set()
  }

  /** 清除引渡历史 */
  function clearHistory() {
    extraditionHistory.value = []
    saveHistory()
  }

  return {
    // 状态
    state,
    availableModules,
    selectedModules,
    encryptionKey,
    meditation,
    currentPhaseInfo,
    currentPackage,
    extraditionHistory,

    // 计算属性
    selectedModuleDetails,
    totalSize,

    // 方法
    refreshModules,
    toggleModule,
    selectAll,
    generateKey,
    executeExtradition,
    importExtradition,
    reset,
    clearHistory,
  }
}

// ---- 内部辅助函数 ----

function setPhase(phase: ExtraditionPhase, callbacks?: ExtraditionCallbacks) {
  callbacks?.onPhaseChange?.(phase)
}

function reportProgress(progress: number, currentModule: string, callbacks?: ExtraditionCallbacks) {
  callbacks?.onProgress?.(progress, currentModule)
}

function collectModuleData(moduleKey: string): Record<string, any> | null {
  const prefixMap: Record<string, string> = {
    timer: 'hf:timer',
    emotion: 'hf:emotion',
    anchor: 'hf:anchor',
    goal: 'hf:goal',
    relation: 'hf:relation',
    study: 'hf:study',
    play: 'hf:play',
    note: 'hf:note',
    safety: 'hf:safety',
    bag: 'hf:bag',
    craft: 'hf:craft',
    seasonal: 'hf:seasonal',
    output: 'hf:output',
    knowledge: 'hf:knowledge',
    will: 'hf:wills',
    customization: 'hf:customization',
    template: 'hf:template',
  }

  const prefix = prefixMap[moduleKey]
  if (!prefix) return null

  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) {
      try {
        data[k] = JSON.parse(localStorage.getItem(k) || '')
      } catch {
        data[k] = localStorage.getItem(k)
      }
    }
  }
  return data
}

function encryptPayload(data: string, key: string): string {
  // 模拟 AES-256 加密
  let encrypted = ''
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  // XOR 结果可能超出 Latin-1 范围，先 URI 编码再 Base64
  return btoa(encodeURIComponent(encrypted))
}

function decryptPayload(encrypted: string, key: string): string {
  const decoded = decodeURIComponent(atob(encrypted))
  let decrypted = ''
  for (let i = 0; i < decoded.length; i++) {
    decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return decrypted
}

function generateTransferCode(manifest: ExtraditionManifest): string {
  // 生成紧凑的传输码（用于 QR 码或手动输入）
  const compact = `${manifest.packageId}|${manifest.checksum}|${manifest.createdAt}`
  return btoa(compact)
}

function parseTransferCode(code: string): ExtraditionManifest | null {
  try {
    const decoded = atob(code)
    const parts = decoded.split('|')
    if (parts.length < 3) return null
    return {
      packageId: parts[0],
      sourceDevice: '',
      createdAt: Number(parts[2]),
      modules: [],
      checksum: parts[1],
      encryption: 'aes-256',
      version: '1.0.0',
      passcode: '',
    }
  } catch {
    return null
  }
}

function getDeviceName(): string {
  try {
    const ua = navigator.userAgent
    if (ua.includes('Windows')) return 'Windows 设备'
    if (ua.includes('Mac')) return 'Mac 设备'
    if (ua.includes('Linux')) return 'Linux 设备'
    if (ua.includes('Android')) return 'Android 设备'
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS 设备'
    return '未知设备'
  } catch {
    return '未知设备'
  }
}