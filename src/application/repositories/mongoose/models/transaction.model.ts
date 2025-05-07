/* repo */
import { model } from '@app/repositories/mongoose'
/* schema */
import { TransactionSchema } from '@app/repositories/mongoose/models/schemas/transaction.schema'
/* handlers */
import { TransactionLogger } from '@app/handlers/loggers/transaction.logger'
/* dtos */
import type { ITransaction } from '@app/interfaces/transaction.interface'
import type { CallbackError } from 'mongoose'
import { appProfilesInstance } from '@app/repositories/axios'

// TransactionSchema.virtual('yearMonth').get(function () {
//   return this['Transaction Date']?.substring(0, 4)
// })

TransactionSchema.virtual('authorization').get(function () {
  return this['MIT Fields']?.[0]?.['38']
})

// TransactionSchema.virtual('originalElements').get(function () {
//   return `0200${String(this['MIT Fields']?.[0]?.['37'])}${String(this['MIT Fields']?.[0]?.['13'])}${String(this['MIT Fields']?.[0]?.['12'])}00${String(this['MIT Fields']?.[0]?.['17'])}          `
// })

/* methods */
// TransactionSchema.method('getDate', function getDate (this: HydratedDocument<ITransaction>) {
//   return convertStringToDate(String(this['Transaction Date']))
// })

/* pre (middlewares) */
TransactionSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())

  if (this.isNew) {
    try {
      const response = await appProfilesInstance.get(`user/admin/getCommerceById/${this.commerce}`)
      const franchiseId = response.data.response.franchiseId
      const advisorId = response.data.response.adviser
      this.franchiseId = franchiseId
      this.advisorId = advisorId
      next()
    } catch (error) {
      next(error as CallbackError)
    }
  }

  next()
})

/* post (middlewares) */
TransactionSchema.post('save', function (doc) {
  TransactionLogger.info(`[Transaction][${String(doc._id)}] Transacción creada: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const TransactionModel = model<ITransaction>('transactions', TransactionSchema)
