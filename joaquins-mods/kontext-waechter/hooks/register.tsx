import type { EngineInterface, Register } from 'claude-code'

// Ab hier erscheint der Hinweis über dem Eingabefeld.
const WARN_CONTEXT = 70
const WARN_LIMIT = 80
const ALARM_CONTEXT = 85

const HANDOFF =
  'Der Chat ist bald voll. Schreib eine Übergabe für eine neue Session: Ziel, was erledigt ist, was offen ist, ' +
  'wichtige Pfade (Projekt auf der Platte), letzte Entscheidungen von mir. Speicher sie als UEBERGABE.md im Projektordner.'

let hasAlarmed = false

type Reading = { context: number; limit: number | undefined; limitKind: string; usd: number | undefined }

async function reading($: EngineInterface): Promise<Reading> {
  const usage = await $.session.usage()
  const five = usage.rateLimits.find(r => r.kind === 'five_hour') ?? usage.rateLimits[0]

  return {
    context: Math.round(usage.context.percent ?? 0),
    limit: five === undefined ? undefined : Math.round(five.percentUsed),
    limitKind: five?.kind === 'five_hour' ? '5-h-Limit' : (five?.kind ?? ''),
    usd: usage.cost?.usd,
  }
}

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const r = await reading($)
    if (r.context >= ALARM_CONTEXT && !hasAlarmed) {
      hasAlarmed = true
      void $.ui.notify(`Der Chat ist zu ${r.context} % voll. Zeit für eine Übergabe.`, { title: 'Kontext-Wächter' })
    }
    if (r.context < WARN_CONTEXT) hasAlarmed = false

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const r = await reading($)
    const isWarn = r.context >= WARN_CONTEXT || (r.limit ?? 0) >= WARN_LIMIT
    if (!isWarn) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const parts = [`Chat zu ${r.context} % voll`]
    if (r.limit !== undefined) parts.push(`${r.limitKind} ${r.limit} %`)

    return (
      <Box flexDirection="row" gap={1} alignItems="center">
        <Text color="warning">🧠 {parts.join(' · ')}</Text>
        <Button
          key="handoff"
          label="Übergabe schreiben"
          variant="primary"
          onPress={() => $.prompt.fill({ text: HANDOFF })}
        />
        <Button key="compact" label="Kompaktieren" onPress={() => $.prompt.fill({ text: '/compact' })} />
      </Box>
    )
  })
}
