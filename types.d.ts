import { MatchFunction } from "path-to-regexp";

export type RequestEvent = {
  req: Request;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  params: { [key: string]: any };
  route: Route
}
export type MaybePromise<T> = T | Promise<T>
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
export type Handler = (event: RequestEvent) => MaybePromise<Response> | null
export type Handlers = {
  [key: string]: Handler
}
type Params = { [key: string]: string }

export type RouteInfo = {
  params: Params;
  handler: Handler | null;
}
export type Static = { [key: string]: any }
export type Key = string | number;

/**
 * xink Filesystem Router
 */
export class Xink {
  async fetch(req: Request): Promise<Response>
}

export type Handle = (input: { event: RequestEvent, resolve(event: RequestEvent): MaybePromise<Response> }) => MaybePromise<Response>
export function json(data: any, init?: ResponseInit | undefined): Response
export function text(data: string, init?: ResponseInit | undefined): Response
export function sequence(...handlers: Handle[])

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
  parametric_children: Map<string, ParametricNode> | null;
  wildcard_store: Store | null;
}
export type Matcher = ((param: string) => boolean) | null;
export type MatcherType = string | null;
export type ParametricNode = {
  matcher: Matcher;
  matcher_type: MatcherType;
  param_name: string;
  store: Store | null;
  static_child: Node | null;
}