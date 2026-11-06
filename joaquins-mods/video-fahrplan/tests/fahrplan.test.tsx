import { expect, mock, test } from 'claude-code/testing'

const BAND = { plugin: 'video-fahrplan', component: 'AbovePrompt', props: {} } as const

test('/fahrplan startet ein Video und der Balken zeigt den Schritt', async ($, on) => {
  mock.store(on)
  on('command.register', () => ({ value: { command: 'fahrplan' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'fahrplan', args: 'Claude Code Mods' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /Claude Code Mods/ }))).toBeDefined()
    expect((await ui.find({ key: 'go' }))).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'done' })
  expect((await ui.find({ type: 'Text', text: /Verpackung/ }))).toBeDefined()
  await ui.unmount()
})
