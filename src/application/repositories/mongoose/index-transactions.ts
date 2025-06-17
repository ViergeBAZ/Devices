import mongoose from 'mongoose'

mongoose.set('strictQuery', false)

export * from './transactions.client'

/* exports */
export { Document } from 'mongoose'
