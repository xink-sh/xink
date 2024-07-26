export { Xink } from '../index.ts'
export const json = (data: any, init?: ResponseInit | undefined): Response => {
  const body = JSON.stringify(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', new TextEncoder().encode(body).byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'application/json')

  return new Response(body, { ...init, headers })
}

export const text = (data: string, init?: ResponseInit | undefined): Response => {
  const body = new TextEncoder().encode(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', body.byteLength.toString())
  
  return new Response(body, { ...init, headers })
}
