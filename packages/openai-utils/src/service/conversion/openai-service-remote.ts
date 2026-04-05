import { OpenAI } from "openai";
import { createLogger, transports } from "winston";
import { OpenaiClientConfig } from "../../config/openai-client-config";
import { ChatResponse, OpenaiService, Prompt } from "./openai-service";

export class OpenaiServiceRemote implements OpenaiService {
  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });
  private readonly client: OpenAI;

  constructor(private readonly config: OpenaiClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiToken
    });
  }

  public async chatCompletion(prompt: Prompt): Promise<ChatResponse> {
    try {
      const request = prompt.toChatRequest(prompt.model, prompt.temperature);
      const response = await this.client.chat.completions.create(request);
      return ChatResponse.forCompletion(response);
    } catch (error) {
      this.logger.error("Error completing chat request", error);
      return new ChatResponse(undefined);
    }
  }
}
