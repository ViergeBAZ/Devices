/* dtos */
import type { Message, RecordMetadata } from 'kafkajs'
import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID?? '',
  brokers: [process.env.KAFKA_SERVER ?? '']
})

const appMainProducer = kafka.producer()

class MainProducer {
  async connect (): Promise<void> {
    await appMainProducer.connect()
  }

  async disconnect (): Promise<void> {
    await appMainProducer.disconnect()
  }

  async send (messages: Message[]): Promise<RecordMetadata[]> {
    console.log('kafka msg', messages)
    return await appMainProducer.send({ topic: 'devices.deposits', messages })
  }
}
const mainProducer: MainProducer = new MainProducer()
export default mainProducer
