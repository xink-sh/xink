#!/usr/bin/env bun
import { join } from "path"
import { readdirSync, statSync } from "node:fs"
import { validateConfig } from "./utils/generic.js"
import { CONFIG } from "./constants.js"
import { Router } from "./utils/medley.js"
import { resolve } from "./utils/runtime.js"

/** @import { Config, Handler, Matcher, ValidatedConfig } from './types/internal.js' */
/** @import { Handle } from 'xink' */

/**
 * @type {ValidatedConfig}
 */
let c

/**
 * @type {Handle | null}
 */
let handle = null

const cwd = process.cwd()
const router = new Router()

/**
 * Initialize routes.
 * 
 * @param {Config} config
 * @returns {Promise<void>}
 */
const initRouter = async ({ config } = {}) => {
  c = config ? validateConfig(config) : CONFIG
  const routes_dir = c.routes
  const params_dir = c.params
  const allowed_handlers = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'])
  
  try {
    statSync(join(cwd, routes_dir)).isDirectory()
  } catch (err) {
    throw new Error(`Routes directory ${routes_dir} does not exist.`)
  }

  /**
   * 
   * @param {string} dir
   * @returns {Promise<void>}
   */
  const readParamsDir = async (dir) => {
    const files = readdirSync(dir)
    //console.log('params files', files)

    for (const f of files) {
      const module = await import(`${join(cwd, dir, f)}`)
      //console.log('module', module)
      const type = f.split('.')[0]
      //console.log('param type is', type)

      /**
       * @type {Matcher}
       */
      const matcher = module['match']

      if (matcher)
        router.setMatcher(type, matcher)
    }
  }

  /* Read params directory. */
  await readParamsDir(params_dir)

  /**
   * 
   * @param {string} dir
   * @returns {Promise<void>}
   */
  const readDirRecursive = async (dir) => {
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

        /**
         * @type {[string, Handler][]}
         */
        const handlers = Object.entries(module)
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

const initMiddleware = async () => {
  handle = (await import(`${join(cwd, 'src/middleware.ts')}`)).handle ?? null
}

export class Xink {
  constructor() {
    initMiddleware()
    initRouter()
  }

  /**
   *
   * @param {Request} req
   * @returns {Promise<Response>}
   */
  async fetch(req) {
    const url = new URL(req.url)
    const route = router.find(url.pathname)
    console.log(route)

    const event = {
      req,
      headers: req.headers, 
      url,
      params: route ? route.params : {},
      route
    }

    return handle ? handle({ event, resolve }) : resolve(event)
  }
}



