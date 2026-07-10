import fs from 'fs'
import path from 'path'
import os from 'os'
import { getMainWindow } from '../../main'
import { ConfigStore } from '../config/ConfigStore'
import { runAgent } from './AgentRunner'
import { getRole, suggestRoles, ROLES } from './AgentRoles'

const TEAMS_DIR = path.join(os.homedir(), '.macvis', 'teams')
const PROJECTS_DIR = path.join(os.homedir(), '.macvis', 'workspace', 'projects')

// Surface a team worker's dangerous tool calls through the main HITL approval
// dialog (same gate as the interactive agent). Unattended → auto-deny.
const teamApprove = (tu: { id: string; name: string; input: any; reason?: string }) =>
  import('../agent/AgentLoop').then(({ agentLoop }) => agentLoop.requestExternalApproval(tu, { reason: tu.reason }))

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'reviewing' | 'waiting' | 'done' | 'error'
export type TeamStatus = 'planning' | 'awaiting-approval' | 'running' | 'paused' | 'done' | 'stopped' | 'error'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

export interface TeamAgent {
  id: string; role: string; name: string; icon: string; color: string
  status: AgentStatus; currentTask?: string; lastMessage?: string
}
export interface TeamTask {
  id: string; title: string; role: string; status: TaskStatus; result?: string; agentId?: string
}
export interface TeamLog { ts: number; agentId?: string; kind: 'system' | 'message' | 'tool' | 'hitl' | 'result'; text: string }
export interface HitlRequest {
  id: string; kind: 'plan' | 'review' | 'final' | 'confirm'
  prompt: string; options: { value: string; label: string }[]; allowFeedback?: boolean
}
export interface Team {
  id: string; goal: string; projectDir: string
  agents: TeamAgent[]; tasks: TeamTask[]; log: TeamLog[]
  status: TeamStatus; round: number
  hitl?: HitlRequest | null
  createdAt: number; updatedAt: number
}
export interface HitlDecision { action: 'approve' | 'reject' | 'feedback' | 'stop'; feedback?: string }

const MAX_ROUNDS = 6

let _ctr = 0
function uid(p: string) { return `${p}_${Date.now().toString(36)}_${(++_ctr).toString(36)}` }
function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'team' }

function extractJsonArray(text: string): any[] {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) return []
  try { const v = JSON.parse(m[0]); return Array.isArray(v) ? v : [] } catch { return [] }
}

export class TeamOrchestrator {
  private static _i: TeamOrchestrator
  static getInstance() { return (this._i ||= new TeamOrchestrator()) }

  private teams = new Map<string, Team>()
  private pendingHitl = new Map<string, (d: HitlDecision) => void>()
  private stopped = new Set<string>()

  list(): Team[] {
    this.hydrate()
    return Array.from(this.teams.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }
  get(id: string): Team | undefined { return this.teams.get(id) }

  private hydrate() {
    if (!fs.existsSync(TEAMS_DIR)) { fs.mkdirSync(TEAMS_DIR, { recursive: true }); return }
    if (this.teams.size > 0) return
    for (const f of fs.readdirSync(TEAMS_DIR)) {
      if (!f.endsWith('.json')) continue
      try { const t = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, f), 'utf-8')); this.teams.set(t.id, t) } catch {}
    }
  }

  private persist(team: Team) {
    team.updatedAt = Date.now()
    try {
      fs.mkdirSync(TEAMS_DIR, { recursive: true })
      fs.writeFileSync(path.join(TEAMS_DIR, `${team.id}.json`), JSON.stringify(team, null, 2))
    } catch {}
    getMainWindow()?.webContents.send('team:update', team)
  }

  private log(team: Team, kind: TeamLog['kind'], text: string, agentId?: string) {
    team.log.push({ ts: Date.now(), kind, text, agentId })
    if (team.log.length > 400) team.log = team.log.slice(-400)
  }

  /** Create a team and start it running in the background. */
  create(goal: string, roleIds?: string[]): Team {
    this.hydrate()
    const id = uid('team')
    const projectDir = path.join(PROJECTS_DIR, `${slug(goal)}-${id.slice(-6)}`)
    const roles = (roleIds && roleIds.length ? roleIds : suggestRoles(goal))
    if (!roles.includes('project-manager')) roles.unshift('project-manager')

    const agents: TeamAgent[] = roles.map(r => {
      const def = getRole(r)
      return { id: uid('agent'), role: r, name: def.title, icon: def.icon, color: def.color, status: 'idle' }
    })

    const team: Team = {
      id, goal, projectDir, agents, tasks: [], log: [],
      status: 'planning', round: 0, hitl: null,
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    this.teams.set(id, team)
    this.log(team, 'system', `Team created for: ${goal}`)
    this.persist(team)
    // Run async; do not await
    this.run(team).catch((err: any) => {
      team.status = 'error'
      this.log(team, 'system', `Fatal error: ${err.message || String(err)}`)
      this.persist(team)
    })
    return team
  }

  stop(id: string) {
    this.stopped.add(id)
    const team = this.teams.get(id)
    if (team) { team.status = 'stopped'; this.log(team, 'system', 'Stopped by user.'); this.persist(team) }
    // Unblock any pending HITL
    this.pendingHitl.get(id)?.({ action: 'stop' })
  }

  respond(id: string, decision: HitlDecision) {
    const r = this.pendingHitl.get(id)
    if (r) { this.pendingHitl.delete(id); r(decision) }
  }

  private isStopped(id: string) { return this.stopped.has(id) }

  private setAgent(team: Team, agentId: string, patch: Partial<TeamAgent>) {
    const a = team.agents.find(x => x.id === agentId)
    if (a) Object.assign(a, patch)
    this.persist(team)
  }

  private pm(team: Team) { return team.agents.find(a => getRole(a.role).manager) || team.agents[0] }

  private requestHitl(team: Team, req: HitlRequest): Promise<HitlDecision> {
    team.hitl = req
    this.log(team, 'hitl', req.prompt)
    this.persist(team)
    getMainWindow()?.webContents.send('team:hitl', { teamId: team.id, hitl: req })
    return new Promise(resolve => this.pendingHitl.set(team.id, (d) => { team.hitl = null; resolve(d) }))
  }

  private agentEvents(team: Team, agent: TeamAgent) {
    return {
      onText: (t: string) => {
        agent.lastMessage = ((agent.lastMessage || '') + t).slice(-280)
        this.persist(team)
      },
      onTool: (name: string, input: any, _r?: string, status?: string) => {
        if (status === 'running') {
          const hint = input?.command || input?.path || input?.url || input?.query || ''
          agent.lastMessage = `${name}${hint ? ' · ' + String(hint).slice(0, 60) : ''}`
          this.log(team, 'tool', agent.lastMessage, agent.id)
          this.persist(team)
        }
      },
    }
  }

  private async run(team: Team): Promise<void> {
    const config = ConfigStore.getInstance()
    fs.mkdirSync(team.projectDir, { recursive: true })
    const pm = this.pm(team)
    const workerRoles = team.agents.filter(a => !getRole(a.role).manager)
    const rosterText = team.agents.map(a => `- ${a.role} (${a.name})`).join('\n')

    // ── 1. PLAN ──────────────────────────────────────────────────────────────
    let planFeedback = ''
    let tasks: { title: string; role: string }[] = []
    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.isStopped(team.id)) return
      team.status = 'planning'
      this.setAgent(team, pm.id, { status: 'thinking', currentTask: 'Planning' })
      const planPrompt =
        `Goal: ${team.goal}\n\nProject directory (all files go here): ${team.projectDir}\n\n` +
        `Your team roster (assign each task to one role):\n${rosterText}\n\n` +
        (planFeedback ? `The user gave this feedback on your previous plan — incorporate it:\n${planFeedback}\n\n` : '') +
        `Break the goal into 3–8 concrete tasks. Reply with ONLY a JSON array, each item ` +
        `{"title": "...", "role": "<one of: ${workerRoles.map(r => r.role).join(', ')}>"}. No prose.`
      const res = await runAgent({ system: getRole(pm.role).system, message: planPrompt, config, maxSteps: 4, signal: () => this.isStopped(team.id), events: this.agentEvents(team, pm), approve: teamApprove })
      const parsed = extractJsonArray(res.text)
      tasks = parsed.map((t: any) => ({
        title: String(t.title || t.task || '').slice(0, 200),
        role: ROLES[t.role] ? t.role : (workerRoles[0]?.role || 'developer'),
      })).filter(t => t.title)
      if (tasks.length === 0) tasks = [{ title: team.goal, role: workerRoles[0]?.role || 'developer' }]

      team.tasks = tasks.map(t => ({ id: uid('task'), title: t.title, role: t.role, status: 'pending' as TaskStatus }))
      this.setAgent(team, pm.id, { status: 'waiting' })
      this.log(team, 'result', `Plan: ${tasks.length} tasks`)

      // HITL: approve the plan
      team.status = 'awaiting-approval'
      const decision = await this.requestHitl(team, {
        id: uid('hitl'), kind: 'plan',
        prompt: `Review the plan (${tasks.length} tasks) for "${team.goal}". Approve to start, or send feedback to revise.`,
        options: [{ value: 'approve', label: 'Approve & start' }, { value: 'reject', label: 'Cancel' }],
        allowFeedback: true,
      })
      if (decision.action === 'stop' || decision.action === 'reject') { team.status = 'stopped'; this.persist(team); return }
      if (decision.action === 'feedback' && decision.feedback) { planFeedback = decision.feedback; continue }
      break
    }

    // ── 2. EXECUTE (rounds until done) ────────────────────────────────────────
    team.status = 'running'
    this.persist(team)
    for (team.round = 1; team.round <= MAX_ROUNDS; team.round++) {
      if (this.isStopped(team.id)) return
      const pending = team.tasks.filter(t => t.status === 'pending')
      if (pending.length === 0) break

      for (const task of pending) {
        if (this.isStopped(team.id)) return
        const agent = team.agents.find(a => a.role === task.role) || workerRoles[0] || pm
        task.status = 'in_progress'; task.agentId = agent.id
        this.setAgent(team, agent.id, { status: 'working', currentTask: task.title })
        this.log(team, 'message', `${agent.name} → ${task.title}`, agent.id)

        const doneTasks = team.tasks.filter(t => t.status === 'done' && t.result)
        const context = doneTasks.length
          ? `\n\nWork already completed by the team:\n${doneTasks.map(t => `• ${t.title}: ${(t.result || '').slice(0, 300)}`).join('\n')}`
          : ''
        const message =
          `Project goal: ${team.goal}\nProject directory (create ALL files here): ${team.projectDir}\n\n` +
          `Your task: ${task.title}${context}\n\nComplete it fully, create/modify the necessary files, and verify it works. ` +
          `End with a one-paragraph summary of what you did.`
        try {
          const res = await runAgent({ system: getRole(agent.role).system, message, config, maxSteps: 24, signal: () => this.isStopped(team.id), events: this.agentEvents(team, agent), approve: teamApprove })
          task.status = 'done'; task.result = res.text.slice(0, 1500)
          this.setAgent(team, agent.id, { status: 'done', currentTask: undefined, lastMessage: res.text.slice(-200) })
          this.log(team, 'result', `✓ ${task.title}`, agent.id)
        } catch (err: any) {
          task.status = 'blocked'
          this.setAgent(team, agent.id, { status: 'error', lastMessage: err.message })
          this.log(team, 'system', `✗ ${task.title}: ${err.message}`, agent.id)
        }
        this.persist(team)
      }

      // PM reviews — is the goal complete? add tasks if not.
      if (this.isStopped(team.id)) return
      this.setAgent(team, pm.id, { status: 'reviewing', currentTask: 'Reviewing progress' })
      const summary = team.tasks.map(t => `• [${t.status}] ${t.title}: ${(t.result || '').slice(0, 200)}`).join('\n')
      const reviewPrompt =
        `Goal: ${team.goal}\nProject dir: ${team.projectDir}\n\nProgress so far:\n${summary}\n\n` +
        `Is the goal fully achieved and working? If YES, reply with exactly: DONE. ` +
        `If NO, reply with ONLY a JSON array of additional tasks ({"title","role"}) needed to finish.`
      const review = await runAgent({ system: getRole(pm.role).system, message: reviewPrompt, config, maxSteps: 6, signal: () => this.isStopped(team.id), events: this.agentEvents(team, pm), approve: teamApprove })
      this.setAgent(team, pm.id, { status: 'waiting', currentTask: undefined })

      if (/\bDONE\b/.test(review.text) && extractJsonArray(review.text).length === 0) {
        this.log(team, 'result', 'PM: goal complete.')
        break
      }
      const more = extractJsonArray(review.text)
        .map((t: any) => ({ title: String(t.title || '').slice(0, 200), role: ROLES[t.role] ? t.role : 'developer' }))
        .filter((t: any) => t.title)
      if (more.length === 0) break
      for (const t of more) team.tasks.push({ id: uid('task'), title: t.title, role: t.role, status: 'pending' })
      this.log(team, 'message', `PM added ${more.length} follow-up task(s).`)
      this.persist(team)
    }

    // ── 3. FINAL HITL ────────────────────────────────────────────────────────
    if (this.isStopped(team.id)) return
    for (const a of team.agents) a.status = 'done'
    const decision = await this.requestHitl(team, {
      id: uid('hitl'), kind: 'final',
      prompt: `The team finished "${team.goal}". Files are in ${team.projectDir}. Accept the result, or send feedback to continue iterating.`,
      options: [{ value: 'approve', label: 'Accept' }, { value: 'feedback', label: 'Iterate with feedback' }],
      allowFeedback: true,
    })
    if (decision.action === 'feedback' && decision.feedback) {
      team.tasks.push({ id: uid('task'), title: decision.feedback, role: 'developer', status: 'pending' })
      this.log(team, 'message', `User requested more: ${decision.feedback}`)
      return this.run(team) // continue iterating
    }
    team.status = 'done'
    this.log(team, 'system', 'Team complete.')
    this.persist(team)
  }
}
