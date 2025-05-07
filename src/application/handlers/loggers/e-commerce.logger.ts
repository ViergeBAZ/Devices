import { createLogger, transports, format } from 'winston'

export const ECommerceLogger = createLogger({
  transports: [
    new transports.File({
      dirname: 'logs',
      filename: 'e-commerce.log'
    })
  ],
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(({ level, message }) => {
      return `[${level}] ${message as string}`
    })
  )
})
