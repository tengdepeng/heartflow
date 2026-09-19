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
import {
  pluginMarketplaceRegistry,
} from '../../modules/plugin/plugin-registry'
import {
  resolveDependencies as resolveGraph,
  getDependencyTree,
} from '../../modules/plugin/plugin-marketplace'
import type { DependencyResolution } from '../../modules/plugin/plugin-marketplace'

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

    // 市场源注册表（市场源单一数据源）
    marketplace: {
      getAll: pluginMarketplaceRegistry.getAll.bind(pluginMarketplaceRegistry),
      getCatalog: pluginMarketplaceRegistry.getCatalog.bind(pluginMarketplaceRegistry),
      getCategories: pluginMarketplaceRegistry.getCategories.bind(pluginMarketplaceRegistry),
      count: pluginMarketplaceRegistry.count.bind(pluginMarketplaceRegistry),
      byCategory: pluginMarketplaceRegistry.byCategory.bind(pluginMarketplaceRegistry),
      search: pluginMarketplaceRegistry.search.bind(pluginMarketplaceRegistry),
      find: pluginMarketplaceRegistry.find.bind(pluginMarketplaceRegistry),
      isMarketPlugin: pluginMarketplaceRegistry.isMarketPlugin.bind(pluginMarketplaceRegistry),

      // 依赖解析（市场源依赖图）
      getDependencyGraph: pluginMarketplaceRegistry.getDependencyGraph.bind(pluginMarketplaceRegistry),

      /** 解析目标插件的依赖（针对市场源注册表当前目录） */
      resolveDependencies(targetPluginId: string): DependencyResolution {
        return resolveGraph(pluginMarketplaceRegistry.getDependencyGraph(), targetPluginId)
      },

      /** 解析指定的依赖图 + 目标插件 */
      resolveGraph,
      getDependencyTree,

      /** 更新检查：比较已安装插件版本与市场最新版本 */
      listUpdates(): MarketplaceUpdate[] {
        const installed = plugins.value
        const results: MarketplaceUpdate[] = []
        for (const entry of pluginMarketplaceRegistry.getAll()) {
          const m = entry.manifest
          const current = installed.find(p => p.manifest.meta.id === m.meta.id)
          if (current && current.manifest.meta.version !== m.meta.version) {
            results.push({
              pluginId: m.meta.id,
              name: m.meta.name,
              icon: m.meta.icon,
              category: m.meta.category,
              fromVersion: current.manifest.meta.version,
              toVersion: m.meta.version,
              breaking: breakingMajor(m.meta.version, current.manifest.meta.version),
              description: m.meta.description,
            })
          }
        }
        return results
      },
    },
  }
}

/** 市场中已安装但版本落后于市场目录的插件 */
export interface MarketplaceUpdate {
  pluginId: string
  name: string
  icon: string
  category: string
  fromVersion: string
  toVersion: string
  breaking: boolean
  description: string
}

/** 判断目标版本相对当前是否为破坏性（大版本号跃迁） */
function breakingMajor(target: string, current: string): boolean {
  const t = Number(target.split('.')[0])
  const c = Number(current.split('.')[0])
  return Number.isFinite(t) && Number.isFinite(c) && t > c
}