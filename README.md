# xink

This deliciousness is still baking.

xink is a directory-based router designed for APIs, and uses [Medley router](https://github.com/medleyjs/router) under the hood.

Medley router provides the following route features:

- static, /hello/there/world
- specific, /hello/miss-[name]
- dynamic, /hello/[name]
- trailing rest, /hello/[...rest]

So far, we've added the following route features:

- matcher, /hello/[name=string] (where 'string' references a function which tests if [name] matches)

> The `[[optional]]` route feature is planned. We may consider allowing [...rest] to be in the middle of a route.

xink is based on [SvelteKit's](https://kit.svelte.dev/docs/routing#server) implementation of directory routing. For example, an endpoint file needs to export one or more functions for each HTTP method it will serve.

```js
/* src/routes/article/[slug]/endpoint.ts */

export const GET = async ({ url, params }) => {
  const article = await getArticle(params.slug)

  return new Response(`Here is the ${article.title} post!`)
}

export const POST = async ({ req, url }) => {
  return new Response(`This is the ${url.pathname} route, and you sent ${await req.json()}`)
}
```

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc". 
