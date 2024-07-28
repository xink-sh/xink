const encoder = new TextEncoder()

/**
 * 
 * @param {any} data 
 * @param {ResponseInit} [init] 
 * @returns {Response}
 */
export const json = (data, init) => {
  const body = JSON.stringify(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', encoder.encode(body).byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'application/json')

  return new Response(body, { ...init, headers })
}

/**
 * 
 * @param {string} data 
 * @param {ResponseInit} [init] 
 * @returns {Response}
 */
export const text = (data, init) => {
  const body = encoder.encode(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', body.byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'text/plain')
  
  return new Response(body, { ...init, headers })
}
