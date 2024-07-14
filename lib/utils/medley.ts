import { Handler } from "../../types";

type Params = { [key: string]: string }
type Route = { store: Store; params: Params; } | null;
type Store = { [key: string]: Handler }
type StoreFactory = () => Store
type Node = {
  segment: string;
  store: Store | null;
  static_children: Map<number, Node> | null;
  parametric_child: ParametricNode | null;
  wildcard_store: Store | null;
}
type ParametricNode = {
  param_name: string;
  store: Store | null;
  static_child: Node | null;
}

function createNode(segment: string, static_children?: Node[] ): Node {
  return {
    segment,
    store: null,
    static_children: static_children === undefined
      ? null
      : new Map(static_children.map(child => [child.segment.charCodeAt(0), child])),
    parametric_child: null,
    wildcard_store: null,
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

function createParametricNode(param_name: string) {
  return {
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
  constructor({ storeFactory }: { storeFactory?: StoreFactory } = { storeFactory: defaultStoreFactory }) {
    if (typeof storeFactory !== 'function')
      throw new TypeError('`storeFactory` must be a function');

    const store = storeFactory()
    if (store === null) {
      throw new Error('Custom `storeFactory` must not return `null`.');
    }

    // const customStoreFactory = storeFactory;
    // storeFactory = () => {
    //   const store = customStoreFactory();
    //   if (store === null) {
    //     throw new Error('Custom `storeFactory` must not return `null`.');
    //   }
    //   return store;
    // };


    this._root = createNode('/');
    this._storeFactory = storeFactory;
  }

  register(path: string) {
    if (typeof path !== 'string') {
      throw new TypeError('Route path must be a string');
    }
    if (path === '' || path[0] !== '/') {
      throw new Error(`Invalid route: ${path}\nRoute path must begin with a "/"`);
    }

    const ends_with_wildcard = path.endsWith('*');

    if (ends_with_wildcard) {
      path = path.slice(0, -1); // Slice off trailing '*'
    }

    const static_segments = path.split(/:.+?(?=\/|$)/);
    const param_segments = path.match(/:.+?(?=\/|$)/g) || [];

    if (static_segments[static_segments.length - 1] === '') {
      static_segments.pop();
    }

    let node = this._root;
    let param_segments_index = 0;

    for (let i = 0; i < static_segments.length; ++i) {
      let segment = static_segments[i];

      if (i > 0) { // Set parametric properties on the node
        const param_name = param_segments[param_segments_index++].slice(1);

        if (node.parametric_child === null) {
          node.parametric_child = createParametricNode(param_name);
        } else if (node.parametric_child.param_name !== param_name) {
          throw new Error(
            `Cannot create route "${path}" with parameter "${param_name}" ` +
            'because a route already exists with a different parameter name ' +
            `("${node.parametric_child.param_name}") in the same location`
          );
        }

        const {parametric_child} = node;

        if (parametric_child.static_child === null) {
          node = parametric_child.static_child = createNode(segment);
          continue;
        }

        node = parametric_child.static_child;
      }

      for (let j = 0; ;) {
        if (j === segment.length) {
          if (j < node.segment.length) { // Move the current node down
            const child_node = cloneNode(node, node.segment.slice(j));
            Object.assign(node, createNode(segment, [child_node]));
          }
          break;
        }

        if (j === node.segment.length) { // Add static child
          const current_character = segment.charCodeAt(j)

          if (node.static_children !== null) {
            const maybe_child = node.static_children.get(current_character)
            if (maybe_child) {
              node = maybe_child
              segment = segment.slice(j);
              j = 0;
              continue;
            }
          } else {
            node.static_children = new Map()
          }

          // Create new node
          const child_node = createNode(segment.slice(j));
          node.static_children.set(current_character, child_node);
          node = child_node;

          break;
        }

        if (segment[j] !== node.segment[j]) { // Split the node
          const existing_child = cloneNode(node, node.segment.slice(j));
          const new_child = createNode(segment.slice(j));

          Object.assign(node, createNode(node.segment.slice(0, j), [existing_child, new_child]));

          node = new_child;

          break;
        }

        ++j;
      }
    }

    if (param_segments_index < param_segments.length) { // The final part is a parameter
      const param = param_segments[param_segments_index];
      const param_name = param.slice(1);

      if (node.parametric_child === null) {
        node.parametric_child = createParametricNode(param_name);
      } else if (node.parametric_child.param_name !== param_name) {
        throw new Error(
          `Cannot create route "${path}" with parameter "${param_name}" ` +
          'because a route already exists with a different parameter name ' +
          `("${node.parametric_child.param_name}") in the same location`
        );
      }

      if (node.parametric_child.store === null) {
        node.parametric_child.store = this._storeFactory();
      }

      return node.parametric_child.store;
    }

    if (ends_with_wildcard) { // The final part is a wildcard
      if (node.wildcard_store === null) {
        node.wildcard_store = this._storeFactory();
      }

      return node.wildcard_store;
    }

    // The final part is static
    if (node.store === null) {
      node.store = this._storeFactory();
    }

    return node.store;
  }

  find(url: string) {
    if (url === '' || url[0] !== '/') {
      return null;
    }

    const query_index = url.indexOf('?');
    const url_length = query_index >= 0 ? query_index : url.length;

    return matchRoute(url, url_length, this._root, 0);
  }

  // debugTree() {
  //   return require('object-treeify')(debugNode(this._root))
  //     .replace(/^.{3}/gm, ''); // Remove the first 3 characters of every line
  // }
}

function matchRoute(url: string, url_length: number, node: Node, start_index: number): Route {
  const { segment } = node;
  const segment_len = segment.length;
  const segment_end_index = start_index + segment_len;

  // Only check the segment if its length is > 1 since the parent has
  // already checked that the url matches the first character
  if (segment_len > 1) {
    if (segment_end_index > url_length) {
      return null;
    }

    if (segment_len < 15) { // Using a loop is faster for short strings
      for (let i = 1, j = start_index + 1; i < segment_len; ++i, ++j) {
        if (segment[i] !== url[j]) {
          return null;
        }
      }
    } else if (url.slice(start_index, segment_end_index) !== segment) {
      return null;
    }
  }

  start_index = segment_end_index;

  if (start_index === url_length) { // Reached the end of the URL
    if (node.store !== null) {
      return {
        store: node.store,
        params: {},
      };
    }

    if (node.wildcard_store !== null) {
      return {
        store: node.wildcard_store,
        params: {'*': ''},
      };
    }

    return null;
  }

  if (node.static_children !== null) {
    const static_child = node.static_children.get(url.charCodeAt(start_index));

    if (static_child !== undefined) {
      const route = matchRoute(url, url_length, static_child, start_index);

      if (route !== null) {
        return route;
      }
    }
  }

  if (node.parametric_child !== null) {
    const parametric_node = node.parametric_child;
    const slash_index = url.indexOf('/', start_index);

    if (slash_index !== start_index) { // Params cannot be empty
      if (slash_index === -1 || slash_index >= url_length) {
        if (parametric_node.store !== null) {
          const params: Params = {}; // This is much faster than using a computed property
          params[parametric_node.param_name] = url.slice(start_index, url_length);
          return {
            store: parametric_node.store,
            params,
          };
        }
      } else if (parametric_node.static_child !== null) {
        const route = matchRoute(url, url_length, parametric_node.static_child, slash_index);

        if (route !== null) {
          route.params[parametric_node.param_name] = url.slice(start_index, slash_index);
          return route;
        }
      }
    }
  }

  if (node.wildcard_store !== null) {
    return {
      store: node.wildcard_store,
      params: {
        '*': url.slice(start_index, url_length),
      },
    };
  }

  return null;
}

// function debugNode(node: Node): any {
//   if (node.store === null && node.static_children === null) { // Can compress output better
//     if (node.parametric_child === null) { // There is only a wildcard store
//       return { [node.segment + '* (s)']: null };
//     }

//     if (node.wildcard_store === null) { // There is only a parametric child
//       if (node.parametric_child.static_child === null) {
//         return {
//           [node.segment + ':' + node.parametric_child.param_name + ' (s)']: null,
//         };
//       }

//       if (node.parametric_child.store === null) {
//         return {
//           [node.segment + ':' + node.parametric_child.param_name]:
//             debugNode(node.parametric_child.static_child)
//         };
//       }
//     }
//   }

//   const child_routes: { [key: string]: Node | null } = {};

//   if (node.static_children !== null) {
//     for (const child_node of node.static_children.values()) {
//       Object.assign(child_routes, debugNode(child_node));
//     }
//   }

//   if (node.parametric_child !== null) {
//     const { parametric_child } = node;
//     const label = ':' + parametric_child.param_name + debugStore(parametric_child.store);

//     child_routes[label] = parametric_child.static_child === null
//       ? null
//       : debugNode(parametric_child.static_child);
//   }

//   if (node.wildcard_store !== null) {
//     child_routes['* (s)'] = null;
//   }

//   return {
//     [node.segment + debugStore(node.store)]: child_routes,
//   };
// }

// function debugStore(store: Store | null): string {
//   return store === null ? '' : ' (s)';
// }
