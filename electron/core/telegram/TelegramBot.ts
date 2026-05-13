import { Telegraf, type Context } from 'telegraf'
import { message } from 'telegraf/filters'
import { ConfigStore } from '../config/ConfigStore'
import { getMainWindow } from '../../main'
import { agentLoop } from '../agent/AgentLoop'
import { SessionStore } from '../sessions/SessionStore'

let bot: Telegraf | null = null
let isRunning = false
let isStarting = false

// Map telegram chatId → MacVis sessionId so each Telegram conversation persists as one MacVis chat
function sessionIdForChat(chatId: number | string): string {
  return `telegram-${chatId}`
}

const TG_LIMIT = 4000

async function sendChunked(ctx: Context, text: string): Promise<void> {
  if (!text) return
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > TG_LIMIT) {
    let cut = remaining.lastIndexOf('\n\n', TG_LIMIT)
    if (cut < TG_LIMIT * 0.5) cut = remaining.lastIndexOf('\n', TG_LIMIT)
    if (cut < TG_LIMIT * 0.5) cut = TG_LIMIT
    chunks.push(remaining.slice(0, cut))
    remaining = remaining.slice(cut).trimStart()
  }
  if (remaining) chunks.push(remaining)
  for (const c of chunks) {
    try { await ctx.reply(c) }
    catch { try { await ctx.reply(c.replace(/[*_`[\]()~>#+=|{}.!-]/g, '')) } catch {} }
  }
}

function emitStatus(running: boolean, error?: string) {
  isRunning = running
  getMainWindow()?.webContents.send('telegram:status', { running, error })
}

export async function startTelegramBot(): Promise<{ ok: boolean; error?: string }> {
  if (isRunning || isStarting) return { ok: true }
  isStarting = true

  const config = ConfigStore.getInstance()
  const token = (config.get('apiKeys.telegram.botToken') as string)?.trim()
  const allowedId = (config.get('apiKeys.telegram.allowedUserId') as string)?.trim()

  if (!token) {
    isStarting = false
    return { ok: false, error: 'No Telegram bot token. Set it in Settings → Telegram.' }
  }
  if (!allowedId) {
    isStarting = false
    return { ok: false, error: 'No allowed user ID. Set your numeric Telegram ID in Settings → Telegram.' }
  }

  try {
    bot = new Telegraf(token)

    // Security — only the allowed user can interact
    bot.use(async (ctx, next) => {
      const userId = ctx.from?.id?.toString()
      if (userId !== allowedId) {
        try { await ctx.reply('🚫 Unauthorized. This is a private assistant.') } catch {}
        return
      }
      return next()
    })

    bot.command('start', async (ctx) => {
      await ctx.reply(
        '🤖 MacVis is online.\n\n' +
        'I have full access to your Mac. Send any message to start a task.\n\n' +
        'Commands:\n' +
        '/new — start a fresh conversation\n' +
        '/stop — cancel the current task\n' +
        '/status — bot status'
      )
    })

    bot.command('status', async (ctx) => {
      await ctx.reply(`✅ MacVis online\n📱 Connected as ${ctx.from?.username || ctx.from?.first_name}`)
    })

    bot.command('new', async (ctx) => {
      const sid = sessionIdForChat(ctx.chat!.id)
      await SessionStore.delete(sid)
      await ctx.reply('🆕 Started a fresh conversation.')
    })

    bot.command('stop', async (ctx) => {
      const sid = sessionIdForChat(ctx.chat!.id)
      agentLoop.stop(sid)
      await ctx.reply('⏹ Stopped the current task.')
    })

    bot.on(message('text'), async (ctx) => {
      const userMessage = ctx.message.text
      const sessionId = sessionIdForChat(ctx.chat.id)

      // Notify renderer
      getMainWindow()?.webContents.send('telegram:message', {
        from: ctx.from?.username || ctx.from?.first_name,
        message: userMessage,
        sessionId,
      })

      let thinkingMsg: any
      try { thinkingMsg = await ctx.reply('⏳ Working on it…') } catch {}

      // Snapshot session message count before running
      const before = await SessionStore.load(sessionId)
      const beforeMsgCount = before?.messages.length || 0

      // Run agent (AgentLoop persists everything to disk + streams to renderer for the app UI)
      try {
        await agentLoop.run(userMessage, sessionId)
      } catch (err: any) {
        if (thinkingMsg) { try { await ctx.deleteMessage(thinkingMsg.message_id) } catch {} }
        await ctx.reply(`⚠️ Error: ${err?.message || String(err)}`)
        return
      }

      // Read final session state and extract the assistant turns since `before`
      const after = await SessionStore.load(sessionId)
      if (!after) {
        if (thinkingMsg) { try { await ctx.deleteMessage(thinkingMsg.message_id) } catch {} }
        await ctx.reply('Done.')
        return
      }

      const newMessages = after.messages.slice(beforeMsgCount)
      const assistantTexts: string[] = []
      const toolNames: string[] = []
      for (const m of newMessages) {
        if (m.role === 'assistant') {
          if (m.content?.trim()) assistantTexts.push(m.content.trim())
          for (const tc of m.toolCalls || []) {
            if (!toolNames.includes(tc.name)) toolNames.push(tc.name)
          }
        }
      }

      if (thinkingMsg) {
        try { await ctx.deleteMessage(thinkingMsg.message_id) } catch {}
      }

      const finalText = assistantTexts.join('\n\n').trim() || 'Done.'
      const toolSuffix = toolNames.length > 0 ? `\n\n🔧 ${toolNames.join(' · ')}` : ''
      await sendChunked(ctx, finalText + toolSuffix)
    })

    bot.on(message('document'), async (ctx) => {
      const f = ctx.message.document
      await ctx.reply(`📎 Got "${f.file_name}". Tell me what to do with it.`)
    })

    // Launch — long-running; do NOT await
    bot.launch().catch((err: any) => {
      console.error('Telegram bot launch error:', err)
      emitStatus(false, err?.message || String(err))
    })

    emitStatus(true)
    isStarting = false
    console.log('Telegram bot started for user', allowedId)
    return { ok: true }
  } catch (err: any) {
    isStarting = false
    bot = null
    emitStatus(false, err.message || String(err))
    return { ok: false, error: err.message || String(err) }
  }
}

export async function stopTelegramBot(): Promise<void> {
  if (bot) {
    try { bot.stop('USER_STOPPED') } catch {}
    bot = null
  }
  emitStatus(false)
}

export function isTelegramBotRunning(): boolean {
  return isRunning
}
