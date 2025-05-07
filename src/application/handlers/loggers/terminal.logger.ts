import { createLogger, transports, format } from 'winston'

export const TerminalLogger = createLogger({
  transports: [
    new transports.File({
      dirname: 'logs',
      filename: 'terminals.log'
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
