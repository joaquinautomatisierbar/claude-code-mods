import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Plan } from '../types'

// Der Ablauf jedes Videos, mit der Bitte, die Joaquin sonst jedes Mal tippt.
const STEPS: { name: string; ask: string }[] = [
  { name: 'Vorbild', ask: 'Analysier das Vorbild-Video: erste 3 min messen, Einstieg Satz für Satz zerlegen, Galerie-Eintrag. Link: ' },
  { name: 'Verpackung', ask: 'Mach 3 Varianten (Titel, Thumbnail-Idee, erste 5 s) und 1–3 Upgrades.' },
  { name: 'Skript', ask: 'Schreib das Skript, lass den Skript-Check laufen und beantworte die drei Fragen.' },
  { name: 'Teleprompter', ask: 'Lade das fertige Skript als v<Nr> in den Drive-Teleprompter-Ordner.' },
  { name: 'Dreh', ask: '/drehbereit' },
  { name: 'Schnitt V1', ask: 'Ich habe gedreht. Transkribier die Aufnahme, wähl die besten Takes und bau V1 mit allen Checks und REVIEW.md.' },
  { name: 'Feedback', ask: 'Ich habe V1 angeschaut, hier mein Feedback (mit Zeitmarken): ' },
  { name: 'Paket', ask: 'Video passt. Mach das Veröffentlichungspaket: Titel, Beschreibung mit Kapiteln, Thumbnails für YouTube 16:9, TikTok 3:4 und Insta 9:16.' },
]

const nameOf = (i: number) => STEPS[i]?.name ?? '?'

const STORE_KEY = 'plan'
const plan = atom({ plugin: 'video-fahrplan', key: 'plan' } as const, null, { shape: 'plan-1' })
const isHidden = atom({ plugin: 'video-fahrplan', key: 'isHidden' } as const, false)

async function save($: EngineInterface, next: Plan | null) {
  await update($, plan, () => next)
  await $.store.set(STORE_KEY, next)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'fahrplan',
      description: 'Video-Fahrplan: /fahrplan <Videoname> startet, /fahrplan weiter, /fahrplan aus',
      argumentHint: '<Videoname> | weiter | zurück | aus',
    })
    const stored = (await $.store.get(STORE_KEY)) as Plan | null | undefined
    if (stored && typeof stored.video === 'string') await update($, plan, () => stored)

    return next(e)
  })

  on('command.run', { command: 'fahrplan' }, async ($, e) => {
    const arg = e.args.trim()
    const current = await read($, plan)
    await update($, isHidden, () => false)

    if (arg === 'aus') {
      await save($, null)
      return { text: 'Fahrplan beendet.' }
    }
    if (arg === 'weiter' || arg === 'zurück') {
      if (current === null) return { text: 'Kein Video aktiv. Starte mit /fahrplan <Videoname>.' }
      const step = Math.max(0, Math.min(STEPS.length - 1, current.step + (arg === 'weiter' ? 1 : -1)))
      await save($, { ...current, step })
      return { text: `${current.video}: jetzt ${nameOf(step)}.` }
    }
    if (arg === '') {
      return { text: current === null ? 'Kein Video aktiv.' : `${current.video}: ${nameOf(current.step)}.` }
    }
    await save($, { video: arg, step: 0 })

    return { text: `Neues Video „${arg}“. Erster Schritt: ${nameOf(0)}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, plan)
    if (e.props.hasSurvey || current === null || (await read($, isHidden))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const step = STEPS[current.step]
    if (step === undefined) return next(e)
    const isLast = current.step === STEPS.length - 1

    return (
      <Box flexDirection="column">
        <Text>
          🎬 <Text bold>{current.video}</Text>
          {'  '}
          {STEPS.map((s, i) => (i < current.step ? '●' : i === current.step ? '◉' : '○')).join(' ')}
          {'  '}
          <Text bold>{step.name}</Text> ({current.step + 1}/{STEPS.length})
        </Text>
        <Box flexDirection="row" gap={1}>
          <Button
            key="go"
            label={`${step.name} starten`}
            variant="primary"
            onPress={() => $.prompt.fill({ text: step.ask })}
          />
          {!isLast && (
            <Button
              key="done"
              label="Erledigt →"
              onPress={() => save($, { ...current, step: current.step + 1 })}
            />
          )}
          <Button key="hide" label="Ausblenden" dimColor onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })
}
