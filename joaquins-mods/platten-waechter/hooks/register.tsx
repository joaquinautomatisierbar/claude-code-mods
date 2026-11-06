import type { EngineInterface, Register } from 'claude-code'

// Die Platten, auf denen das Videomaterial liegt.
const DISKS = ['Personal 1', 'Business 1']

const wasMounted: Record<string, boolean> = {}

async function freeGb($: EngineInterface, disk: string): Promise<number | undefined> {
  const ran = await $.process.run(['df', '-g', `/Volumes/${disk}`])
  const row = ran.stdout.trim().split('\n')[1]
  const free = row?.split(/\s+/)[3]

  return free === undefined ? undefined : Number(free)
}

async function check($: EngineInterface) {
  const parts: string[] = []

  for (const disk of DISKS) {
    const isMounted = await $.fs.exists(`/Volumes/${disk}`)

    if (isMounted) {
      const free = await freeGb($, disk)
      parts.push(`${disk} ✓ ${free ?? '?'} GB frei`)
    } else {
      parts.push(`${disk} ✗ fehlt`)
    }

    const before = wasMounted[disk]
    if (before === true && !isMounted) {
      void $.ui.notify(`${disk} wurde getrennt. Laufende Renders darauf brechen ab.`, {
        title: 'Platten-Wächter',
      })
    }
    if (before === false && isMounted) {
      $.ui.toast(`${disk} ist wieder da.`)
    }
    wasMounted[disk] = isMounted
  }

  $.ui.status(`💾 ${parts.join('  ·  ')}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await check($)
    $.clock.every(20_000, () => void check($))

    return next(e)
  })

  // Vor jedem Werkzeug, das eine Platte anfasst: Ist sie überhaupt da?
  on('tool.call', async ($, e, next) => {
    const text = JSON.stringify(e)
    const disk = DISKS.find(d => text.includes(`/Volumes/${d}`))

    if (disk !== undefined && !(await $.fs.exists(`/Volumes/${disk}`))) {
      await check($)

      return {
        deny: `${disk} ist nicht angeschlossen. Bitte Joaquin, die Platte einzustecken, und warte auf sein OK, statt auf den Mac auszuweichen.`,
      }
    }

    return next(e)
  }).catch(($, e, next) => next(e))
}
