import plugin from "../../lib/plugins/plugin.js"
import PluginsLoader from "../../lib/plugins/loader.js"
import { ensureWebuiData } from "./webui/dataDir.js"
import { installBotOnline } from "./compat/bots.js"
import {
  addDispose,
  installDealHook,
  installPluginFilter,
  installToolSync,
} from "./compat/loader.js"
import { pendingRemovalNames, purgePendingRemovals } from "./webui/pluginPendingRemove.js"
import { disabledPluginKeys } from "./webui/pluginManager.js"
import AIManager from "./ai/AIManager.js"
import AIToolRegistry from "./ai/AIToolRegistry.js"
import { mountWebUI } from "./webui/server.js"
import { HelpPanel } from "./help/index.js"
import { WebPanelLogin } from "./webui/plugin.js"
import { AiPersona } from "./ai/builtin/persona.js"
import { AiSessionCommands } from "./ai/builtin/commands.js"
import { StatusPanel } from "./status/plugin.js"

const SELF_KEY = "webui-plugin"
const isSelfKey = key => key === SELF_KEY || String(key).startsWith(`${SELF_KEY}/`)

ensureWebuiData()
installBotOnline()
installToolSync(PluginsLoader, AIToolRegistry)

installPluginFilter(PluginsLoader, {
  isDisabled: key => disabledPluginKeys().includes(String(key)),
  pendingFolders: () => pendingRemovalNames(),

  sweep: () => dropDisabledEntries(),
})

function markBuiltinEntries() {
  for (const entry of PluginsLoader.priority || [])
    if (isSelfKey(entry?.key)) entry.builtin = true
}

function rebuildTools() {
  markBuiltinEntries()
  AIToolRegistry.rebuildPluginTools(
    (PluginsLoader.priority || []).map(entry => ({
      plugin: entry.plugin,
      class: entry.class,
      key: entry.key,
      name: entry.name,
      priority: entry.priority,
      namespace: entry.namespace,
      builtin: entry.builtin === true,
    })),
  )
}

async function dropDisabledEntries() {
  const keys = new Set([...disabledPluginKeys().map(String), ...pendingRemovalNames()])
  if (!keys.size) return
  for (const entry of PluginsLoader.priority || []) {
    const key = String(entry?.key || "")
    const [folder] = key.split("/")
    if (!keys.has(key) && !keys.has(folder)) continue
    await PluginsLoader.unloadPlugin(key, true).catch(() => {})
  }
}

async function afterLoad() {
  try {
    const purged = await purgePendingRemovals()
    if (purged.removed.length)
      Bot.makeLog("info", `已清理残留插件目录：${purged.removed.join("、")}`, "Plugin")
    if (purged.failed.length)
      Bot.makeLog("warn", `残留插件目录仍被占用：${purged.failed.join("、")}`, "Plugin")
  } catch {}
  await dropDisabledEntries()
  rebuildTools()
}

class WebUICore extends plugin {
  constructor() {
    super({
      name: "WebUI 控制台",
      dsc: "WebUI 管理面板与 AI 对话扩展的引导模块",
      event: "message",
      priority: 900,
      rule: [],
    })
  }

  async init() {
    let webui = null
    const dispose = async () => {
      webui?.dispose?.()
      webui = null
    }
    if (typeof this.addCleanup === "function") this.addCleanup(dispose)
    else addDispose(PluginsLoader, SELF_KEY, dispose)

    installDealHook(PluginsLoader)

    await AIManager.init()
    Bot.ai = AIManager

    webui = mountWebUI()
    Bot.webui = webui

    if (Bot.stat?.online === 2) await afterLoad()
    else Bot.once("online", () => void afterLoad())
  }
}

export const apps = {
  WebUICore,
  HelpPanel,
  WebPanelLogin,
  AiPersona,
  AiSessionCommands,
  StatusPanel,
}
