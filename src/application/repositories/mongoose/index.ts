import mongoose from 'mongoose'

mongoose.set('strictQuery', false)

export * from './devices.client'
// export * from './profiles.client'

/* exports */
export { Schema, model, Types, Model, SchemaTypes, Document } from 'mongoose'
