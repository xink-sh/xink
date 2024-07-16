import { Matcher, Node, ParametricNode, Params, Route, Store, StoreFactory } from "../../types";

function createNode(segment: string, static_children?: Node[] ): Node {
  return {
    segment,
    store: null,
    static_children: static_children === undefined
      ? null
      : new Map(static_children.map(child => [child.segment.charCodeAt(0), child])),
    parametric_child: null,
    wildcard_store: null
  };
}

function cloneNode(node: Node, new_segment: string): Node {
  return {
    segment: new_segment,
    store: node.store,
    static_children: node.static_children,
    parametric_child: node.parametric_child,
    wildcard_store: node.wildcard_store,
  };
}

function createParametricNode(param_name: string, matcher: Matcher = null): ParametricNode {
  return {
    matcher,
    param_name,
    store: null,
    static_child: null,
  };
}

function defaultStoreFactory(): Store {
  return Object.create(null);
}

export class Router {
  _root: Node
  _storeFactory: StoreFactory
  _matchers
  constructor({ storeFactory }: { storeFactory?: StoreFactory } = { storeFactory: defaultStoreFactory }) {
    if (typeof storeFactory !== 'function')
      throw new TypeError('`storeFactory` must be a function');

    const store = storeFactory()
    if (store === null) {
      throw new Error('Custom `storeFactory` must not return `null`.');
    }

    this._root = createNode('/');
    this._storeFactory = storeFactory;
    this._matchers = new Map<string, Matcher>()
  }

  getTree() {
    return this._root
  }

  setMatcher(type: string, matcher: Matcher) {
    console.log('setting matcher for type', type)
    this._matchers.set(type, matcher)
    console.log('set', this._matchers.get(type))
  }

  getMatcher(param: string): Matcher | null {
    console.log('trying to find matcher for', param)
    const matcher = this._matchers.get(param) ?? null
    console.log('find matcher?', matcher ? 'yes' : 'no')
    return matcher
  }

  register(path: string) {
    if (typeof path !== 'string') {
      throw new TypeError('Route path must be a string');
    }
    if (path === '' || path[0] !== '/') {
      throw new Error(`Invalid route: ${path}\nRoute path must begin with a "/"`);
    }
    console.log('Registering path', path)
    const ends_with_wildcard = path.endsWith('*');

    if (ends_with_wildcard) {
      console.log('Path ends with wildcard')
      path = path.slice(0, -1); // Slice off trailing '*'
    }

    const static_segments = path.split(/:.+?(?=\/|$)/);
    const optional_segments = path.match(/:[\w.~-]+?\?(?=\/|$)/g) || [];
    //const param_segments = path.match(/:[\w.~-]+?(?=\/|$)/g) || [];
    const matcher_regex = /:[\w.~-]+?=[a-zA-Z]+?(?=\/|$)/g
    const param_segments = path.match(/:[\w.~-]+?(?:=[a-zA-Z]+?)?(?=\/|$)/g) || [];
    console.log('Static segments are', static_segments)
    console.log('Optional segments are', optional_segments)
    console.log('Param segments are', param_segments)

    if (static_segments[static_segments.length - 1] === '') {
      console.log('Popping last static segment, becuase it is an empty string')
      static_segments.pop();
    }

    let node = this._root;
    let param_segments_index = 0;

    for (let i = 0; i < static_segments.length; ++i) {
      let segment = static_segments[i];
      console.log('Processing path segment', segment)
      let is_matcher = false;

      if (i > 0) { // Set parametric properties on the node
        const param = param_segments[param_segments_index]
        console.log('Pre-slice param segment', param)
        is_matcher = matcher_regex.test(param)
        console.log(`param ${param} is matcher?`, is_matcher)
        let param_name = ''
        let matcher: Matcher = null
        if (is_matcher) {
          /* Remove the leading : and anything after and including the = that defines the match type. */
          param_name = param_segments[param_segments_index++].slice(1, param.indexOf('='));
          matcher = this.getMatcher(param)
        } else
          /* Is regular param, remove leading : */
          param_name = param_segments[param_segments_index++].slice(1);

        console.log('Post-slice param segment', param_name)

        if (node.parametric_child === null) {
          console.log('Found no parametric child, creating...')
          node.parametric_child = createParametricNode(param_name, matcher);
          console.log('Parametric child is', node.parametric_child)
        } else if (node.parametric_child.param_name !== param_name) {
          throw new Error(
            `Cannot create route "${path}" with parameter "${param_name}" ` +
            'because a route already exists with a different parameter name ' +
            `("${node.parametric_child.param_name}") in the same location`
          );
        }

        const { parametric_child } = node;
        console.log('parametric_child from node', parametric_child)

        if (parametric_child.static_child === null) {
          console.log('Parametric child has no static child; creating...')
          node = parametric_child.static_child = createNode(segment);
          console.log('Parametric childs static child is now', node)
          continue;
        }

        // TODO can this be an else for above?
        node = parametric_child.static_child;
        console.log('Parametric childs static child is', node)
      }

      for (let j = 0; ;) {
        console.log('j is', j, 'segment length is', segment.length)
        if (j === segment.length) {
          /* Reached end of segment. */
          console.log('Reached end of segment.')
          console.log('j === segment.length', j, segment.length)
          if (j < node.segment.length) { // Move the current node down
            console.log('j is less than nodes segment length; clone.', j, node.segment.length)
            console.log('cloning node', node, 'for', node.segment.slice(j))
            const child_node = cloneNode(node, node.segment.slice(j));
            console.log('child_node is', child_node, '; moving down.')
            Object.assign(node, createNode(segment, [child_node]));
            console.log('Post move, node is', node)
          }
          console.log('breaking out of j === segment.length if')
          break;
        }

        if (j === node.segment.length) { // Add static child
          console.log('j === node.segment.length', j, node.segment.length, node.segment)
          const current_character = segment.charCodeAt(j)
          console.log('current_character is', segment[j], current_character)

          if (node.static_children !== null) {
            console.log('nodes static_children is not null; has current_character?', node.static_children)
            const maybe_child = node.static_children.get(current_character)
            console.log('node.static_children has current character?', !!maybe_child)
            if (maybe_child) {
              console.log('yep, node static children has current character')
              node = maybe_child
              console.log('node is now that child', node)
              segment = segment.slice(j);
              console.log(`sliced segment at value of ${j}, now`, segment, 'setting j to 0 and continuing')
              j = 0;
              continue;
            }
          } else {
            console.log('node.static_children is null; assign new Map')
            node.static_children = new Map()
          }

          // Create new node
          const child_node = createNode(segment.slice(j));
          console.log('created child node from segment slice', j, child_node)
          console.log('setting node.static_children to node above, with character', current_character, 'as key')
          node.static_children.set(current_character, child_node);
          console.log('setting node to child_node and breaking')
          node = child_node;

          break;
        }

        if (segment[j] !== node.segment[j]) { // Split the node
          console.log('segment', segment[j], 'does not equal node.segment', node.segment[j], '; split node')
          const existing_child = cloneNode(node, node.segment.slice(j));
          console.log('existing_child', existing_child, 'is now clone of', node, 'and node.segment.slice(j)', node.segment.slice(j))
          const new_child = createNode(segment.slice(j));
          console.log('new_child is', new_child, 'by creating node from', segment.slice(j))

          Object.assign(node, createNode(node.segment.slice(0, j), [existing_child, new_child]));
          console.log('Assigning new node from', node.segment.slice(0, j), 'and children', [existing_child, new_child], 'to', node)

          node = new_child;
          console.log('node is now new_child', new_child, 'and breaking')

          break;
        }

        ++j;
        console.log('add 1 to j. j now', j)
      }
    }

    if (param_segments_index < param_segments.length) { // The final part is a parameter
      console.log('final segment is a param', param_segments_index, 'is less than', param_segments.length)
      let is_matcher = false;
      let param_name = ''
      let matcher: Matcher = null
      const param = param_segments[param_segments_index];
      console.log('param is', param)
      is_matcher = matcher_regex.test(param)
      if (is_matcher) {
        /* Remove the leading : and anything after and including the = that defines the match type. */
        param_name = param.slice(1, param.indexOf('='));
        const param_type = param.split('=')[1]
        matcher = this.getMatcher(param_type)
      } else
        /* Is regular param, remove leading : */
        param_name = param.slice(1);

      console.log('sliced 1 from param, to get param_name', param_name)

      if (node.parametric_child === null) {
        console.log('node.parametric_child is null; create')
        node.parametric_child = createParametricNode(param_name, matcher);
        console.log('created parametric child is', node.parametric_child)
      } else if (node.parametric_child.param_name !== param_name) {
        console.log(node.parametric_child.param_name, 'is not equal to', param_name)
        throw new Error(
          `Cannot create route "${path}" with parameter "${param_name}" ` +
          'because a route already exists with a different parameter name ' +
          `("${node.parametric_child.param_name}") in the same location`
        );
      }

      if (node.parametric_child.store === null) {
        console.log('node.parametric_child.store is null; create store')
        node.parametric_child.store = this._storeFactory();
        console.log('created store for parametric', node.parametric_child.store)
      }
      console.log('returning newly created store.')
      return node.parametric_child.store;
    }

    if (ends_with_wildcard) { // The final part is a wildcard
      console.log('final part is a wildcard')
      if (node.wildcard_store === null) {
        console.log('final part does not have a wildcard store; create store')
        node.wildcard_store = this._storeFactory();
        console.log('created store for wildcard', node.wildcard_store, 'for final wildcard part')
      }
      console.log('returning wildcard store', node.wildcard_store)
      return node.wildcard_store;
    }

    // The final part is static
    if (node.store === null) {
      console.log('final part is static because node', node, 'does not have a store; create store')
      node.store = this._storeFactory();
      console.log('created store for static', node.store)
    }
    console.log('returning static store', node.store)
    return node.store;
  }

  find(url: string) {
    if (url === '' || url[0] !== '/') {
      return null;
    }

    const query_index = url.indexOf('?');
    console.log('query index', query_index)
    const url_length = query_index >= 0 ? query_index : url.length;
    console.log('url length', url_length)
    return matchRoute(url, url_length, this._root, 0);
  }
}

function matchRoute(url: string, url_length: number, node: Node, start_index: number): Route {
  const { segment } = node;
  console.log('segment', segment)
  const segment_len = segment.length;
  console.log('segment length', segment_len)
  const segment_end_index = start_index + segment_len;
  console.log('segment end index', segment_end_index)

  // Only check the segment if its length is > 1 since the parent has
  // already checked that the url matches the first character
  if (segment_len > 1) {
    console.log('segment length > 1')
    if (segment_end_index > url_length) {
      console.log('segment is longer than url. no match. return')
      return null;
    }

    if (segment_len < 15) { // Using a loop is faster for short strings
      console.log('segment length < 15, looping to attempt match')
      for (let i = 1, j = start_index + 1; i < segment_len; ++i, ++j) {
        console.log('comparing', segment[i], url[j])
        if (segment[i] !== url[j]) {
          console.log('no short match. return')
          return null;
        }
      }
    } else if (url.slice(start_index, segment_end_index) !== segment) {
      console.log('no long match. return')
      return null;
    }
  }

  start_index = segment_end_index;
  console.log('start index is now', start_index)

  if (start_index === url_length) { // Reached the end of the URL
    console.log('reached end of url')
    if (node.store !== null) {
      console.log('node has a store. returning', node.store)
      return {
        store: node.store,
        params: {},
      };
    }

    if (node.wildcard_store !== null) {
      console.log('found wildcard, returning', node.wildcard_store)
      return {
        store: node.wildcard_store,
        params: {'*': ''},
      };
    }

    return null;
  }

  if (node.static_children !== null) {
    console.log('node has static children')
    const static_child = node.static_children.get(url.charCodeAt(start_index));

    if (static_child !== undefined) {
      console.log('child matched, process child', static_child)
      const route = matchRoute(url, url_length, static_child, start_index);

      if (route !== null) {
        console.log('match found', route)
        return route;
      }
    }
  }

  if (node.parametric_child !== null) {
    const parametric_node = node.parametric_child;
    console.log('node has parametric children', parametric_node)
    const slash_index = url.indexOf('/', start_index);
    console.log('slash / index is', slash_index)

    if (slash_index !== start_index) { // Params cannot be empty
      console.log('slash index', slash_index, 'and start index', start_index, 'do not match')
      if (slash_index === -1 || slash_index >= url_length) {
        if (parametric_node.store !== null) {
          console.log('found parametric node store. return', parametric_node.store)
          const params: Params = {}; // This is much faster than using a computed property
          const param = url.slice(start_index, url_length)
          const matcher = parametric_node.matcher

          if (matcher) {
            console.log('found matcher', matcher)
            const type_match = matcher(param)
            if (!type_match) {
              console.log('parametric node has matcher, but failed to match param type')
              return null
            }
            console.log('param type equals matcher type')
          }
          
          params[parametric_node.param_name] = param;
          return {
            store: parametric_node.store,
            params,
          };
        }
      } else if (parametric_node.static_child !== null) {
        console.log('parametric node has static child', parametric_node.static_child, 'process child')
        const route = matchRoute(url, url_length, parametric_node.static_child, slash_index);

        if (route !== null) {
          console.log('set params and return route', route)
          route.params[parametric_node.param_name] = url.slice(start_index, slash_index);
          return route;
        }
      }
    }
  }

  if (node.wildcard_store !== null) {
    console.log('node has wildcard store. return', node.wildcard_store)
    return {
      store: node.wildcard_store,
      params: {
        '*': url.slice(start_index, url_length),
      },
    };
  }

  return null;
}
