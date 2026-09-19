// ============================================================
// 共鸣协议层 · Plugin 桥接器
// 将插件状态通过共振层暴露，替代直接 import usePluginStore
// ============================================================

import { usePluginStore } from '../../stores/plugin'
import { storeToRefs } from 'pinia'
import {
  invokePluginCapability,
  listAvailableCapabilities,
  findCapabilityByKeyword,
} from '../../modules/plugin/capability-registry'

export function usePlugin() {
  const store = usePluginStore()
  const {
    plugins, initialized, installIssues, enabledPlugins, disabledPlugins,
    officialPlugins, communityPlugins, experimentalPlugins,
  } = storeToRefs(store)

  return {
    // 响应式状态
    plugins,
    initialized,
    installIssues,
    enabledPlugins,
    disabledPlugins,
    officialPlugins,
    communityPlugins,
    experimentalPlugins,

    // 方法
    init: store.init?.bind(store),
    enable: store.enable?.bind(store),
    disable: store.disable?.bind(store),
    toggle: store.toggle?.bind(store),
    setPermission: store.setPermission?.bind(store),
    revokeAllPermissions: store.revokeAllPermissions?.bind(store),
    installPlugin: store.installPlugin?.bind(store),
    uninstallPlugin: store.uninstallPlugin?.bind(store),

    // 能力通道（蓝图 L10612：插件经能力扩展房间）
    listCapabilities: listAvailableCapabilities,
    findCapability: findCapabilityByKeyword,
    invokeCapability: invokePluginCapability,
  }
}