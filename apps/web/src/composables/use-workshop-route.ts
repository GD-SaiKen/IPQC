import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useIpqcStore } from '@/stores/ipqc'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import type { WorkshopFilter } from '@/domain/ipqc/types'

const WS_KEYS = new Set<string>(['全部', ...WORKSHOPS.map((w) => w.key)])

function safeWorkshop(raw: unknown): WorkshopFilter {
  const key = String(raw ?? '全部')
  return (WS_KEYS.has(key) ? key : '全部') as WorkshopFilter
}

export function useWorkshopRoute() {
  const route = useRoute()
  const router = useRouter()
  const store = useIpqcStore()

  const syncFromRoute = () => {
    store.setWorkshop(safeWorkshop(route.query.ws))
  }
  syncFromRoute()
  watch(
    () => route.query.ws,
    () => syncFromRoute()
  )

  function setWorkshop(ws: WorkshopFilter, view?: string) {
    store.setWorkshop(ws)
    const name = view || (route.name as string)
    router.push({ name, query: ws === '全部' ? {} : { ws } })
  }

  function enterWorkshop(ws: WorkshopFilter) {
    setWorkshop(ws, 'dash')
  }

  function backToBoard() {
    setWorkshop('全部', 'board')
  }

  return { setWorkshop, enterWorkshop, backToBoard }
}
