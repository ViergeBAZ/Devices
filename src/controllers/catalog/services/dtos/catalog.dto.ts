import { type Types } from '@app/repositories/mongoose'

export interface IGetTerminalCatalog {
  value: Types.ObjectId
  name: string
  model: string
}
