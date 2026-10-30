import type { MenuRoute } from '../auth-context'

export function flattenMenu(items: MenuRoute[]): MenuRoute[] {
  return items.flatMap((item) => [item, ...flattenMenu(item.children || item.submenu || [])])
}

export function menuPath(route: string) {
  return route.startsWith('/') ? route : `/${route}`
}

export function labelForRoute(item: MenuRoute) {
  return item.components.replace(/\.tsx?$/, '').replace(/([a-z])([A-Z])/g, '$1 $2')
}
