/* models */

/* app models */
import { AppErrorResponse } from '@app/models/app.response'
/* enums */
import type { ClientSession } from 'mongoose'
import type { Types } from '@app/repositories/mongoose'
import { ESimcardStatus, SimcardModel } from '@app/repositories/mongoose/models/simcard.model '
import { type ICreateSimcardData } from './dtos/simcard.dto'

class SimcardService {
  async getSimcards (query: any): Promise<typeof data> {
    const filter = query.filter
    const count: any = await SimcardModel.count({ location: filter, active: true })
    const simcards = await SimcardModel.find({ location: filter, active: true }, undefined, {
      skip: query?.start ?? 0,
      limit: query?.end ?? 10
    })
    const data = { count, simcards }
    return data
  }

  async getSimcard (_id: string): Promise<typeof simcard> {
    if (typeof _id === 'undefined') {
      throw new AppErrorResponse({
        description: 'Faltó agregar ID para la simcard',
        name: 'Faltó agregar ID para la simcard',
        statusCode: 500,
        isOperational: true
      })
    }

    const simcard = await SimcardModel.findOne({ _id, active: true })
    return simcard
  }

  async createSimcards (simcardDataArray: ICreateSimcardData[], session: ClientSession): Promise<typeof response> {
    const createdSimcards = await SimcardModel.insertMany(simcardDataArray)
    const response = { created: true, createdSimcards }
    return response
  }

  async assignSimcardFranchise (idSimcard: Types.ObjectId, idFranchise: Types.ObjectId, session: ClientSession): Promise<typeof data> {
    const simcard = await SimcardModel.findOne({ _id: idSimcard, active: true, pending: false }, undefined, { session })
    if (simcard == null) throw new AppErrorResponse({ name: 'Simcard no encontrada', description: 'Simcard no encontrada', isOperational: true, statusCode: 404 })
    console.log(idFranchise)
    simcard.franchiseId = idFranchise
    simcard.status = ESimcardStatus.FRANCHISE
    const data = await simcard.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return data
  }

  async assignSimcardCommerce (idSimcard: Types.ObjectId, idCommerce: Types.ObjectId, session: ClientSession): Promise<typeof data> {
    const simcard = await SimcardModel.findOne({ _id: idSimcard, active: true, pending: false }, undefined, { session })
    if (simcard == null) throw new AppErrorResponse({ name: 'Simcard no encontrada', description: 'Simcard no encontrada', isOperational: true, statusCode: 404 })
    simcard.commerceId = idCommerce
    simcard.status = ESimcardStatus.COMMERCE
    const data = await simcard.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return data
  }
}

const simcardService: SimcardService = new SimcardService()
export default simcardService
