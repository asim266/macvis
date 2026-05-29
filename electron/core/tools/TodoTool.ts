import { getMainWindow } from '../../main'

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm?: string
}

// Latest todo list, kept in-memory so the renderer can re-sync if needed.
let currentTodos: TodoItem[] = []
export function getCurrentTodos(): TodoItem[] {
  return currentTodos
}

export const TodoTool = {
  definition: {
    name: 'todo_write',
    description:
      'Create or update your task list for the current request. Use for any multi-step task (3+ steps) to plan and ' +
      'track progress. Mark exactly one task in_progress at a time; mark tasks completed as soon as they are done. ' +
      'Send the FULL list every time — it replaces the previous list. The user sees this as a live checklist.',
    input_schema: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Imperative task description' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
              activeForm: { type: 'string', description: 'Present-continuous form shown while in progress' },
            },
            required: ['content', 'status'],
          },
        },
      },
      required: ['todos'],
    },
  },

  async execute({ todos }: any) {
    currentTodos = Array.isArray(todos) ? todos : []
    getMainWindow()?.webContents.send('agent:todos', { todos: currentTodos })

    if (currentTodos.length === 0) return 'Todo list cleared.'
    const done = currentTodos.filter(t => t.status === 'completed').length
    const summary = currentTodos
      .map(t => `${t.status === 'completed' ? '[x]' : t.status === 'in_progress' ? '[~]' : '[ ]'} ${t.content}`)
      .join('\n')
    return `Todos updated (${done}/${currentTodos.length} done):\n${summary}`
  },
}
