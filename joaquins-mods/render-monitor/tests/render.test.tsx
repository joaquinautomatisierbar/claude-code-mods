import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'render-monitor', component: 'Pane', requestId: 'renders',
  props: { title: 'Renders', isFocused: false, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

const ps = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
// So zeigt ps es wirklich: ohne Anführungszeichen, mit Leerzeichen im Plattennamen.
const RUNNING =
  '  4242   12:04 /opt/homebrew/bin/ffmpeg -i /Volumes/Personal 1/raw/take.mov -c:v libx264 /Volumes/Personal 1/out/V1.mp4\n' +
  '  4300   01:10 node /x/hyperframes render -o /Volumes/Personal 1/render/Szene 3.mp4 --fps 30\n' +
  '  99 01:00 /bin/zsh -c foo; ffmpeg -i a.mov b.mp4\n'

test('läuft ein Render: Panel zeigt ihn, endet er: Benachrichtigung', async ($, on) => {
  let out = RUNNING
  const notes: string[] = []
  const opened: string[] = []
  on('process.run', () => ps(out))
  on('fs.exists', () => ({ value: true }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 1_200_000_000, mtimeMs: 0, isLink: false } }))
  on('clock.every', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.open', (_, e) => { opened.push(e.id); return { value: { isPlaced: true } } })
  on('ui.notify', (_, e) => { notes.push(e.text); return { value: { isSent: true, channel: 'test' } } })
  on('command.register', () => ({ value: { command: 'renders' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(opened).toContain('renders')

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /ffmpeg · läuft 12:04/ }))).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /out\/V1\.mp4 · 1200 MB/ }))).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /HyperFrames · läuft 01:10/ }))).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /render\/Szene 3\.mp4/ }))).toBeDefined()
  await ui.unmount()

  out = '  99 01:00 /bin/zsh\n'
  await $.command.run({ command: 'renders', args: '' })
  expect(notes.some(n => n.includes('ffmpeg fertig: V1.mp4'))).toBe(true)
  expect(notes.some(n => n.includes('HyperFrames fertig: Szene 3.mp4'))).toBe(true)
  expect(notes.length).toBe(2)
})
