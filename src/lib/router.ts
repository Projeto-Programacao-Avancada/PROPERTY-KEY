export type AppPage = 'dashboard' | 'history' | 'keys' | 'gallery' | 'ai'

export const ROUTE_PATHS: Record<AppPage, string> = {
  dashboard: '/dashboard',
  history: '/historico',
  keys: '/chaves',
  gallery: '/galeria',
  ai: '/ia',
}

const PATH_TO_PAGE: Record<string, AppPage> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/historico': 'history',
  '/history': 'history',
  '/chaves': 'keys',
  '/keys': 'keys',
  '/galeria': 'gallery',
  '/gallery': 'gallery',
  '/ia': 'ai',
  '/ai': 'ai',
}

export function normalizePathname(pathname: string): string {
  const cleaned = pathname.trim().replace(/\/+$/, '')
  return cleaned === '' ? '/' : cleaned.toLowerCase()
}

export function isKnownPath(pathname: string): boolean {
  return normalizePathname(pathname) in PATH_TO_PAGE
}

export function resolvePage(pathname: string): AppPage {
  return PATH_TO_PAGE[normalizePathname(pathname)] ?? 'dashboard'
}

export function pageToPath(page: AppPage): string {
  return ROUTE_PATHS[page]
}

export function getCurrentPage(): AppPage {
  if (typeof window === 'undefined') return 'dashboard'
  return resolvePage(window.location.pathname)
}

export function navigateTo(page: AppPage, options: { replace?: boolean } = {}): void {
  if (typeof window === 'undefined') return
  const nextPath = pageToPath(page)
  const currentPath = normalizePathname(window.location.pathname)
  if (currentPath === nextPath) return

  if (options.replace) {
    window.history.replaceState({ page }, '', nextPath)
  } else {
    window.history.pushState({ page }, '', nextPath)
  }
}

export function subscribeToRoute(listener: (page: AppPage) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handlePopState = () => listener(getCurrentPage())
  window.addEventListener('popstate', handlePopState)
  return () => window.removeEventListener('popstate', handlePopState)
}
