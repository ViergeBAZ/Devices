import { Kafka } from 'kafkajs'

export function createKafka (): Kafka {
  if (process.env.NEW_KAFKA) {
    const username = process.env.KAFKA_USERNAME
    const password = process.env.KAFKA_PASSWORD
    const brokers = process.env.KAFKA_BOOTSTRAP_SERVERS

    if (!username) {
      throw new Error('KAFKA_USERNAME is required')
    }
    if (!password) {
      throw new Error('KAFKA_PASSWORD is required')
    }
    if (!brokers) {
      throw new Error('KAFKA_BOOTSTRAP_SERVERS is required')
    }
    return new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID ?? '',
      brokers: brokers.split(','),
      ssl: true,
      sasl: {
        mechanism: 'scram-sha-512',
        username,
        password
      }
    })
  }
  return new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? '',
    brokers: [process.env.KAFKA_SERVER ?? '']
  })
}
