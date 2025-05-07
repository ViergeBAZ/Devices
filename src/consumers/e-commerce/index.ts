import consumerController from './consumer.controller'
import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID?? '',
  brokers: [process.env.KAFKA_SERVER ?? '']
})

const appDepositsConsumer = kafka.consumer({ groupId: 'development.e-commerce.devices' })

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
    await appDepositsConsumer.subscribe({ topic: 'deposits.devices', fromBeginning: true })
  }

  private async streamMessages (): Promise<void> {
    await appDepositsConsumer.run({
      eachMessage: consumerController.init.bind(consumerController)
    })
  }
}

const depositsConsumer: DepositsConsumer = new DepositsConsumer()
export default depositsConsumer
