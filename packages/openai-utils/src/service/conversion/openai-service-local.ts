import * as randomstring from "randomstring";
import { ChatResponse, OpenaiService, Prompt } from "./openai-service";

export class OpenaiServiceLocal implements OpenaiService {
  private static instance: OpenaiServiceLocal = new OpenaiServiceLocal();
  private static responsesByPromptSubstring: Map<string, string> = new Map();
  private static errorCountsByPromptSubstring: Map<string, number> = new Map();

  public static getInstance() {
    return OpenaiServiceLocal.instance;
  }

  public static setResponse(promptSubstring: string, response: string): void {
    this.responsesByPromptSubstring.set(promptSubstring, response);
  }

  public static setError(promptSubstring: string, count: number): void {
    this.errorCountsByPromptSubstring.set(promptSubstring, count);
  }

  public static clearResponses(): void {
    this.responsesByPromptSubstring.clear();
  }

  public static clearErrors(): void {
    this.errorCountsByPromptSubstring.clear();
  }

  private static promptText(prompt: Prompt): string {
    return `${prompt.systemPrompt ?? ""} ${prompt.message ?? ""}`;
  }

  private static shouldErrorForPrompt(prompt: Prompt): boolean {
    const text = this.promptText(prompt);
    for (const [substring, remaining] of this.errorCountsByPromptSubstring) {
      if (substring && text.includes(substring) && remaining > 0) {
        const nextRemaining = remaining - 1;
        if (nextRemaining > 0) {
          this.errorCountsByPromptSubstring.set(substring, nextRemaining);
        } else {
          this.errorCountsByPromptSubstring.set(substring, 0);
        }
        return true;
      }
    }
    return false;
  }

  private static responseForPrompt(prompt: Prompt): string | undefined {
    const text = this.promptText(prompt);
    for (const [substring, response] of this.responsesByPromptSubstring) {
      if (substring && text.includes(substring)) {
        return response;
      }
    }
    return undefined;
  }

  async chatCompletion(prompt: Prompt): Promise<ChatResponse> {
    if (OpenaiServiceLocal.shouldErrorForPrompt(prompt)) {
      return Promise.resolve(ChatResponse.forException());
    }
    const keyed = OpenaiServiceLocal.responseForPrompt(prompt);
    if (keyed !== undefined) {
      return Promise.resolve(new ChatResponse(keyed));
    }
    return Promise.resolve(new ChatResponse(randomstring.generate(10)));
  }
}
