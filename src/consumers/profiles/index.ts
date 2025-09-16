import { createKafka } from '@app/utils/kafka.util'
import consumerController from './consumer.controller'

const kafka = createKafka()

export const appProfilesConsumer = kafka.consumer({ groupId: 'devices.profile' })

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
