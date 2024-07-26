#!/usr/bin/env bun
import { join } from "path"
import { readdirSync, statSync } from "node:fs"
import { Config, Handler, Matcher, ValidatedConfig } from "../types.js"
import { validateConfig } from "./utils/generic.js"
import { CONFIG } from "./constants.js"
import { Router } from "./utils/medley.js"

let c: ValidatedConfig
const cwd = process.cwd()
const router = new Router()

/**
 * Initialize routes.
 */
const initRouter = async ({ config }: { config?: Config } = {}): Promise<void> => {
  c = config ? validateConfig(config) : CONFIG
  const routes_dir = c.routes
  const params_dir = c.params
  const allowed_handlers = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'])
  
  try {
    statSync(join(cwd, routes_dir)).isDirectory()
  } catch (err) {
    throw new Error(`Routes directory ${routes_dir} does not exist.`)
  }

  const readParamsDir = async (dir: string): Promise<void> => {
    const files = readdirSync(dir)
    console.log('params files', files)

    for (const f of files) {
      const module = await import(`${join(cwd, dir, f)}`)
      console.log('module', module)
      const type = f.split('.')[0]
      console.log('param type is', type)
      const matcher: Matcher = module['match']

      if (matcher)
        router.setMatcher(type, matcher)
    }
  }

  /* Read params directory. */
  await readParamsDir(params_dir)

  /**
   * Reference: https://stackoverflow.com/a/63111390
   */
  const readDirRecursive = async (dir: string): Promise<void> => {
    const directories = readdirSync(dir)
    let path = dir.substring(routes_dir.length) || '/'

    /* Convert matcher segments. */
    path = path.replace(/\[{1}([\w.~-]+?=[a-zA-Z]+?)\]{1}/g, ':$1')

    /* Convert optional segments. */
    path = path.replace(/\[{2}([\w.~-]+?)\]{2}/g, ':$1?')

    /* Convert rest segments. */
    path = path.replace(/\[{1}\.{3}[\w.~-]+?\]{1}/g, '*')

    /* Convert specific and dynamic segments. */
    path = path.replace(/\[{1}/g, ':')
    path = path.replace(/\]{1}/g, '')

    for (const f of directories) {
      if (f === 'endpoint.ts') {
        const module = await import(`${join(cwd, dir, f)}`)
        const handlers: [string, Handler][] = Object.entries(module)
        const store = router.register(path)

        handlers.forEach(([key, value]) => {
          if (typeof value !== 'function')
            throw new Error(`Handler ${key} for ${path} is not a function.`)
          if (!allowed_handlers.has(key))
            throw new Error(`xink does not support the ${key} endpoint handler, found in ${join(dir, f)}`)

          store[key] = value
        })
      } else {
        const absolute_path = join(dir, f)
        await readDirRecursive(absolute_path)
      }
    }
  }

  /* Read routes directory. */
  await readDirRecursive(`${routes_dir}`)
}

export class Xink {
  constructor() {
    initRouter()
  }

  /**
   * xink Filesystem Router
   */
  async fetch(req: Request ): Promise<Response> {
    const url = new URL(req.url)
    const route = router.find(url.pathname)

    if (!route) return new Response('Not Found', { status: 404 })

    const handler = route.store[req.method] ?? route.store['fallback']

    if (!handler) return new Response('Method Not Allowed', { status: 405 })

    return handler({ req, headers: req.headers, url, params: route.params })
  }
}
