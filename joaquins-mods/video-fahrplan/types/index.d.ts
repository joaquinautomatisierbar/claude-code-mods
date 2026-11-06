export type Plan = { video: string; step: number }

declare module 'claude-code' {
  interface PluginState {
    'video-fahrplan': { plan: Shaped<Plan | null>; isHidden: boolean }
  }
}
