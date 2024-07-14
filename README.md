# xink

This deliciousness is still baking.

xink is a filesystem router designed for APIs. It's currently using [Medley router](https://github.com/medleyjs/router) behind the scenes.

xink is based on [SvelteKit's](https://kit.svelte.dev/docs/routing#server) implementation of filesystem routing. For example, an endpoint file needs to export a function for each HTTP method it will serve.

```js
/* src/routes/endpoint.ts */

export const GET = async ({ url, params }) => {
  const article = await getArticle(params.slug)

  return new Response(`Here is the ${article.title} post!`)
}

export const POST = async ({ req, url }) => {
  return new Response(`This is the ${url.pathname} route, and you sent ${await req.json()}`)
}
```

Features like `[[optional]]` parameters, and `[param=matchers]` are planned.

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc". 
