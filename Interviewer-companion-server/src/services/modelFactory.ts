import { ChatAnthropic } from '@langchain/anthropic'
import { ChatBedrockConverse } from '@langchain/aws'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { config } from '../config/index.js'

export class ModelFactory {
  static create(): BaseChatModel {
    switch (config.aiProvider) {
      case 'claude':
        if (!config.anthropicApiKey) {
          throw new Error(
            'ANTHROPIC_API_KEY is required when AI_PROVIDER=claude'
          )
        }

        return new ChatAnthropic({
          apiKey: config.anthropicApiKey,
          model: config.anthropicModel,
          temperature: 0,
        })

      case 'bedrock':
        if (!config.bedrockModelId) {
          throw new Error(
            'BEDROCK_MODEL_ID is required when AI_PROVIDER=bedrock'
          )
        }

        return new ChatBedrockConverse({
          model: config.bedrockModelId,
          region: config.awsRegion,
          temperature: 0,
        })

      default:
        throw new Error(
          `Unsupported AI_PROVIDER: ${config.aiProvider}`
        )
    }
  }
}