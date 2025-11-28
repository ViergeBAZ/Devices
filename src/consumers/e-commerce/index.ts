import { createKafka } from '@app/utils/kafka.util'
import consumerController from './consumer.controller'

const kafka = createKafka()

const appDepositsConsumer = kafka.consumer({ groupId: 'devices.devices' })
const topic = process.env.PREFIX_TOPIC_KAFKA ? process.env.PREFIX_TOPIC_KAFKA + 'deposits.devices' : 'deposits.devices'

class DepositsConsumer {
  async init (): Promise<void> {
    await this.connect()
    await this.subscribe()
  }

  async start (): Promise<void> {
    await this.streamMessages()
  }

  private async connect (): Promise<void> {
    await appDepositsConsumer.connect()
  }

  private async subscribe (): Promise<void> {
    await appDepositsConsumer.subscribe({ topic, fromBeginning: true })
  }

  private async streamMessages (): Promise<void> {
    await appDepositsConsumer.run({
      eachMessage: consumerController.init.bind(consumerController)
    })
  }
}

const depositsConsumer: DepositsConsumer = new DepositsConsumer()
export default depositsConsumer
