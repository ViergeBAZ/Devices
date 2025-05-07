import { createLogger, transports, format } from 'winston'

export const Winston = createLogger({
  transports: [new transports.Console(), new transports.File({
    dirname: 'logs',
    filename: 'server.log'
  })],
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(({ level, message }) => {
      return `[${level}] ${message as string}`
    })
  )
})
