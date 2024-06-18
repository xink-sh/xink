import hexoid from 'hexoid'
import { Handlers, Potential, RouteInfo, RouteType, SegmentType, Key } from '../../types'
import { Match, MatchFunction, match } from 'path-to-regexp'

const id = hexoid()

const type_ids = {
  static: 0,
  specific: 1,
  matcher: 2,
  dynamic: 3,
  low: 4
}

const types = [0, 3, 4]
/* TODO: const types = ['static', 'specific', 'matcher', 'dynamic', 'low'] */

const segment_regexp_map = new Map<RouteType, RegExp>()
/* hello */
segment_regexp_map.set('static',  /^[\w.~\/-]+$|\'\'/)
/* hello-:world */
segment_regexp_map.set('specific', /^[\w\-\.~]+\:[a-zA-Z]+$/)
/* :rest*(\\d+) , :word(\\w+) , :word?(\\w+) */
segment_regexp_map.set('matcher', /^(?:\:[a-zA-Z]+\*(\\d+)|\:[a-zA-Z]+(\\w+)|\:[a-zA-Z]+\?(\\w+))$/)
/* :hello */
segment_regexp_map.set('dynamic', /^\:[\w\-\.~]+$/)
/* :optional? , :rest* */
segment_regexp_map.set('low', /^(?:\:[a-zA-A]+\?|\:[a-zA-Z]+\*)$/)

class Node {
  key
  matcher?
  segment
  type
  parent
  children
  handlers
  constructor({ key = id(), matcher, segment = '', type = {}, parent, children = [], handlers = null }: { key?: Key; matcher?: MatchFunction; segment?: string; type?: { name?: string; id?: number }; parent: Key; children?: Node[]; handlers?: Handlers | null; }) {
    this.key = key
    this.matcher = matcher
    this.segment = segment
    this.type = type
    this.parent = parent
    this.children = children
    this.handlers = handlers
  }
}

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

  constructor() {
    /* Add nodes for types. */
    types.forEach((t) => this.create({ key: t, parent: 'root' }))
  }

  add(segments: string[], handlers?: any) {
    let previous_node: Node = this.root

    // if (path === '/') {
    //   this.root.handlers = handlers ?? null
    //   return
    // }

    //const segments = path.substring(1).split('/')

    segments.forEach((s) => {
      //console.log('segment', s)
      if (s === '') {
        this.root.handlers = handlers ?? null
        return
      }

      /* Find out the type for this path segment. */
      const path_segment_type = this.segmentType(s)

      /* For handlers: If this is the last segment of the route, add them to the node. */
      previous_node = this.create({ matcher: match(s, { decode: decodeURIComponent }), segment: s, type: { ...path_segment_type }, parent: previous_node.key, handlers: handlers ?? null })
    })
  }

  create({ 
    key = id(), 
    matcher, 
    segment = '', 
    type = {}, 
    parent, 
    children = [], 
    handlers = null 
  }: { 
    key?: Key; 
    matcher?: MatchFunction; 
    segment?: string; 
    type?: { name?: string, id?: number }; 
    parent: string | number; 
    children?: Node[]; 
    handlers?: any; 
  }) {
    const parent_node = this.find(parent)
    if (!parent_node) throw new Error(`No parent node found with key ${key}`)

    let child_exists: Node | null

    /* Does this path segment already exist for the parent? */
    parent_node
    if (parent_node.children.length > 0) {
      child_exists = this.searchBySegment(segment, parent_node)
      if (child_exists) return child_exists
    }

    const node = new Node({ key, matcher, segment, type, parent, children, handlers })
    parent_node.children.push(node)

    /* Re-sort children by type id (static, specific, etc), for priority selection when traversing tree. */
    //this.sortChildren(parent_node)

    //if (node.handlers)
      //sortByPathCost(parent_node)

    return node
  }

  /* Find and return a node. */
  find(key: Key, root?: boolean): Node | null {
    if (root || key === this.root.key) return this.root

    return this.searchByKey(key)
  }

  searchByKey(key: Key, node = this.root): Node | null {
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

  searchByP(path: string, method: string): RouteInfo | null {
    if (path === '/') {
      const handlers = this.root.handlers
      if (handlers && handlers[method])
        return { params: {}, handler: handlers[method] }
      else
        return null
    }

    let current_parent: Node = this.root
    let s = 0
    let match: Match = false
    let params = {}
    let route: RouteInfo | null = null
    const segments = path.substring(1).split('/')

    const recurse = (node: Node): any => {
      for (let c = 0; c < node.children.length; c++) {
        if (route) break
        const child = node.children[c]
        const matcher = child.matcher
        match = matcher ? matcher(segments[s]) : false
        if (match) {
          // console.log('matched', match)
          // console.log('current params', params)
          // console.log('match params', match.params)
          // console.log('new params', { ...params, ...match.params })
          params = { ...params, ...match.params }

          /* Child matches segment. */
          if (s === segments.length - 1) {
            /* Matched last segement. Return handler. */
            
            
            route = {
              params,
              handler: child.handlers ? child.handlers[method] : null
            }
          } else {
            //console.log('recursing', child)
            s++
            recurse(child)
          }
        }
      }
      //console.log('returning', )
    }

    recurse(current_parent)

    return route
  }

  /**
   * Searches the children of current node by regexp and returns.
   */
  searchSegment(segment: string, node = this.root): Node | null {
    if (!node) throw new Error('Cannot search: node is falsey.')

    let target_node = null

    const widthFirst = (current: Node) => {
      for (let i = 0; i < current.children.length; i++) {
        const matcher = current.children[i].matcher
        if (!matcher) return null

        const match = matcher(segment)
        if (match) target_node = current.children[i]
      }
    }

    widthFirst(node)

    return target_node
  }

  searchByPath(path: string, method: string): RouteInfo | null {
    if (path === '/') {
      const handlers = this.root.handlers
      if (handlers && handlers[method])
        return { params: {}, handler: handlers[method] }
      else
        return null
    }

    const segments = path.substring(1).split('/')
    const slength = segments.length

    /* Reset values for next route type */
    let s = 0
    let stop = false
    let current_parent: Node = this.root
    let potentials: Potential[] = []
    let branches: Node[] = []
    let priority = 0
    let params: { [key: string]: any } = {}
    let ppath = []
    
    const recurse = (node: Node, preserve: boolean = false): void => {
      let next_child = false
      if (!preserve) priority = 0
      for (let c = 0; c < node.children.length; c++) {
        let child = node.children[c]
        let seg_match = false
        let seg = ''
        let param_name = ''

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
          params[param_name] = segments[s]
        }

        if (seg_match) {
          priority += child.type.id!
          ppath.push(child.segment)
          if (node.children.length > 0) {
            branches.push(node)
          }
          s++
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
                delete params[param_name]
              }
            } else {
              /* Remove this segment's param, but keep parent params; in case the parent has more children which could match. */
              if (seg) {
                delete params[param_name]
              }
              ppath.pop()
              priority -= child.type.id!
            }
          } else if (s === slength) {
            /* Reached the possible path depth of this branch and either found nothing or no matching method. */
            stop = true
            params = {}
            return
          }
          if (stop) {
            /* do we need this? */
            return
          }

          /* Keep going down this branch. */
          if (!next_child) {
            recurse(child, true)
          }
        } else {
          /* Last child, didn't match. Subtract priority of parent, reset, and pop parent from branches. */
          if (c === node.children.length) {
            priority -= branches.at(-1)?.type.id!
            next_child = false
            branches.pop()
          }
        }
      }
      if (stop) {
        return
      }
      if (node.parent === 'root' && potentials) {
        return
      }
    }

    recurse(current_parent)

    if (potentials.length === 0) return null

    if (potentials.length === 1) return potentials[0]

    potentials.sort((a, b) => {
      if (a.priority < b.priority) return -1
      if (a.priority > b.priority) return 1
      return 0
    })

    return potentials[0]
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

  sortChildren(node: Node): Node {
    node.children.sort((a, b) => {
      if (a.type.id! < b.type.id!) return -1
      if (a.type.id! > b.type.id!) return 1
      return 0
    })
    return node
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
}