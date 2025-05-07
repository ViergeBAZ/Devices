export const appMailSender = process.env.NODEMAIL_EMAIL
export const appMailPassword = process.env.NODEMAIL_PASS
export const appMailHost = process.env.NODEMAIL_HOST
export const appMailPort = Number(process.env.NODEMAIL_PORT)
export const appMailSSL = Boolean(process.env.NODEMAIL_SSL)

export const sendEmailsEnabled = (process.env?.SEND_EMAILS === 'true')
export const defaultEmail = 'jair.marquez@lklpay.com.mx'

export const excelReportRecipients = [
  'jair.marquez@lklpay.com.mx',
  'ricardo.ruiz@lklpay.com.mx'
]
