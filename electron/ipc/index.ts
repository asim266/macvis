import { setupAgentHandlers } from './agentHandlers'
import { setupConfigHandlers } from './configHandlers'
import { setupMCPHandlers } from './mcpHandlers'
import { setupSkillsHandlers } from './skillsHandlers'
import { setupPacksHandlers } from './packsHandlers'
import { setupTelegramHandlers } from './telegramHandlers'
import { setupProviderHandlers } from './providerHandlers'
import { setupSessionHandlers } from './sessionHandlers'
import { setupProjectHandlers } from './projectHandlers'

export function setupIPCHandlers() {
  setupAgentHandlers()
  setupConfigHandlers()
  setupMCPHandlers()
  setupSkillsHandlers()
  setupPacksHandlers()
  setupTelegramHandlers()
  setupProviderHandlers()
  setupSessionHandlers()
  setupProjectHandlers()
}
