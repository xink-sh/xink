import hexoid from 'hexoid'
import { Handler, RouteType } from '../../types'

const id = hexoid()

const route_regexp_map = new Map<RouteType, RegExp>()
/* src/routes/hello/world */
route_regexp_map.set('static',  /^[^\[\].=](?:[\w.~\/-]+|\[{2}[a-zA-A]+\]{2}|\[{1}\.{3}[a-zA-Z]+\]{1})+[\w.~\/-]+[^\]=\[]$/)
/* src/routes/hello-[world] */
route_regexp_map.set('specific', /\/[\w\-\.~]+\[{1}[a-zA-Z]+\]{1}\//)
/* [...rest=integer] or [word=string] or [[word=string]] */
route_regexp_map.set('matcher', /\/(?:\[{1}\.{3}[a-zA-Z]+=[a-zA-Z]+\]{1}|\[{1,2}[a-zA-Z]+=[a-zA-Z]+\]{1,2})\//)
/* /src/routes/[hello]/world */
route_regexp_map.set('dynamic', /\/\[{1}[\w\-\.~]+\]{1}\/{0,1}/)
/* /[[optional]] or /[...rest] at the end of a route */
route_regexp_map.set('low', /\/(?:\[{2}[a-zA-A]+\]{2}|\[{1}\.{3}[a-zA-Z]+\]{1})$/)

const segment_regexp_map = new Map<RouteType, RegExp>()
/* hello */
segment_regexp_map.set('static',  /^[\w.~\/-]+$/)
/* hello-[world] */
segment_regexp_map.set('specific', /^[\w\-\.~]+\[{1}[a-zA-Z]+\]{1}$/)
/* [...rest=integer] or [word=string] or [[word=string]] */
segment_regexp_map.set('matcher', /^(?:\[{1}\.{3}[a-zA-Z]+=[a-zA-Z]+\]{1}|\[{1,2}[a-zA-Z]+=[a-zA-Z]+\]{1,2})$/)
/* [hello] */
segment_regexp_map.set('dynamic', /^\[{1}[\w\-\.~]+\]{1}$/)
/* [[optional]] or [...rest] */
segment_regexp_map.set('low', /^(?:\[{2}[a-zA-A]+\]{2}|\[{1}\.{3}[a-zA-Z]+\]{1})$/)

class Node {
  key
  segment
  type
  parent
  children
  handlers
  constructor({ key = id(), segment = '', type = null, parent, children = [], handlers = null }: { key?: string; segment?: string; type?: string | null; parent: string; children?: Node[]; handlers?: any; }) {
    this.key = key
    this.segment = segment
    this.type = type
    this.parent = parent
    this.children = children
    this.handlers = handlers
  }
}

const types = ['static']
/* TODO: const types = ['static', 'specific', 'matcher', 'dynamic', 'low'] */

export class Tree {
  /* Initialize the root node when tree is created. */
  root: Node = {
    key: 'root',
    segment: '',
    type: null,
    parent: 'self',
    children: [],
    handlers: null
  }
  
  constructor() {
    /* Add nodes for types. */
    types.forEach((t) => this.create({ key: t, parent: 'root' }))
  }

  add(path: string, handlers?: any) {
    const type = this.routeType(path)
    const segments = path === '/' ? ['/'] : path.substring(1).split('/')
    let path_segments: string[] = []

    /* Get key for route type node, so we know who this route's parent will be. */
    const route_type_node = this.root.children.find((c) => c.key === type)
    if (!route_type_node) throw Error('No child node found under root that matches')

    let previous_node: Node = route_type_node

    segments.forEach((s) => {
      path_segments.push(s)

      /* Find out the type for this path segment. */
      const path_segment_type = this.segmentType(s)

      /* For handlers: If this is the last segment of the route, add them to the node. */
      previous_node = this.create({ segment: s, type: path_segment_type, parent: previous_node.key, handlers: segments.at(-1) === s ? handlers : null })
    })
  }

  create({ key = id(), segment = '', type = null, parent, children = [], handlers = null }: { key?: string; segment?: string; type?: string | null; parent: string; children?: Node[]; handlers?: any; }) {
    const parent_node = this.find(parent)
    if (!parent_node) throw new Error(`No parent node found with key ${key}`)

    let child_exists: Node | null

    if (parent_node.children.length > 0) {
      child_exists = this.searchBySegment(segment, parent_node)
      if (child_exists) return child_exists
    }

    const node = new Node({ key, segment, type, parent, children, handlers })
    parent_node.children.push(node)

    return node
  }

  /* Find and return a node. */
  find(key: string, root?: boolean): Node | null {
    if (root || key === this.root.key) return this.root

    return this.searchByKey(key)
  }

  /* Find a route match. */
  findRoute(path: string, method: string): Handler | null {
    const type = this.routeType(path)
    const segments = path === '/' ? ['/'] : path.substring(1).split('/')
    let path_segments: string[] = []

    /* Get key for route type node, so we know who this route's parent will be. */
    const route_type_node = this.root.children.find((c) => c.key === type)
    if (!route_type_node) throw Error('No child node found under root that matches')

    let current_node: Node = route_type_node
    let found_node: Node | null

    segments.forEach((s) => {
      path_segments.push(s)

      /* Find out the type for this path segment. */
      const path_segment_type = this.segmentType(s)
      
      found_node = this.searchBySegment(s, current_node)

      if (!found_node) return null
      current_node = found_node
    })

    /* No handlers or no matching handler method for route. */
    if (!current_node.handlers || typeof current_node.handlers[method] !== 'function') return null
    
    return current_node.handlers[method]
  }

  searchByKey(key: string, node = this.root): Node | null {
    if (!node) throw new Error('Cannot search: node is falsey.')
    if (node.children.length === 0) return null

    let target_node = null
    let found = false

    const depthFirst = (current: Node) => {
      for (let i = 0; i < current.children.length; i++) {
        if (current.children[i].key === key) {
          found = true
          target_node = current.children[i]
          break
        } else {
          depthFirst(current.children[i])
          if (found) break
        }
      }
    }

    depthFirst(node)

    if (!target_node) {
      return null
    } else {
      return target_node
    }
  }

  searchBySegment(segment: string, node = this.root): Node | null {
    if (!node) throw new Error('Cannot search: node is falsey.')

    let target_node = null
    let found = false

    const widthFirst = (current: Node) => {
      for (let i = 0; i < current.children.length; i++) {
        if (current.children[i].segment === segment) {
          found = true
          target_node = current.children[i]
          break
        }
      }
    }

    widthFirst(node)

    if (!target_node) {
      return null
    } else {
      return target_node
    }
  }

  /* Identify the route type. */
  routeType(route: string): RouteType {
    if (route === '/') return 'static'

    for (const [key, value] of route_regexp_map) {
      const match = value.test(route)
      if (match) return key
    }
    throw new Error(`Route ${route} is invalid.`)
  }

  /* Identify the segment type. */
  segmentType(segment: string): RouteType {
    if (segment === '/') return 'static'

    for (const [key, value] of segment_regexp_map) {
      const match = value.test(segment)
      if (match) return key
    }
    throw new Error(`Segment ${segment} is invalid.`)
  }
}
