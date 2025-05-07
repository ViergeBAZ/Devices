'@app/repositories/mongoose/models'

import { AppErrorResponse } from '@app/models/app.response'
import { SelectModel } from '@app/repositories/mongoose/models'

class CatalogService {
  async getTerminalModels (): Promise<any> {
    const catalog = await SelectModel.findOne({ name: 'terminalModelsByName' })
    if (catalog == null) throw new AppErrorResponse({ description: '', name: 'No se encontró el catalogo', statusCode: 404, isOperational: true })
    return catalog.options
  }
}

const catalogService: CatalogService = new CatalogService()
export default catalogService
