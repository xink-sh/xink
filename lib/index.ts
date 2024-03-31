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
  const { headers, url } = parseRequest(req)
  const method = req.method
  const to_match = join(c.routes, url.pathname)
  const matched = tree.findRoute(to_match.substring(c.routes.length), method)

  if (!matched) return new Response('Not Found', { status: 404 })

  return matched({ req, headers, url })
}
