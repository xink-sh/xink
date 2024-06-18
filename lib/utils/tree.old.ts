import hexoid from 'hexoid'
import { Handlers, Potential, RouteInfo, RouteType, SegmentType } from '../../types'

const id = hexoid()

const type_ids = {
  static: 0,
  specific: 1,
  matcher: 2,
  dynamic: 3,
  low: 4
}

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
route_regexp_map.set('low', /\/(?:\[{2}[a-zA-Z]+\]{2}|\[{1}\.{3}[a-zA-Z]+\]{1})$/)

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
  constructor({ key = id(), segment = '', type = {}, parent, children = [], handlers = null }: { key?: string; segment?: string; type?: { name?: string; id?: number }; parent: string; children?: Node[]; handlers?: Handlers | null; }) {
    this.key = key
    this.segment = segment
    this.type = type
    this.parent = parent
    this.children = children
    this.handlers = handlers
  }
}

const types = ['dynamic']
/* TODO: const types = ['static', 'specific', 'matcher', 'dynamic', 'low'] */

export class Tree {
  /* Initialize the root node when tree is created. */
  root: Node = {
    key: 'root',
    segment: '',
    type: {},
    parent: 'self',
    children: [],
    handlers: null
  }
  static = new Map<string, Record<string, any>>()
  
  constructor() {
    /* Add nodes for types. */
    types.forEach((t) => this.create({ key: t, parent: 'root' }))
  }

  add(path: string, handlers?: any) {
    const type = this.routeType(path)

    /* Add static routes to tree. */
    if (type === 'static') {
      console.log('setting', path)
      this.static.set(path, handlers)
      return
    }

    const segments = path.substring(1).split('/')
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
      previous_node = this.create({ segment: s, type: { ...path_segment_type }, parent: previous_node.key, handlers: segments.at(-1) === s ? handlers : null })
    })
  }

  create({ key = id(), segment = '', type = {}, parent, children = [], handlers = null }: { key?: string; segment?: string; type?: { name?: string, id?: number }; parent: string; children?: Node[]; handlers?: any; }) {
    const parent_node = this.find(parent)
    if (!parent_node) throw new Error(`No parent node found with key ${key}`)

    let child_exists: Node | null

    /* Does this path segment already exist for the parent? */
    if (parent_node.children.length > 0) {
      child_exists = this.searchBySegment(segment, parent_node)
      if (child_exists) return child_exists
    }

    const node = new Node({ key, segment, type, parent, children, handlers })
    parent_node.children.push(node)

    /* Resort children by type id (static, specific, etc), for priority selection when traversing tree. */
    this.sortChildren(parent_node)

    return node
  }

  /* Find and return a node. */
  find(key: string, root?: boolean): Node | null {
    if (root || key === this.root.key) return this.root

    return this.searchByKey(key)
  }

  searchByPath(path: string, method: string): RouteInfo | null {
    const segments = path.substring(1).split('/')
    const slength = segments.length

    /* Process the children of each route type (dyamic, specific, etc) */
    for (let i = 0; i < types.length; i++) {
      /* Reset values for next route type */
      let s = 0
      let stop = false
      let current_parent: Node
      let potentials: Potential[] = []
      let branches: Node[] = []
      let priority = 0
      let params: { [key: string]: any } = {}
      let ppath = []

      current_parent = this.root.children[i]
      
      const recurse = (node: Node, preserve: boolean = false): void => {
        let next_child = false
        console.log('recursing node', node.segment)
        if (!preserve) priority = 0
        for (let c = 0; c < node.children.length; c++) {
          let child = node.children[c]
          let seg_match = false
          let seg = ''
          let param_name = ''

          console.log('checking segment', child.segment)
          if (child.segment === segments[s]) {
            /* Matches static segment. */
            seg_match = true
          } else if (child.type.name === 'dynamic') {
            seg_match = true
            seg = child.segment
            /**
             * Remove leading [ and trailing ]
             * and add as a param, in case this route matches.
             */
            param_name = seg.substring(1, seg.length -1)
            console.log('adding param', segments[s], 'for', child.segment)
            params[param_name] = segments[s]
          }

          if (seg_match) {
            console.log('enter seg_match')
            priority += child.type.id!
            ppath.push(child.segment)
            console.log('match! new priority is', priority, 'path is', ppath)
            if (node.children.length > 0) {
              console.log('seg_match found children, pushing branch', node.segment)
              branches.push(node)
            }
            s++
            console.log('seg_match s is now', s)
            /**
             * This is the last segment of the path and it's an endpoint,
             * implying we found a route.
             */
            if (s === slength && child.handlers && typeof child.handlers[method] === 'function') {
              /* Found route match, check next child for same segment. */
              next_child = true
              s--
              if (potentials.length === 0 || priority <= potentials[0].priority) {
                potentials.push({
                  priority,
                  path: ppath.join('/'),
                  params: structuredClone(params),
                  handler: child.handlers[method]
                })
                console.log('found route match. s is', s, 'next_child is true,', 'potentials is', potentials)
              }
              
              if (c + 1 === node.children.length) {
                /**
                 * Last child, matched.
                 * 
                 * Subtract priority of child and parent, 
                 * remove parent from branches,
                 * pop child and parent from potential path.
                 */
                priority -= child.type.id! + branches.at(-1)?.type.id!
                branches.pop()
                ppath.pop()
                ppath.pop()
                s--
                if (seg) {
                  console.log('params before delete', params)
                  delete params[param_name]
                  console.log('params after delete', params)
                }
                console.log('child', child.segment, 'is last child of', node.segment, 'new priority is', priority, 'popping last branch', 's is', s)
              } else {
                /* Remove this segment's param, but keep parent params; in case the parent has more children which could match. */
                if (seg) {
                  console.log('params before delete', params)
                  delete params[param_name]
                  console.log('params after delete', params)
                }
                ppath.pop()
                priority -= child.type.id!
                console.log('child', child.segment, 'is not last child of', node.segment, 'priority is now', priority)
              }
            } else if (s === slength) {
              console.log('No match, and this is the last possible segment. Stopping.')
              /* Reached the possible path depth of this branch and either found nothing or no matching method. */
              stop = true
              params = {}
              return
            }
            if (stop) {
              /* do we need this? */
              console.log('Detected stop, returning.')
              return
            }

            /* Keep going down this branch. */
            if (!next_child) {
              console.log('next_child is false. recurse child')
              recurse(child, true)
            }
          } else {
            /* Last child, didn't match. Subtract priority of parent, reset, and pop parent from branches. */
            console.log('no segment match')
            if (c === node.children.length) {
              priority -= branches.at(-1)?.type.id!
              next_child = false
              branches.pop()
              console.log('no segment match, and', c, 'is last child of', node.segment, 'priority is now', priority, 'setting next false, and popping branch')
            }
          }
        }
        console.log('done processing children of', node.segment, 'for recurse')
        if (stop) {
          console.log('detected stop after processing children for recurse. return.')
          return
        }
        if (node.parent === 'root' && potentials) {
          console.log('found potentials in child', node.key, 'returning.')
          return
        }
      }

      recurse(current_parent)

      if (potentials) {
        potentials.sort((a, b) => {
          if (a.priority < b.priority) return -1
          if (a.priority > b.priority) return 1
          return 0
        })

        return potentials[0]
        //const first = potentials[0]
        //let finalists = potentials.filter((p) => p.priority === first.priority)
        //console.log('finalists are', finalists)
        // if (finalists.length > 1) {
        //   /* Break tie alphabetically. */
        //   finalists.sort((a, b) => {
        //     if (a.path < b.path) return -1
        //     if (a.path > b.path) return 1
        //     return 0
        //   })
        // }
        //return finalists[0]
      }
    }

    return null
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

    return target_node
  }

  /**
   * Searches the children of current node for a static match and returns.
   */
  searchBySegment(segment: string, node = this.root): Node | null {
    if (!node) throw new Error('Cannot search: node is falsey.')

    let target_node = null

    const widthFirst = (current: Node) => {
      for (let i = 0; i < current.children.length; i++) {
        if (current.children[i].segment === segment) {
          target_node = current.children[i]
          break
        }
      }
    }

    widthFirst(node)

    return target_node
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
  segmentType(segment: string): SegmentType {
    if (segment === '/') return { name: 'static', id: 0 }

    for (const [key, value] of segment_regexp_map) {
      const match = value.test(segment)
      if (match) return { name: key, id: type_ids[key] }
    }
    throw new Error(`Segment ${segment} is invalid.`)
  }

  sortChildren(node: Node): Node {
    node.children.sort((a, b) => {
      if (a.type.id! < b.type.id!) return -1
      if (a.type.id! > b.type.id!) return 1
      return 0
    })
    return node
  }
}
