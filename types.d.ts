export class Xink {
  async fetch(req: Request): Promise<Response>
}

type MaybePromise<T> = T | Promise<T>
export type Handle = (input: { event: RequestEvent, resolve(event: RequestEvent): MaybePromise<Response> }) => MaybePromise<Response>

export function json(data: any, init?: ResponseInit | undefined): Response
export function text(data: string, init?: ResponseInit | undefined): Response
export function sequence(...handlers: Handle[]): Handle
