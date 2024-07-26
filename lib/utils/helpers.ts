const encoder = new TextEncoder()

export const json = (data: any, init?: ResponseInit | undefined): Response => {
  const body = JSON.stringify(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', encoder.encode(body).byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'application/json')

  return new Response(body, { ...init, headers })
}

export const text = (data: string, init?: ResponseInit | undefined): Response => {
  const body = encoder.encode(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', body.byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'text/plain')
  
  return new Response(body, { ...init, headers })
}
