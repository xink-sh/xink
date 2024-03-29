#!/usr/bin/env bun
import { parseRequest } from "./utils/router.js"
import { join } from "path"
import { readdir } from "node:fs/promises"
import { readdirSync, statSync } from "node:fs"
import { Tree } from "./utils/tree.js"
import { Config, ValidatedConfig } from "../types.js"
import { validateConfig } from "./utils/generic.js"
import { CONFIG } from "./constants.js"

let c: ValidatedConfig
let tree: Tree
const cwd = process.cwd()

/**
 * Initialize routes.
 */
export const initRouter = async ({ config }: { config?: Config } = {}): Promise<void> => {
  /* Initialize route decision tree. */
  tree = new Tree()

  c = config ? validateConfig(config) : CONFIG

  try {
    await readdir(join(cwd, c.routes))
  } catch (err) {
    throw new Error(`Routes directory ${c.routes} does not exist.`)
  }

  let routes: string[] = []

  /**
   * Reference: https://stackoverflow.com/a/63111390
   */
  const readDirRecursive = (dir: string) => {
    //console.log('processing dir', dir)
    readdirSync(dir).forEach(f => {
      //console.log('reading', f)
      //console.log('dir', dir)

      /* Don't enter any routes for / here. */
      if (dir !== `./${c.routes}` && f === 'endpoint.ts') {
        //console.log('pushing', dir)
        routes.push(`${dir}`)
      }
 
      const absolute = join(dir, f)
      //console.log('absolute', absolute)

      /* Add route for / if there's an endpoint. */
      if (absolute === `${c.routes}/endpoint.ts`) {
        //console.log('found endpoint for /')
        routes.push(`${c.routes}`)
      }

      if (statSync(absolute).isDirectory())
        return readDirRecursive(absolute)
    })
  }

  /* Read routes directory. */
  readDirRecursive(`./${c.routes}`)
  
  for (const route of routes) {
    tree.add(route)
  }
  //console.log(tree.root.children)
}

/**
 * xink Filesystem Router
 */
export const xink = async ({ req }: { req: Request }): Promise<Response> => {
  const { headers, url } = parseRequest(req)
  const method = req.method

  console.log('config routes are', c.routes)
  //console.log('full tree', tree)
  const to_match = join(c.routes, url.pathname)
  console.log('to match', to_match)
  //console.log('Trying to find route in tree...')
  //const matched = tree.find(to_match)
  
  const matched = true
  //console.log('matched?', matched)

  if (!matched) {
    //console.log('did not match a route in the tree')
    return new Response('Not Found', { status: 404 })
  }
  const maybe_route = Bun.file(join(cwd, to_match, 'endpoint.ts'))
  const file = await maybe_route.exists()

  /* No route. */
  if (!file) {
    console.log('no endpoint.ts file for route')
    return new Response('Not Found', { status: 404 })
  }

  const handler = await import(`${maybe_route.name}`)

  /* No matching method for route. */
  if (typeof handler[method] !== 'function') return new Response('Not Found', { status: 404 })

  return handler[method]({ req, headers, url })
}
