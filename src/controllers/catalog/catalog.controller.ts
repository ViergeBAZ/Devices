import type { Request, Response } from 'express'

/* services */
import catalogService from './services/catalog.service'
/* handlers */
import { appErrorResponseHandler, appSuccessResponseHandler } from '@app/handlers/response'
/* dtos */
import type { AppControllerResponse } from '@app/models/app.response'

class CatalogController {
  public async getTerminalModels (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const response = await catalogService.getTerminalModels()
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const catalogController: CatalogController = new CatalogController()
