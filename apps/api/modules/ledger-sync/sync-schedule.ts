const SHANGHAI_TZ = 'Asia/Shanghai'

function shanghaiParts(now: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SHANGHAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
  }
}

/** 上海日历日 YYYY-MM-DD */
export function shanghaiDateKey(now: Date): string {
  const { year, month, day } = shanghaiParts(now)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function isPastScheduleTime(now: Date, hour: number, minute: number): boolean {
  const { hour: h, minute: m } = shanghaiParts(now)
  if (h > hour) {
    return true
  }
  if (h < hour) {
    return false
  }
  return m >= minute
}

/**
 * 当天尚无定时轮次，且当前上海时间已到配置的 hour:minute（含晚启动补跑）。
 * 立即同步不占名额，由调用方用 hasScheduledRunToday 反映库里是否已有 scheduledRunDate。
 */
export function shouldStartScheduledSync(input: {
  now: Date
  hour: number
  minute: number
  hasScheduledRunToday: boolean
}): boolean {
  if (input.hasScheduledRunToday) {
    return false
  }
  return isPastScheduleTime(input.now, input.hour, input.minute)
}