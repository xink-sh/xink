#!/usr/bin/env bun
import { parseRequest } from "./utils/router.js"
import { join } from "path"
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
  const routes_dir = c.routes
  
  try {
    statSync(join(cwd, routes_dir)).isDirectory()
  } catch (err) {
    throw new Error(`Routes directory ${routes_dir} does not exist.`)
  }

  /**
   * Reference: https://stackoverflow.com/a/63111390
   */
  const readDirRecursive = async (dir: string): Promise<void> => {
    const directories = readdirSync(dir)
    const path = dir.substring(routes_dir.length) || '/'

    for (const f of directories) {
      if (f === 'endpoint.ts') {
        const handlers = await import(`${join(cwd, dir, f)}`)
        tree.add(path, handlers)
      } else {
        const absolute_path = join(dir, f)
        await readDirRecursive(absolute_path)
      }
    }
  }

  /* Read routes directory. */
  await readDirRecursive(`${routes_dir}`)
}

/**
 * xink Filesystem Router
 */
export const xink = async ({ req }: { req: Request }): Promise<Response> => {
  const method = req.method
  const url = new URL(req.url)

  const maybe_static = tree.static.get(url.pathname)
  if (maybe_static && typeof maybe_static[method] === 'function')
    return maybe_static[method]({ req, headers: req.headers, url, params: {} })
    
  const matched = tree.searchByPath(url.pathname, method)

  if (matched)
    return matched.handler({ req, headers: req.headers, url, params: matched.params })

  return new Response('Not Found', { status: 404 })
}
