import type { EngineInterface, Register } from 'claude-code'

const OBS_PROFILES = 'Library/Application Support/obs-studio/basic/profiles'

async function sh($: EngineInterface, script: string): Promise<string> {
  const ran = await $.process.run(['/bin/sh', '-c', script])

  return ran.stdout.trim()
}

async function freeGb($: EngineInterface, path: string): Promise<number | undefined> {
  const out = await sh($, `df -g "${path}" | tail -1 | awk '{print $4}'`)

  return out === '' ? undefined : Number(out)
}

async function report($: EngineInterface): Promise<{ text: string; isReady: boolean }> {
  const rows: string[] = []
  let isReady = true
  const ok = (good: boolean, line: string) => {
    if (!good) isReady = false
    rows.push(`${good ? '✅' : '❌'} ${line}`)
  }

  const isObsRunning = (await sh($, 'pgrep -x OBS || true')) !== ''
  ok(isObsRunning, isObsRunning ? 'OBS läuft' : 'OBS ist nicht offen')

  const recPath = await sh($, `grep -h '^RecFilePath=' "$HOME/${OBS_PROFILES}"/*/basic.ini | head -1 | cut -d= -f2-`)
  if (recPath === '') {
    ok(false, 'Kein Aufnahmepfad in OBS gefunden')
  } else {
    const isThere = await $.fs.exists(recPath)
    ok(isThere, `Aufnahmepfad: ${recPath}${isThere ? '' : ' (nicht erreichbar, Platte angeschlossen?)'}`)

    if (isThere) {
      const free = await freeGb($, recPath)
      // 4K-Aufnahmen brauchen grob 1 GB pro Minute.
      ok((free ?? 0) >= 50, `Freier Platz am Aufnahmeort: ${free ?? '?'} GB (Minimum 50)`)

      const last = await sh($, `ls -t "${recPath}" | grep -iE '\\.(mov|mp4|mkv)$' | head -1`)
      if (last !== '') {
        const age = await sh($, `echo $(( ($(date +%s) - $(stat -f %m "${recPath}/${last}")) / 60 ))`)
        rows.push(`ℹ️ Letzte Aufnahme: ${last} (vor ${age} min)`)
      }
    }
  }

  const macFree = await freeGb($, '/')
  const isMacOk = (macFree ?? 0) >= 15
  rows.push(`${isMacOk ? '✅' : '⚠️'} Mac: ${macFree ?? '?'} GB frei`)

  const teleprompter = await sh($, `ls -t "$HOME/CC YouTube"/*/v*.txt 2>/dev/null | head -1`)
  if (teleprompter !== '') rows.push(`ℹ️ Neuestes Skript: ${teleprompter.split('/').slice(-2).join('/')}`)

  const head = isReady ? '🎬 Drehbereit. Viel Spass!' : '🛑 Noch nicht drehbereit:'

  return { text: [head, ...rows].join('\n'), isReady }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'drehbereit',
      description: 'Prüft OBS, Aufnahmepfad, Platte und Speicher vor dem Dreh',
    })

    return next(e)
  })

  on('command.run', { command: 'drehbereit' }, async $ => {
    const { text, isReady } = await report($)
    $.ui.toast(isReady ? 'Drehbereit ✅' : 'Noch nicht drehbereit ❌')

    return { text }
  })
}
