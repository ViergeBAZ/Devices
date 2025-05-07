import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
/* controllers */
import { simcardController } from '@controllers/sim/simcard.controller'

class SimcardRoutes extends ServerRouter {
  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/', simcardController.getSimcards as RequestHandler)
    this.router.get('/:id', simcardController.getSimcard as RequestHandler)
    this.router.post('/createMany', simcardController.createSimcards as RequestHandler)
    this.router.patch('/assignSimcardFranchise', simcardController.assignSimcardFranchise as RequestHandler)
    this.router.patch('/assignSimcardCommerce', simcardController.assignSimcardCommerce as RequestHandler)
  }
}

const simcardRoutes: SimcardRoutes = new SimcardRoutes()
export default simcardRoutes.router
