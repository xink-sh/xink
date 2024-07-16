import { MatchFunction } from "path-to-regexp";

export type RequestEvent = {
  req: Request;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  params: { [key: string]: any };
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
export type SegmentType = {
  name: 'static' | 'specific' | 'matcher' | 'dynamic' | 'low';
  id: number;
}
export type Handler = (event: RequestEvent) => Promise<Response>
export type Handlers = {
  [key: string]: Handler
}
export type RouteInfo = {
  params: { [key: string]: string };
  handler: Handler | null;
}
export type Static = { [key: string]: any }
export type Potential = {
  priority: number;
  path: string;
  params: { [key: string]: string };
  handler: Handler;
}
export type Low = {
  type: number;
  match: MatchFunction;
  handlers: Handlers
}
export type Key = string | number;

/**
 * xink Filesystem Router
 */
export function xink({ req }: { req: Request }): Promise<Response>

/**
 * Initialize xink Router.
 * Needed even if you don't pass in a config.
 */
export function initRouter({}: { config?: Config } = {}): void

export function json(data: any, init?: ResponseInit | undefined): Response
export function text(data: string, init?: ResponseInit | undefined): Response


/**
 * Medley types.
 */
export type Params = { [key: string]: string }
export type Route = { store: Store; params: Params; } | null;
export type Store = { [key: string]: Handler }
export type StoreFactory = () => Store
export type Node = {
  segment: string;
  store: Store | null;
  static_children: Map<number, Node> | null;
  parametric_child: ParametricNode | null;
  wildcard_store: Store | null;
}
export type Matcher = ((param: string) => boolean) | null
export type ParametricNode = {
  matcher: Matcher;
  param_name: string;
  store: Store | null;
  static_child: Node | null;
}