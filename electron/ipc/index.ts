import { setupAgentHandlers } from './agentHandlers'
import { setupConfigHandlers } from './configHandlers'
import { setupMCPHandlers } from './mcpHandlers'
import { setupSkillsHandlers } from './skillsHandlers'
import { setupTelegramHandlers } from './telegramHandlers'

export function setupIPCHandlers() {
  setupAgentHandlers()
  setupConfigHandlers()
  setupMCPHandlers()
  setupSkillsHandlers()
  setupTelegramHandlers()
}
