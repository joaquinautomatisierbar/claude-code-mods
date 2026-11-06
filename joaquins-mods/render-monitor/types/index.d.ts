export type Render = {
  pid: string
  kind: string
  elapsed: string
  output: string
  sizeMb: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'render-monitor': { renders: Shaped<Render[]> }
  }
}
