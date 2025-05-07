/* services */
import consumerService from './services/consumer.service'
/* handlers */
import { Winston } from '@app/handlers/loggers/winston.logger'
import { AppErrorResponse } from '@app/models/app.response'
import { customLog } from '@app/utils/util.util'
/* dtos */
import type { EachMessagePayload, KafkaMessage } from 'kafkajs'

class ConsumerController {
  async init ({ message }: EachMessagePayload): Promise<void> {
    try {
      if (message.key == null) throw new AppErrorResponse({ description: '', name: '', statusCode: 500, isOperational: true })
      if (message.key.toString() === 'create') await this.onTransactionCreate(message)
      if (message.key.toString() === 'update') await this.onTransactionUpdate(message)
      if (message.key.toString() === 'refunded') await this.onTransactionRefund(message)
      if (message.key.toString() === 'deposit-block-transactions') await this.onTransactionBlock(message)
      if (message.key.toString() === 'confirm-deposit') await this.onConfirmDeposit(message)

      if (message.key.toString() === 'update-transactions-tef-read') await this.tefReadUpdates(message)
    } catch (error) {
      Winston.error(String(error))
    }
  }

  private async onTransactionCreate (message: KafkaMessage): Promise<void> {
    customLog('[Deposits]: create')
    await consumerService.onTransactionCreate(message)
  }

  private async onTransactionUpdate (message: KafkaMessage): Promise<void> {
    customLog('[Deposits]: update')
    await consumerService.onTransactionUpdate(message)
  }

  private async onTransactionRefund (message: KafkaMessage): Promise<void> {
    customLog('[Deposits]: refunded')
    await consumerService.onTransactionRefund(message)
  }

  private async onTransactionBlock (message: KafkaMessage): Promise<void> {
    customLog('[Deposits]: deposit-block-transactions')
    await consumerService.onTransactionBlock(message)
  }

  private async onConfirmDeposit (message: KafkaMessage): Promise<void> {
    customLog('[Deposits]: confirm-deposit')
    await consumerService.onConfirmDeposit(message)
  }

  // Tef
  private async tefReadUpdates (message: KafkaMessage): Promise<void> {
    customLog('[Deposits]: tef-read-updates')
    await consumerService.tefReadUpdates(message)
  }
}

const consumerController = new ConsumerController()
export default consumerController
