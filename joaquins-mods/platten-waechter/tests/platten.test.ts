import { expect, test } from 'claude-code/testing'

const DF = 'Filesystem 1G-blocks Used Available Capacity\n/dev/disk4s1 1862 459 1403 25% /Volumes/Business 1\n'

test('fehlende Platte: Befehl wird gestoppt, Statuszeile zeigt es', async ($, on) => {
  const status: (string | undefined)[] = []
  on('fs.exists', (_, e) => ({ value: !e.path.includes('Personal 1') }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: DF, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('clock.every', () => ({ value: undefined }))
  on('ui.status', (_, e) => { status.push(e.text); return { value: undefined } })
  on('ui.toast', () => ({ value: undefined }))
  on('ui.notify', () => ({ value: { isSent: true, channel: 'test' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(status.at(-1)).toContain('Personal 1 ✗ fehlt')
  expect(status.at(-1)).toContain('Business 1 ✓ 1403 GB frei')

  const blocked = await $.tool.call({ tool: 'Bash', command: 'ls "/Volumes/Personal 1/YouTube"' })
  expect(blocked.deny).toContain('Personal 1 ist nicht angeschlossen')

  const fine = await $.tool.call({ tool: 'Bash', command: 'ls "/Volumes/Business 1"' })
  expect(fine.deny).toBeUndefined()
})
