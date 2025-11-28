/* dtos */
import { createKafka } from '@app/utils/kafka.util'
import { customLog } from '@app/utils/util.util'
import type { Message, RecordMetadata } from 'kafkajs'

const kafka = createKafka()
const topic = process.env.PREFIX_TOPIC_KAFKA ? process.env.PREFIX_TOPIC_KAFKA + 'devices.deposits' : 'devices.deposits'

const appMainProducer = kafka.producer()

class MainProducer {
  async connect (): Promise<void> {
    await appMainProducer.connect()
  }

  async disconnect (): Promise<void> {
    await appMainProducer.disconnect()
  }

  async send (messages: Message[]): Promise<RecordMetadata[]> {
    customLog('kafka msg', messages)
    return await appMainProducer.send({ topic, messages })
  }
}
const mainProducer: MainProducer = new MainProducer()
export default mainProducer
