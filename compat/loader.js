import lodash from "lodash"
import cfg from "./config.js"
import AIManager from "../ai/AIManager.js"

async function runMatchedRule(loader, e, plugins) {
  const priority = plugins || loader.priority
  for (const i of priority) {
    if (!i.plugin?.rule) continue
    for (const v of i.plugin.rule) {
      if (v.event && !loader.filtEvent(e, v)) continue
      if (!(v.reg instanceof RegExp)) {
        try {
          v.reg = new RegExp(v.reg)
        } catch {
          continue
        }
      }
      if (!v.reg.test(e.msg)) continue

      if (!loader.filtPermission(e, v)) return true
      const plugin = Object.assign(new i.class(e), { e })
      e.logFnc = `${logger.blue(`[${plugin.name}(${v.fnc})]`)}`
      Bot.makeLog("info", `${e.logText}${e.logFnc}${logger.yellow("[开始处理]")}`, false)
      try {
        const start_time = Date.now()
        const res = plugin[v.fnc] && (await plugin[v.fnc](e))
        if (res === false) continue
        Bot.makeLog(
          "mark",
          `${e.logText}${e.logFnc}${logger.green(`[完成${Bot.getTimeDiff(start_time)}]`)}`,
          false,
        )
      } catch (err) {
        Bot.makeLog("error", [`${e.logText}${e.logFnc}`, err], false)
      }
      return true
    }
  }
  return false
}

async function aiFallback(e) {
  if (cfg.ai?.enabled !== true) return false
  try {
    return await AIManager.handleMessage(e)
  } catch (err) {
    Bot.makeLog("error", ["AI 消息处理错误", err], "AIManager")
    return false
  }
}

async function deal(loader, e) {
  loader.count(e, "receive", e.message)
  if (!loader.checkBlack(e)) return
  const groupCfg = cfg.getGroup(e.self_id, e.group_id)
  if (e.group_id) {
    const disabledBots = Array.isArray(groupCfg.disabledBots) ? groupCfg.disabledBots : []
    if (disabledBots.some(id => String(id) === String(e.self_id))) return
  }
  if (!loader.checkLimit(e, groupCfg)) return
  loader.dealEvent(e, groupCfg)
  if (e.only_reply_at) loader.setLimit(e, groupCfg)
  loader.reply(e)

  const Runtime = (await import("../../../lib/plugins/runtime.js")).default
  await Runtime.init(e)

  const priority = []
  for (const i of loader.priority)
    if (loader.checkDisable(Object.assign(i.plugin, { e }), groupCfg) && loader.filtEvent(e, i.plugin))
      priority.push(i)

  for (const i of priority) {
    if (!i.plugin.getContext) continue
    const context = {
      ...i.plugin.getContext(),
      ...i.plugin.getContext(false, true),
    }
    if (!lodash.isEmpty(context)) {
      let ret
      for (const fnc in context)
        ret ||= await Object.assign(new i.class(e), { e })[fnc](context[fnc])
      if (ret === "continue") continue
      return
    }
  }

  if (!e.only_reply_at) {
    if (!(await runMatchedRule(loader, e, priority))) await aiFallback(e)
    return
  }

  for (const i of priority)
    if (i.plugin.accept) {
      const res = await Object.assign(new i.class(e), { e }).accept(e)
      if (res === "return") return
      if (res) break
    }

  for (const i of priority) {
    if (i.plugin.rule)
      for (const v of i.plugin.rule) {
        if (v.event && !loader.filtEvent(e, v)) continue
        if (!(v.reg instanceof RegExp)) {
          try {
            v.reg = new RegExp(v.reg)
          } catch {
            continue
          }
        }
        if (!v.reg.test(e.msg)) continue
        const plugin = Object.assign(new i.class(e), { e })
        e.logFnc = `${logger.blue(`[${plugin.name}(${v.fnc})]`)}`
        Bot.makeLog(
          v.log === false ? "debug" : "info",
          `${e.logText}${e.logFnc}${logger.yellow("[开始处理]")}`,
          false,
        )
        if (loader.filtPermission(e, v))
          try {
            const start_time = Date.now()
            const res = plugin[v.fnc] && (await plugin[v.fnc](e))
            if (res === false) continue
            Bot.makeLog(
              v.log === false ? "debug" : "mark",
              `${e.logText}${e.logFnc}${logger.green(`[完成${Bot.getTimeDiff(start_time)}]`)}`,
              false,
            )
          } catch (err) {
            Bot.makeLog("error", [`${e.logText}${e.logFnc}`, err], false)
          }
        return
      }
  }

  Bot.makeLog("debug", `${e.logText}${logger.blue(`[暂无插件处理]`)}`, false)
  await aiFallback(e)
}

export function installDealHook(loader) {
  if (!loader || typeof loader.deal !== "function") return false
  if (loader.__webuiPluginDeal === true) return true

  if (String(loader.deal).includes("aiFallback")) return true
  loader.deal = function (e) {
    return deal(this, e)
  }
  loader.__webuiPluginDeal = true
  return true
}

export function installPluginFilter(loader, { isDisabled, pendingFolders, sweep } = {}) {
  if (!loader) return false
  if (loader.__webuiPluginFilter === true) return true
  const guard = file => {
    const folder = String(file?.name || "").split("/")[0]
    try {
      if (folder && pendingFolders?.()?.has?.(folder)) return false
    } catch {}
    try {
      return isDisabled?.(file?.name) !== true
    } catch {
      return true
    }
  }
  if (typeof loader.getPlugins === "function") {
    const original = loader.getPlugins
    loader.getPlugins = async function (...args) {
      const list = (await original.apply(this, args)) || []
      return list.filter(guard)
    }
  }
  if (typeof loader.importPlugin === "function") {
    const originalImport = loader.importPlugin
    loader.importPlugin = async function (file, ...rest) {
      if (!guard(file)) {
        Bot.makeLog("info", `插件已在 WebUI 中停用，跳过加载 ${file?.name}`, "Plugin")
        return false
      }
      return originalImport.call(this, file, ...rest)
    }
  }

  if (typeof loader.createTask === "function" && typeof sweep === "function") {
    const originalTask = loader.createTask
    loader.createTask = function (...args) {
      const result = originalTask.apply(this, args)

      loader.__webuiPluginSweep = Promise.resolve()
        .then(sweep)
        .catch(() => {})
      return result
    }
  }
  loader.__webuiPluginFilter = true
  return true
}

export function installDisposeHook(loader) {
  if (!loader || typeof loader.unloadPlugin !== "function") return false
  if (loader.__webuiPluginDispose === true) return true
  const original = loader.unloadPlugin
  loader.unloadPlugin = async function (key, ...rest) {
    try {
      return await original.call(this, key, ...rest)
    } finally {
      const map = loader.__webuiPluginDisposers
      if (map) {
        const name = String(key)
        for (const [target, list] of [...map]) {
          if (name !== target && !name.startsWith(`${target}/`)) continue
          map.delete(target)
          for (const dispose of list) {
            try {
              await dispose()
            } catch (error) {
              globalThis.Bot?.makeLog?.("error", ["插件资源回收错误", error], "Plugin")
            }
          }
        }
      }
    }
  }
  loader.__webuiPluginDispose = true
  return true
}

export function addDispose(loader, key, dispose) {
  installDisposeHook(loader)
  const map = (loader.__webuiPluginDisposers ??= new Map())
  const list = map.get(String(key)) ?? []
  list.push(dispose)
  map.set(String(key), list)
}

export function installToolSync(loader, registry) {
  if (!loader || typeof loader.unloadPlugin !== "function" || !registry) return false
  if (loader.__webuiPluginToolSync === true) return true
  const original = loader.unloadPlugin
  loader.unloadPlugin = async function (key, ...rest) {
    const result = await original.call(this, key, ...rest)
    try {
      registry.unregisterPlugin?.(key)
    } catch {}
    return result
  }
  loader.__webuiPluginToolSync = true
  return true
}
