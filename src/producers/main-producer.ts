/* dtos */
import { createKafka } from '@app/utils/kafka.util'
import type { Message, RecordMetadata } from 'kafkajs'
import { Kafka } from 'kafkajs'

const kafka = createKafka()

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
