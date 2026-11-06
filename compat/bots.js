export function isBotOnline(bot) {
  if (!bot) return false
  if (typeof bot.isOnline === "function") {
    try {
      return !!bot.isOnline()
    } catch {}
  }
  const ws = bot.ws
  if (ws && typeof ws.readyState === "number" && ws.readyState !== 1) return false
  if (bot.stat?.online === false || bot.stat?.online === 0) return false
  const last = Number(bot.stat?.last_heartbeat || 0)
  if (last > 0) {
    const interval = Number(bot.stat?.heartbeat_interval || 0)
    const limit = Math.max(15000, interval > 0 ? interval * 3 : 0)
    if (Date.now() - last > limit) return false
  }
  return true
}

export function installBotOnline() {
  if (typeof Bot !== "object" || !Bot) return
  if (typeof Bot.isBotOnline === "function") return
  try {
    Object.defineProperty(Bot, "isBotOnline", {
      value: isBotOnline,
      writable: true,
      configurable: true,
    })
  } catch {}
}
