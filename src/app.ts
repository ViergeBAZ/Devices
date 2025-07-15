/* aliases an environment variables */
import 'module-alias/register'
import 'dotenv/config'
import 'reflect-metadata'

/* application */
import express, { type Application, type RequestHandler, type Router } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import fs from 'fs'
import https from 'https'

/* consumers */
import depositsConsumer from '@consumers/e-commerce'
/* routes */
import terminalRoutes from './routes/terminal.routes'
import transactionRoutes from './routes/transaction.routes'
import catalogRoutes from './routes/catalog.routes'

/* handlers */
import { Winston } from '@app/handlers/loggers/winston.logger'

/* consts */
import { cors as serverCors } from '@app/constants/cors.constants'

/* dtos */
import { type ExpressMiddleware } from './application/dtos/express.dto'
import simcardRoutes from '@routes/simcard.routes'
import mainProducer from '@producers/main-producer'
import { appTiempoRetencion } from './cronjobs/cronjob.controller'
import serverRoutes from '@routes/server.routes'

/* app class */
export class AppServer {
  public app: Application
  /* readonly */
  private readonly server: https.Server

  constructor () {
    this.app = express()
    this.server = https.createServer(this.getHttpsOptions(), this.app)
    /* init methods */
    this.config()
    this.routes()
    /* kafka */
    void this.producers()
    void this.consumers()
    this.crons()
  }

  private getHttpsOptions (): any {
    return {
      key: fs.readFileSync('./src/SSL/key.pem'),
      cert: fs.readFileSync('./src/SSL/fullchain.pem')
    }
  }

  config (): void {
    this.app.set('port', process.env.PORT ?? 3000)
    this.app.use(morgan('dev'))
    this.app.use(cors(serverCors))
    this.app.use(cookieParser())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))
  }

  async consumers (): Promise<void> {
    try {
      /* connect */
      await depositsConsumer.init()
      /* subscribe */
      await depositsConsumer.start()
    } catch (error) {
      Winston.error(String(error))
      console.log(error)
    }
  }

  async producers (): Promise<void> {
    try {
      await mainProducer.connect()
    } catch (error) {
      Winston.error(String(error))
    }
  }

  routes (): void {
    this.app.use('/api/terminal', terminalRoutes)
    this.app.use('/api/simcard', simcardRoutes)
    this.app.use('/api/transaction', transactionRoutes)
    this.app.use('/api/catalog', catalogRoutes)
    this.app.use('/api/server', serverRoutes)
  }

  getAvailableRoutes (): void {
    this.app._router.stack.forEach((middleware: ExpressMiddleware) => {
      if (middleware.route != null) { // routes registered directly on the app
        const handler: RequestHandler = middleware.handle as RequestHandler
        console.log(middleware.route.path, handler)
      } else if (middleware.name === 'router') { // router middleware
        const router: Router = middleware.handle as Router
        console.log(middleware)
        router.stack.forEach((handler: any) => {
          if (typeof handler.route !== 'undefined') console.log(handler.route.path, handler.route.methods)
        })
      }
    })
  }

  crons (): void {
    appTiempoRetencion.start()
  }

  start (): void {
    this.server.listen(this.app.get('port'), () => {
      Winston.info(`Server listening on \x1b[34mhttp://localhost:${this.app.get('port') as string}\x1b[0m`)
    })
  }

  stop (): void {
    this.server.close()
  }
}
