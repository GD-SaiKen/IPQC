import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
    viewKey?: string
    workshopMode?: 'all' | 'workshop' | 'any'
    parent?: { name: string }
  }
}
