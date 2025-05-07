import consumerController from './consumer.controller'
import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID?? '',
  brokers: [process.env.KAFKA_SERVER ?? '']
})

export const appProfilesConsumer = kafka.consumer({ groupId: 'development.profile.devices' })

class ProfilesConsumer {
  async init (): Promise<void> {
    await this.connect()
    await this.subscribe()
  }

  async start (): Promise<void> {
    await this.streamMessages()
  }

  private async connect (): Promise<void> {
    await appProfilesConsumer.connect()
  }

  private async subscribe (): Promise<void> {
    await appProfilesConsumer.subscribe({ topic: 'profile.devices', fromBeginning: true })
  }

  private async streamMessages (): Promise<void> {
    await appProfilesConsumer.run({
      eachMessage: consumerController.init.bind(consumerController)
    })
  }
}

const profilesConsumer: ProfilesConsumer = new ProfilesConsumer()
export default profilesConsumer
