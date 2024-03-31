import { RequestEvent } from "../../types"

export const parseRequest = (req: Request): RequestEvent => {
  return {
    req,
    headers: req.headers,
    url: new URL(req.url)
  }
}
