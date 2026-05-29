import { setupAgentHandlers } from './agentHandlers'
import { setupConfigHandlers } from './configHandlers'
import { setupMCPHandlers } from './mcpHandlers'
import { setupSkillsHandlers } from './skillsHandlers'
import { setupPacksHandlers } from './packsHandlers'
import { setupTeamsHandlers } from './teamsHandlers'
import { setupSchedulerHandlers } from './schedulerHandlers'
import { setupVoiceHandlers } from './voiceHandlers'
import { setupTerminalHandlers } from './terminalHandlers'
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
  setupTeamsHandlers()
  setupSchedulerHandlers()
  setupVoiceHandlers()
  setupTerminalHandlers()
  setupTelegramHandlers()
  setupProviderHandlers()
  setupSessionHandlers()
  setupProjectHandlers()
}
