import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
/* controllers */
import { catalogController } from '@controllers/catalog/catalog.controller'

class CatalogRoutes extends ServerRouter {
  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/terminalModels', catalogController.getTerminalModels as RequestHandler)
  }
}

const catalogRoutes: CatalogRoutes = new CatalogRoutes()
export default catalogRoutes.router
