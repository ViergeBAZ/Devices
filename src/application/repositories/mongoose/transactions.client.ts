import mongoose from 'mongoose'
/* settings */
import { AppMongooseSettings } from './mongoose.settings'
/* handlers */
import { Winston } from '@app/handlers/loggers/winston.logger'

const AppMongooseRepo2 = mongoose.createConnection(
  AppMongooseSettings.uri2,
)

AppMongooseRepo2.on('error', (e) => { Winston.error(String(e)) })
AppMongooseRepo2.on('open', () => { Winston.info('transactions db connection success!') })

export {AppMongooseRepo2}
