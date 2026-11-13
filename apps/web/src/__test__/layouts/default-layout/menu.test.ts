import { describe, expect, it } from 'vitest'
import { buildIpqcMenuGroups } from '@/layouts/default-layout/menu'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import type { WorkshopFilter } from '@/domain/ipqc/types'

function workshopItems(workshop: WorkshopFilter) {
  return buildIpqcMenuGroups(workshop)
    .flatMap((g) => g.items)
    .filter((i) => i.workshopEnter)
}

describe('buildIpqcMenuGroups 车间图标', () => {
  it('车间子工作台每个车间图标各不相同', () => {
    const items = workshopItems('全部')
    expect(items).toHaveLength(WORKSHOPS.length)
    expect(new Set(items.map((i) => i.icon)).size).toBe(WORKSHOPS.length)
  })

  it('切换分组里每个车间图标各不相同', () => {
    const items = workshopItems('注塑')
    expect(items.map((i) => i.workshopEnter)).not.toContain('注塑')
    expect(new Set(items.map((i) => i.icon)).size).toBe(items.length)
  })
})
