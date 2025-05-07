import { AppErrorResponse } from '@app/models/app.response'
/* tos */
import { type KafkaMessage } from 'kafkajs'

export function messageHandler <T> (message: KafkaMessage): T {
  if (typeof message.value?.toString() === 'undefined') {
    throw new AppErrorResponse({
      name: '',
      description: '',
      isOperational: true,
      statusCode: 500
    })
  }

  return JSON.parse(message.value.toString()) as T
}
