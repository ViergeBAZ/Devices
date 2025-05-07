import { CronJob } from 'cron'
/* service */
import { appDispersionCronjob } from './service/cronjob.service'
import { Winston } from '@app/handlers/loggers/winston.logger'
// import { appSendEmail } from '@app/utils/mail.util'
// import { emailReceptors } from '@app/constants/default-values'
import { customLog } from '@app/utils/util.util'

class CronjobControlller {
  async deleteSensitiveData (): Promise<void> {
    try {
      customLog('Cron deleteSensitiveData')
      await appDispersionCronjob.deleteSensitiveData()
    } catch (e) {
      // await appSendEmail(emailReceptors.admins, 'Error al leer el borrar datos antiguos', `${String(e)}`)
      Winston.error(String(e))
    }
  }
}

export const controller = new CronjobControlller()

// export const appTiempoRetencion = new CronJob('*/5 * * * * *', controller.deleteSensitiveData)
export const appTiempoRetencion = new CronJob('0 11 01 Jan,Apr,Jul,Oct *', controller.deleteSensitiveData)
