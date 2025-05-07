import { type RequestHandler, type Router } from 'express'

export interface ExpressMiddleware {
  route?: {
    path: string
    methods: Record<string, boolean>
  }
  name?: string
  handle?: RequestHandler | Router
  regexp?: RegExp // Añade esta línea
}
