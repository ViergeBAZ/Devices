import type { Request, Response } from 'express'
/* repo */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import terminalService from './services/terminal.service'
/* handlers */
import { appErrorResponseHandler, appSuccessResponseHandler } from '@app/handlers/response'
/* dtos */
import type { AppControllerResponse } from '@app/models/app.response'
import type { IPostTerminal, IGetTerminalsQuery, IGetCountTerminal, IGetSearchTerminals } from './services/dtos/terminal.dto'
import { type UpdateTerminalDto } from './services/dtos/update-terminal.dto'
import { type TpvLoginDto } from './services/dtos/tpv-login.dto'
import { type AssingApiKeyWOtpDto } from './services/dtos/assign-apikey-w-otp.dto'
import { type GenerateOtpDto } from './services/dtos/generate-otp.dto'
import { type ResetApiKeyDto } from './services/dtos/reset-apikey.dto'

class TerminalController {
  public async getTerminals (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTerminalsQuery
    try {
      const response = await terminalService.getTerminals(query)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTerminal (req: Request, res: Response): Promise<AppControllerResponse> {
    const id = req.params?.id
    try {
      const response = await terminalService.getTerminal(id)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async searchTerminals (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetSearchTerminals
    try {
      const response = await terminalService.searchTerminals(query)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async searchByCommerce (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetSearchTerminals
    const locals = res.locals
    try {
      const response = await terminalService.searchByCommerce(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async searchByFranchise (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetSearchTerminals
    const locals = res.locals
    try {
      const response = await terminalService.searchByFranchise(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async terminalCount (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetCountTerminal

    try {
      const response = await terminalService.terminalCount(query)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body as IPostTerminal
    const session = await AppMongooseRepo.startSession()

    try {
      session.startTransaction()
      const response = await terminalService.create(body, session)
      await session.commitTransaction()
      await session.endSession()
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async update (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body as UpdateTerminalDto
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await terminalService.update(body, session)
      await session.commitTransaction()
      await session.endSession()
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error)
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async resetApiKey (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body as ResetApiKeyDto
    const session = await AppMongooseRepo.startSession()

    try {
      session.startTransaction()
      const response = await terminalService.resetApiKey(body.serialNumber, session)
      await session.commitTransaction()
      await session.endSession()
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async tpvLogin (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body as TpvLoginDto
    try {
      const response = await terminalService.tpvLogin(body.serialNumber, body.apiKey)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async generateOtp (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body as GenerateOtpDto

    try {
      const response = await terminalService.generateOtp(body.serialNumber)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async assignApiKeyWithOtp (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body as AssingApiKeyWOtpDto

    try {
      const response = await terminalService.assignApiKeyWithOtp(body.commerceInternalId, body.serialNumber, body.otp)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async resetPasscode (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals
    console.log(locals)

    try {
      const result = await terminalService.resetPasscode(locals.user._id, locals.user.serialNumber)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async deleteTerminal (req: Request, res: Response): Promise<AppControllerResponse> {
    const { id } = req.params
    try {
      const result = await terminalService.deleteTerminal(id)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const terminalController: TerminalController = new TerminalController()
