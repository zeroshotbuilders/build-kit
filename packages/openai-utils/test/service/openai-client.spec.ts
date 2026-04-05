import {
  OpenaiService,
  OpenaiServiceLocal,
  Prompt
} from "@zeroshotbuilders/openai-utils";
import { createLocalOpenaiService } from "../client-factory";

const JSON_RESPONSE = `
{
  "questions": [
    {
      "question": "Best Denver craft brewery?",
      "options": ["Great Divide", "Denver Beer Co", "Wynkoop", "Odell"]
    },
    {
      "question": "Favorite Denver sports team?",
      "options": ["Broncos", "Nuggets", "Avalanche", "Rockies"]
    }
  ]
}`;

describe("OpenAI Client", () => {
  let client: OpenaiService;

  beforeAll(async () => {
    client = await createLocalOpenaiService();
  });

  beforeEach(() => {
    OpenaiServiceLocal.clearErrors();
    OpenaiServiceLocal.clearResponses();
  });

  it("should generate a chat response", async () => {
    const prompt = Prompt.forValues(
      "You are a chatbot. You are helping a user with a question. The user asks:",
      "What is the meaning of life, the universe, and everything?"
    );
    const response = await client.chatCompletion(prompt);
    expect(response.completion).toBeDefined();
    expect(response.completion).not.toEqual("");
  });

  it("should return undefined on error", async () => {
    OpenaiServiceLocal.setError("chatbot", 1);
    const prompt = Prompt.forValues(
      "You are a chatbot. You are helping a user with a question. The user asks:",
      "What is the meaning of life, the universe, and everything?"
    );
    const response1 = await client.chatCompletion(prompt);
    expect(response1.completion).toBeUndefined();
    const response2 = await client.chatCompletion(prompt);
    expect(response2.completion).toBeDefined();
  });

  it("should return json when i ask it to", async () => {
    OpenaiServiceLocal.setResponse("json", JSON_RESPONSE);
    const prompt = Prompt.forValues("Give me json plz", "Denver, CO");
    const response = await client.chatCompletion(prompt);
    expect(response.completion).toBeDefined();
    const value = JSON.parse(response.completion);
    expect(value.questions).toHaveLength(2);
  });

  it("should error n times before returning a response", async () => {
    OpenaiServiceLocal.setError("json", 3);
    OpenaiServiceLocal.setResponse("json", JSON_RESPONSE);
    const prompt = Prompt.forValues("Give me json plz", "Denver, CO");
    const response1 = await client.chatCompletion(prompt);
    expect(response1.completion).toBeUndefined();
    const response2 = await client.chatCompletion(prompt);
    expect(response2.completion).toBeUndefined();
    const response3 = await client.chatCompletion(prompt);
    expect(response3.completion).toBeUndefined();
    const response4 = await client.chatCompletion(prompt);
    expect(response4.completion).toBeDefined();
  });
});
