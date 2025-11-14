import { AppErrorResponse } from '@app/models/app.response'
import { type ITransaction } from './dtos/transaction.dto'
import { customLog } from '@app/utils/util.util'
import { appProfilesInstance } from '@app/repositories/axios'
import { TransactionModel } from '@app/repositories/mongoose/models'

class TransactionServiceV2 {
  async searchByFranchise (query: any, locals: any): Promise<any> {
    // const commerceId = query.commerceId
    // const franchiseId = locals.user._id

    // const commercesFound = await UserModel.find({ active: true, franchiseId })
    // const commerceIds = commercesFound.map(x => String(x._id))
    // if (commerceIds.length === 0) throw new AppErrorResponse({ statusCode: 404, name: 'El distribuidor no cuenta con comercios' })
    // if (commerceId != null && !commerceIds.includes(commerceId)) throw new AppErrorResponse({ statusCode: 403, name: 'El comercio no pertenece a este distribuidor' })

    // const branchesFound = await this.search({ ...query, commerceId: [commerceId] ?? commerceIds })
    // return branchesFound // .filter((x: IBranch) => commerceIds.includes(String(x.commerceId)))
  }

  async searchByBackoffice (query: any): Promise<any> {
    const records = await this.search(query)
    return records
  }

  async search (query: any): Promise<any> {
    const { limit = 10, populated = 1, size, sortField, fields, ...queryFields } = query

    const allowedFields: Array<keyof ITransaction> = ['ID Transaction', 'commerce', 'processor', 'transactionStatus', 'Transaction Date', 'Transaction Time', 'Amount', 'ID Afiliate', 'tefStatus', 'depositStatus', 'operationType']

    const filter: any = { active: true }
    let selection: any = size === 'small' ? { commerce: 1, 'ID Transaction': 1, Amount: 1, 'Transaction Date': 1, 'Transaction Time': 1 } : { active: 0, __v: 0 }
    if (fields != null && fields.length > 0) {
      selection = Object.fromEntries(fields.map((key: string) => [key, 1]))
    }

    for (const field in queryFields) {
      if (!allowedFields.includes(field.replace(/[~<>]/, '') as any)) {
        throw new AppErrorResponse({ statusCode: 404, name: `Campo no permitido: ${field}` })
      }

      const value = queryFields[field]
      const cleanField = field.replace(/[~<>]/, '')

      if (Array.isArray(value)) {
        filter[cleanField] = { $in: value }
      } else if (field.startsWith('~')) {
        filter[cleanField] = new RegExp('' + String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      } else if (field.startsWith('<')) {
        filter[cleanField] = { ...filter[cleanField], $lt: value }
      } else if (field.startsWith('>')) {
        filter[cleanField] = { ...filter[cleanField], $gt: value }
      } else {
        filter[cleanField] = value
      }
    }

    customLog('filter', filter)

    const records = await TransactionModel.find(filter).select(selection).limit(limit)
    return populated === 1 ? await this.populateResults(records) : records
  }

  async populateResults (resultObj: any): Promise<any> {
    const transactions = JSON.parse(JSON.stringify(resultObj))
    if (transactions == null || transactions.length === 0) return transactions

    let commerces: any, franchises: any, branches: any
    try {
      const commerceIds = [...new Set(transactions.map((transaction: ITransaction) => transaction.commerce))]
      const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
      commerces = response.data.response

      const franchiseIds = [...new Set(transactions.map((transaction: ITransaction) => transaction.franchiseId))]
      const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
      franchises = response2.data.response

      const branchIds = [...new Set(transactions.map((transaction: ITransaction) => transaction.branchId))]
      const response3 = await appProfilesInstance.get(`branch/backoffice/getBranches/?branchIds[]=${branchIds.join('&branchIds[]=')}`)
      branches = response3.data.response
    } catch (error) {
      customLog('No se obtuvo respuesta del servidor profiles')
    }

    return transactions.map((x: ITransaction) => ({
      ...x,
      commerceName: commerces?.[String(x.commerce)]?.name,
      franchiseName: franchises?.[String(x.franchiseId)]?.name,
      branchName: branches?.[String(x.branchId)]?.branchName,
      commerceInfo: {
        commerceName: commerces?.[String(x.commerce)]?.name,
        commerceInternalId: commerces?.[String(x.commerce)]?.internalId,
        commerceResponsible: commerces?.[String(x.commerce)]?.commerceResponsible
      },
      branchInfo: { ...branches?.[String(x.branchId)] }
    }))
  }
}

const transactionServiceV2: TransactionServiceV2 = new TransactionServiceV2()
export default transactionServiceV2
