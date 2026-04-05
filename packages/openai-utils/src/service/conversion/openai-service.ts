import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming
} from "openai/resources/chat/completions";

export interface OpenaiService {
  chatCompletion(prompt: Prompt): Promise<ChatResponse>;
}

export class Prompt {
  constructor(
    public readonly systemPrompt: string,
    public readonly message: string,
    public readonly model: string = "gpt-4o",
    public readonly temperature: number = 0.8
  ) {}

  public static forValues(
    systemPrompt: string,
    message: string,
    model?: string,
    temperature?: number
  ): Prompt {
    return new Prompt(systemPrompt, message, model, temperature);
  }

  public toChatRequest(
    model: string,
    temperature = 0
  ): ChatCompletionCreateParamsNonStreaming {
    return {
      model: model,
      temperature: model === "gpt-5" ? undefined : temperature,
      messages: [
        {
          role: "system",
          content: this.systemPrompt
        },
        {
          role: "user",
          content: this.message
        }
      ]
    };
  }
}

export class ChatResponse {
  constructor(public readonly completion: string | undefined) {}

  public static forCompletion(completion: ChatCompletion): ChatResponse {
    const choice = completion?.choices[0]?.message?.content;
    return new ChatResponse(choice);
  }

  public static forException(): ChatResponse {
    return new ChatResponse(undefined);
  }
}
