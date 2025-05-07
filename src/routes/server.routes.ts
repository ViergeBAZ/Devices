import { backofficeMiddleware } from '@app/middlewares/auth.middleware'
import { ServerRouter } from './models/route'
import { type Request, type Response } from 'express'
class ServerRoutes extends ServerRouter {
  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/health', [backofficeMiddleware], (req: Request, res: Response) => res.status(200).json({ status: 'OK', response: req.query }))
  }
}

const serverRoutes: ServerRoutes = new ServerRoutes()
export default serverRoutes.router
