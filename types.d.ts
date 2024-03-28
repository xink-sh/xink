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

export function router({ req }: { req: Request }): Promise<Response>
export function initRouter({}: { config?: Config } = {}): void
