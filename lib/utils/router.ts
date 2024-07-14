import { Key, pathToRegexp, match } from 'path-to-regexp'
import { Handlers, Low, RouteInfo } from '../../types'
import hexoid from 'hexoid'
import { Tree } from './tree.ts'

export const map = new Map()
map.set('low', [])

const optional_regex = /.*\:[a-zA-Z]+\?\/*.*/
const rest_regex = /.*\/\:[a-z-A-Z]+\*\/*.*/
const id = hexoid()

class Node {
  key
  segment
  type
  parent
  children
  handlers
  constructor({ key = id(), segment = '', type = {}, parent, children = [], handlers = null }: { key?: string; segment?: string; type?: { name?: string; id?: number }; parent: string; children?: Node[]; handlers?: Handlers | null; }) {
    this.key = key
    this.segment = segment
    this.type = type
    this.parent = parent
    this.children = children
    this.handlers = handlers
  }
}

const sortChildren = (node: Node): Node => {
  node.children.sort((a, b) => {
    if (a.type.id! < b.type.id!) return -1
    if (a.type.id! > b.type.id!) return 1
    return 0
  })
  return node
}

/* Ensures that "Low" paths are sorted by Optional then Rest. */
const sortLow = (data: Array<Low>): void => {
  data.sort((a, b) => {
    if (a.type < b.type) return -1
    if (a.type > b.type) return 1
    return 0
  })
}

export const addPath = (path: string, handlers?: any) => {
  /* Convert matcher segments. */
  /**
   * Need to import what the mather would be, from src/params/<matcher-name>.js.
   * @example export function match(param) { return /^\d+$/.test(param); }
   */
  //path = path.replace(/(?:\[{1}\.{3}[a-zA-Z]+=[a-zA-Z]+\]{1}|\[{1,2}[a-zA-Z]+=[a-zA-Z]+\]{1,2})/, '')

  /* Convert optional segments. */
  path = path.replace(/\[{2}([a-zA-A]+)\]{2}/g, ':$1?')

  /* Convert rest segments. */
  path = path.replace(/\[{1}\.{3}([a-zA-Z]+)\]{1}/g, '*')

  /* Convert specific and dynamic segments. */
  path = path.replace(/\[{1}/g, ':')
  path = path.replace(/\]{1}/g, '')

  const segments = path.substring(1).split('/') // substring removes leading '/'
  
  /* Account for root '/' route. */
  // if (segments[0] === '') {
  //   segments.pop()
  //   segments.push('/')
  // }

  const segment_count = segments.length

  // const keys: Key[] = []
  // const regex = pathToRegexp(path, keys)
  // console.log(regex, keys)

  const addLow = ({ type }: { type: number }) => {
    const data = map.get('low')
    data.push({
      type,
      path,
      matcher: match(path, { decode: decodeURIComponent }),
      handlers
    })

    sortLow(data)
  }

  /* Contains an optional segment. */
  if (optional_regex.test(path)) {
    addLow({ type: 4 })
    return
  }

  /* Contains a rest segment. */
  if (rest_regex.test(path)) {
    addLow({ type: 5 })
    return
  } 

  const exist = map.has(segment_count)

  // if (!exist) {
  //   map.set(segment_count, [{
  //     path,
  //     matcher: match(path, { decode: decodeURIComponent }),
  //     handlers
  //   }])
  //   return
  // }

  if (!exist) {
    map.set(segment_count, new Tree())
  }
  
  // map.get(segment_count).push({
  //   path,
  //   matcher: match(path, { decode: decodeURIComponent }), 
  //   handlers
  // })
  const tree = map.get(segment_count)
  tree.add(segments, handlers)
}

export const getPath = (path: string, method: string): RouteInfo | null => {
  const segments = path.substring(1).split('/')
  //console.log('segements are', segments)
  const segment_count = segments.length
  let route: RouteInfo | null = null

  // const paths = map.get(segment_count)
  const matcher = (p: any) => {
    const matches = p.matcher(path)

    if (matches && p.handlers[method]) {
      route = { params: matches.params, handler: p.handlers[method] }
    }
  }
  // console.log('paths is', paths)
  // if (paths)
  //   paths.forEach((p: any) => matcher(p))

  const tree = map.get(segment_count)
  route = tree.searchByP(path, method)

  if (route) return route

  const low = map.get('low')
  low.forEach((p: any) => matcher(p))

  return route
}
