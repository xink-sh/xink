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
    console.log('processing dir', dir)
    const directories = readdirSync(dir)
    const path = dir.substring(routes_dir.length) || '/'

    for (const f of directories) {
      console.log('reading', f)

      if (f === 'endpoint.ts') {
        console.log('path', path)
        const handlers = await import(`${join(cwd, dir, f)}`)
        console.log(`done getting handlers for`, path)
        console.log(path, 'handlers:', handlers)
        console.log('adding', path, 'to tree')
        tree.add(path, handlers)
        //tree.add(path)
        console.log('done adding', path, 'to tree')
      } else {
        const absolute_path = join(dir, f)
        await readDirRecursive(absolute_path)
      }

      // console.log('setting absolute path for', f)
      // const absolute_path = join(dir, f)
      // if (statSync(absolute_path).isDirectory()) {
      //   console.log('recursing', absolute_path)
      //   readDirRecursive(absolute_path)
      // }
    }
  }

  /* Read routes directory. */
  await readDirRecursive(`${routes_dir}`)
  //console.log(JSON.stringify(tree.root.children, null, 2))
  console.log(JSON.stringify(tree.root.children[0].children, null, 2))
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
