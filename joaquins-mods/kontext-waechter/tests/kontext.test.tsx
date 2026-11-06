import { expect, test } from 'claude-code/testing'

const BAND = { plugin: 'kontext-waechter', component: 'AbovePrompt', props: { hasSurvey: false } } as const

const usage = (percent: number) => () => ({
  value: { startedAt: 0, context: { window: 200000, percent }, rateLimits: [{ kind: 'five_hour', percentUsed: 40 }], cost: { usd: 1 } },
})

test('ab 70 % erscheint der Übergabe-Knopf und füllt das Eingabefeld', async ($, on) => {
  const filled: string[] = []
  on('session.usage', usage(78))
  on('prompt.fill', (_, e) => { filled.push(e.text); return { isFilled: true } })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /78 % voll/ }))).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'handoff' })
  expect(filled[0]).toContain('UEBERGABE.md')
  await ui.unmount()
})

test('unter 70 % bleibt es ruhig', async ($, on) => {
  on('session.usage', usage(30))
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /voll/ }))).toBeUndefined()
  await ui.unmount()
})
