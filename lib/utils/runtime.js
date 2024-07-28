/** @import { RequestEvent, MaybePromise } from '../types/internal.js' */
/** @import { Handle } from 'xink' */

/**
 * 
 * @param {RequestEvent} event 
 * @returns {MaybePromise<Response>}
 */
export const resolve = (event) => {
  if (!event.route) return new Response('Not Found', { status: 404 })

  const handler = event.route.store[event.req.method] ?? event.route.store['fallback']

  if (!handler)
    /**
     * TODO
     * Add config option to suppress a 405 and instead send a 404.
     */

    /* We found an endpoint, but the requested method is not configured. */
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': Object.keys(event.route.store).join(', ') /* Ensure we return the allowed methods for the endpoint, per RFC9110. */
      }
    })

  return handler(event)
}

/**
 * Directly from SvelteKit code, minus options.
 * 
 * @param {...Handle} handlers The chain of `handle` functions
 * @returns {Handle}
 */
export function sequence(...handlers) {
 const length = handlers.length;
 if (!length) return ({ event, resolve }) => resolve(event);

 return ({ event, resolve }) => {
   return apply_handle(0, event);

   /**
    * @param {number} i
    * @param {RequestEvent} event
    * @returns {MaybePromise<Response>}
    */
   function apply_handle(i, event) {
     const handle = handlers[i];

     return handle({
       event,
       resolve: (event) => {
         return i < length - 1
           ? apply_handle(i + 1, event)
           : resolve(event);
       }
     });
   }
 };
}