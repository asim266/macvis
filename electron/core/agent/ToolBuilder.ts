import { getToolDefinitions } from '../tools'

export class ToolBuilder {
  static async buildAll(_config: any): Promise<any[]> {
    const native = getToolDefinitions()
    return [...native]
  }
}
