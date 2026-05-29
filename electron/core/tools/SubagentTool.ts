import { getMainWindow } from '../../main'

export const SubagentTool = {
  definition: {
    name: 'task',
    description:
      'Delegate a focused subtask to an autonomous sub-agent that has the full toolset and runs its own tool-use loop ' +
      'to completion, then returns a concise result. Use for self-contained work you want done in one shot (research a ' +
      'topic, refactor a file, gather data) without cluttering the main conversation. Give it a complete, standalone brief.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'A complete, self-contained instruction for the sub-agent' },
        role: { type: 'string', description: 'Optional role hint, e.g. "researcher", "developer", "writer"' },
      },
      required: ['prompt'],
    },
  },

  async execute({ prompt, role }: any, config: any) {
    const { runAgent } = await import('../agents/AgentRunner')
    const system =
      `You are an autonomous ${role || 'general-purpose'} sub-agent inside MacVis. You have the full native + MCP toolset. ` +
      `Complete the task end to end using tools, then return a concise summary of what you did and the key result/output. ` +
      `Do not ask questions — make reasonable assumptions and finish.`
    try {
      const res = await runAgent({
        system,
        message: prompt,
        config,
        maxSteps: 18,
        events: {
          onTool: (name) => getMainWindow()?.webContents.send('agent:subagent', { name }),
        },
      })
      return `Sub-agent finished (${res.toolCount} tool calls).\n\n${res.text || '(no text returned)'}`
    } catch (err: any) {
      return `Sub-agent failed: ${err.message || String(err)}`
    }
  },
}
