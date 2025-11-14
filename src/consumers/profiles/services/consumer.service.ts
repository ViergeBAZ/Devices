import { customLog } from '@app/utils/util.util'
import { type KafkaMessage } from 'kafkajs'

export class ConsumerService {
  async test (message: KafkaMessage): Promise<void> {
    customLog('hola')
  }
}

const consumerService = new ConsumerService()
export default consumerService
