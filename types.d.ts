export class Xink {
  async fetch(request: Request): Promise<Response>
}

export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>
export type MaybePromise<T> = T | Promise<T>
export type RequestEvent = {
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  locals: { [key: string]: string },
  params: Params;
  request: Request;
  route: Route;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
}
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>

export function json(data: any, init?: ResponseInit | undefined): Response
export function text(data: string, init?: ResponseInit | undefined): Response
export function sequence(...handlers: Handle[]): Handle
