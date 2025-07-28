import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
/* controllers */
import { terminalController } from '@controllers/terminal/terminal.controller'
import { advisorMiddleware, backofficeMiddleware, commerceMiddleware, franchiseMiddleware } from '@app/middlewares/auth.middleware'
import { validateReq } from '@app/middlewares/class-validation.middleware'
import { UpdateTerminalDto } from '@controllers/terminal/services/dtos/update-terminal.dto'
import { TpvLoginDto } from '@controllers/terminal/services/dtos/tpv-login.dto'
import { AssingApiKeyWOtpDto } from '@controllers/terminal/services/dtos/assign-apikey-w-otp.dto'
import { GenerateOtpDto } from '@controllers/terminal/services/dtos/generate-otp.dto'
import { ResetApiKeyDto } from '@controllers/terminal/services/dtos/reset-apikey.dto'
import { DeleteTerminalDto } from '@controllers/terminal/services/dtos/delete-terminal.dto'

class UserRoutes extends ServerRouter {
  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/', [backofficeMiddleware], terminalController.getTerminals as RequestHandler)
    this.router.get('/resume', [backofficeMiddleware], terminalController.terminalCount as RequestHandler)
    this.router.get('/getTerminalById/:id', [backofficeMiddleware], terminalController.getTerminal as RequestHandler)
    this.router.post('/', [backofficeMiddleware], terminalController.create as RequestHandler)
    this.router.patch('/update', [backofficeMiddleware, validateReq(UpdateTerminalDto)], terminalController.update as RequestHandler)
    this.router.delete('/:id', [backofficeMiddleware, validateReq(DeleteTerminalDto, 'params')], terminalController.deleteTerminal as RequestHandler)

    this.router.post('/generateOtp', [backofficeMiddleware, validateReq(GenerateOtpDto)], terminalController.generateOtp as RequestHandler)
    this.router.post('/assignApiKeyWithOtp', [validateReq(AssingApiKeyWOtpDto)], terminalController.assignApiKeyWithOtp as RequestHandler)
    this.router.post('/resetApiKey', [backofficeMiddleware, validateReq(ResetApiKeyDto)], terminalController.resetApiKey as RequestHandler)
    this.router.get('/searchTerminals', [backofficeMiddleware], terminalController.searchTerminals as RequestHandler)

    this.router.post('/commerce/resetPasscode', [commerceMiddleware], terminalController.resetPasscode as RequestHandler)

    this.router.get('/commerce/search', [commerceMiddleware], terminalController.searchByCommerce as RequestHandler)

    // Franchise
    this.router.get('/franchise', [franchiseMiddleware], terminalController.getTerminalsFranchise as RequestHandler)
    this.router.get('/franchise/getTerminalById/:id', [franchiseMiddleware], terminalController.getTerminalFranchise as RequestHandler)
    this.router.post('/franchise', [franchiseMiddleware], terminalController.createTerminalFranchise as RequestHandler)
    this.router.get('/franchise/search', [franchiseMiddleware], terminalController.searchByFranchise as RequestHandler)
    this.router.patch('/franchise/update', [franchiseMiddleware, validateReq(UpdateTerminalDto)], terminalController.updateTerminalFranchise as RequestHandler)
    this.router.post('/franchise/generateOtp', [franchiseMiddleware, validateReq(GenerateOtpDto)], terminalController.generateOtpFranchise as RequestHandler)
    // Advisor
    this.router.get('/advisor', [advisorMiddleware], terminalController.getTerminalsAdvisor as RequestHandler)
    this.router.get('/advisor/getTerminalById/:id', [advisorMiddleware], terminalController.getTerminalAdvisor as RequestHandler)
    this.router.patch('/advisor/update', [advisorMiddleware, validateReq(UpdateTerminalDto)], terminalController.updateTerminalAdvisor as RequestHandler)

    this.router.post('/tpvLogin', [validateReq(TpvLoginDto)], terminalController.tpvLogin as RequestHandler)
  }
}

const userRoutes: UserRoutes = new UserRoutes()
export default userRoutes.router
