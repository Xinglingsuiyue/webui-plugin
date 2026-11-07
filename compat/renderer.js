import fs from "node:fs"
import Renderer from "../../../lib/renderer/loader.js"

function renderable(target) {
  return !!target && typeof target.render === "function"
}

function templateHasScript(tplFile) {
  try {
    return String(tplFile) && fs.readFileSync(tplFile, "utf8").includes("</script>")
  } catch {
    return false
  }
}

function collectBackends() {
  const list = []
  try {
    const map = Renderer.renderers
    if (map && typeof map.values === "function") list.push(...map.values())
  } catch {}
  if (!list.length) {
    try {
      const picked = Renderer.getRenderer?.()
      if (picked && picked !== Renderer) list.push(picked)
    } catch {}
  }
  return list.filter(renderable)
}

function orderBackends(backends, data) {
  const script = templateHasScript(data?.tplFile)
  const supports = []
  const others = []
  for (const backend of backends) {
    const ok = script ? true : backend.support_script === false
    if (ok) supports.push(backend)
    else others.push(backend)
  }
  return [...supports, ...others]
}

export async function render(name, data) {
  if (renderable(Renderer)) return await Renderer.render(name, data)
  let reason = "没有可用的图片渲染后端"
  for (const backend of orderBackends(collectBackends(), data)) {
    try {
      const image = await backend.render(name, data)
      if (image) return image
    } catch (err) {
      reason = err?.message || reason
    }
  }
  throw new Error(reason)
}

export default { render }
