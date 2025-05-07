import { type KafkaMessage } from 'kafkajs'

export class ConsumerService {
  async test (message: KafkaMessage): Promise<void> {
    console.log('hola')
  }
}

const consumerService = new ConsumerService()
export default consumerService
