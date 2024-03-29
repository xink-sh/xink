export type RequestEvent = {
  req: Request;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
}
export type Config = {
  params?: string;
  routes?: string;
}
export type DefaultConfig = {
  params: string;
  routes: string;
}
export type ValidatedConfig = {
  params: string;
  routes: string;
}
export type RouteType = 'static' | 'specific' | 'matcher' | 'dynamic' | 'low'
export type Handler = (req: RequestEvent) => Promise<Response>
export type Handlers = Handler | null

/**
 * xink Filesystem Router
 */
export function xink({ req }: { req: Request }): Promise<Response>

/**
 * Initialize xink Router.
 * Needed even if you don't pass in a config.
 */
export function initRouter({}: { config?: Config } = {}): void
