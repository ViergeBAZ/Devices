import type { Request, Response } from 'express'
/* repo */
import { AppMongooseRepo } from '@app/repositories/mongoose'
import { appErrorResponseHandler, appSuccessResponseHandler } from '@app/handlers/response'
/* dtos */
import type { AppControllerResponse } from '@app/models/app.response'
import simcardService from './services/simcard.service'

class SimcardController {
  public async getSimcards (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query
    try {
      const response = await simcardService.getSimcards(query)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getSimcard (req: Request, res: Response): Promise<AppControllerResponse> {
    const id = req.params?.id
    try {
      const response = await simcardService.getSimcard(id)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async createSimcards (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await simcardService.createSimcards(body, session)
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

  public async assignSimcardFranchise (req: Request, res: Response): Promise<AppControllerResponse> {
    const { idSimcard, idFranchise } = req.body
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await simcardService.assignSimcardFranchise(idSimcard, idFranchise, session)
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

  public async assignSimcardCommerce (req: Request, res: Response): Promise<AppControllerResponse> {
    const { idSimcard, idCommerce } = req.body
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await simcardService.assignSimcardCommerce(idSimcard, idCommerce, session)
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
}

export const simcardController: SimcardController = new SimcardController()
