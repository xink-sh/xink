#!/usr/bin/env bun
import { join } from "path"
import { readdirSync, statSync } from "node:fs"
import { Tree } from "./utils/tree.js"
import { Config, ValidatedConfig } from "../types.js"
import { validateConfig } from "./utils/generic.js"
import { CONFIG } from "./constants.js"
import { addPath, getPath, map } from "./utils/router.js"

let c: ValidatedConfig
const cwd = process.cwd()

/**
 * Initialize routes.
 */
export const initRouter = async ({ config }: { config?: Config } = {}): Promise<void> => {
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
        const module = await import(`${join(cwd, dir, f)}`)
        const handlers = Object.entries(module)

        handlers.forEach(([key, value]) => {
          if (typeof value !== 'function')
            throw new Error(`Handler ${key} for ${path} is not a function`)
        })

        addPath(path, module)
      } else {
        const absolute_path = join(dir, f)
        await readDirRecursive(absolute_path)
      }
    }
  }

  /* Read routes directory. */
  await readDirRecursive(`${routes_dir}`)
  //console.log(map.get(1).root)
}

/**
 * xink Filesystem Router
 */
export const xink = async ({ req }: { req: Request }): Promise<Response> => {
  const method = req.method
  const url = new URL(req.url)

  const matched = getPath(url.pathname, method)
  if (matched && matched.handler)
    return matched.handler({ req, headers: req.headers, url, params: matched.params })

  return new Response('Not Found', { status: 404 })
}
