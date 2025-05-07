/* services */
import consumerService from './services/consumer.service'
/* handlers */
import { Winston } from '@app/handlers/loggers/winston.logger'
import { AppErrorResponse } from '@app/models/app.response'
/* dtos */
import type { EachMessagePayload, KafkaMessage } from 'kafkajs'

class ConsumerController {
  async init ({ message }: EachMessagePayload): Promise<void> {
    try {
      if (message.key == null) throw new AppErrorResponse({ description: '', name: '', statusCode: 500, isOperational: true })
      if (message.key.toString() === 'update-terminal-ids') await this.onUpdateTerminalIds(message)
    } catch (error) {
      Winston.error(String(error))
    }
  }

  private async onUpdateTerminalIds (message: KafkaMessage): Promise<void> {
    console.log('update-terminal-ids')
    await consumerService.test(message)
  }
}

const consumerController = new ConsumerController()
export default consumerController
