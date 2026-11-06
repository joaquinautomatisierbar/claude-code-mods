import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Render } from '../types'

const PANE = 'renders'
const renders = atom({ plugin: 'render-monitor', key: 'renders' } as const, [], {
  shape: 'renders-1',
})

function kindOf(command: string): string | undefined {
  if (/\bhyperframes\b.*\brender\b/.test(command)) return 'HyperFrames'
  if (/\bblender\b.*(\s-b\b|--background)/.test(command)) return 'Blender'
  if (/(^|\/)ffmpeg\s/.test(command)) return 'ffmpeg'

  return undefined
}

// Die Ausgabedatei. `ps` zeigt Pfade ohne Anführungszeichen, und Joaquins Platten
// heissen „Personal 1“: darum den letzten Pfad suchen, der auf eine Medien-Endung
// endet und vor der nächsten Option oder dem Zeilenende steht (Leerzeichen erlaubt).
const MEDIA = /(\/[^\n]*?\.(?:mp4|mov|mkv|webm|m4v|wav|mp3|png|jpg|exr))(?=\s+-|\s*$)/g

function outputOf(command: string): string {
  const paths = [...command.matchAll(MEDIA)]
    .map(m => m[1] ?? '')
    .map(p => p.slice(p.lastIndexOf(' /') + 1))
  const last = paths.at(-1)
  if (last !== undefined && last !== '') return last
  const flag = command.match(/(?:-o|--output)\s+(\S+)/)

  return flag?.[1] ?? ''
}

async function scan($: EngineInterface): Promise<Render[]> {
  const ran = await $.process.run(['ps', '-Ao', 'pid=,etime=,command='])
  const found: Render[] = []

  for (const line of ran.stdout.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/)
    if (m === null) continue
    const [, pid = '', elapsed = '', command = ''] = m
    const kind = kindOf(command)
    if (kind === undefined || command.includes('ps -Ao')) continue
    const output = outputOf(command)
    let sizeMb: number | null = null
    if (output.startsWith('/') && (await $.fs.exists(output))) {
      const stat = await $.fs.stat(output)
      sizeMb = Math.round(stat.size / 1_000_000)
    }
    found.push({ pid, kind, elapsed, output, sizeMb })
  }

  return found
}

async function tick($: EngineInterface) {
  const before = await read($, renders)
  const now = await scan($)
  const gone = before.filter(r => !now.some(n => n.pid === r.pid))

  for (const r of gone) {
    const name = r.output.split('/').pop() ?? r.kind
    void $.ui.notify(`${r.kind} fertig: ${name} (lief ${r.elapsed})`, { title: 'Render fertig' })
  }

  if (before.length === 0 && now.length > 0) {
    void $.ui.open({ id: PANE, title: 'Renders' })
  }

  await update($, renders, () => now)
  $.ui.status(now.length === 0 ? undefined : `🎬 ${now.length} Render${now.length > 1 ? 's' : ''} läuft`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'renders',
      description: 'Zeigt die laufenden Renders in einem Seitenpanel',
    })
    await tick($)
    $.clock.every(5_000, () => void tick($))

    return next(e)
  })

  on('command.run', { command: 'renders' }, async $ => {
    await tick($)
    await $.ui.open({ id: PANE, title: 'Renders' })

    return { text: 'Render-Panel geöffnet.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, renders)

    return (
      <Box flexDirection="column" gap={1}>
        {list.length === 0 && <Text dimColor>Gerade läuft kein Render.</Text>}
        {list.map(r => (
          <Box key={r.pid} flexDirection="column">
            <Text bold>
              {r.kind} · läuft {r.elapsed}
            </Text>
            <Text dimColor wrap="truncate-start">
              {r.output.split('/').slice(-2).join('/')}
              {r.sizeMb === null ? '' : ` · ${r.sizeMb} MB`}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
