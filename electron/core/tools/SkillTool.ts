import { SkillManager } from '../skills/SkillManager'

export const SkillTool = {
  definition: {
    name: 'skill',
    description:
      'Load the full instructions for one of your enabled skills. The system prompt lists available skills by name; ' +
      'call this with the skill id to read its complete playbook BEFORE doing related work. Returns the skill body.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The skill id to load (e.g. "react", "solidity-foundry")' },
      },
      required: ['name'],
    },
  },

  async execute({ name }: any) {
    const parsed = SkillManager.read(name)
    if (!parsed) {
      const available = SkillManager.enabledSummaries().map(s => s.id).join(', ')
      return `No enabled skill with id "${name}". Enabled skills: ${available || '(none)'}.`
    }
    return `# Skill: ${parsed.name}\n\n${parsed.body}`
  },
}
