import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useIpqcStore } from '@/stores/ipqc'
import type { WorkshopFilter } from '@/domain/ipqc/types'

export function useWorkshopRoute() {
  const route = useRoute()
  const router = useRouter()
  const store = useIpqcStore()

  const syncFromRoute = () => {
    const ws = (route.query.ws as string) || '全部'
    store.setWorkshop(ws as WorkshopFilter)
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
