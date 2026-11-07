import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import YAML from "yaml"
import coreCfg from "../../../lib/config/config.js"

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SHIPPED_DEFAULT_DIR = path.join(PLUGIN_ROOT, "config", "default_config")

const CORE_CONFIG_DIR = path.resolve(process.cwd(), "config/config")
const CORE_DEFAULT_DIR = path.resolve(process.cwd(), "config/default_config")

const PLUGIN_CONFIGS = new Set(["ai", "webui", "help"])

export function normalizeGroupId(id) {
  return String(id ?? "").replace(/[\uF03A\uFF1A]/g, ":")
}

export function isGroupId(id) {
  return (
    /^\d{3,20}$/.test(String(id ?? "")) ||
    /^\d{3,20}:[\dA-Za-z_-]{6,64}$/.test(normalizeGroupId(id))
  )
}

function readYamlFileSync(file) {
  try {
    const parsed = YAML.parse(fs.readFileSync(file, "utf8"))
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function shippedDefaults(name) {
  if (!PLUGIN_CONFIGS.has(name)) return {}
  return readYamlFileSync(path.join(SHIPPED_DEFAULT_DIR, `${name}.yaml`))
}

function configSources() {
  const sources = new Map()
  try {
    for (const file of fs.readdirSync(CORE_DEFAULT_DIR)) {
      const source = path.join(CORE_DEFAULT_DIR, file)
      if (fs.statSync(source).isFile()) sources.set(file, source)
    }
  } catch {}
  for (const name of PLUGIN_CONFIGS) {
    const file = `${name}.yaml`
    const source = path.join(SHIPPED_DEFAULT_DIR, file)
    if (fs.existsSync(source)) sources.set(file, source)
  }
  return sources
}

function ensureConfigFiles() {
  const sources = configSources()
  for (const dir of [CORE_DEFAULT_DIR, CORE_CONFIG_DIR]) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      for (const [file, source] of sources) {
        const target = path.join(dir, file)
        if (!fs.existsSync(target)) fs.copyFileSync(source, target)
      }
    } catch {}
  }
}

ensureConfigFiles()

function getAllCfg(name) {
  const base = coreCfg.getAllCfg(name) || {}
  if (!PLUGIN_CONFIGS.has(name)) return base
  return { ...shippedDefaults(name), ...base }
}

export function readYamlFile(type, name) {
  const file = `config/${type}/${name}.yaml`
  try {
    const parsed = YAML.parse(fs.readFileSync(file, "utf8"))
    return parsed && typeof parsed === "object" ? parsed : undefined
  } catch {
    return undefined
  }
}

let lastGroupReload = 0

function getGroup(bot_id = "", group_id = "") {
  const rawBotId = String(bot_id)
  const rawGroupId = normalizeGroupId(group_id)
  const bareGroupId =
    rawBotId && rawGroupId.startsWith(`${rawBotId}:`)
      ? rawGroupId.slice(rawBotId.length + 1)
      : rawGroupId
  const fullGroupId = `${rawBotId}:${bareGroupId}`

  let config = getAllCfg("group") || {}
  const hasOwn = [rawGroupId, bareGroupId, fullGroupId].some(id => config[id])

  if (!hasOwn && group_id && Date.now() - lastGroupReload > 3000) {
    lastGroupReload = Date.now()
    const live = readYamlFile("config", "group")
    if (live) {
      coreCfg.config["config.group"] = live
      config = getAllCfg("group") || {}
    }
  }

  return {
    ...config.default,
    ...config[`${rawBotId}:default`],
    ...config[rawGroupId],
    ...config[bareGroupId],
    ...config[fullGroupId],
  }
}

const shim = {
  normalizeGroupId,
  isGroupId,
  readYamlFile,
  getGroup,
  getAllCfg,
}

export default new Proxy(shim, {
  get(target, prop) {
    if (prop in target) return target[prop]

    const value = coreCfg[prop]
    if (typeof value === "function") return value.bind(coreCfg)
    if (value !== undefined) return value
    if (typeof prop !== "string") return undefined
    return getAllCfg(prop)
  },
  has(target, prop) {
    return prop in target || prop in coreCfg
  },
})
