import { createLogger, transports, format } from 'winston'

export const CommerceLogger = createLogger({
  transports: [
    new transports.File({
      dirname: 'logs',
      filename: 'commerce-register.log'
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
