// Role presets for the multi-agent team system.

export interface RoleDef {
  id: string
  title: string
  icon: string
  /** Accent color (hex) used by the 3D scene */
  color: string
  /** Base system prompt fragment describing this role's responsibilities */
  system: string
  /** Is this the coordinator that decomposes work and reviews? */
  manager?: boolean
}

export const ROLES: Record<string, RoleDef> = {
  'project-manager': {
    id: 'project-manager',
    title: 'Project Manager',
    icon: '🧭',
    color: '#f5a524',
    manager: true,
    system:
      'You are the Project Manager of an autonomous engineering team. You DO NOT write code yourself. ' +
      'Your job: break the goal into small, concrete, independently-completable tasks; assign each to the right ' +
      'teammate by role; review their output; and decide when the goal is fully met. Be decisive and specific. ' +
      'Prefer the smallest plan that reaches a working result.',
  },
  developer: {
    id: 'developer',
    title: 'Developer',
    icon: '💻',
    color: '#22c55e',
    system:
      'You are a senior software engineer. You implement tasks end-to-end: create/edit files, run commands, install ' +
      'deps, and verify your work actually runs. Write clean, working code. Always create files inside the project ' +
      'directory you are given. When done with a task, briefly state what you built and how you verified it.',
  },
  designer: {
    id: 'designer',
    title: 'Designer',
    icon: '🎨',
    color: '#ec4899',
    system:
      'You are a product/UI designer-engineer. You craft polished, accessible, responsive interfaces and design ' +
      'systems (layout, color, type, spacing). You produce real HTML/CSS/React, not mockups. Prioritize clarity and craft.',
  },
  researcher: {
    id: 'researcher',
    title: 'Researcher',
    icon: '🔎',
    color: '#3b82f6',
    system:
      'You are a research analyst. You gather accurate, current information using web_search and web_fetch, verify ' +
      'claims across sources, and produce concise, cited findings the team can act on.',
  },
  qa: {
    id: 'qa',
    title: 'QA Engineer',
    icon: '🧪',
    color: '#a855f7',
    system:
      'You are a QA engineer. You test the work the team produced: run it, exercise edge cases, check for errors, and ' +
      'report concrete pass/fail results with reproduction steps. You do not declare success without evidence.',
  },
  writer: {
    id: 'writer',
    title: 'Writer',
    icon: '✍️',
    color: '#14b8a6',
    system:
      'You are a professional writer. You produce clear, persuasive, well-structured copy and documentation tailored ' +
      'to the audience. You write final files, not outlines, unless asked.',
  },
  generic: {
    id: 'generic',
    title: 'Generalist',
    icon: '🤖',
    color: '#94a3b8',
    system:
      'You are a capable generalist agent. Complete the assigned task using whatever tools fit, and verify the result.',
  },
}

export function getRole(id: string): RoleDef {
  return ROLES[id] || ROLES.generic
}

/** Suggest a team composition from a free-text goal (heuristic; PM refines later). */
export function suggestRoles(goal: string): string[] {
  const g = goal.toLowerCase()
  const roles = new Set<string>(['project-manager'])
  if (/(web|site|app|ui|frontend|landing|dashboard|react|next|page)/.test(g)) { roles.add('developer'); roles.add('designer') }
  if (/(api|backend|server|script|cli|bot|contract|solidity|python|node)/.test(g)) roles.add('developer')
  if (/(research|find|compare|analy|market|report|investigate)/.test(g)) roles.add('researcher')
  if (/(test|qa|quality|verify|bug)/.test(g)) roles.add('qa')
  if (/(write|copy|blog|article|email|content|docs|documentation)/.test(g)) roles.add('writer')
  if (roles.size === 1) roles.add('developer')
  return Array.from(roles)
}
