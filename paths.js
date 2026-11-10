import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const PLUGIN_ROOT = path.dirname(fileURLToPath(import.meta.url))

export const PROJECT_ROOT = path.resolve(PLUGIN_ROOT, "..", "..")

export const PLUGINS_DIR = path.join(PROJECT_ROOT, "plugins")

export const WEBUI_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, "package.json"), "utf8")).version || ""
  } catch {
    return ""
  }
})()

export default { PLUGIN_ROOT, PROJECT_ROOT, PLUGINS_DIR, WEBUI_VERSION }
