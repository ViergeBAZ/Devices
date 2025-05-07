import mongoose from 'mongoose'
/* settings */
import { AppMongooseSettings } from './mongoose.settings'
/* handlers */
import { Winston } from '@app/handlers/loggers/winston.logger'

mongoose.connect(
  AppMongooseSettings.uri
).catch((e) => Winston.error('something went wrong'))

export const AppMongooseRepo = mongoose.connection

AppMongooseRepo.on('error', (e) => { Winston.error(String(e)) })
AppMongooseRepo.on('open', () => { Winston.info('devices db connection success!') })
