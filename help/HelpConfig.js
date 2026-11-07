import cfg from "../compat/config.js"
import { resolveIconValue } from "./icons.js"

const DEFAULT_FOOTER = "Created By TRSS-Yunzai"
export const HELP_VERSION = cfg.package?.version || ""

const DEFAULT_HELP_CFG = {
  title: "帮助",
  subTitle: "",
  colCount: 3,
  colWidth: 265,
  theme: "all",
  themeExclude: ["default"],
  bgBlur: true,
  tableBorder: false,
  footer: "",
}

const DEFAULT_HELP_LIST = [
  {
    group: "常用",
    list: [
      { icon: "📖", title: "#帮助", desc: "查看本帮助面板" },
      { icon: "🔎", title: "#帮助 关键词", desc: "按关键词筛选功能" },
      { icon: "🎭", title: "#persona", desc: "查看人格列表，管理员可切换" },
      { icon: "🖥", title: "#状态", desc: "查看机器人运行状态" },
    ],
  },
  {
    group: "智能对话",
    auth: "master",
    list: [
      { icon: "🎚", title: "#persona 预设名", desc: "切换本群/本私聊的人格" },
      { icon: "↩️", title: "#persona 默认", desc: "恢复跟随主人格" },
      { icon: "🧠", title: "#我的记忆", desc: "查看你的回忆" },
      { icon: "🗑", title: "#清除记忆", desc: "清空你的回忆" },
      { icon: "📝", title: "#群聊总结", desc: "总结本群近期聊天" },
      { icon: "📊", title: "#对话状态", desc: "查看当前会话的人格、模型与轮数" },
      { icon: "🛑", title: "#结束对话", desc: "清空当前会话上下文" },
    ],
  },
  {
    group: "管理",
    auth: "master",
    list: [
      { icon: "🔑", title: "#云崽登录", desc: "获取带一次性登录码的 WebUI 地址" },
      { icon: "📄", title: "#版本", desc: "查看当前框架版本" },
      { icon: "🔄", title: "#重启", desc: "重启机器人" },
      { icon: "⏹", title: "#关机", desc: "停止运行，也可用" },
      { icon: "⬆️", title: "#更新", desc: "更新框架与插件" },
    ],
  },
]

export const STYLE_KEYS = [
  "accentColor",
  "fontColor",
  "fontShadow",
  "descColor",
  "descShadow",
  "contBgColor",
  "contBgBlur",
  "headerBgColor",
  "rowBgColor1",
  "rowBgColor2",
]

const ICON_TEXT_MAX = 4

function clampNumber(value, min, max, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.round(num)))
}

function textOf(value) {
  return typeof value === "string" ? value.trim() : ""
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function normalizeIcon(icon, previewAssets = false) {
  const text = textOf(icon)
  if (!text) return { iconHtml: "", iconClass: "" }
  if (/^icon:/i.test(text)) {
    const url = resolveIconValue(text)
    if (!url) return { iconHtml: "", iconClass: "" }

    const src = previewAssets ? `help-asset:icon/${text.replace(/^icon:/i, "").trim()}` : url
    return {
      iconHtml: `<img class="icon-img" src="${src}" alt="">`,
      iconClass: "is-image",
    }
  }
  if (/^(https?:\/\/|data:image\/)/i.test(text))
    return {
      iconHtml: `<img class="icon-img" src="${escapeHtml(text)}" alt="">`,
      iconClass: "is-image",
    }
  const label = Array.from(text).slice(0, ICON_TEXT_MAX).join("")
  return { iconHtml: escapeHtml(label), iconClass: "is-text" }
}

function canSeeGroup(group, e) {
  const auth = textOf(group.auth).toLowerCase()
  if (!auth) return true
  if (auth === "master") return e?.isMaster === true
  if (auth === "admin") return e?.isMaster === true || e?.isAdmin === true
  return true
}

function matchesKeyword(group, title, desc, keyword) {
  if (!keyword) return true
  const haystack = `${textOf(group.group) || textOf(group.name)} ${title} ${desc}`.toLowerCase()
  return haystack.includes(keyword)
}

function chunkRows(items, colCount) {
  const rows = []
  for (let i = 0; i < items.length; i += colCount) {
    const cells = items.slice(i, i + colCount)
    rows.push({ cells, fillers: new Array(colCount - cells.length).fill(1) })
  }
  return rows
}

export function normalizeHelpConfig(rawInput) {
  const raw = rawInput && typeof rawInput === "object" ? rawInput : {}
  const rawCfg = raw.helpCfg && typeof raw.helpCfg === "object" ? raw.helpCfg : {}
  const helpCfg = { ...DEFAULT_HELP_CFG, ...rawCfg }

  helpCfg.title = textOf(helpCfg.title) || DEFAULT_HELP_CFG.title
  helpCfg.subTitle = textOf(helpCfg.subTitle)
  helpCfg.footer = textOf(helpCfg.footer)
  helpCfg.colCount = clampNumber(helpCfg.colCount, 2, 5, DEFAULT_HELP_CFG.colCount)
  helpCfg.colWidth = clampNumber(helpCfg.colWidth, 100, 500, DEFAULT_HELP_CFG.colWidth)
  helpCfg.bgBlur = helpCfg.bgBlur !== false
  helpCfg.tableBorder = helpCfg.tableBorder === true

  for (const key of STYLE_KEYS) {
    if (helpCfg[key] === undefined || helpCfg[key] === null) helpCfg[key] = ""
  }

  return {
    helpCfg,
    helpList: Array.isArray(raw.helpList) ? raw.helpList : [],
  }
}

export function getHelpConfig() {
  const raw = cfg.help && typeof cfg.help === "object" ? cfg.help : {}
  const parsed = normalizeHelpConfig(raw)
  if (!parsed.helpList.length) parsed.helpList = DEFAULT_HELP_LIST
  return parsed
}

export function buildHelpGroups(helpList, e, keyword = "", colCount = DEFAULT_HELP_CFG.colCount, options = {}) {
  const key = textOf(keyword).toLowerCase()
  const previewAssets = options.previewAssets === true
  const groups = []

  for (let groupIndex = 0; groupIndex < helpList.length; groupIndex++) {
    const group = helpList[groupIndex]
    if (!group || typeof group !== "object") continue
    if (!canSeeGroup(group, e)) continue

    const source = Array.isArray(group.list) ? group.list : []
    const items = []
    for (let itemIndex = 0; itemIndex < source.length; itemIndex++) {
      const item = source[itemIndex]
      if (!item || typeof item !== "object") continue
      const title = textOf(item.title)
      const desc = textOf(item.desc)
      if (!title && !desc) continue
      if (!matchesKeyword(group, title, desc, key)) continue
      items.push({ index: itemIndex, title, desc, ...normalizeIcon(item.icon, previewAssets) })
    }
    if (!items.length) continue

    groups.push({
      index: groupIndex,
      name: textOf(group.group) || textOf(group.name) || "未分组",
      desc: textOf(group.desc),
      rows: chunkRows(items, colCount),
    })
  }

  return groups
}

export function helpFooterText(helpCfg) {
  return textOf(helpCfg?.footer) || DEFAULT_FOOTER
}

export function helpText(helpCfg, helpGroups) {
  const lines = [helpCfg.title || DEFAULT_HELP_CFG.title]
  for (const group of helpGroups) {
    lines.push("", `【${group.name}】`)
    for (const row of group.rows)
      for (const item of row.cells) lines.push(item.desc ? `${item.title} - ${item.desc}` : item.title)
  }
  if (helpCfg.footer) lines.push("", helpCfg.footer)
  return lines.join("\n")
}
