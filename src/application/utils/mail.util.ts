import { appMailTransporter, type SentMessageInfo } from '@app/repositories/nodemailer'
/* consts */
import { appMailSender, defaultEmail, sendEmailsEnabled } from '@app/constants/mail.constants'
import { Winston } from '@app/handlers/loggers/winston.logger'
import { customLog } from './util.util'

export async function appSendEmail (to: string | string[], subject: string, html: string, attachments: any[] = []): Promise<SentMessageInfo> {
  let prefix = ''
  if (!sendEmailsEnabled) {
    to = defaultEmail
    prefix = '[Dev] '
  }
  return await new Promise((resolve, reject) => {
    const mailOptions = {
      from: `Lkl Pay Financial Technology ${appMailSender as string}`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: `${prefix}${subject}`,
      html,
      attachments
    }

    appMailTransporter.sendMail(mailOptions, (error, info) => {
      if (error !== null) {
        reject(error)
      } else {
        Winston.info(`Email enviado: ${String(to)}`)
        customLog(`Email enviado: ${String(to)}`)
        resolve(info)
      }
    })
  })
}
