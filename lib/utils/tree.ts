import hexoid from 'hexoid'
import { RouteType } from '../../types'

const id = hexoid()

const regexp_map = new Map<RouteType, RegExp>()
/* src/routes/hello/world */
regexp_map.set('static',  /^[^\[\].=](?:[\w.~\/-]+|\[{2}[a-zA-A]+\]{2}|\[{1}\.{3}[a-zA-Z]+\]{1})+[\w.~\/-]+[^\]=\[]$/)
/* src/routes/hello-[world] */
regexp_map.set('specific', /\/[\w\-\.~]+\[{1}[a-zA-Z]+\]{1}\//)
/* [...rest=integer] or [word=string] or [[word=string]] */
regexp_map.set('matcher', /\/(?:\[{1}\.{3}[a-zA-Z]+=[a-zA-Z]+\]{1}|\[{1,2}[a-zA-Z]+=[a-zA-Z]+\]{1,2})\//)
/* /src/routes/[hello]/world */
regexp_map.set('dynamic', /\/\[{1}[\w\-\.~]+\]{1}\/{0,1}/)
/* /[[optional]] or /[...rest] at the end of a route */
regexp_map.set('low', /\/(?:\[{2}[a-zA-A]+\]{2}|\[{1}\.{3}[a-zA-Z]+\]{1})$/)

class Node {
  key: string
  data: string
  parent: string | null
  children: Node[]
  constructor(key: string, data: string, parent: string | null = null) {
    this.key = key
    this.data = data
    this.parent = parent
    this.children = []
  }
}

/* /hello/there/world */
/* /goodbye/world */
const types = ['static', 'specific', 'matcher', 'dynamic', 'low']
export class Tree {
  /* Initialize the root node when tree is created. */
  root: Node = {
    key: id(),
    data: '',
    parent: 'self',
    children: []
  }
  
  constructor() {
    /* Add nodes for types. */
    console.log('initializing tree')
    types.forEach((t) => this.add(t, true))
    console.log(this.root.children)
    //this.add(route_dir)
  }

  add(data: string, root?: boolean) {
    /* Bypass normal processing and add under root Node. */
    if (root) {
      this.create(id(), data, this.root.key)
      return
    }
    
    const type = this.type(data)
    console.log(`Route type for ${data} is ${type}.`)

    const parts = data.split('/')
    console.log('parts of route', parts)
    let previous_node: Node
    let segment: string[] = []

    /* Get key for route type. */
    const root_node = this.find('root', true)
    const type_node = root_node.children.find((c) => c.data === type)
    console.log('type', type_node)
    parts.forEach((p, i) => {
      console.log('part', p)
      if (i === 0) {
          segment.push(p)
          console.log('segment', segment)
          console.log('skipping part', p)
          previous_node = this.root
      } else {
        segment.push(p)
        console.log('segment', segment)

        /* TODO is there a tree segment which matches `segment`? */
        /** 
         * to accomplish, should we hash all parts before adding part to tree? and include hash as a property;
         * then when searching for a segment, hash the items first and compare with tree hashes?
         */

        /* Parent is key of last node created. */
        console.log('creating node under some parent', previous_node.data, 'for', 'part', p)
        previous_node = this.create(id(), p, previous_node.key)
        
      }
    })
    console.log('segment', segment)


    // parts.forEach((p, i) => {
    //   //console.log('previous node:', previous_node)
    //   if (!this.root) {
    //     console.log('adding root node')
    //     previous_node = this.create(id(), p, 'self')
    //   } else if (i === 0) {
    //     //console.log('must not be the first route we are adding now')
    //     /* Need to know key of root node. */
    //     const root = this.find('root', true)
    //     previous_node = this.create(id(), p, root.key)
    //   } else {
    //     /* Parent is key of last node created. */
    //     previous_node = this.create(id(), p, previous_node.key)
    //   }
    //   //console.log(JSON.stringify(this.root?.children, null, 2))
    // })
  }

  create(key: string, data: string, parent: string) {
    /* Node already exist? */
    const node = new Node(key, data, parent)

    try {
      const target_parent = this.find(parent)

      //node.parent = target_parent.key
      target_parent.children.push(node)

    } catch (err) {
      throw new Error(`Error when adding new node to tree: ${err}`)
    }

    return node
  }

  /* Find and return a node. */
  find(key: string, root?: boolean) {
    if (root || key === this.root.key) return this.root

    return this.search(key)
  }

  search(key: string, node = this.root) {
    if (!node) throw new Error('Cannot search: node is falsey.')

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
      throw new Error(`depth(): Target node with given key: "${key}" is not found in the tree.`)
    } else {
      return target_node
    }
  }

  /* Identify the route type. */
  type(data: string): RouteType {
    for (const [key, value] of regexp_map) {
      const match = value.test(data)
      if (match) return key
    }
    throw new Error(`Route ${data} is invalid.`)
  }
}