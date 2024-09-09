# xink

This deliciousness is still baking, and is a first iteration. I've since started building xink as a Bun plugin [here](https://github.com/xink-sh/xink-bun-plugin), so it can theoretically be used in edge runtimes.

xink is a directory-based router designed for APIs, and uses [Medley router](https://github.com/medleyjs/router) under the hood.

Medley router provides the following route features:

- static, /hello/there/world
- specific, /hello/miss-[name]
- dynamic, /hello/[name]
- trailing rest, /hello/[...rest]

So far, we've added the following route features:

- matcher, /hello/[name=string] (where 'string' references a function which tests if [name] matches)

> The `[[optional]]` route feature is planned. We may consider allowing [...rest] to be in the middle of a route.

## Defining Routes

xink is based on [SvelteKit's](https://kit.svelte.dev/docs/routing#server) implementation of directory routing. For example, an endpoint file needs to export one or more functions for each HTTP method it will serve. You can also define a fallback, for any unhandled request methods.

> xink does not support the `CONNECT` or `TRACE` HTTP request methods.

```ts
/* src/routes/article/[slug]/endpoint.ts */
import { json, text } from '@xink-sh/xink'

export const GET = async ({ url, params }) => {
  const article = await getArticle(params.slug)

  return text(`Here is the ${article.title} post!`)
}

export const POST = async ({ req, url }) => {
  return json(await req.json())
}

export const fallback = ({ req }) => {
  return text(`Hello ${req.method}`)
}
```

## Use

### Bun
```ts
import { Xink } from "@xink-sh/xink"

const api = new Xink()

export default api
// OR
Bun.serve({ fetch: api.fetch })
```

### Deno
```ts
import { Xink } from "@xink-sh/xink"

const api = new Xink()

Deno.serve(api.fetch)
```

## Matcher routes

To define a test for a matcher route, create a `src/params` directory in your project. Then create a javascript or typescript file for each type. The file needs to export a `match` function that takes in a string and returns a boolean. When `true` is returned, the param matches and the router either continues to try and match the rest of the route or returns the route if this is the last segment. Returning `false` indicates the param does not match, and the router keeps searching for a route.

```ts
/* src/params/fruit.ts */
export const match = (param) => {
  const fruits = new Set(['apple', 'orange', 'grape'])
  return fruits.has(param)
} 
```

xink provides the following built-in matchers, but they can be overridden by creating your own file definitions:

```ts
/* string */
(param) => /^[a-zA-Z]+$/.test(param)
```
```ts
/* number */
(param) => /^[0-9]+$/.test(param)
```

## Helper Functions

### text
Returns a text response. By default, it sends a `Content-Length` header and a `Content-Type` header of `text/plain`.
```ts
import { text } from '@xink-sh/xink'

export const GET = () => {
  return text(`Hello World!`)
}
```

### json
Returns a json response. By default, it sends a `Content-Length` header and a `Content-Type` header of `application/json`.
```ts
import { json } from '@xink-sh/xink'

export const GET = () => {
  return json({ hello: world })
}
```

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc". 
